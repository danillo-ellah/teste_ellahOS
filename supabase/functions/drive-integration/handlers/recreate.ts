import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { buildDriveStructure } from '../../_shared/google-drive-client.ts';

// POST /drive-integration/:jobId/recreate
// Limpa registros locais de drive_folders e recria a estrutura no Drive
// AVISO: nao deleta pastas no Google Drive (apenas recria registros locais)
// Se as pastas ja existem no Drive com mesmo nome, serao criadas duplicadas
export async function recreateStructure(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const serviceClient = getServiceClient();

  // 1. Remover registros existentes de drive_folders para este job
  const { error: deleteError } = await serviceClient
    .from('drive_folders')
    .delete()
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[recreate] erro ao limpar drive_folders:', deleteError.message);
  }

  // 2. Limpar drive_folder_url do job
  await serviceClient
    .from('jobs')
    .update({ drive_folder_url: null })
    .eq('id', jobId);

  // 3. Recriar estrutura
  const result = await buildDriveStructure({
    serviceClient,
    jobId,
    tenantId: auth.tenantId,
  });

  return success({
    folders_created: result.foldersCreated,
    root_url: result.rootUrl,
    warnings: result.errors,
    recreated: true,
  });
}
