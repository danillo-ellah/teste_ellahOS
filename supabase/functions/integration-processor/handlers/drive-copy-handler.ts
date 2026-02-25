import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';
import { getGoogleAccessToken, copyDriveFile } from '../../_shared/google-drive-client.ts';
import { getSecret } from '../../_shared/vault.ts';

// Handler: processa evento drive_copy_templates
// Copia templates de arquivos do Drive para as pastas do job
export async function processDriveCopyEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const jobId = event.payload.job_id as string;
  const tenantId = event.tenant_id;
  const templateIds = (event.payload.templates as string[]) ?? [];

  if (!jobId) {
    throw new Error('drive_copy_templates: job_id ausente no payload');
  }

  console.log(`[drive-copy-handler] copiando templates para job ${jobId}`);

  // Ler configuracao de templates do tenant
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) ?? {};
  const driveConfig = integrations['google_drive'] ?? {};

  if (!driveConfig.enabled) {
    console.log(`[drive-copy-handler] Drive desabilitado para tenant ${tenantId}`);
    return { skipped: true, reason: 'Drive desabilitado' };
  }

  const allTemplates = (driveConfig.templates as Array<Record<string, unknown>>) ?? [];

  if (allTemplates.length === 0) {
    console.log(`[drive-copy-handler] nenhum template configurado para tenant ${tenantId}`);
    return { skipped: true, reason: 'nenhum template configurado' };
  }

  // Filtrar templates: se templateIds informados, apenas esses; senao, todos
  const templatesToCopy = templateIds.length > 0
    ? allTemplates.filter((t) => templateIds.includes(t.source_id as string))
    : allTemplates;

  if (templatesToCopy.length === 0) {
    return { skipped: true, reason: 'nenhum template a copiar apos filtro' };
  }

  // Buscar dados do job para substituicao de placeholders
  const { data: job } = await serviceClient
    .from('jobs')
    .select('code, job_aba, title, clients(name)')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  const jobAba = (job?.job_aba as string) ?? '';
  const jobCode = (job?.code as string) ?? '';
  const clientName = ((job?.clients as Record<string, unknown>)?.name as string) ?? '';

  // Obter access token do Google Drive via Service Account do Vault
  const saJson = await getSecret(serviceClient, `${tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new Error('drive_copy_templates: Service Account do Google Drive nao encontrada no Vault');
  }
  const sa = JSON.parse(saJson);
  const accessToken = await getGoogleAccessToken(sa);
  if (!accessToken) {
    throw new Error('drive_copy_templates: falha ao obter access_token do Google Drive');
  }

  let copiedCount = 0;
  const errors: string[] = [];
  const results: Array<Record<string, unknown>> = [];

  for (const template of templatesToCopy) {
    const sourceId = template.source_id as string;
    const namePattern = (template.name as string) ?? 'Template';
    const targetFolderKey = (template.target_folder_key as string) ?? 'root';

    // Substituir placeholders no nome
    const fileName = namePattern
      .replace(/\{JOB_ABA\}/g, jobAba)
      .replace(/\{JOB_CODE\}/g, jobCode)
      .replace(/\{CLIENT\}/g, clientName);

    // Buscar pasta destino no Drive
    const { data: folderData } = await serviceClient
      .from('drive_folders')
      .select('google_drive_id')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .eq('folder_key', targetFolderKey)
      .is('deleted_at', null)
      .maybeSingle();

    const targetFolderId = (folderData?.google_drive_id as string) ?? null;

    if (!targetFolderId) {
      const msg = `pasta "${targetFolderKey}" nao encontrada para job ${jobId}`;
      console.warn(`[drive-copy-handler] ${msg}`);
      errors.push(msg);
      continue;
    }

    // Verificar se ja foi copiado (idempotencia via job_files.external_id)
    const externalId = `template:${sourceId}`;
    const { data: existingFile } = await serviceClient
      .from('job_files')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .eq('external_id', externalId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingFile) {
      console.log(`[drive-copy-handler] template ${sourceId} ja copiado para job ${jobId} — pulando`);
      results.push({ source_id: sourceId, name: fileName, status: 'skipped', reason: 'ja copiado' });
      continue;
    }

    try {
      // Copiar arquivo no Drive
      const copyResult = await copyDriveFile(accessToken, sourceId, fileName, targetFolderId);

      // Registrar em job_files
      await serviceClient
        .from('job_files')
        .insert({
          tenant_id: tenantId,
          job_id: jobId,
          file_name: fileName,
          file_type: 'template',
          drive_file_id: copyResult.id,
          drive_url: copyResult.webViewLink ?? `https://drive.google.com/file/d/${copyResult.id}/view`,
          external_id: externalId,
          metadata: { source_template_id: sourceId, folder_key: targetFolderKey },
        });

      copiedCount++;
      results.push({
        source_id: sourceId,
        name: fileName,
        status: 'copied',
        copied_id: copyResult.id,
        target_folder: targetFolderKey,
      });

      console.log(`[drive-copy-handler] template "${fileName}" copiado → ${copyResult.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[drive-copy-handler] falha ao copiar template ${sourceId}: ${msg}`);
      errors.push(`${namePattern}: ${msg}`);
      results.push({ source_id: sourceId, name: fileName, status: 'error', reason: msg });
    }
  }

  console.log(
    `[drive-copy-handler] concluido: ${copiedCount} copiados, ${errors.length} erros de ${templatesToCopy.length} total`,
  );

  // Se nenhum arquivo copiado e houve erros, considerar falha
  if (copiedCount === 0 && errors.length > 0) {
    throw new Error(`Nenhum template copiado. Erros: ${errors.join('; ')}`);
  }

  return {
    job_id: jobId,
    files_copied: copiedCount,
    errors,
    results,
  };
}
