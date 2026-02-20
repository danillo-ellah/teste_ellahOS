import { getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

const MAX_PERIOD_MONTHS = 24;

// GET /reports/team?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
// Chama a RPC get_report_team_utilization com o tenant_id do JWT
export async function getTeamReport(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');

  // Defaults: ultimos 3 meses
  const defaultEnd = new Date().toISOString().slice(0, 10);
  const defaultStartDate = new Date();
  defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
  const defaultStart = defaultStartDate.toISOString().slice(0, 10);

  const resolvedStart = startDate ?? defaultStart;
  const resolvedEnd = endDate ?? defaultEnd;

  // Validar formato de data (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(resolvedStart) || !dateRegex.test(resolvedEnd)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Datas devem estar no formato YYYY-MM-DD',
      400,
    );
  }

  const start = new Date(resolvedStart);
  const end = new Date(resolvedEnd);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('VALIDATION_ERROR', 'Datas invalidas', 400);
  }

  if (start > end) {
    throw new AppError(
      'VALIDATION_ERROR',
      'start_date deve ser anterior a end_date',
      400,
    );
  }

  const diffMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (diffMonths > MAX_PERIOD_MONTHS) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Periodo maximo permitido e de ${MAX_PERIOD_MONTHS} meses`,
      400,
    );
  }

  console.log(
    '[reports/team] tenant:', auth.tenantId,
    'periodo:', resolvedStart, '->', resolvedEnd,
  );

  // Usar service client: a RPC e SECURITY DEFINER e recebe tenant_id como parametro
  const serviceClient = getServiceClient();

  const { data, error: rpcError } = await serviceClient.rpc(
    'get_report_team_utilization',
    {
      p_tenant_id: auth.tenantId,
      p_start_date: resolvedStart,
      p_end_date: resolvedEnd,
    },
  );

  if (rpcError) {
    console.error('[reports/team] erro na RPC:', rpcError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao gerar relatorio de equipe', 500);
  }

  return success({
    report_type: 'team_utilization',
    parameters: {
      start_date: resolvedStart,
      end_date: resolvedEnd,
    },
    result: data ?? [],
  });
}
