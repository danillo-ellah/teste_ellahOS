import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para visualizar preview de lote
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

export async function handleBatchPreview(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[payment-manager/batch-preview] iniciando preview de lote', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  const url = new URL(req.url);
  const idsParam = url.searchParams.get('cost_item_ids');

  if (!idsParam || !idsParam.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Parametro cost_item_ids e obrigatorio', 400);
  }

  // Parsear IDs separados por virgula
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Nenhum ID valido fornecido', 400);
  }

  if (ids.length > 100) {
    throw new AppError('VALIDATION_ERROR', 'Maximo de 100 itens por preview', 400);
  }

  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const invalidIds = ids.filter((id) => !uuidRegex.test(id));
  if (invalidIds.length > 0) {
    throw new AppError('VALIDATION_ERROR', 'IDs invalidos fornecidos', 400, {
      invalid_ids: invalidIds,
    });
  }

  const client = getSupabaseClient(auth.token);

  // Buscar cost_items com informacoes do vendor
  const { data: items, error: fetchError } = await client
    .from('cost_items')
    .select(
      `id, service_description, item_number, sub_item_number,
       unit_value, quantity, total_with_overtime, overtime_hours, overtime_rate,
       payment_status, payment_due_date, payment_method,
       vendor_id, vendor_name_snapshot, vendor_email_snapshot, vendor_pix_snapshot,
       job_id`,
    )
    .in('id', ids)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('[payment-manager/batch-preview] erro ao buscar itens:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo', 500);
  }

  const foundItems = items ?? [];

  // Calcular total geral
  const total = foundItems.reduce((acc, item) => acc + (item.total_with_overtime ?? 0), 0);

  // Resumo por vendor
  const vendorMap = new Map<
    string,
    { vendor_name: string; items_count: number; total: number }
  >();

  for (const item of foundItems) {
    const vendorKey = item.vendor_id ?? `sem_vendor_${item.id}`;
    const vendorName = item.vendor_name_snapshot ?? 'Sem fornecedor';

    const existing = vendorMap.get(vendorKey);
    if (existing) {
      existing.items_count += 1;
      existing.total += item.total_with_overtime ?? 0;
    } else {
      vendorMap.set(vendorKey, {
        vendor_name: vendorName,
        items_count: 1,
        total: item.total_with_overtime ?? 0,
      });
    }
  }

  // Identificar IDs nao encontrados
  const foundIds = foundItems.map((i) => i.id);
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  console.log('[payment-manager/batch-preview] preview gerado', {
    items_found: foundItems.length,
    total,
  });

  return success({
    items: foundItems,
    total,
    items_count: foundItems.length,
    vendor_summary: Array.from(vendorMap.values()),
    not_found_ids: notFoundIds,
  });
}
