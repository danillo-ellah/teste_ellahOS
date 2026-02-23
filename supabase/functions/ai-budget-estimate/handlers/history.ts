// GET /ai-budget-estimate/history?job_id=X
// Lista estimativas anteriores de um job, ordenadas por data (mais recente primeiro)

import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

export async function handleHistory(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  console.log('[ai-budget-estimate/history] tenant:', auth.tenantId, 'job:', jobId);

  const supabase = getSupabaseClient(auth.token);

  // RLS garante filtro por tenant_id automaticamente
  const { data, error } = await supabase
    .from('ai_budget_estimates')
    .select(
      'id, job_id, requested_by, suggested_total, breakdown, confidence, reasoning, similar_jobs, warnings, model_used, input_tokens, output_tokens, duration_ms, was_applied, created_at',
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[ai-budget-estimate/history] erro:', error.message);
    throw new AppError('INTERNAL_ERROR', error.message, 500);
  }

  // Formatar resposta
  const estimates = (data ?? []).map((e) => ({
    estimate_id: e.id,
    job_id: e.job_id,
    requested_by: e.requested_by,
    suggested_budget: {
      total: e.suggested_total,
      breakdown: e.breakdown,
      confidence: e.confidence,
    },
    similar_jobs: e.similar_jobs,
    reasoning: e.reasoning,
    warnings: e.warnings,
    model_used: e.model_used,
    tokens_used: {
      input: e.input_tokens,
      output: e.output_tokens,
    },
    was_applied: e.was_applied,
    created_at: e.created_at,
  }));

  return success(estimates);
}
