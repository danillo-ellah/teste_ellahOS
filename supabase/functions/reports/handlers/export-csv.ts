import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { error } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { corsHeaders } from '../_shared/cors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// Tipos de relatorio suportados no export
type ReportType = 'financial_monthly' | 'performance' | 'team_utilization';

// Definicao de uma coluna CSV: chave no objeto de dados + cabecalho legivel
interface CsvColumn {
  key: string;
  header: string;
  // Formatador opcional para o valor da celula
  format?: (value: unknown) => string;
}

// Definicoes de colunas por tipo de relatorio
// Financeiro: exporta a lista by_category (mais util para analise detalhada)
const FINANCIAL_COLUMNS: CsvColumn[] = [
  { key: 'month', header: 'Mes' },
  { key: 'revenue', header: 'Receita (R$)', format: formatCurrency },
  { key: 'expenses', header: 'Despesas (R$)', format: formatCurrency },
  { key: 'balance', header: 'Saldo (R$)', format: formatCurrency },
  { key: 'job_count', header: 'Jobs' },
];

// Performance: exporta o array raiz (cada elemento e um grupo: diretor, tipo, cliente ou segmento)
const PERFORMANCE_COLUMNS: CsvColumn[] = [
  { key: 'group_label', header: 'Agrupamento' },
  { key: 'job_count', header: 'Qtd Jobs' },
  { key: 'total_revenue', header: 'Receita Total (R$)', format: formatCurrency },
  { key: 'avg_margin', header: 'Margem Media (%)' },
  { key: 'avg_health_score', header: 'Health Score Medio' },
  { key: 'completed_count', header: 'Jobs Finalizados' },
  { key: 'cancelled_count', header: 'Jobs Cancelados' },
];

// Equipe: exporta o array raiz (cada elemento e uma pessoa)
const TEAM_COLUMNS: CsvColumn[] = [
  { key: 'full_name', header: 'Nome' },
  { key: 'person_type', header: 'Tipo' },
  { key: 'job_count', header: 'Qtd Jobs' },
  { key: 'allocated_days', header: 'Dias Alocados' },
  { key: 'utilization_pct', header: 'Utilizacao (%)' },
  { key: 'conflict_count', header: 'Conflitos' },
];

// Mapeamento: tipo -> colunas e nome legivel para o arquivo
const REPORT_CONFIG: Record<ReportType, { columns: CsvColumn[]; label: string }> = {
  financial_monthly: { columns: FINANCIAL_COLUMNS, label: 'financeiro' },
  performance: { columns: PERFORMANCE_COLUMNS, label: 'performance' },
  team_utilization: { columns: TEAM_COLUMNS, label: 'equipe' },
};

// Mapeamento: tipo -> nome da RPC no PostgreSQL
const REPORT_RPC: Record<ReportType, string> = {
  financial_monthly: 'get_report_financial_monthly',
  performance: 'get_report_performance',
  team_utilization: 'get_report_team_utilization',
};

// Parametros extras por tipo (alem de p_tenant_id, p_start_date, p_end_date)
type RpcParams = Record<string, string | undefined>;

// Helpers de formatacao

function formatCurrency(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return '0,00';
  return num.toFixed(2).replace('.', ',');
}

// Escapa um valor para CSV RFC 4180:
// - Envolve em aspas se contem virgula, aspas ou quebra de linha
// - Dobra aspas duplas internas
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Converte um array de objetos em string CSV com BOM UTF-8
function generateCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  if (rows.length === 0) {
    // Retorna apenas o cabecalho se nao houver dados
    const header = columns.map(c => escapeCsvValue(c.header)).join(',');
    return '\uFEFF' + header + '\r\n';
  }

  const header = columns.map(c => escapeCsvValue(c.header)).join(',');

  const dataRows = rows.map(row => {
    return columns
      .map(col => {
        const rawValue = row[col.key];
        const formatted = col.format ? col.format(rawValue) : rawValue;
        return escapeCsvValue(formatted);
      })
      .join(',');
  });

  // BOM UTF-8 (\uFEFF) para que Excel abra corretamente com acentuacao
  return '\uFEFF' + [header, ...dataRows].join('\r\n') + '\r\n';
}

