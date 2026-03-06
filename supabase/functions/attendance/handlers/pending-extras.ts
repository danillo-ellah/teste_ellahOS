import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

// Apenas roles com visibilidade cross-job podem acessar
const ALLOWED_ROLES = ['ceo', 'produtor_executivo', 'admin'];

export async function handlePendingExtras(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/pending-extras] listando extras pendentes cross-job', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas ceo, produtor_executivo ou admin pode visualizar extras pendentes cross-job',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Busca todos os extras com status pendente_ceo de jobs nao arquivados/cancelados
  const { data: extras, error: fetchError } = await client
    .from('scope_items')
    .select(
      `id, job_id, description, origin_channel, requested_at,
       created_by, created_at,
       profiles!scope_items_created_by_fkey(full_name),
       jobs!scope_items_job_id_fkey(code, title, status)`,
    )
    .eq('tenant_id', auth.tenantId)
    .eq('is_extra', true)
    .eq('extra_status', 'pendente_ceo')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('[attendance/pending-extras] erro na query:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar extras pendentes', 500, {
      detail: fetchError.message,
    });
  }

  // Filtrar apenas jobs ativos (excluir encerrado/cancelado/arquivado)
  const INACTIVE_STATUSES = ['encerrado', 'cancelado', 'arquivado'];

  const normalized = (extras ?? [])
    .filter((item: Record<string, unknown>) => {
      const job = item.jobs as { status: string } | null;
      return job && !INACTIVE_STATUSES.includes(job.status);
    })
    .map((item: Record<string, unknown>) => {
      const profile = item.profiles as { full_name: string } | null;
      const job = item.jobs as { code: string; title: string; status: string } | null;

      // Calcular dias pendente desde created_at
      const createdAt = new Date(item.created_at as string);
      const diffMs = Date.now() - createdAt.getTime();
      const daysPending = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        id: item.id,
        job_id: item.job_id,
        job_code: job?.code ?? null,
        job_title: job?.title ?? null,
        description: item.description,
        origin_channel: item.origin_channel,
        requested_at: item.requested_at,
        days_pending: daysPending,
        created_by: item.created_by,
        created_by_name: profile?.full_name ?? null,
        created_at: item.created_at,
      };
    });

  return new Response(
    JSON.stringify({ data: normalized }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
