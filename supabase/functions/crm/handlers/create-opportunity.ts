import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const STAGE_VALUES = [
  'lead',
  'qualificado',
  'proposta',
  'negociacao',
  'fechamento',
  'ganho',
  'perdido',
] as const;

const CreateOpportunitySchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio').max(300),
  client_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  stage: z.enum(STAGE_VALUES).default('lead'),
  estimated_value: z.number().min(0).optional().nullable(),
  probability: z.number().int().min(0).max(100).default(50),
  expected_close_date: z.string().optional().nullable(), // YYYY-MM-DD
  loss_reason: z.string().max(500).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  project_type: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
});

/**
 * POST /crm/opportunities
 * Cria uma nova oportunidade no pipeline CRM.
 */
export async function handleCreateOpportunity(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[crm/create-opportunity] criando oportunidade', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateOpportunitySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Validar que client_id ou agency_id pertencem ao tenant
  if (data.client_id) {
    const { data: clientRow } = await client
      .from('clients')
      .select('id')
      .eq('id', data.client_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();

    if (!clientRow) {
      throw new AppError('NOT_FOUND', 'Cliente nao encontrado', 404);
    }
  }

  if (data.agency_id) {
    const { data: agencyRow } = await client
      .from('agencies')
      .select('id')
      .eq('id', data.agency_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();

    if (!agencyRow) {
      throw new AppError('NOT_FOUND', 'Agencia nao encontrada', 404);
    }
  }

  const insertData = {
    tenant_id: auth.tenantId,
    title: data.title.trim(),
    client_id: data.client_id ?? null,
    agency_id: data.agency_id ?? null,
    contact_id: data.contact_id ?? null,
    stage: data.stage,
    estimated_value: data.estimated_value ?? null,
    probability: data.probability,
    expected_close_date: data.expected_close_date ?? null,
    loss_reason: data.loss_reason ?? null,
    source: data.source ?? null,
    project_type: data.project_type ?? null,
    notes: data.notes ?? null,
    assigned_to: data.assigned_to ?? auth.userId,
    created_by: auth.userId,
  };

  const { data: createdOpp, error: insertError } = await client
    .from('opportunities')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error('[crm/create-opportunity] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar oportunidade', 500, {
      detail: insertError.message,
    });
  }

  // Registrar atividade inicial automatica
  await client.from('opportunity_activities').insert({
    tenant_id: auth.tenantId,
    opportunity_id: createdOpp.id,
    activity_type: 'note',
    description: `Oportunidade criada no estagio "${data.stage}".`,
    created_by: auth.userId,
    completed_at: new Date().toISOString(),
  });

  console.log('[crm/create-opportunity] oportunidade criada', { id: createdOpp.id });
  return created(createdOpp, req);
}
