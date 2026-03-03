import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const STAGE_VALUES = [
  'lead',
  'qualificado',
  'proposta',
  'negociacao',
  'fechamento',
  'ganho',
  'perdido',
  'pausado',
] as const;

// Transicoes de stage validas (pode avancar ou recuar, mas perdido/ganho sao terminais)
// pausado pode ir para qualquer stage ativo (reativacao)
// qualquer stage ativo pode ir para pausado
// ganho nao pode ir para pausado — so para perdido
const VALID_TRANSITIONS: Record<string, string[]> = {
  lead: ['qualificado', 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido', 'pausado'],
  qualificado: ['lead', 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido', 'pausado'],
  proposta: ['lead', 'qualificado', 'negociacao', 'fechamento', 'ganho', 'perdido', 'pausado'],
  negociacao: ['lead', 'qualificado', 'proposta', 'fechamento', 'ganho', 'perdido', 'pausado'],
  fechamento: ['lead', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido', 'pausado'],
  ganho: ['perdido'], // ganho nao volta para pipeline ativo nem pode ser pausado
  perdido: ['lead'], // perdido pode ser reativado como lead
  pausado: ['lead', 'qualificado', 'proposta', 'negociacao', 'fechamento', 'ganho', 'perdido'],
};

const UpdateOpportunitySchema = z.object({
  title: z.string().min(1).max(300).optional(),
  client_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  stage: z.enum(STAGE_VALUES).optional(),
  estimated_value: z.number().min(0).optional().nullable(),
  probability: z.number().int().min(0).max(100).optional(),
  expected_close_date: z.string().optional().nullable(),
  actual_close_date: z.string().optional().nullable(),
  loss_reason: z.string().max(500).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  project_type: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  // Novos campos adicionados na migration
  response_deadline: z.string().optional().nullable(), // ISO date YYYY-MM-DD
  is_competitive_bid: z.boolean().optional().nullable(),
  competitor_count: z.number().int().min(0).optional().nullable(),
  deliverable_format: z.string().max(500).optional().nullable(),
  client_budget: z.number().min(0).optional().nullable(),
  campaign_period: z.string().max(200).optional().nullable(),
});

/**
 * PATCH /crm/opportunities/:id
 * Atualiza dados de uma oportunidade. Inclui movimentacao de stage.
 */
export async function handleUpdateOpportunity(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[crm/update-opportunity] atualizando oportunidade', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateOpportunitySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;

  if (Object.keys(data).length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Nenhum campo para atualizar', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar oportunidade atual para validar transicao de stage
  const { data: current, error: fetchError } = await client
    .from('opportunities')
    .select('id, stage, job_id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Validar transicao de stage se houver mudanca
  if (data.stage && data.stage !== current.stage) {
    const validNext = VALID_TRANSITIONS[current.stage as string] ?? [];
    if (!validNext.includes(data.stage)) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        `Transicao de stage invalida: ${current.stage} -> ${data.stage}`,
        422,
        { current_stage: current.stage, requested_stage: data.stage, valid_transitions: validNext },
      );
    }

    // Quando marca como ganho, registra data de fechamento se nao foi fornecida
    if (data.stage === 'ganho' && !data.actual_close_date) {
      data.actual_close_date = new Date().toISOString().slice(0, 10);
    }

    // Quando marca como perdido, loss_reason e obrigatoria
    if (data.stage === 'perdido' && !data.loss_reason) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Informe o motivo da perda (loss_reason) ao marcar como perdido',
        400,
      );
    }
  }

  // Montar update payload (apenas campos presentes no body)
  const updatePayload: Record<string, unknown> = {};
  if (data.title !== undefined) updatePayload.title = data.title.trim();
  if (data.client_id !== undefined) updatePayload.client_id = data.client_id;
  if (data.agency_id !== undefined) updatePayload.agency_id = data.agency_id;
  if (data.contact_id !== undefined) updatePayload.contact_id = data.contact_id;
  if (data.stage !== undefined) updatePayload.stage = data.stage;
  if (data.estimated_value !== undefined) updatePayload.estimated_value = data.estimated_value;
  if (data.probability !== undefined) updatePayload.probability = data.probability;
  if (data.expected_close_date !== undefined) updatePayload.expected_close_date = data.expected_close_date;
  if (data.actual_close_date !== undefined) updatePayload.actual_close_date = data.actual_close_date;
  if (data.loss_reason !== undefined) updatePayload.loss_reason = data.loss_reason;
  if (data.source !== undefined) updatePayload.source = data.source;
  if (data.project_type !== undefined) updatePayload.project_type = data.project_type;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.assigned_to !== undefined) updatePayload.assigned_to = data.assigned_to;
  if (data.response_deadline !== undefined) updatePayload.response_deadline = data.response_deadline;
  if (data.is_competitive_bid !== undefined) updatePayload.is_competitive_bid = data.is_competitive_bid;
  if (data.competitor_count !== undefined) updatePayload.competitor_count = data.competitor_count;
  if (data.deliverable_format !== undefined) updatePayload.deliverable_format = data.deliverable_format;
  if (data.client_budget !== undefined) updatePayload.client_budget = data.client_budget;
  if (data.campaign_period !== undefined) updatePayload.campaign_period = data.campaign_period;

  const { data: updated, error: updateError } = await client
    .from('opportunities')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[crm/update-opportunity] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar oportunidade', 500, {
      detail: updateError.message,
    });
  }

  // Registrar atividade de mudanca de stage automaticamente
  if (data.stage && data.stage !== current.stage) {
    const stageLabel: Record<string, string> = {
      lead: 'Lead',
      qualificado: 'Qualificado',
      proposta: 'Proposta',
      negociacao: 'Negociacao',
      fechamento: 'Fechamento',
      ganho: 'Ganho',
      perdido: 'Perdido',
      pausado: 'Pausado',
    };

    await client.from('opportunity_activities').insert({
      tenant_id: auth.tenantId,
      opportunity_id: id,
      activity_type: 'note',
      description: `Stage alterado: ${stageLabel[current.stage] ?? current.stage} → ${stageLabel[data.stage] ?? data.stage}.${data.loss_reason ? ` Motivo: ${data.loss_reason}` : ''}`,
      created_by: auth.userId,
      completed_at: new Date().toISOString(),
    });
  }

  console.log('[crm/update-opportunity] oportunidade atualizada', { id });
  return success(updated, 200, req);
}
