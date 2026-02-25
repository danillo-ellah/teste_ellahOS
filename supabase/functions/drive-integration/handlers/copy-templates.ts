import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { getGoogleAccessToken } from '../../_shared/google-drive-client.ts';
import { getSecret } from '../../_shared/vault.ts';

// ============================================================
// POST /drive-integration/:jobId/copy-templates
// Copia templates configurados no tenant para as pastas do job.
// Idempotente: templates ja registrados em job_files sao pulados.
// Auth: JWT — admin, ceo, produtor_executivo
// ============================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Configuracao de um template (dentro de tenant.settings)
interface DriveTemplateConfig {
  name: string;             // Nome com placeholders: GG_{JOB_ABA}, Cronograma_{JOB_ABA}
  source_id: string;        // fileId do Google Drive a ser copiado
  target_folder_key: string; // folder_key em drive_folders (ex: 'root', 'cronograma')
  type?: string;            // 'spreadsheet' | 'document' | etc. (apenas informativo)
}

// Resultado de um arquivo copiado com sucesso
interface CopiedFile {
  template_name: string;
  source_id: string;
  copied_id: string;
  copied_url: string;
  target_folder: string;
}

// Opcoes para chamadas com Shared Drive
interface DriveOptions {
  driveType?: string | null;
  sharedDriveId?: string | null;
}

// ============================================================
// Utilitarios Drive API
// ============================================================

