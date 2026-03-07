import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = ['ceo', 'admin'];

export async function handleTemplatesDeactivate(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[preproduction-templates/deactivate] desativando template', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para desativar templates', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Verificar existencia — apenas templates ativos podem ser desativados
  const { data: current, error: fetchError } = await client
    .from('preproduction_checklist_templates')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .eq('is_active', true)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Template nao encontrado', 404);
  }

  const { error: deactivateError } = await client
    .from('preproduction_checklist_templates')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deactivateError) {
    console.error('[preproduction-templates/deactivate] erro ao desativar:', deactivateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao desativar template', 500, {
      detail: deactivateError.message,
    });
  }

  console.log('[preproduction-templates/deactivate] template desativado', { id });
  return success({ id, deactivated: true }, 200, req);
}
