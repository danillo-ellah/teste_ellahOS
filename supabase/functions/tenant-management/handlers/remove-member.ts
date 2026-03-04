import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';

// Roles que podem remover membros
const ADMIN_ROLES = ['admin', 'ceo'];

/**
 * DELETE /tenant-management/members/:id
 * Remove um membro do tenant desassociando o tenant_id do profile.
 * Usa service client pois o admin nao pode editar profiles de outros usuarios via RLS do usuario dono.
 * Apenas admin/ceo podem remover membros.
 * Nao e permitido remover a si mesmo.
 */
export async function handleRemoveMember(
  req: Request,
  auth: AuthContext,
  memberId: string,
): Promise<Response> {
  console.log('[tenant-management/remove-member] removendo membro', {
    memberId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas administradores podem remover membros', 403);
  }

  if (memberId === auth.userId) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Nao e permitido remover a si mesmo', 422);
  }

  const service = getServiceClient();

  // Verificar se o membro existe e pertence ao tenant
  const { data: member, error: fetchError } = await service
    .from('profiles')
    .select('id, full_name, email, role, tenant_id')
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (fetchError) {
    console.error(
      '[tenant-management/remove-member] erro ao buscar membro:',
      fetchError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar membro', 500, {
      detail: fetchError.message,
    });
  }

  if (!member) {
    throw new AppError('NOT_FOUND', 'Membro nao encontrado no tenant', 404);
  }

  // Desassociar o tenant do profile (nao deleta o usuario, apenas remove do tenant)
  // Seta tenant_id para null para desassociar
  const { error: updateError } = await service
    .from('profiles')
    .update({ tenant_id: null })
    .eq('id', memberId)
    .eq('tenant_id', auth.tenantId);

  if (updateError) {
    console.error(
      '[tenant-management/remove-member] erro ao remover membro:',
      updateError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao remover membro', 500, {
      detail: updateError.message,
    });
  }

  console.log('[tenant-management/remove-member] membro removido', {
    memberId,
    tenantId: auth.tenantId,
  });

  return success({ id: memberId, removed: true }, 200, req);
}
