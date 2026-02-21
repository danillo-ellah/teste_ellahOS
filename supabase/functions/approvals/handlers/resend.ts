import { getSupabaseClient, getServiceClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { enqueueEvent } from '../_shared/integration-client.ts';
import type { AuthContext } from '../_shared/auth.ts';

// UUID v4 regex para validacao de formato
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /approvals/:id/resend — reenvia link de aprovacao
export async function resend(
  _req: Request,
  auth: AuthContext,
  approvalId: string,
): Promise<Response> {
  if (!UUID_REGEX.test(approvalId)) {
    throw new AppError('NOT_FOUND', 'Solicitacao de aprovacao nao encontrada', 404);
  }

  const supabase = getSupabaseClient(auth.token);

  // Buscar aprovacao
  const { data: approval, error: fetchError } = await supabase
    .from('approval_requests')
    .select('*, jobs(code, title)')
    .eq('id', approvalId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !approval) {
    throw new AppError('NOT_FOUND', 'Solicitacao de aprovacao nao encontrada', 404);
  }

  if (approval.status !== 'pending') {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Somente aprovacoes pendentes podem ser reenviadas', 422);
  }

  if (approval.approver_type !== 'external') {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Reenvio somente disponivel para aprovadores externos', 422);
  }

  if (!approval.approver_phone) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Aprovador nao possui telefone cadastrado', 422);
  }

  // Enfileirar WhatsApp
  const serviceClient = getServiceClient();
  const approvalUrl = `${Deno.env.get('SITE_URL') ?? 'https://ellahos.com'}/approve/${approval.token}`;

  await enqueueEvent(serviceClient, {
    tenant_id: auth.tenantId,
    event_type: 'whatsapp_send',
    payload: {
      phone: approval.approver_phone,
      recipient_name: approval.approver_email ?? 'Cliente',
      template: 'approval_request',
      job_code: (approval as any).jobs?.code ?? '',
      job_title: (approval as any).jobs?.title ?? '',
      approval_type: approval.approval_type,
      approval_title: approval.title,
      approval_url: approvalUrl,
    },
    idempotency_key: `approval-resend-${approval.id}-${Date.now()}`,
  });

  // Log de reenvio
  await serviceClient.from('approval_logs').insert({
    tenant_id: auth.tenantId,
    approval_request_id: approval.id,
    action: 'resent',
    actor_type: 'user',
    actor_id: auth.userId,
    metadata: { channel: 'whatsapp', phone: approval.approver_phone },
  });

  return success({ id: approval.id, resent: true });
}
