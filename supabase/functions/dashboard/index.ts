import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { getKpis } from './handlers/kpis.ts';
import { getPipeline } from './handlers/pipeline.ts';
import { getAlerts } from './handlers/alerts.ts';
import { getActivity } from './handlers/activity.ts';
import { getRevenueChart } from './handlers/revenue-chart.ts';

// Roteamento:
// GET /dashboard/kpis              -> KPIs agregados do tenant
// GET /dashboard/pipeline          -> Contagem de jobs por status
// GET /dashboard/alerts?limit=20   -> Alertas urgentes (margin, overdue, health, expiring)
// GET /dashboard/activity?hours=48&limit=30 -> Atividades recentes (job_history)
// GET /dashboard/revenue?months=12 -> Faturamento por mes para grafico

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Todos os endpoints do dashboard sao autenticados
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex(s => s === 'dashboard');

    // segment1: kpis | pipeline | alerts | activity | revenue
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    const method = req.method;

    // Apenas GET e permitido nesta Edge Function
    if (method !== 'GET') {
      return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
    }

    if (segment1 === 'kpis') {
      return await getKpis(req, auth);
    }

    if (segment1 === 'pipeline') {
      return await getPipeline(req, auth);
    }

    if (segment1 === 'alerts') {
      return await getAlerts(req, auth);
    }

    if (segment1 === 'activity') {
      return await getActivity(req, auth);
    }

    if (segment1 === 'revenue') {
      return await getRevenueChart(req, auth);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em dashboard:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
