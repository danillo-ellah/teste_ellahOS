import { getServiceClient } from '../_shared/supabase-client.ts';
import { success, error } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { validate, z } from '../_shared/validation.ts';
import { createNotification } from '../_shared/notification-helper.ts';

const RespondSchema = z.object({
  action: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Acao deve ser "approved" ou "rejected"' }),
  }),
  comment: z.string().max(5000).optional().nullable(),
}).refine(
  (data) => data.action !== 'rejected' || (data.comment && data.comment.length > 0),
  { message: 'Comentario obrigatorio para rejeicao' },
);

// POST /approvals/public/:token/respond — resposta do aprovador (publico, sem auth)
export async function respond(
  req: Request,
  token: string,
): Promise<Response> {
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return error('NOT_FOUND', 'Token invalido', 404);
  }

  // Validar Origin (FASE6-ALTO-002)
  const origin = req.headers.get('origin') ?? '';
  const siteUrl = Deno.env.get('SITE_URL') ?? '';
  const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isSiteUrl = siteUrl !== '' && origin === siteUrl;
  if (!isLocalhost && !isSiteUrl) {
    console.warn(`[approvals/respond] origem rejeitada: "${origin}"`);
    return error('FORBIDDEN', 'Origem nao autorizada', 403);
  }

  const serviceClient = getServiceClient();

  // Buscar aprovacao pelo token
  const { data: approval, error: fetchError } = await serviceClient
    .from('approval_requests')
    .select('id, tenant_id, job_id, status, expires_at, created_by, title, approval_type, jobs(code, title)')
    .eq('token', token)
    .is('deleted_at', null)
    .single();

  if (fetchError || !approval) {
    return error('NOT_FOUND', 'Solicitacao de aprovacao nao encontrada', 404);
  }

  // Verificar expiracao
  if (new Date(approval.expires_at) < new Date()) {
    return error('BUSINESS_RULE_VIOLATION', 'Este link de aprovacao expirou', 410);
  }

  // Verificar status
  if (approval.status !== 'pending') {
    return error('BUSINESS_RULE_VIOLATION', `Esta aprovacao ja foi ${approval.status}`, 409);
  }

  // Rate limiting: contar logs na ultima hora para este request (max 5 por hora)
  const { count } = await serviceClient
    .from('approval_logs')
    .select('id', { count: 'exact', head: true })
    .eq('approval_request_id', approval.id)
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());

  if (count && count >= 5) {
    console.warn(`[approvals/respond] rate limit atingido para approval ${approval.id}: ${count} tentativas`);
    return error('BUSINESS_RULE_VIOLATION', 'Muitas tentativas. Tente novamente em 1 hora.', 429);
  }

  // Validar payload
  const body = await req.json();
  const validated = validate(RespondSchema, body);

  // Capturar IP do request
  const clientIp = req.headers.get('x-forwarded-for')
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'unknown';

  // Atualizar aprovacao
  const updates: Record<string, unknown> = {
    status: validated.action,
    approved_ip: clientIp,
  };

  if (validated.action === 'approved') {
    updates.approved_at = new Date().toISOString();
  } else {
    updates.rejection_reason = validated.comment ?? null;
  }

  const { error: updateError } = await serviceClient
    .from('approval_requests')
    .update(updates)
    .eq('id', approval.id);

  if (updateError) {
    console.error('[approvals/respond] erro update:', updateError.message);
    return error('INTERNAL_ERROR', 'Erro ao processar resposta', 500);
  }

  // Log de resposta
  await serviceClient.from('approval_logs').insert({
    tenant_id: approval.tenant_id,
    approval_request_id: approval.id,
    action: validated.action,
    actor_type: 'external',
    actor_ip: clientIp,
    comment: validated.comment ?? null,
  });

  // Notificar criador da solicitacao (in-app)
  const actionLabel = validated.action === 'approved' ? 'aprovada' : 'rejeitada';
  await createNotification(serviceClient, {
    tenant_id: approval.tenant_id,
    user_id: approval.created_by,
    type: 'approval_responded',
    priority: validated.action === 'rejected' ? 'high' : 'normal',
    title: `Aprovacao ${actionLabel}: ${approval.title}`,
    body: `A aprovacao de ${approval.approval_type} para o job ${(approval as any).jobs?.code} foi ${actionLabel} pelo cliente${validated.comment ? `. Motivo: ${validated.comment}` : ''}`,
    job_id: approval.job_id,
    action_url: `/jobs/${approval.job_id}?tab=aprovacoes`,
  });

  return success({
    status: validated.action,
    message: validated.action === 'approved'
      ? 'Aprovacao registrada com sucesso!'
      : 'Rejeicao registrada com sucesso.',
  });
}
