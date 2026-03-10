import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ENUMs validos para filtro de entity_type
const ENTITY_TYPE_VALUES = ['clients', 'contacts', 'jobs'] as const;

// Schema dos query params
const ListLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  entity_type: z.enum(ENTITY_TYPE_VALUES).optional(),
});

export async function handleListLogs(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Apenas roles com permissao de importacao
  const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para visualizar logs de importacao', 403);
  }

  // 1. Parsear query params
  const url = new URL(req.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());

  const parsed = ListLogsQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Parametros de consulta invalidos', 400, {
      issues: parsed.error.issues,
    });
  }

  const { page, per_page, entity_type } = parsed.data;

  const supabase = getSupabaseClient(auth.token);

  // 2. Calcular range para paginacao (Supabase usa range inclusivo)
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  // 3. Construir query base
  let query = supabase
    .from('import_logs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .range(from, to);

  // Filtro opcional por entity_type
  if (entity_type) {
    query = query.eq('entity_type', entity_type);
  }

  const { data: logs, error: dbError, count } = await query;

  if (dbError) {
    console.error('[data-import/logs] Erro ao buscar import_logs:', dbError);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar historico de importacoes', 500);
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / per_page);

  console.log(
    `[data-import/logs] tenant=${auth.tenantId} page=${page} per_page=${per_page} total=${total}`,
  );

  return paginated(
    logs ?? [],
    {
      total,
      page,
      per_page,
      total_pages: totalPages,
    },
    req,
  );
}
