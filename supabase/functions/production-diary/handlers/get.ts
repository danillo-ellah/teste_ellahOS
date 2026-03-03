import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

export async function handleGet(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[production-diary/get] buscando entry', { id, userId: auth.userId });

  const client = getSupabaseClient(auth.token);

  const { data: entry, error: fetchError } = await client
    .from('production_diary_entries')
    .select(`
      *,
      production_diary_photos(
        id,
        url,
        thumbnail_url,
        caption,
        photo_type,
        taken_at,
        created_at
      )
    `)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !entry) {
    throw new AppError('NOT_FOUND', 'Entrada do diario nao encontrada', 404);
  }

  return success(entry, 200, req);
}
