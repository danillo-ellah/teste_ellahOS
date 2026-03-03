import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

/**
 * GET /crm/opportunities/:id
 * Retorna detalhe completo da oportunidade com propostas e ultima atividade.
 */
export async function handleGetOpportunity(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[crm/get-opportunity] buscando oportunidade', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const client = getSupabaseClient(auth.token);

  // Buscar oportunidade com joins
  const { data: opportunity, error: fetchError } = await client
    .from('opportunities')
    .select(`
      *,
      clients(id, name, cnpj),
      agencies(id, name),
      contacts(id, full_name, email, phone),
      assigned_profile:profiles!opportunities_assigned_to_fkey(id, full_name, avatar_url, email),
      created_by_profile:profiles!opportunities_created_by_fkey(id, full_name),
      jobs(id, title, code, status)
    `)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !opportunity) {
    console.error('[crm/get-opportunity] nao encontrada', { id, error: fetchError?.message });
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Buscar propostas (excluindo deletadas)
  const { data: proposals } = await client
    .from('opportunity_proposals')
    .select(`
      *,
      created_by_profile:profiles!opportunity_proposals_created_by_fkey(id, full_name)
    `)
    .eq('opportunity_id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('version', { ascending: false });

  // Buscar 5 atividades mais recentes para preview no detalhe
  const { data: recentActivities } = await client
    .from('opportunity_activities')
    .select(`
      *,
      created_by_profile:profiles!opportunity_activities_created_by_fkey(id, full_name, avatar_url)
    `)
    .eq('opportunity_id', id)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(5);

  return success(
    {
      ...opportunity,
      proposals: proposals ?? [],
      recent_activities: recentActivities ?? [],
    },
    200,
    req,
  );
}