// Extrai o array de linhas exportavel de cada tipo de resultado de RPC
// Para financial_monthly, a RPC retorna { summary, by_month, by_category, projection }
// Exportamos by_month que e o mais util para analise granular
function extractRows(reportType: ReportType, rpcResult: unknown): Record<string, unknown>[] {
  if (!rpcResult || typeof rpcResult !== 'object') return [];

  if (reportType === 'financial_monthly') {
    const result = rpcResult as { by_month?: unknown[] };
    return (result.by_month ?? []) as Record<string, unknown>[];
  }

  // performance e team_utilization retornam array diretamente
  if (Array.isArray(rpcResult)) {
    return rpcResult as Record<string, unknown>[];
  }

  return [];
}

// POST /reports/export
// Body: { report_type, parameters: { start_date, end_date, group_by? } }
// Retorna: text/csv com Content-Disposition para download
export async function exportCsv(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  if (!body || typeof body !== 'object') {
    throw new AppError('VALIDATION_ERROR', 'Body invalido', 400);
  }

  const { report_type, parameters } = body as {
    report_type?: string;
    parameters?: Record<string, string | undefined>;
  };

  // Validar report_type
  const validTypes: ReportType[] = ['financial_monthly', 'performance', 'team_utilization'];
  if (!report_type || !validTypes.includes(report_type as ReportType)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `report_type invalido. Valores aceitos: ${validTypes.join(', ')}`,
      400,
    );
  }

  const resolvedType = report_type as ReportType;
  const params = parameters ?? {};

  // Defaults de data
  const defaultEnd = new Date().toISOString().slice(0, 10);
  const defaultStartDate = new Date();
  if (resolvedType === 'financial_monthly') {
    // Financeiro: inicio do ano corrente
    defaultStartDate.setMonth(0, 1);
  } else if (resolvedType === 'performance') {
    // Performance: ultimos 12 meses
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 12);
  } else {
    // Equipe: ultimos 3 meses
    defaultStartDate.setMonth(defaultStartDate.getMonth() - 3);
  }
  const defaultStart = defaultStartDate.toISOString().slice(0, 10);

  const resolvedStart = params.start_date ?? defaultStart;
  const resolvedEnd = params.end_date ?? defaultEnd;

  // Validar formato de data
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
  if (diffMonths > 24) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Periodo maximo para export e de 24 meses',
      400,
    );
  }

  // Montar parametros da RPC (p_tenant_id obrigatorio — RPCs sao SECURITY DEFINER)
  const rpcParams: RpcParams & { p_tenant_id: string; p_start_date: string; p_end_date: string } = {
    p_tenant_id: auth.tenantId,
    p_start_date: resolvedStart,
    p_end_date: resolvedEnd,
  };

  // group_by apenas para performance
  if (resolvedType === 'performance') {
    const groupBy = params.group_by ?? 'director';
    const validGroupBy = ['director', 'project_type', 'client', 'segment'];
    if (!validGroupBy.includes(groupBy)) {
      throw new AppError(
        'VALIDATION_ERROR',
        `group_by invalido. Valores aceitos: ${validGroupBy.join(', ')}`,
        400,
      );
    }
    (rpcParams as Record<string, string>).p_group_by = groupBy;
  }

  console.log(
    '[reports/export-csv] tenant:', auth.tenantId,
    'tipo:', resolvedType,
    'periodo:', resolvedStart, '->', resolvedEnd,
  );

  // Executar a RPC correspondente via client autenticado (RLS filtra pelo JWT)
  const supabase = getSupabaseClient(auth.token);
  const rpcName = REPORT_RPC[resolvedType];

  const { data: rpcResult, error: rpcError } = await supabase.rpc(rpcName, rpcParams);

  if (rpcError) {
    console.error('[reports/export-csv] erro na RPC:', rpcError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do relatorio', 500);
  }

  // Extrair linhas exportaveis do resultado da RPC
  const rows = extractRows(resolvedType, rpcResult);

  // Gerar CSV
  const config = REPORT_CONFIG[resolvedType];
  const csvContent = generateCsv(rows, config.columns);

  // Montar nome do arquivo: relatorio-{tipo}-{ano-mes-atual}.csv
  const fileDate = new Date().toISOString().slice(0, 7); // ex: 2026-02
  const filename = `relatorio-${config.label}-${fileDate}.csv`;

  console.log(
    '[reports/export-csv] CSV gerado:',
    rows.length, 'linhas,',
    csvContent.length, 'bytes,',
    'arquivo:', filename,
  );

  return new Response(csvContent, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
