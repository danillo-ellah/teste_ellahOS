import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Apenas ceo, produtor_executivo e admin podem aprovar
const APPROVAL_ROLES = ['ceo', 'produtor_executivo', 'admin'];

export async function handleInternalApprovalApprove(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[attendance/internal-approval-approve] aprovando aprovacao interna', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!APPROVAL_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas ceo, produtor_executivo ou admin pode aprovar a aprovacao interna',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar o registro para validar pre-condicoes
  const { data: current, error: fetchError } = await client
    .from('job_internal_approvals')
    .select('id, status, scope_description, approved_budget, job_id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Aprovacao interna nao encontrada', 404);
  }

  if (current.status === 'aprovado') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Esta aprovacao interna ja foi aprovada',
      422,
      { current_status: current.status },
    );
  }

  // Validar pre-condicoes: scope_description e approved_budget obrigatorios
  if (!current.scope_description || !current.approved_budget) {
    const missing: string[] = [];
    if (!current.scope_description) missing.push('scope_description');
    if (!current.approved_budget) missing.push('approved_budget');
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Campos obrigatorios para aprovacao: ${missing.join(', ')}`,
      422,
      { missing_fields: missing },
    );
  }

  const { data: updated, error: updateError } = await client
    .from('job_internal_approvals')
    .update({
      status: 'aprovado',
      approved_by: auth.userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[attendance/internal-approval-approve] erro ao aprovar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao aprovar aprovacao interna', 500, {
      detail: updateError.message,
    });
  }

  console.log('[attendance/internal-approval-approve] aprovacao registrada', {
    id,
    job_id: current.job_id,
  });
  return success(updated, 200, req);
}
