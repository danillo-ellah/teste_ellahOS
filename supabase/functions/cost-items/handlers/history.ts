import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { paginated } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { canViewFinancials } from '../../_shared/financial-mask.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';

// Labels amigaveis para campos de cost_items
const FIELD_LABELS: Record<string, string> = {
  service_description: 'Descricao',
  unit_value: 'Valor Unitario',
  quantity: 'Quantidade',
  total_value: 'Valor Total',
  overtime_hours: 'Horas Extra',
  overtime_rate: 'Taxa HE',
  overtime_value: 'Valor HE',
  total_with_overtime: 'Total + HE',
  vendor_id: 'Fornecedor',
  vendor_name_snapshot: 'Nome do Fornecedor',
  item_status: 'Status do Item',
  payment_status: 'Status de Pagamento',
  payment_date: 'Data de Pagamento',
  payment_due_date: 'Data de Vencimento',
  payment_condition: 'Condicao de Pagamento',
  actual_paid_value: 'Valor Pago',
  nf_request_status: 'Status NF',
  nf_number: 'Numero NF',
  nf_drive_url: 'Link NF',
  nf_validation_ok: 'NF Validada',
  payment_proof_url: 'Comprovante Pagamento',
  notes: 'Observacoes',
  item_number: 'Numero do Item',
  sub_item_number: 'Sub-Item',
  is_category_header: 'Cabecalho de Categoria',
  sort_order: 'Ordem',
};

// Campos a ignorar no diff — metadados internos sem valor auditavel para o usuario
const IGNORED_FIELDS = new Set([
  'updated_at',
  'created_at',
  'tenant_id',
  'id',
  'job_id',
  'deleted_at',
  'health_score',
  'suggested_status',
]);

// Colunas permitidas para ordenacao (apenas created_at faz sentido para audit log)
const ALLOWED_SORT_COLUMNS = ['created_at'];

// Tipo interno de uma entrada do audit_log
interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
}

// Tipo de uma entrada de alteracao de campo
interface FieldChange {
  field: string;
  label: string;
  old_value: unknown;
  new_value: unknown;
}

// Tipo de resposta enriquecida por entrada do historico
interface HistoryEntry {
  id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  user_id: string | null;
  user_name: string;
  created_at: string;
  item_label: string;
  record_id: string;
  changes: FieldChange[];
}

// Monta o label do item de custo a partir dos dados do audit_log
// Preferencia: new_data (INSERT/UPDATE), fallback old_data (DELETE)
function buildItemLabel(row: AuditLogRow): string {
  const data = (row.new_data ?? row.old_data) as Record<string, unknown> | null;
  if (!data) return row.record_id;

  const itemNumber = data.item_number != null ? String(data.item_number).padStart(2, '0') : null;
  const subItemNumber = data.sub_item_number != null
    ? String(data.sub_item_number).padStart(2, '0')
    : null;
  const description = typeof data.service_description === 'string'
    ? data.service_description
    : null;

  const numberPart = itemNumber
    ? subItemNumber ? `${itemNumber}.${subItemNumber}` : itemNumber
    : null;

  if (numberPart && description) return `${numberPart} - ${description}`;
  if (description) return description;
  if (numberPart) return `Item ${numberPart}`;
  return row.record_id;
}