// Copia um arquivo no Drive (files.copy) e retorna { id, webViewLink }
async function driveFileCopy(
  token: string,
  sourceId: string,
  targetName: string,
  opts?: DriveOptions,
): Promise<{ id: string; webViewLink: string }> {
  let url = `${DRIVE_API}/files/${sourceId}/copy?fields=id,webViewLink`;
  if (opts?.driveType === 'shared_drive') {
    url += '&supportsAllDrives=true';
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: targetName }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive files.copy "${sourceId}": HTTP ${resp.status} — ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  return { id: data.id, webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view` };
}

// Move um arquivo para uma pasta diferente (files.update com removeParents + addParents)
async function driveFileMove(
  token: string,
  fileId: string,
  targetFolderId: string,
  opts?: DriveOptions,
): Promise<void> {
  // Primeiro busca os parents atuais para removê-los
  let getUrl = `${DRIVE_API}/files/${fileId}?fields=parents`;
  if (opts?.driveType === 'shared_drive') {
    getUrl += '&supportsAllDrives=true';
  }

  const getResp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!getResp.ok) {
    const text = await getResp.text();
    throw new Error(`Drive files.get "${fileId}": HTTP ${getResp.status} — ${text.slice(0, 300)}`);
  }

  const fileData = await getResp.json();
  const currentParents: string[] = fileData.parents || [];

  // Montar URL de update com addParents/removeParents
  const removeParents = currentParents.join(',');
  let updateUrl = `${DRIVE_API}/files/${fileId}?addParents=${encodeURIComponent(targetFolderId)}`;
  if (removeParents) {
    updateUrl += `&removeParents=${encodeURIComponent(removeParents)}`;
  }
  if (opts?.driveType === 'shared_drive') {
    updateUrl += '&supportsAllDrives=true';
  }
  updateUrl += '&fields=id';

  const updateResp = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!updateResp.ok) {
    const text = await updateResp.text();
    throw new Error(`Drive files.update (move) "${fileId}": HTTP ${updateResp.status} — ${text.slice(0, 300)}`);
  }
}

// ============================================================
// Substituicao de placeholders no nome do template
// ============================================================

function resolvePlaceholders(
  template: string,
  job: { job_aba?: string | null; code?: string | null },
  clientName: string,
): string {
  return template
    .replace(/{JOB_ABA}/g, job.job_aba || 'SEM-ABA')
    .replace(/{JOB_CODE}/g, job.code || 'SEM-CODIGO')
    .replace(/{CLIENT}/g, clientName || 'SEM-CLIENTE');
}

// ============================================================
// Handler principal
// ============================================================

export async function handleCopyTemplates(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  // Verificacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin, ceo ou produtor_executivo podem copiar templates',
      403,
    );
  }

  // Usar sempre serviceClient para acesso completo (sem RLS para jobs internos)
  const serviceClient = getServiceClient();

  // Parse do body (opcional)
  let body: { templates?: string[] } = {};
  try {
    const raw = await req.text();
    if (raw.trim()) {
      body = JSON.parse(raw);
    }
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const filterTemplateIds: string[] | undefined =
    Array.isArray(body.templates) && body.templates.length > 0 ? body.templates : undefined;

  // ----------------------------------------------------------
  // 1. Buscar config do tenant (settings.integrations.drive)
  // ----------------------------------------------------------
  const { data: tenant, error: tenantError } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  const settings = (tenant.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const driveConfig = integrations['google_drive'] || {};

  if (!driveConfig.enabled) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Integracao com Google Drive nao esta habilitada para este tenant',
      422,
    );
  }

  const configuredTemplates = (driveConfig.templates as DriveTemplateConfig[]) || [];
  if (!configuredTemplates.length) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nenhum template configurado em tenant.settings.integrations.google_drive.templates',
      422,
    );
  }

  // Filtrar templates pelo ids solicitados (se informado)
  const templatesToProcess = filterTemplateIds
    ? configuredTemplates.filter((t) => filterTemplateIds.includes(t.source_id))
    : configuredTemplates;

  if (!templatesToProcess.length) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Nenhum template encontrado para os source_ids informados: ${filterTemplateIds?.join(', ')}`,
      400,
    );
  }

  // ----------------------------------------------------------
  // 2. Buscar dados do job (incluindo job_aba, code e client)
  // ----------------------------------------------------------
  const { data: job, error: jobError } = await serviceClient
    .from('jobs')
    .select('id, code, job_aba, client_id, tenant_id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', `Job ${jobId} nao encontrado`, 404);
  }

  // Buscar nome do cliente via FK
  let clientName = '';
  if (job.client_id) {
    const { data: client } = await serviceClient
      .from('clients')
      .select('company_name')
      .eq('id', job.client_id)
      .single();
    clientName = client?.company_name || '';
  }

  // ----------------------------------------------------------
  // 3. Buscar drive_folders do job (para encontrar pasta destino)
  // ----------------------------------------------------------
  const { data: driveFolders } = await serviceClient
    .from('drive_folders')
    .select('folder_key, google_drive_id, url')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  const folderByKey = new Map<string, { driveId: string; url: string }>();
  for (const folder of driveFolders || []) {
    if (folder.folder_key && folder.google_drive_id) {
      folderByKey.set(folder.folder_key, {
        driveId: folder.google_drive_id,
        url: folder.url || '',
      });
    }
  }

  if (folderByKey.size === 0) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Este job nao possui pastas Drive registradas. Crie a estrutura primeiro via /create-structure.',
      422,
    );
  }

  // ----------------------------------------------------------
  // 4. Buscar job_files existentes para idempotencia
  // ----------------------------------------------------------
  const { data: existingFiles } = await serviceClient
    .from('job_files')
    .select('external_id')
    .eq('job_id', jobId)
    .eq('external_source', 'google_drive')
    .is('deleted_at', null);

  // Set de source_ids ja copiados (para verificar se um template source_id
  // ja foi copiado antes, baseado em metadados no file_name ou external_id).
  // Usamos a coluna external_id para guardar o source_id original do template
  // no formato "template:{source_id}" para diferenciar de outros arquivos Drive.
  const copiedSourceIds = new Set<string>();
  for (const f of existingFiles || []) {
    if (f.external_id?.startsWith('template:')) {
      copiedSourceIds.add(f.external_id.replace('template:', ''));
    }
  }

  // ----------------------------------------------------------
  // 5. Obter access token do Google via Service Account no Vault
  // ----------------------------------------------------------
  const saJson = await getSecret(serviceClient, `${auth.tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new AppError('INTERNAL_ERROR', 'Service Account Google Drive nao encontrada no Vault', 500);
  }

  const sa = JSON.parse(saJson);
  const token = await getGoogleAccessToken(sa);
  if (!token) {
    throw new AppError('INTERNAL_ERROR', 'Falha ao obter access_token do Google', 500);
  }

  const driveType = (driveConfig.drive_type as string) || 'my_drive';
  const sharedDriveId = (driveConfig.shared_drive_id as string) || null;
  const driveOpts: DriveOptions = { driveType, sharedDriveId };

  // ----------------------------------------------------------
  // 6. Processar cada template (fail-safe: erro nao interrompe os demais)
  // ----------------------------------------------------------
  const filesCopied: CopiedFile[] = [];
  const filesSkipped: string[] = [];
  const errors: string[] = [];

  for (const template of templatesToProcess) {
    const logPrefix = `[copy-templates] template "${template.name}" (${template.source_id})`;

    // 6a. Verificar idempotencia: template ja copiado para este job?
    if (copiedSourceIds.has(template.source_id)) {
      console.log(`${logPrefix}: ja copiado — pulando`);
      filesSkipped.push(template.name);
      continue;
    }

    // 6b. Resolver pasta destino
    const targetFolder = folderByKey.get(template.target_folder_key);
    if (!targetFolder) {
      const msg = `Pasta "${template.target_folder_key}" nao encontrada nas pastas do job`;
      console.warn(`${logPrefix}: ${msg}`);
      errors.push(`${template.name}: ${msg}`);
      continue;
    }

    // 6c. Resolver nome final do arquivo (substituir placeholders)
    const finalName = resolvePlaceholders(template.name, job, clientName);

    try {
      // 6d. Copiar arquivo no Drive (files.copy)
      console.log(`${logPrefix}: copiando como "${finalName}" ...`);
      const copied = await driveFileCopy(token, template.source_id, finalName, driveOpts);

      // 6e. Mover para a pasta correta (files.update com parents)
      console.log(`${logPrefix}: movendo "${copied.id}" para pasta "${template.target_folder_key}" (${targetFolder.driveId})`);
      await driveFileMove(token, copied.id, targetFolder.driveId, driveOpts);

      // 6f. Registrar em job_files
      //   external_id = "template:{source_id}" — permite checar idempotencia em chamadas futuras
      const { error: insertError } = await serviceClient.from('job_files').insert({
        tenant_id: auth.tenantId,
        job_id: jobId,
        file_name: finalName,
        file_url: copied.webViewLink,
        file_type: template.type || 'application/vnd.google-apps.spreadsheet',
        category: 'template_drive',
        external_id: `template:${template.source_id}`,
        external_source: 'google_drive',
        uploaded_by: auth.userId,
      });

      if (insertError) {
        // Nao bloqueia — o arquivo foi copiado no Drive. Apenas loga o aviso.
        console.warn(`${logPrefix}: arquivo copiado no Drive mas falhou ao registrar em job_files: ${insertError.message}`);
        errors.push(`${template.name}: copiado no Drive mas falhou ao salvar registro (${insertError.message})`);
      }

      console.log(`${logPrefix}: copiado com sucesso -> ${copied.id}`);
      filesCopied.push({
        template_name: template.name,
        source_id: template.source_id,
        copied_id: copied.id,
        copied_url: copied.webViewLink,
        target_folder: template.target_folder_key,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`${logPrefix}: ERRO — ${msg}`);
      errors.push(`${template.name}: ${msg}`);
    }
  }

  // ----------------------------------------------------------
  // 7. Registrar integration_event de auditoria
  // ----------------------------------------------------------
  try {
    // Chave de idempotencia baseada no jobId + timestamp do dia (evita duplicatas na mesma operacao)
    const idempotencyKey = `drive_copy_templates:${jobId}:${new Date().toISOString().slice(0, 10)}`;

    await serviceClient.from('integration_events').insert({
      tenant_id: auth.tenantId,
      event_type: 'drive_copy_templates',
      status: 'completed',
      idempotency_key: idempotencyKey,
      payload: {
        job_id: jobId,
        templates_requested: templatesToProcess.length,
        files_copied: filesCopied.length,
        files_skipped: filesSkipped.length,
        errors_count: errors.length,
        triggered_by: auth.userId,
      },
      result: {
        files: filesCopied,
        skipped: filesSkipped,
        errors,
      },
    });
  } catch (eventErr) {
    // Falha no registro de auditoria nao deve reverter a operacao
    console.warn('[copy-templates] falha ao registrar integration_event:', eventErr);
  }

  // ----------------------------------------------------------
  // 8. Resposta
  // ----------------------------------------------------------
  console.log(
    `[copy-templates] job ${jobId}: ${filesCopied.length} copiados, ${filesSkipped.length} pulados, ${errors.length} erros`,
  );

  return success({
    files_copied: filesCopied.length,
    files_skipped: filesSkipped.length,
    files: filesCopied,
    errors,
  });
}
