import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { canViewFinancials } from '../../_shared/financial-mask.ts';

export async function handleSummary(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[receivables/summary] buscando resumo de recebimentos do job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Guard: apenas roles com acesso financeiro podem ver o resumo
  if (!canViewFinancials(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para visualizar resumo de recebimentos', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Chamar a RPC get_receivables_summary
  const { data: summaryData, error: rpcError } = await client
    .rpc('get_receivables_summary', {
      p_tenant_id: auth.tenantId,
      p_job_id: jobId,
    });

  if (rpcError) {
    console.error('[receivables/summary] erro ao chamar RPC:', rpcError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar resumo de recebimentos', 500, {
      detail: rpcError.message,
    });
  }

  // RPC retorna array (RETURNS TABLE), pegar primeiro elemento
  const summary = Array.isArray(summaryData) ? summaryData[0] ?? null : summaryData;
  return success(summary);
}
