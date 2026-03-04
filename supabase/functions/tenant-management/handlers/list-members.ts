import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * GET /tenant-management/members
 * Lista todos os membros (profiles) do tenant.
 * Qualquer usuario autenticado do tenant pode listar.
 */
export async function handleListMembers(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[tenant-management/list-members] listando membros', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const roleFilter = url.searchParams.get('role')?.trim() ?? '';

  const client = getSupabaseClient(auth.token);

  let query = client
    .from('profiles')
    .select(
      `
      id,
      full_name,
      email,
      phone,
      role,
      avatar_url,
      created_at
    `,
    )
    .eq('tenant_id', auth.tenantId)
    .order('full_name', { ascending: true });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (roleFilter) {
    query = query.eq('role', roleFilter);
  }

  const { data: members, error: fetchError } = await query;

  if (fetchError) {
    console.error('[tenant-management/list-members] erro ao buscar membros:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar membros', 500, {
      detail: fetchError.message,
    });
  }

  console.log('[tenant-management/list-members] membros retornados', {
    count: members?.length ?? 0,
  });

  return success(members ?? [], 200, req);
}
