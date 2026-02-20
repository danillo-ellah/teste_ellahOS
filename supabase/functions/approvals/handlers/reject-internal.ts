import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, z } from '../../_shared/validation.ts';
import { createNotification } from '../../_shared/notification-helper.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const RejectInternalSchema = z.object({
  comment: z.string().min(1, 'Comentario obrigatorio para rejeicao').max(5000),
});

// POST /approvals/:id/reject — rejeicao interna
export async function rejectInternal(
  req: Request,
  auth: AuthContext,
  approvalId: string,
): Promise<Response> {
  const body = await req.json();
  const validated = validate(RejectInternalSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Buscar aprovacao
  const { data: approval, error: fetchError } = await supabase
    .from('approval_requests')
    .select('*, jobs(id, code, title)')
    .eq('id', approvalId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !approval) {
    throw new AppError('NOT_FOUND', 'Solicitacao de aprovacao nao encontrada', 404);
  }

  if (approval.status !== 'pending') {
    throw new AppError('BUSINESS_RULE_VIOLATION', `Aprovacao ja foi ${approval.status}`, 422);
  }

  // Atualizar status
  const { data: updated, error: updateError } = await supabase
    .from('approval_requests')
    .update({
      status: 'rejected',
      rejection_reason: validated.comment,
    })
    .eq('id', approvalId)
    .select('*')
    .single();

  if (updateError) {
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // Log de rejeicao
  const serviceClient = getServiceClient();
  await serviceClient.from('approval_logs').insert({
    tenant_id: auth.tenantId,
    approval_request_id: approvalId,
    action: 'rejected',
    actor_type: 'user',
    actor_id: auth.userId,
    comment: validated.comment,
  });

  // Notificar criador da solicitacao
  if (approval.created_by !== auth.userId) {
    await createNotification(serviceClient, {
      tenant_id: auth.tenantId,
      user_id: approval.created_by,
      type: 'approval_responded' as any,
      priority: 'high',
      title: `Aprovacao rejeitada: ${approval.title}`,
      body: `A aprovacao de ${approval.approval_type} para o job ${(approval as any).jobs?.code} foi rejeitada. Motivo: ${validated.comment}`,
      job_id: approval.job_id,
      action_url: `/jobs/${approval.job_id}?tab=aprovacoes`,
    });
  }

  return success(updated);
}
