import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { DOCUSEAL_STATUSES } from '../../_shared/types.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Colunas permitidas para ordenacao de docuseal_submissions
const DOCUSEAL_ALLOWED_SORT = [
  'created_at',
  'updated_at',
  'sent_at',
  'signed_at',
  'person_name',
  'person_email',
  'docuseal_status',
];

export async function listSubmissions(req: Request, auth: AuthContext): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);
  const url = new URL(req.url);

  // Parametros de filtro
  const jobIdFilter = url.searchParams.get('job_id');
  const statusFilter = url.searchParams.get('status');

  // Parametros de paginacao
  const pagination = parsePagination(url, DOCUSEAL_ALLOWED_SORT);
  const offset = getOffset(pagination);

  console.log(
    `[list] tenant=${auth.tenantId} job_id=${jobIdFilter} status=${statusFilter} page=${pagination.page}`,
  );

  // Validar status se informado
  if (statusFilter && !DOCUSEAL_STATUSES.includes(statusFilter as (typeof DOCUSEAL_STATUSES)[number])) {
    throw new AppError('VALIDATION_ERROR', `Status invalido: ${statusFilter}`, 400);
  }

  // Montar query com join em jobs para retornar job_code e job_title
  let query = supabase
    .from('docuseal_submissions')
    .select(
      `
      id,
      tenant_id,
      job_id,
      person_id,
      person_name,
      person_email,
      person_cpf,
      docuseal_submission_id,
      docuseal_template_id,
      docuseal_status,
      signed_pdf_url,
      sent_at,
      opened_at,
      signed_at,
      error_message,
      metadata,
      created_by,
      created_at,
      updated_at,
      jobs (
        id,
        code,
        title
      )
      `,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  // Aplicar filtros opcionais
  if (jobIdFilter) {
    query = query.eq('job_id', jobIdFilter);
  }

  if (statusFilter) {
    query = query.eq('docuseal_status', statusFilter);
  }

  // Ordenacao e paginacao
  query = query
    .order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' })
    .range(offset, offset + pagination.perPage - 1);

  const { data, error: queryError, count } = await query;

  if (queryError) {
    console.error('[list] falha ao listar docuseal_submissions:', queryError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao listar submissoes DocuSeal', 500);
  }

  const meta = buildMeta(count ?? 0, pagination);

  console.log(`[list] retornando ${data?.length ?? 0} submissoes (total: ${count})`);

  return paginated(data ?? [], meta);
}
