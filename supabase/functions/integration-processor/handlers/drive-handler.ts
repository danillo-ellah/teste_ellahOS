import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { IntegrationEvent } from '../../_shared/integration-client.ts';
import { buildDriveStructure } from '../../_shared/google-drive-client.ts';

// Handler: processa evento drive_create_structure
// Cria arvore de 26 pastas no Google Drive e registra em drive_folders
export async function processDriveEvent(
  serviceClient: SupabaseClient,
  event: IntegrationEvent,
): Promise<Record<string, unknown>> {
  const jobId = event.payload.job_id as string;
  const tenantId = event.tenant_id;

  if (!jobId) {
    throw new Error('drive_create_structure: job_id ausente no payload');
  }

  console.log(`[drive-handler] criando estrutura Drive para job ${jobId}`);

  const result = await buildDriveStructure({
    serviceClient,
    jobId,
    tenantId,
  });

  if (result.errors.length > 0) {
    console.warn(`[drive-handler] job ${jobId}: ${result.errors.length} avisos:`, result.errors);
  }

  // Se nenhuma pasta foi criada e houve erros, considerar falha
  if (result.foldersCreated === 0 && result.errors.length > 0) {
    throw new Error(`Nenhuma pasta criada. Erros: ${result.errors.join('; ')}`);
  }

  return {
    folders_created: result.foldersCreated,
    root_url: result.rootUrl,
    warnings: result.errors,
  };
}
