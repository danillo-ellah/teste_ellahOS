import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ACTIVITY_TYPES = ['note', 'call', 'email', 'meeting', 'proposal', 'follow_up'] as const;

const AddActivitySchema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES),
  description: z.string().min(1, 'Descricao e obrigatoria').max(5000),
  scheduled_at: z.string().optional().nullable(), // ISO timestamp
  completed_at: z.string().optional().nullable(), // ISO timestamp — null = pendente
});

/**
 * POST /crm/opportunities/:id/activities
 * Registra uma nova atividade/interacao numa oportunidade.
 */
export async function handleAddActivity(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
): Promise<Response> {
  console.log('[crm/add-activity] adicionando atividade', {
    opportunityId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = AddActivitySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
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

  const insertData = {
    tenant_id: auth.tenantId,
    opportunity_id: opportunityId,
    activity_type: data.activity_type,
    description: data.description.trim(),
    scheduled_at: data.scheduled_at ?? null,
    // Se nao informado e nao ha agendamento, considera concluida agora
    completed_at: data.completed_at ?? (data.scheduled_at ? null : new Date().toISOString()),
    created_by: auth.userId,
  };

  const { data: activity, error: insertError } = await client
    .from('opportunity_activities')
    .insert(insertData)
    .select(`
      *,
      created_by_profile:profiles!opportunity_activities_created_by_fkey(id, full_name, avatar_url)
    `)
    .single();

  if (insertError) {
    console.error('[crm/add-activity] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar atividade', 500, {
      detail: insertError.message,
    });
  }

  console.log('[crm/add-activity] atividade registrada', { id: activity.id });
  return created(activity, req);
}
