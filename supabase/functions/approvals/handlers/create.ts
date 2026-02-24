import { getSupabaseClient, getServiceClient } from '../_shared/supabase-client.ts';
import { created } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { validate, z } from '../_shared/validation.ts';
import { createNotification } from '../_shared/notification-helper.ts';
import { enqueueEvent } from '../_shared/integration-client.ts';
import type { AuthContext } from '../_shared/auth.ts';

const APPROVAL_TYPES = ['briefing', 'orcamento_detalhado', 'corte', 'finalizacao', 'entrega'] as const;

const CreateApprovalSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  approval_type: z.enum(APPROVAL_TYPES, {
    errorMap: () => ({ message: 'Tipo de aprovacao invalido' }),
  }),
  title: z.string().min(1, 'Titulo e obrigatorio').max(500),
  description: z.string().max(5000).optional().nullable(),
  file_url: z.string().url().max(2000).refine(
    (url) => {
      try {
        const { hostname } = new URL(url);
        const allowed = ['supabase.co', 'drive.google.com', 'docs.google.com'];
        return hostname === 'localhost' || allowed.some((d) => hostname === d || hostname.endsWith(`.${d}`));
      } catch {
        return false;
      }
    },
    { message: 'URL do arquivo deve ser de um dominio autorizado (supabase.co, drive.google.com, docs.google.com)' },
  ).optional().nullable(),
  approver_type: z.enum(['external', 'internal'], {
    errorMap: () => ({ message: 'Tipo de aprovador invalido' }),
  }),
  approver_email: z.string().email().optional().nullable(),
  approver_phone: z.string().min(10).max(20).optional().nullable(),
  approver_people_id: z.string().uuid().optional().nullable(),
}).refine(
  (data) => {
    if (data.approver_type === 'external') return !!data.approver_email;
    if (data.approver_type === 'internal') return !!data.approver_people_id;
    return false;
  },
  { message: 'Aprovador externo requer email, interno requer people_id' },
);

// POST /approvals — cria solicitacao de aprovacao
export async function createApproval(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const body = await req.json();
  const validated = validate(CreateApprovalSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar que o job existe
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title')
    .eq('id', validated.job_id)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Validade do token: varia por tipo de aprovacao (FASE6-MEDIO-003)
  const EXPIRY_DAYS_BY_TYPE: Record<typeof validated.approval_type, number> = {
    briefing: 30,
    orcamento_detalhado: 7,
    corte: 14,
    finalizacao: 14,
    entrega: 7,
  };
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS_BY_TYPE[validated.approval_type]);

  // Inserir aprovacao
  const { data: approval, error: insertError } = await supabase
    .from('approval_requests')
    .insert({
      tenant_id: auth.tenantId,
      job_id: validated.job_id,
      approval_type: validated.approval_type,
      title: validated.title,
      description: validated.description ?? null,
      file_url: validated.file_url ?? null,
      approver_type: validated.approver_type,
      approver_email: validated.approver_email ?? null,
      approver_phone: validated.approver_phone ?? null,
      approver_people_id: validated.approver_people_id ?? null,
      expires_at: expiresAt.toISOString(),
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[approvals/create] erro insert:', insertError.message);
    throw new AppError('INTERNAL_ERROR', insertError.message, 500);
  }

  // Log de criacao (audit trail)
  const serviceClient = getServiceClient();
  await serviceClient.from('approval_logs').insert({
    tenant_id: auth.tenantId,
    approval_request_id: approval.id,
    action: 'created',
    actor_type: 'user',
    actor_id: auth.userId,
    metadata: { approval_type: validated.approval_type, approver_type: validated.approver_type },
  });

  // Notificacao in-app para aprovador interno
  if (validated.approver_type === 'internal' && validated.approver_people_id) {
    // Buscar profile_id da pessoa
    const { data: person } = await supabase
      .from('people')
      .select('profile_id, full_name')
      .eq('id', validated.approver_people_id)
      .single();

    if (person?.profile_id) {
      await createNotification(serviceClient, {
        tenant_id: auth.tenantId,
        user_id: person.profile_id,
        type: 'approval_requested',
        priority: 'high',
        title: `Nova aprovacao: ${validated.title}`,
        body: `Aprovacao de ${validated.approval_type} para o job ${job.code} - ${job.title}`,
        job_id: validated.job_id,
        action_url: `/jobs/${validated.job_id}?tab=aprovacoes`,
      });
    }
  }

  // WhatsApp para aprovador externo
  if (validated.approver_type === 'external' && validated.approver_phone) {
    const approvalUrl = `${Deno.env.get('SITE_URL') ?? 'https://ellahos.com'}/approve/${approval.token}`;
    await enqueueEvent(serviceClient, {
      tenant_id: auth.tenantId,
      event_type: 'whatsapp_send',
      payload: {
        phone: validated.approver_phone,
        recipient_name: validated.approver_email ?? 'Cliente',
        template: 'approval_request',
        job_code: job.code,
        job_title: job.title,
        approval_type: validated.approval_type,
        approval_title: validated.title,
        approval_url: approvalUrl,
      },
      idempotency_key: `approval-created-${approval.id}`,
    });

    // Log de envio
    await serviceClient.from('approval_logs').insert({
      tenant_id: auth.tenantId,
      approval_request_id: approval.id,
      action: 'sent',
      actor_type: 'system',
      metadata: { channel: 'whatsapp', phone: validated.approver_phone },
    });
  }

  return created(approval);
}
