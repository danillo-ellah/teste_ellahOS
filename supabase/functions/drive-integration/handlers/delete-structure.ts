import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { getGoogleAccessToken, trashFile } from '../../_shared/google-drive-client.ts';
import { getSecret } from '../../_shared/vault.ts';

// DELETE /drive-integration/:jobId/delete-structure
// Move toda a arvore de pastas do Drive para a lixeira usando a SA (que e owner).
// Necessario porque a SA cria as pastas e e owner — o usuario nao consegue excluir diretamente.
// Tambem remove os registros do banco (drive_folders).
export async function deleteStructure(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const serviceClient = getServiceClient();

  // 1. Buscar todas as pastas do job no banco
  const { data: folders, error: foldersError } = await serviceClient
    .from('drive_folders')
    .select('id, folder_key, google_drive_id')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (foldersError) {
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar pastas do Drive', 500);
  }

  if (!folders || folders.length === 0) {
    return success({ message: 'Nenhuma pasta Drive encontrada para este job', deleted: 0 });
  }

  // 2. Obter SA token
  const saJson = await getSecret(serviceClient, `${auth.tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new AppError('INTERNAL_ERROR', 'Service Account nao encontrada no Vault', 500);
  }

  const sa = JSON.parse(saJson);
  const token = await getGoogleAccessToken(sa);
  if (!token) {
    throw new AppError('INTERNAL_ERROR', 'Falha ao obter access_token do Google', 500);
  }

  // 3. Ler config do tenant para drive_type
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const driveConfig = integrations['google_drive'] || {};
  const driveType = (driveConfig.drive_type as string) || 'my_drive';
  const sharedDriveId = (driveConfig.shared_drive_id as string) || null;

  // 4. Mover para lixeira — comecar pela pasta raiz (move tudo de uma vez)
  const rootFolder = folders.find(f => f.folder_key === 'root');
  let trashed = 0;
  const errors: string[] = [];

  if (rootFolder) {
    // Mover pasta raiz para lixeira (subpastas vao junto automaticamente)
    const ok = await trashFile(token, rootFolder.google_drive_id, { driveType, sharedDriveId });
    if (ok) {
      trashed = folders.length; // Todas as subpastas foram para lixeira junto com a raiz
    } else {
      errors.push(`Falha ao mover pasta raiz ${rootFolder.google_drive_id} para lixeira`);
      // Tentar individualmente cada pasta
      for (const folder of folders) {
        const okIndiv = await trashFile(token, folder.google_drive_id, { driveType, sharedDriveId });
        if (okIndiv) trashed++;
        else errors.push(`Falha ao mover ${folder.folder_key} (${folder.google_drive_id})`);
      }
    }
  } else {
    // Sem pasta raiz — tentar individualmente
    for (const folder of folders) {
      const ok = await trashFile(token, folder.google_drive_id, { driveType, sharedDriveId });
      if (ok) trashed++;
      else errors.push(`Falha ao mover ${folder.folder_key} (${folder.google_drive_id})`);
    }
  }

  // 5. Remover registros do banco
  const folderIds = folders.map(f => f.id);
  await serviceClient
    .from('drive_folders')
    .delete()
    .in('id', folderIds);

  // 6. Limpar drive_folder_url do job
  await serviceClient
    .from('jobs')
    .update({ drive_folder_url: null })
    .eq('id', jobId);

  console.log(`[drive-integration/delete-structure] job ${jobId}: ${trashed}/${folders.length} pastas movidas para lixeira`);

  return success({
    deleted: trashed,
    total: folders.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
