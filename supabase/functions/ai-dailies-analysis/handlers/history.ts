// GET /ai-dailies-analysis/history?job_id=X
// Lista analises de dailies anteriores de um job, lendo de ai_usage_logs
// onde feature='dailies_analysis' e metadata->>'job_id' = job_id informado.
// Usa serviceClient pois RLS de ai_usage_logs restringe acesso a admin/ceo.

import { getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// Estrutura de um registro retornado pelo historico
interface DailiesHistoryEntry {
  id: string;
  job_id: string;
  requested_by: string;
  model_used: string;
  tokens_used: {
    input: number;
    output: number;
  };
  duration_ms: number;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function handleHistory(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  // Parametro job_id e obrigatorio para consulta
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  console.log(
    `[ai-dailies-analysis/history] tenant=${auth.tenantId} job=${jobId} user=${auth.userId}`,
  );

  // serviceClient faz bypass do RLS — filtro manual por tenant_id e obrigatorio
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select(
      'id, user_id, model_used, input_tokens, output_tokens, duration_ms, status, metadata, created_at',
    )
    .eq('tenant_id', auth.tenantId)
    .eq('feature', 'dailies_analysis')
    // Filtra pelo job_id armazenado dentro do campo JSONB metadata
    .eq('metadata->>job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error(
      `[ai-dailies-analysis/history] erro ao buscar logs tenant=${auth.tenantId} job=${jobId}:`,
      error.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar historico de analises', 500);
  }

  // Mapear colunas do banco para o contrato de resposta da API
  const entries: DailiesHistoryEntry[] = (data ?? []).map((row) => ({
    id: row.id,
    job_id: (row.metadata as Record<string, unknown>)?.job_id as string ?? jobId,
    requested_by: row.user_id,
    model_used: row.model_used,
    tokens_used: {
      input: row.input_tokens ?? 0,
      output: row.output_tokens ?? 0,
    },
    duration_ms: row.duration_ms ?? 0,
    status: row.status,
    metadata: row.metadata as Record<string, unknown>,
    created_at: row.created_at,
  }));

  console.log(
    `[ai-dailies-analysis/history] retornando ${entries.length} registro(s) job=${jobId}`,
  );

  return success(entries);
}
