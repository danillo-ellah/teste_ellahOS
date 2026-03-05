import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para buscar cost items
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro', 'produtor_executivo'];

/**
 * GET /nf-processor/cost-items-search
 *
 * Busca cost items para vincular a uma NF.
 * Retorna itens SEM NF vinculada (ou ja vinculados ao NF corrente).
 *
 * Params:
 *   search       - busca textual (vendor, descricao)
 *   email        - email exato do fornecedor (match direto)
 *   job_id       - filtrar por job
 *   linked_to_nf - incluir cost items ja vinculados a este nf_document_id
 */
export async function searchCostItems(req: Request, auth: AuthContext): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() ?? '';
  const email = url.searchParams.get('email')?.trim() ?? '';
  const jobId = url.searchParams.get('job_id');
  const linkedToNf = url.searchParams.get('linked_to_nf');

  // Precisa de pelo menos um criterio de busca
  if (search.length < 2 && !email && !jobId && !linkedToNf) {
    return success([]);
  }

  const supabase = getSupabaseClient(auth.token);

  // Sanitizar busca para evitar quebra do filtro PostgREST
  const safeSearch = search.replace(/[,.()\[\]]/g, ' ').trim();

  // Query base
  let query = supabase
    .from('cost_items')
    .select(`
      id,
      service_description,
      total_value,
      vendor_name_snapshot,
      vendor_email_snapshot,
      nf_request_status,
      nf_document_id,
      payment_due_date,
      item_number,
      job_id,
      jobs (
        id,
        code,
        title
      )
    `)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .eq('is_category_header', false)
    .gt('total_value', 0)
    .order('created_at', { ascending: false })
    .limit(20);

  // Filtro: somente itens sem NF OU ja vinculados ao NF corrente
  if (linkedToNf) {
    query = query.or(`nf_document_id.is.null,nf_document_id.eq.${linkedToNf}`);
  } else {
    query = query.is('nf_document_id', null);
  }

  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  if (email) {
    // Match exato por email do fornecedor
    query = query.eq('vendor_email_snapshot', email);
  } else if (safeSearch.length >= 2) {
    // Busca textual por nome, email ou descricao
    query = query.or(
      `vendor_name_snapshot.ilike.%${safeSearch}%,vendor_email_snapshot.ilike.%${safeSearch}%,service_description.ilike.%${safeSearch}%`,
    );
  }

  const { data, error: queryError } = await query;

  if (queryError) {
    console.error('[cost-items-search] erro:', queryError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao buscar itens de custo', 500);
  }

  // deno-lint-ignore no-explicit-any
  const items = (data ?? []).map((item: any) => ({
    id: item.id,
    service_description: item.service_description,
    total_value: item.total_value,
    vendor_name: item.vendor_name_snapshot,
    vendor_email: item.vendor_email_snapshot,
    nf_request_status: item.nf_request_status,
    nf_document_id: item.nf_document_id,
    payment_due_date: item.payment_due_date,
    item_number: item.item_number,
    job_id: item.job_id,
    job_code: item.jobs?.code ?? null,
    job_title: item.jobs?.title ?? null,
  }));

  console.log(`[cost-items-search] tenant=${auth.tenantId} search="${safeSearch}" email="${email}" found=${items.length}`);

  return success(items);
}
