import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';

// GET /drive-integration/:jobId/folders
// Lista todas as pastas Drive registradas para um job
export async function listFolders(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  const { data: folders, error: queryError } = await supabase
    .from('drive_folders')
    .select('id, job_id, folder_key, google_drive_id, url, parent_folder_id, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (queryError) {
    console.error('[list-folders] erro:', queryError.message);
    return success({ data: [], meta: { total: 0 } });
  }

  return success(folders || []);
}
