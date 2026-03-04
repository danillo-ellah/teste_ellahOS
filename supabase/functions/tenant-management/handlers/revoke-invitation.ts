import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem revogar convites
const ADMIN_ROLES = ['admin', 'ceo'];

/**
 * DELETE /tenant-management/invitations/:id
 * Revoga (deleta) um convite pendente.
 * Apenas admin/ceo podem revogar.
 */
export async function handleRevokeInvitation(
  req: Request,
  auth: AuthContext,
  invitationId: string,
): Promise<Response> {
  console.log('[tenant-management/revoke-invitation] revogando convite', {
    invitationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas administradores podem revogar convites', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Verificar se o convite existe e pertence ao tenant
  const { data: invitation, error: fetchError } = await client
    .from('tenant_invitations')
    .select('id, accepted_at, expires_at')
    .eq('id', invitationId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (fetchError) {
    console.error(
      '[tenant-management/revoke-invitation] erro ao buscar convite:',
      fetchError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar convite', 500, {
      detail: fetchError.message,
    });
  }

  if (!invitation) {
    throw new AppError('NOT_FOUND', 'Convite nao encontrado', 404);
  }

  if (invitation.accepted_at) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nao e possivel revogar um convite ja aceito',
      422,
    );
  }

  const { error: deleteError } = await client
    .from('tenant_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error(
      '[tenant-management/revoke-invitation] erro ao deletar convite:',
      deleteError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao revogar convite', 500, {
      detail: deleteError.message,
    });
  }

  console.log('[tenant-management/revoke-invitation] convite revogado', { invitationId });

  return success({ id: invitationId, revoked: true }, 200, req);
}
