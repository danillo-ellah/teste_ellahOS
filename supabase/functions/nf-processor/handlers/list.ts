import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para listar NFs
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro', 'produtor_executivo'];

// Colunas permitidas para ordenacao de nf_documents
const NF_ALLOWED_SORT = [
  'created_at',
  'updated_at',
  'received_at',
  'status',
  'sender_email',
  'sender_name',
  'file_name',
  'match_confidence',
];

export async function listNfs(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para listar NFs', 403);
  }

  const supabase = getSupabaseClient(auth.token);
  const url = new URL(req.url);

  // Parametros de filtro
  const statusFilter = url.searchParams.get('status');
  const jobIdFilter = url.searchParams.get('job_id');

  // Parametros de paginacao
  const pagination = parsePagination(url, NF_ALLOWED_SORT);
  const offset = getOffset(pagination);

  console.log(`[list] tenant=${auth.tenantId} status=${statusFilter} job_id=${jobIdFilter} page=${pagination.page}`);

  // Montar query base com joins
  let query = supabase
    .from('nf_documents')
    .select(
      `
      id,
      tenant_id,
      job_id,
      source,
      gmail_message_id,
      sender_email,
      sender_name,
      subject,
      received_at,
      file_name,
      file_hash,
      file_size_bytes,
      drive_file_id,
      drive_url,
      nf_number,
      nf_value,
      nf_issuer_name,
      nf_issuer_cnpj,
      nf_issue_date,
      status,
      matched_financial_record_id,
      matched_invoice_id,
      match_confidence,
      match_method,
      validated_by,
      validated_at,
      rejection_reason,
      metadata,
      created_at,
      updated_at,
      jobs (
        id,
        code,
        title
      ),
      financial_records:matched_financial_record_id (
        id,
        description,
        amount,
        supplier_email
      )
      `,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  // Aplicar filtros opcionais
  if (statusFilter) {
    const validStatuses = ['pending_review', 'auto_matched', 'confirmed', 'rejected', 'processing'];
    if (!validStatuses.includes(statusFilter)) {
      throw new AppError('VALIDATION_ERROR', `Status invalido: ${statusFilter}`, 400);
    }
    query = query.eq('status', statusFilter);
  }

  if (jobIdFilter) {
    query = query.eq('job_id', jobIdFilter);
  }

  // Ordenacao e paginacao
  query = query
    .order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' })
    .range(offset, offset + pagination.perPage - 1);

  const { data, error: queryError, count } = await query;

  if (queryError) {
    console.error('[list] falha ao listar nf_documents:', queryError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao listar NFs', 500);
  }

  const meta = buildMeta(count ?? 0, pagination);

  console.log(`[list] retornando ${data?.length ?? 0} NFs (total: ${count})`);

  return paginated(data ?? [], meta);
}
