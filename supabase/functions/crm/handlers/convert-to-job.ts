import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ConvertToJobSchema = z.object({
  // Campos minimos para criar o job — o usuario completa o resto na pagina do job
  job_title: z.string().min(1, 'Titulo do job e obrigatorio').max(300),
  project_type: z.string().max(100).optional().nullable(),
  // Se nao informado, usa o cliente/agencia da oportunidade
  client_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  // Campos opcionais copiados da oportunidade (Onda 1.2)
  closed_value: z.number().min(0).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  deliverable_format: z.string().max(500).optional().nullable(),
  campaign_period: z.string().max(200).optional().nullable(),
});

/**
 * POST /crm/opportunities/:id/convert-to-job
 * Converte uma oportunidade em job e marca o stage como 'ganho'.
 * O job e criado com status 'briefing' e vinculado a oportunidade via job_id.
 */
export async function handleConvertToJob(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
): Promise<Response> {
  console.log('[crm/convert-to-job] convertendo oportunidade em job', {
    opportunityId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Apenas admin, ceo e produtor_executivo podem converter
  const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin, CEO ou produtor executivo podem converter oportunidades em job',
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = ConvertToJobSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar oportunidade
  const { data: opp, error: oppError } = await client
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (oppError || !opp) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Nao pode converter oportunidade que ja foi perdida ou ja tem job
  // Onda 1.2: permitir conversao de qualquer stage exceto 'perdido'
  if (opp.stage === 'perdido') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nao e possivel converter uma oportunidade perdida em job',
      422,
    );
  }

  if (opp.job_id) {
    throw new AppError(
      'CONFLICT',
      'Oportunidade ja foi convertida em job',
      409,
      { existing_job_id: opp.job_id },
    );
  }

  // Buscar proximo code sequencial do job para o tenant
  const { data: seqRow } = await client
    .from('job_code_sequences')
    .select('last_seq')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  const nextSeq = (seqRow?.last_seq ?? 0) + 1;

  // Criar o job com campos da oportunidade (Onda 1.2: copiar mais campos)
  const jobInsert: Record<string, unknown> = {
    tenant_id: auth.tenantId,
    title: data.job_title.trim(),
    project_type: data.project_type ?? opp.project_type ?? null,
    client_id: data.client_id ?? opp.client_id ?? null,
    agency_id: data.agency_id ?? opp.agency_id ?? null,
    status: 'briefing',
    priority_level: 'media',
    created_by: auth.userId,
    // Campos derivados da oportunidade
    notes: data.description ?? opp.notes ?? null,
    closed_value: data.closed_value ?? opp.estimated_value ?? null,
    deliverable_format: data.deliverable_format ?? opp.deliverable_format ?? null,
    campaign_period: data.campaign_period ?? opp.campaign_period ?? null,
  };

  const { data: createdJob, error: jobError } = await client
    .from('jobs')
    .insert(jobInsert)
    .select('id, title, code, status')
    .single();

  if (jobError) {
    console.error('[crm/convert-to-job] erro ao criar job:', jobError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar job', 500, {
      detail: jobError.message,
    });
  }

  // Atualizar sequencia (best-effort — o trigger atomico do banco cuida disso)
  await client
    .from('job_code_sequences')
    .upsert({ tenant_id: auth.tenantId, last_seq: nextSeq })
    .eq('tenant_id', auth.tenantId);

  // Atualizar a oportunidade: marcar como ganho e vincular ao job
  const { data: updatedOpp, error: updateError } = await client
    .from('opportunities')
    .update({
      stage: 'ganho',
      job_id: createdJob.id,
      actual_close_date: new Date().toISOString().slice(0, 10),
    })
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[crm/convert-to-job] erro ao atualizar oportunidade:', updateError.message);
    // Job foi criado mas oportunidade nao atualizada — logar para investigacao manual
    throw new AppError('INTERNAL_ERROR', 'Job criado mas erro ao vincular oportunidade', 500, {
      created_job_id: createdJob.id,
      detail: updateError.message,
    });
  }

  // Registrar atividade
  await client.from('opportunity_activities').insert({
    tenant_id: auth.tenantId,
    opportunity_id: opportunityId,
    activity_type: 'note',
    description: `Oportunidade convertida em job: "${createdJob.title}" (${createdJob.code ?? createdJob.id}).`,
    created_by: auth.userId,
    completed_at: new Date().toISOString(),
  });

  console.log('[crm/convert-to-job] conversao concluida', {
    opportunityId,
    jobId: createdJob.id,
  });

  return success(
    {
      opportunity: updatedOpp,
      job: createdJob,
    },
    200,
    req,
  );
}
