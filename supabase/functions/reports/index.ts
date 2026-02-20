import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { getFinancialReport } from './handlers/financial.ts';
import { getPerformanceReport } from './handlers/performance.ts';
import { getTeamReport } from './handlers/team.ts';
import { exportCsv } from './handlers/export-csv.ts';

// Roteamento:
// GET  /reports/financial?start_date=X&end_date=Y               -> relatorio financeiro mensal
// GET  /reports/performance?group_by=director&start_date=X&end_date=Y -> performance por agrupamento
// GET  /reports/team?start_date=X&end_date=Y                    -> utilizacao de equipe
// POST /reports/export                                           -> export CSV server-side

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Todos os endpoints de reports sao autenticados
    const auth = await getAuthContext(req);

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'reports');

    // segment1 = subrecurso: 'financial' | 'performance' | 'team' | 'export'
    const segment1 = pathSegments[fnIndex + 1] ?? null;
    const method = req.method;

    if (method === 'GET' && segment1 === 'financial') {
      return await getFinancialReport(req, auth);
    }

    if (method === 'GET' && segment1 === 'performance') {
      return await getPerformanceReport(req, auth);
    }

    if (method === 'GET' && segment1 === 'team') {
      return await getTeamReport(req, auth);
    }

    if (method === 'POST' && segment1 === 'export') {
      return await exportCsv(req, auth);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('[reports] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
