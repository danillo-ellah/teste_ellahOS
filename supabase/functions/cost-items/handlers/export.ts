import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { corsHeaders } from '../../_shared/cors.ts';

// Roles autorizados para exportar dados
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Labels das condicoes de pagamento
const PAYMENT_CONDITION_LABELS: Record<string, string> = {
  a_vista: 'A vista',
  cnf_30: 'CNF 30',
  cnf_40: 'CNF 40',
  cnf_45: 'CNF 45',
  cnf_60: 'CNF 60',
  cnf_90: 'CNF 90',
  snf_30: 'SNF 30',
};

// Labels dos status de item
const ITEM_STATUS_LABELS: Record<string, string> = {
  orcado: 'Orcado',
  aguardando_nf: 'Aguardando NF',
  nf_pedida: 'NF Pedida',
  nf_recebida: 'NF Recebida',
  nf_aprovada: 'NF Aprovada',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

// Labels dos status de NF
const NF_STATUS_LABELS: Record<string, string> = {
  nao_aplicavel: 'N/A',
  pendente: 'Pendente',
  pedido: 'Pedido',
  recebido: 'Recebido',
  rejeitado: 'Rejeitado',
  aprovado: 'Aprovado',
};

// Labels dos status de pagamento
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

// Sanitiza um valor para CSV (envolve em aspas se necessario, escapa aspas duplas)
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Se contiver virgula, aspas ou quebra de linha, envolver em aspas
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Formata numero para moeda brasileira
function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return '';
  const num = Number(value);
  if (isNaN(num)) return '';
  return num.toFixed(2).replace('.', ',');
}

export async function handleExport(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[cost-items/export] exportando itens de custo para CSV', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para exportar dados financeiros',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar job para codigo e titulo
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, code, title')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar todos os itens de custo do job (sem paginacao — export total)
  const { data: items, error: itemsError } = await client
    .from('cost_items')
    .select('*')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('item_number', { ascending: true })
    .order('sub_item_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (itemsError) {
    console.error('[cost-items/export] erro ao buscar itens:', itemsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo para export', 500, {
      detail: itemsError.message,
    });
  }

  // Definir cabecalhos do CSV
  const headers = [
    'Item',
    'Sub-Item',
    'Descricao',
    'Fornecedor',
    'Valor Unit.',
    'Qtd',
    'Total',
    'HE Horas',
    'HE Taxa',
    'HE Valor',
    'Total+HE',
    'Condicao Pgto',
    'Vencimento',
    'Status',
    'Status NF',
    'Status Pgto',
    'Valor Pago',
    'Data Pgto',
  ];

  // Construir linhas do CSV
  const rows: string[] = [headers.map(csvCell).join(',')];

  for (const item of items ?? []) {
    const row = [
      csvCell(item.item_number),
      csvCell(item.sub_item_number),
      csvCell(item.service_description),
      csvCell(item.vendor_name_snapshot),
      csvCell(formatCurrency(item.unit_value)),
      csvCell(item.quantity),
      csvCell(formatCurrency(item.total_value)),
      csvCell(item.overtime_hours),
      csvCell(formatCurrency(item.overtime_rate)),
      csvCell(formatCurrency(item.overtime_value)),
      csvCell(formatCurrency(item.total_with_overtime)),
      csvCell(item.payment_condition ? (PAYMENT_CONDITION_LABELS[item.payment_condition] ?? item.payment_condition) : ''),
      csvCell(item.payment_due_date),
      csvCell(item.item_status ? (ITEM_STATUS_LABELS[item.item_status] ?? item.item_status) : ''),
      csvCell(item.nf_request_status ? (NF_STATUS_LABELS[item.nf_request_status] ?? item.nf_request_status) : ''),
      csvCell(item.payment_status ? (PAYMENT_STATUS_LABELS[item.payment_status] ?? item.payment_status) : ''),
      csvCell(formatCurrency(item.actual_paid_value)),
      csvCell(item.payment_date),
    ];
    rows.push(row.join(','));
  }

  const csvContent = rows.join('\r\n');

  // Formatar data para nome do arquivo
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const jobCode = (job.code ?? jobId).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `custos_${jobCode}_${dateStr}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
