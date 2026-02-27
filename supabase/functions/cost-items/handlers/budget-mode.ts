import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para alterar modo de orcamento
const ALLOWED_ROLES = ['produtor_executivo', 'admin', 'ceo'];

// Schema de validacao
const BudgetModeSchema = z.object({
  budget_mode: z.enum(['bottom_up', 'top_down']),
});

export async function handleBudgetMode(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[cost-items/budget-mode] alterando modo de orcamento do job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para alterar modo de orcamento',
      403,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = BudgetModeSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { budget_mode } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar se o job existe e pertence ao tenant
  const { data: job, error: fetchError } = await client
    .from('jobs')
    .select('id, budget_mode')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Atualizar budget_mode no job
  const { data: updated, error: updateError } = await client
    .from('jobs')
    .update({ budget_mode })
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .select('id, budget_mode, updated_at')
    .single();

  if (updateError) {
    console.error('[cost-items/budget-mode] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar modo de orcamento', 500, {
      detail: updateError.message,
    });
  }

  console.log('[cost-items/budget-mode] modo de orcamento atualizado', {
    jobId,
    budget_mode,
    previous: job.budget_mode,
  });

  return success({
    job_id: jobId,
    budget_mode: updated.budget_mode,
    updated_at: updated.updated_at,
  });
}
