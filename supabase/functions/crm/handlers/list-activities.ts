import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

/**
 * GET /crm/opportunities/:id/activities
 * Lista todas as atividades de uma oportunidade, mais recente primeiro.
 */
export async function handleListActivities(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
): Promise<Response> {
  console.log('[crm/list-activities] listando atividades', {
    opportunityId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50')));
  const activityType = url.searchParams.get('activity_type');

  const client = getSupabaseClient(auth.token);

  // Verificar que oportunidade existe no tenant
  const { data: opp } = await client
    .from('opportunities')
    .select('id')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!opp) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  let query = client
    .from('opportunity_activities')
    .select(`
      *,
      created_by_profile:profiles!opportunity_activities_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (activityType) {
    query = query.eq('activity_type', activityType);
  }

  const { data: activities, error: fetchError } = await query;

  if (fetchError) {
    console.error('[crm/list-activities] erro na query:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar atividades', 500, {
      detail: fetchError.message,
    });
  }

  return new Response(
    JSON.stringify({ data: activities ?? [] }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
