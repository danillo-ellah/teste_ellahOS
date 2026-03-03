import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const CheckSchema = z.object({
  cost_item_id: z.string().uuid(),
  amount: z.number().positive(),
});

/**
 * POST /payment-approvals/check
 *
 * Verifica se um valor requer aprovacao hierarquica com base nas regras ativas do tenant.
 * Retorna a regra aplicavel e o papel minimo requerido.
 */
export async function handleCheck(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[payment-approvals/check] iniciando verificacao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CheckSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { amount } = parseResult.data;

  const client = getSupabaseClient(auth.token);

  // Buscar regras ativas do tenant ordenadas por min_amount asc
  const { data: rules, error: rulesError } = await client
    .from('payment_approval_rules')
    .select('id, min_amount, max_amount, required_role, description')
    .eq('tenant_id', auth.tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('min_amount', { ascending: true });

  if (rulesError) {
    console.error('[payment-approvals/check] erro ao buscar regras:', rulesError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar regras de aprovacao', 500, {
      detail: rulesError.message,
    });
  }

  // Encontrar regra que cobre o amount: min_amount <= amount AND (max_amount IS NULL OR amount < max_amount)
  const matchedRule = (rules ?? []).find((rule) => {
    const meetsMin = amount >= Number(rule.min_amount);
    const meetsMax = rule.max_amount === null || amount < Number(rule.max_amount);
    return meetsMin && meetsMax;
  });

  if (!matchedRule) {
    console.log('[payment-approvals/check] nenhuma regra aplicavel para o valor', { amount });
    return success({ requires_approval: false, rule: null, required_role: null }, 200, req);
  }

  console.log('[payment-approvals/check] regra encontrada', {
    ruleId: matchedRule.id,
    requiredRole: matchedRule.required_role,
    amount,
  });

  return success(
    {
      requires_approval: true,
      rule: matchedRule,
      required_role: matchedRule.required_role,
    },
    200,
    req,
  );
}
