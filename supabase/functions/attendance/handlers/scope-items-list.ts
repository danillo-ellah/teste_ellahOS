import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const ALLOWED_SORT_COLS = ['created_at', 'requested_at', 'description', 'extra_status'];

export async function handleScopeItemsList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/scope-items-list] listando itens de escopo', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar itens de escopo', 403);
  }

  const url = new URL(req.url);
  const client = getSupabaseClient(auth.token);

  const jobId = url.searchParams.get('job_id');
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  const isExtra = url.searchParams.get('is_extra');
  const extraStatus = url.searchParams.get('extra_status');

  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  let query = client
    .from('scope_items')
    .select(
      `id, job_id, description, is_extra, origin_channel, requested_at,
       extra_status, ceo_decision_by, ceo_decision_at, ceo_notes,
       created_by, created_at, updated_at,
       profiles!scope_items_created_by_fkey(full_name)`,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (isExtra !== null) {
    query = query.eq('is_extra', isExtra === 'true');
  }
  if (extraStatus) {
    query = query.eq('extra_status', extraStatus);
  }

  query = query.order(pagination.sortBy, { ascending: pagination.sortOrder === 'asc' });

  const offset = getOffset(pagination);
  query = query.range(offset, offset + pagination.perPage - 1);

  const { data: items, error: listError, count } = await query;

  if (listError) {
    console.error('[attendance/scope-items-list] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar itens de escopo', 500, {
      detail: listError.message,
    });
  }

  const normalized = (items ?? []).map((item: Record<string, unknown>) => {
    const profile = item.profiles as { full_name: string } | null;
    return {
      ...item,
      profiles: undefined,
      created_by_name: profile?.full_name ?? null,
    };
  });

  const total = count ?? 0;
  const meta = buildMeta(total, pagination);

  return new Response(
    JSON.stringify({ data: normalized, meta }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