// Calcula o diff entre old_data e new_data, retornando apenas os campos alterados
// com labels amigaveis. Campos em IGNORED_FIELDS sao omitidos.
function buildChanges(row: AuditLogRow): FieldChange[] {
  const changes: FieldChange[] = [];

  if (row.action === 'INSERT') {
    // Para INSERT mostra todos os campos nao-nulos e nao-ignorados de new_data
    const data = row.new_data ?? {};
    for (const [field, newVal] of Object.entries(data)) {
      if (IGNORED_FIELDS.has(field)) continue;
      if (newVal === null || newVal === undefined) continue;
      changes.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        old_value: null,
        new_value: newVal,
      });
    }
    return changes;
  }

  if (row.action === 'DELETE') {
    // Para DELETE mostra todos os campos nao-nulos e nao-ignorados de old_data
    const data = row.old_data ?? {};
    for (const [field, oldVal] of Object.entries(data)) {
      if (IGNORED_FIELDS.has(field)) continue;
      if (oldVal === null || oldVal === undefined) continue;
      changes.push({
        field,
        label: FIELD_LABELS[field] ?? field,
        old_value: oldVal,
        new_value: null,
      });
    }
    return changes;
  }

  // UPDATE — prioriza changed_fields se disponivel para limitar o escopo do diff
  const fieldsToCheck = row.changed_fields?.length
    ? row.changed_fields.filter((f) => !IGNORED_FIELDS.has(f))
    : Object.keys({ ...(row.old_data ?? {}), ...(row.new_data ?? {}) }).filter(
        (f) => !IGNORED_FIELDS.has(f),
      );

  for (const field of fieldsToCheck) {
    const oldVal = row.old_data?.[field] ?? null;
    const newVal = row.new_data?.[field] ?? null;

    // Comparacao por valor serializado para tratar null vs undefined
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);
    if (oldStr === newStr) continue;

    changes.push({
      field,
      label: FIELD_LABELS[field] ?? field,
      old_value: oldVal,
      new_value: newVal,
    });
  }

  return changes;
}

export async function handleHistory(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  // Apenas roles com acesso financeiro podem ver historico de itens de custo
  if (!canViewFinancials(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para visualizar historico financeiro', 403);
  }

  console.log('[cost-items/history] consultando historico do job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const pagination = parsePagination(url, ALLOWED_SORT_COLUMNS);

  // Filtro opcional por action via query param
  const filterAction = url.searchParams.get('action');
  if (filterAction && !['INSERT', 'UPDATE', 'DELETE'].includes(filterAction)) {
    throw new AppError('VALIDATION_ERROR', 'action deve ser INSERT, UPDATE ou DELETE', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar todos os IDs de cost_items do job (incluindo deletados para capturar exclusoes)
  const { data: allIdsRows, error: idsError } = await client
    .from('cost_items')
    .select('id')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (idsError) {
    console.error('[cost-items/history] erro ao buscar IDs dos itens:', idsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo', 500);
  }

  const ids = (allIdsRows ?? []).map((r: { id: string }) => r.id);

  // Se o job nao tem cost_items, retornar lista vazia com meta zerada
  if (ids.length === 0) {
    const meta = buildMeta(0, pagination);
    return paginated([], meta, req);
  }

  // Montar query base para o audit_log filtrado pelos IDs coletados
  let countQuery = client
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)
    .eq('table_name', 'cost_items')
    .in('record_id', ids);

  let dataQuery = client
    .from('audit_log')
    .select('id, table_name, record_id, action, user_id, old_data, new_data, changed_fields, created_at')
    .eq('tenant_id', auth.tenantId)
    .eq('table_name', 'cost_items')
    .in('record_id', ids)
    .order('created_at', { ascending: false })
    .range(getOffset(pagination), getOffset(pagination) + pagination.perPage - 1);

  // Aplicar filtro de action em ambas as queries
  if (filterAction) {
    countQuery = countQuery.eq('action', filterAction);
    dataQuery = dataQuery.eq('action', filterAction);
  }

  // Executar count e dados em paralelo
  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

  if (countResult.error) {
    console.error('[cost-items/history] erro no count:', countResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao consultar historico', 500);
  }
  if (dataResult.error) {
    console.error('[cost-items/history] erro na query de dados:', dataResult.error.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao consultar historico', 500);
  }

  const total = countResult.count ?? 0;
  const rows = (dataResult.data ?? []) as AuditLogRow[];

  // Batch fetch de profiles para enriquecer com nome do usuario
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];

  let userMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profiles) {
      userMap = Object.fromEntries(
        profiles.map((p: { id: string; full_name: string }) => [p.id, p.full_name]),
      );
    }
  }

  // Montar response enriquecida com user_name, item_label e changes
  const enriched: HistoryEntry[] = rows.map((row) => ({
    id: row.id,
    action: row.action,
    user_id: row.user_id,
    user_name: row.user_id ? (userMap[row.user_id] ?? 'Sistema') : 'Sistema',
    created_at: row.created_at,
    item_label: buildItemLabel(row),
    record_id: row.record_id,
    changes: buildChanges(row),
  }));

  const meta = buildMeta(total, pagination);
  return paginated(enriched, meta, req);
}
