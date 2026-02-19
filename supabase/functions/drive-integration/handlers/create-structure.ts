import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { buildDriveStructure } from '../../_shared/google-drive-client.ts';

// POST /drive-integration/:jobId/create-structure
// Trigger manual para criacao de pastas Drive (admin/ceo only)
// Util para criar pastas sem precisar re-aprovar o job
export async function createStructure(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const serviceClient = getServiceClient();

  const result = await buildDriveStructure({
    serviceClient,
    jobId,
    tenantId: auth.tenantId,
  });

  return success({
    folders_created: result.foldersCreated,
    root_url: result.rootUrl,
    warnings: result.errors,
  });
}
