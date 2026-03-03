import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success, created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// So admin/ceo podem criar e editar regras
const ADMIN_ROLES = ['admin', 'ceo'];

const VALID_ROLES = ['financeiro', 'admin', 'cfo', 'ceo'] as const;

const CreateRuleSchema = z.object({
  min_amount: z.number().min(0).default(0),
  max_amount: z.number().positive().optional().nullable(),
  required_role: z.enum(VALID_ROLES),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

const UpdateRuleSchema = z.object({
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().positive().optional().nullable(),
  required_role: z.enum(VALID_ROLES).optional(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

/**
 * GET /payment-approvals/rules — lista regras do tenant
 * POST /payment-approvals/rules — cria nova regra (admin/ceo)
 * PATCH /payment-approvals/rules/:id — atualiza regra (admin/ceo)
 */
export async function handleRules(
  req: Request,
  auth: AuthContext,
  ruleId: string | null,
): Promise<Response> {
  const method = req.method;
  const client = getSupabaseClient(auth.token);

  // ---- GET /payment-approvals/rules ----
  if (method === 'GET' && !ruleId) {
    console.log('[payment-approvals/rules] listando regras', {
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    const { data: rules, error: listError } = await client
      .from('payment_approval_rules')
      .select('id, min_amount, max_amount, required_role, description, is_active, created_at, updated_at')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .order('min_amount', { ascending: true });

    if (listError) {
      console.error('[payment-approvals/rules] erro ao listar regras:', listError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao listar regras de aprovacao', 500, {
        detail: listError.message,
      });
    }

    return success(rules ?? [], 200, req);
  }

  // ---- POST /payment-approvals/rules ----
  if (method === 'POST' && !ruleId) {
    console.log('[payment-approvals/rules] criando regra', {
      userId: auth.userId,
      tenantId: auth.tenantId,
      role: auth.role,
    });

    if (!ADMIN_ROLES.includes(auth.role)) {
      throw new AppError(
        'FORBIDDEN',
        'Apenas admin e ceo podem criar regras de aprovacao',
        403,
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
    }

    const parseResult = CreateRuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
        issues: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // Validar que max_amount > min_amount se fornecido
    if (data.max_amount !== null && data.max_amount !== undefined && data.max_amount <= data.min_amount) {
      throw new AppError(
        'VALIDATION_ERROR',
        'O valor maximo deve ser maior que o valor minimo',
        400,
      );
    }

    const { data: rule, error: insertError } = await client
      .from('payment_approval_rules')
      .insert({
        tenant_id: auth.tenantId,
        min_amount: data.min_amount,
        max_amount: data.max_amount ?? null,
        required_role: data.required_role,
        description: data.description ?? null,
        is_active: data.is_active,
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('[payment-approvals/rules] erro ao criar regra:', insertError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao criar regra de aprovacao', 500, {
        detail: insertError.message,
      });
    }

    console.log('[payment-approvals/rules] regra criada', { ruleId: rule.id });
    return created(rule, req);
  }

  // ---- PATCH /payment-approvals/rules/:id ----
  if (method === 'PATCH' && ruleId) {
    console.log('[payment-approvals/rules] atualizando regra', {
      userId: auth.userId,
      tenantId: auth.tenantId,
      ruleId,
      role: auth.role,
    });

    if (!ADMIN_ROLES.includes(auth.role)) {
      throw new AppError(
        'FORBIDDEN',
        'Apenas admin e ceo podem editar regras de aprovacao',
        403,
      );
    }

    // Verificar que a regra existe e pertence ao tenant
    const { data: existing, error: fetchError } = await client
      .from('payment_approval_rules')
      .select('id, min_amount, max_amount')
      .eq('id', ruleId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError) {
      console.error('[payment-approvals/rules] erro ao buscar regra:', fetchError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar regra', 500, {
        detail: fetchError.message,
      });
    }

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Regra nao encontrada', 404);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
    }

    const parseResult = UpdateRuleSchema.safeParse(body);
    if (!parseResult.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
        issues: parseResult.error.issues,
      });
    }

    const data = parseResult.data;

    // Validar consistencia min/max apos merge com valores existentes
    const effectiveMin = data.min_amount ?? Number(existing.min_amount);
    const effectiveMax = data.max_amount !== undefined
      ? data.max_amount
      : (existing.max_amount !== null ? Number(existing.max_amount) : null);

    if (effectiveMax !== null && effectiveMax <= effectiveMin) {
      throw new AppError(
        'VALIDATION_ERROR',
        'O valor maximo deve ser maior que o valor minimo',
        400,
      );
    }

    // Montar patch apenas com campos presentes no body
    const patch: Record<string, unknown> = {};
    if (data.min_amount !== undefined) patch.min_amount = data.min_amount;
    if ('max_amount' in data) patch.max_amount = data.max_amount ?? null;
    if (data.required_role !== undefined) patch.required_role = data.required_role;
    if ('description' in data) patch.description = data.description ?? null;
    if (data.is_active !== undefined) patch.is_active = data.is_active;

    if (Object.keys(patch).length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Nenhum campo para atualizar', 400);
    }

    const { data: updated, error: updateError } = await client
      .from('payment_approval_rules')
      .update(patch)
      .eq('id', ruleId)
      .eq('tenant_id', auth.tenantId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[payment-approvals/rules] erro ao atualizar regra:', updateError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar regra de aprovacao', 500, {
        detail: updateError.message,
      });
    }

    console.log('[payment-approvals/rules] regra atualizada', { ruleId });
    return success(updated, 200, req);
  }

  throw new AppError('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405);
}
