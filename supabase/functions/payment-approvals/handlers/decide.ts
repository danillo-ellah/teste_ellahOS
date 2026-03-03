import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Hierarquia de roles: index maior = role mais alto
const ROLE_HIERARCHY: Record<string, number> = {
  freelancer: 0,
  diretor: 1,
  produtor: 1,
  financeiro: 2,
  admin: 3,
  cfo: 4,
  ceo: 5,
};

const DecideSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

/**
 * POST /payment-approvals/:id/decide
 *
 * Aprova ou rejeita uma solicitacao de aprovacao de pagamento.
 * Valida que o usuario tem role >= required_role da regra.
 * Atualiza approval + cost_items.payment_approval_status.
 */
export async function handleDecide(
  req: Request,
  auth: AuthContext,
  approvalId: string,
): Promise<Response> {
  console.log('[payment-approvals/decide] iniciando decisao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    approvalId,
    role: auth.role,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = DecideSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { decision, notes } = parseResult.data;

  const client = getSupabaseClient(auth.token);

  // Buscar aprovacao com join na regra para obter required_role
  const { data: approval, error: approvalError } = await client
    .from('payment_approvals')
    .select('id, status, cost_item_id, requested_by, amount, rule_id, payment_approval_rules(required_role)')
    .eq('id', approvalId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (approvalError) {
    console.error('[payment-approvals/decide] erro ao buscar aprovacao:', approvalError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar aprovacao', 500, {
      detail: approvalError.message,
    });
  }

  if (!approval) {
    throw new AppError('NOT_FOUND', 'Aprovacao nao encontrada', 404);
  }

  // So pode decidir aprovacoes pendentes
  if (approval.status !== 'pending') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Esta aprovacao ja foi ${approval.status === 'approved' ? 'aprovada' : 'rejeitada'}`,
      422,
      { current_status: approval.status },
    );
  }

  // Verificar hierarquia de roles
  const rule = approval.payment_approval_rules as { required_role: string } | null;
  if (rule) {
    const requiredLevel = ROLE_HIERARCHY[rule.required_role] ?? 99;
    const userLevel = ROLE_HIERARCHY[auth.role] ?? 0;

    if (userLevel < requiredLevel) {
      throw new AppError(
        'FORBIDDEN',
        `Permissao insuficiente. Necessario role '${rule.required_role}' ou superior`,
        403,
        { required_role: rule.required_role, user_role: auth.role },
      );
    }
  } else {
    // Se regra foi deletada, apenas admin/ceo podem decidir
    const fallbackAllowed = ['admin', 'ceo'];
    if (!fallbackAllowed.includes(auth.role)) {
      throw new AppError(
        'FORBIDDEN',
        'Permissao insuficiente para decidir esta aprovacao',
        403,
      );
    }
  }

  const now = new Date().toISOString();

  // Atualizar a aprovacao
  const { data: updated, error: updateError } = await client
    .from('payment_approvals')
    .update({
      status: decision,
      decided_by: auth.userId,
      decided_at: now,
      decision_notes: notes ?? null,
    })
    .eq('id', approvalId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[payment-approvals/decide] erro ao atualizar aprovacao:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar decisao', 500, {
      detail: updateError.message,
    });
  }

  // Mapear decision para payment_approval_status do cost item
  const newApprovalStatus = decision === 'approved' ? 'approved' : 'rejected';

  const { error: costItemUpdateError } = await client
    .from('cost_items')
    .update({ payment_approval_status: newApprovalStatus })
    .eq('id', approval.cost_item_id)
    .eq('tenant_id', auth.tenantId);

  if (costItemUpdateError) {
    console.error('[payment-approvals/decide] erro ao atualizar cost item:', costItemUpdateError.message);
    // Nao bloquear — o approval foi registrado com sucesso
  }

  // Criar notificacao para quem solicitou
  try {
    const decisionLabel = decision === 'approved' ? 'aprovado' : 'rejeitado';
    await client.from('notifications').insert({
      tenant_id: auth.tenantId,
      user_id: approval.requested_by,
      type: 'payment_approval_decided',
      title: `Pagamento ${decisionLabel}`,
      message: `Sua solicitacao de pagamento de R$ ${Number(approval.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi ${decisionLabel}.${notes ? ` Motivo: ${notes}` : ''}`,
      data: {
        approval_id: approvalId,
        cost_item_id: approval.cost_item_id,
        decision,
        decided_by: auth.userId,
        notes: notes ?? null,
      },
    });
  } catch (notifErr) {
    console.warn('[payment-approvals/decide] falha ao criar notificacao:', notifErr);
  }

  console.log('[payment-approvals/decide] decisao registrada com sucesso', {
    approvalId,
    decision,
    decidedBy: auth.userId,
  });

  return success(updated, 200, req);
}
