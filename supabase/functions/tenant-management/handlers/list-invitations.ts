import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem listar convites
const ADMIN_ROLES = ['admin', 'ceo'];

/**
 * GET /tenant-management/invitations
 * Lista convites pendentes (nao aceitos e nao expirados) do tenant.
 * Apenas admin/ceo podem listar.
 */
export async function handleListInvitations(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[tenant-management/list-invitations] listando convites', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas administradores podem listar convites', 403);
  }

  const url = new URL(req.url);
  // Parametro opcional: incluir_expirados=true para listar todos
  const incluirExpirados = url.searchParams.get('incluir_expirados') === 'true';

  const client = getSupabaseClient(auth.token);

  let query = client
    .from('tenant_invitations')
    .select(
      `
      id,
      email,
      phone,
      role,
      token,
      invited_by,
      accepted_at,
      accepted_by,
      expires_at,
      created_at,
      inviter:profiles!tenant_invitations_invited_by_fkey(id, full_name, email),
      acceptor:profiles!tenant_invitations_accepted_by_fkey(id, full_name, email)
    `,
    )
    .eq('tenant_id', auth.tenantId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (!incluirExpirados) {
    query = query.gt('expires_at', new Date().toISOString());
  }

  const { data: invitations, error: fetchError } = await query;

  if (fetchError) {
    console.error(
      '[tenant-management/list-invitations] erro ao buscar convites:',
      fetchError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar convites', 500, {
      detail: fetchError.message,
    });
  }

  console.log('[tenant-management/list-invitations] convites retornados', {
    count: invitations?.length ?? 0,
  });

  return success(invitations ?? [], 200, req);
}
