import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success, created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem solicitar aprovacao
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

const RequestSchema = z.object({
  cost_item_id: z.string().uuid(),
});

/**
 * POST /payment-approvals/request
 *
 * Solicita aprovacao hierarquica para pagamento de um cost item.
 * Busca a regra aplicavel ao valor, cria registro em payment_approvals
 * e atualiza cost_items.payment_approval_status = 'pending'.
 */
export async function handleRequest(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[payment-approvals/request] iniciando solicitacao de aprovacao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para solicitar aprovacao de pagamento',
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = RequestSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { cost_item_id } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar cost item para obter o valor e verificar se pertence ao tenant
  const { data: costItem, error: itemError } = await client
    .from('cost_items')
    .select('id, tenant_id, total_with_overtime, payment_approval_status')
    .eq('id', cost_item_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (itemError) {
    console.error('[payment-approvals/request] erro ao buscar cost item:', itemError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar item de custo', 500, {
      detail: itemError.message,
    });
  }

  if (!costItem) {
    throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
  }

  const amount = Number(costItem.total_with_overtime ?? 0);

  if (amount <= 0) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Item de custo sem valor definido nao pode ser enviado para aprovacao',
      422,
    );
  }

  // Verificar se ja existe aprovacao pendente para este cost item
  const { data: existing, error: existingError } = await client
    .from('payment_approvals')
    .select('id, status')
    .eq('cost_item_id', cost_item_id)
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'pending')
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    console.error('[payment-approvals/request] erro ao verificar aprovacao existente:', existingError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar aprovacoes existentes', 500, {
      detail: existingError.message,
    });
  }

  if (existing) {
    throw new AppError(
      'CONFLICT',
      'Ja existe uma solicitacao de aprovacao pendente para este item',
      409,
      { approval_id: existing.id },
    );
  }

  // Buscar regras ativas do tenant
  const { data: rules, error: rulesError } = await client
    .from('payment_approval_rules')
    .select('id, min_amount, max_amount, required_role, description')
    .eq('tenant_id', auth.tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('min_amount', { ascending: true });

  if (rulesError) {
    console.error('[payment-approvals/request] erro ao buscar regras:', rulesError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar regras de aprovacao', 500, {
      detail: rulesError.message,
    });
  }

  // Encontrar regra aplicavel
  const matchedRule = (rules ?? []).find((rule) => {
    const meetsMin = amount >= Number(rule.min_amount);
    const meetsMax = rule.max_amount === null || amount < Number(rule.max_amount);
    return meetsMin && meetsMax;
  });

  // Se nenhuma regra cobre o valor, retornar sem criar aprovacao
  if (!matchedRule) {
    console.log('[payment-approvals/request] nenhuma regra aplicavel, nao requer aprovacao', {
      cost_item_id,
      amount,
    });
    return success({ message: 'Nao requer aprovacao', requires_approval: false }, 200, req);
  }

  // Criar registro de aprovacao
  const { data: approval, error: insertError } = await client
    .from('payment_approvals')
    .insert({
      tenant_id: auth.tenantId,
      cost_item_id,
      rule_id: matchedRule.id,
      requested_by: auth.userId,
      requested_at: new Date().toISOString(),
      status: 'pending',
      amount,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[payment-approvals/request] erro ao criar aprovacao:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar solicitacao de aprovacao', 500, {
      detail: insertError.message,
    });
  }

  // Atualizar payment_approval_status do cost item
  const { error: updateError } = await client
    .from('cost_items')
    .update({ payment_approval_status: 'pending' })
    .eq('id', cost_item_id)
    .eq('tenant_id', auth.tenantId);

  if (updateError) {
    console.error('[payment-approvals/request] erro ao atualizar cost item:', updateError.message);
    // Nao lancar erro — aprovacao foi criada, o status pode ser corrigido depois
  }

  // Criar notificacao para o role requerido
  try {
    await client.from('notifications').insert({
      tenant_id: auth.tenantId,
      user_id: null, // notificacao para role, nao usuario especifico
      type: 'payment_approval_requested',
      title: 'Nova aprovacao de pagamento pendente',
      message: `Um item de custo de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aguarda aprovacao por ${matchedRule.required_role}.`,
      data: {
        approval_id: approval.id,
        cost_item_id,
        amount,
        required_role: matchedRule.required_role,
        rule_id: matchedRule.id,
      },
      target_role: matchedRule.required_role,
    });
  } catch (notifErr) {
    // Notificacao e melhor esforco — nao bloquear o fluxo
    console.warn('[payment-approvals/request] falha ao criar notificacao:', notifErr);
  }

  console.log('[payment-approvals/request] aprovacao criada com sucesso', {
    approvalId: approval.id,
    costItemId: cost_item_id,
    requiredRole: matchedRule.required_role,
    amount,
  });

  return created(
    {
      approval,
      requires_approval: true,
      required_role: matchedRule.required_role,
    },
    req,
  );
}
