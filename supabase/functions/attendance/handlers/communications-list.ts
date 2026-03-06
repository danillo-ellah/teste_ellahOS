import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

// Roles com acesso ao modulo de atendimento
const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const ALLOWED_SORT_COLS = ['entry_date', 'created_at', 'entry_type', 'channel'];

export async function handleCommunicationsList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/communications-list] listando comunicacoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar comunicacoes', 403);
  }

  const url = new URL(req.url);
  const client = getSupabaseClient(auth.token);

  const jobId = url.searchParams.get('job_id');
  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  const search = url.searchParams.get('search');
  const entryType = url.searchParams.get('entry_type');

  const pagination = parsePagination(url, ALLOWED_SORT_COLS);

  // Ordenacao: entry_date DESC por padrao
  const isDefault = pagination.sortBy === 'created_at' && !url.searchParams.has('sort_by');
  const sortBy = isDefault ? 'entry_date' : pagination.sortBy;
  const ascending = isDefault ? false : pagination.sortOrder === 'asc';

  let query = client
    .from('client_communications')
    .select(
      `id, job_id, entry_date, entry_type, channel, description,
       created_by, created_at, updated_at,
       profiles!client_communications_created_by_fkey(full_name)`,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (search) {
    query = query.ilike('description', `%${search}%`);
  }
  if (entryType) {
    query = query.eq('entry_type', entryType);
  }

  query = query.order(sortBy, { ascending });

  const offset = getOffset(pagination);
  query = query.range(offset, offset + pagination.perPage - 1);

  const { data: items, error: listError, count } = await query;

  if (listError) {
    console.error('[attendance/communications-list] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar comunicacoes', 500, {
      detail: listError.message,
    });
  }

  // Normalizar: achatar created_by_name do join
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
