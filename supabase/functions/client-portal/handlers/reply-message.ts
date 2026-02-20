import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { created } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { validate, z } from '../_shared/validation.ts';
import type { AuthContext } from '../_shared/auth.ts';

const ReplyMessageSchema = z.object({
  content: z.string().min(1, 'Conteudo da mensagem e obrigatorio').max(10000),
  sender_name: z.string().min(1, 'Nome do remetente e obrigatorio').max(200),
  attachments: z
    .array(
      z.object({
        name: z.string().min(1).max(500),
        url: z.string().url('URL do anexo invalida'),
        size: z.number().int().positive().optional(),
      }),
    )
    .max(10, 'Maximo de 10 anexos por mensagem')
    .optional()
    .default([]),
});

// POST /client-portal/sessions/:id/messages
// Produtor responde a mensagem do cliente via portal.
// Autenticado — usa auth.userId como sender_user_id.
export async function replyMessage(
  req: Request,
  auth: AuthContext,
  sessionId: string,
): Promise<Response> {
  // Validar UUID do sessionId
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(sessionId)) {
    throw new AppError('VALIDATION_ERROR', 'ID de sessao invalido', 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Corpo da requisicao invalido (JSON esperado)', 400);
  }

  const validated = validate(ReplyMessageSchema, body);
  const supabase = getSupabaseClient(auth.token);

  console.log(`[client-portal/reply-message] tenant=${auth.tenantId}, session_id=${sessionId}, user_id=${auth.userId}`);

  // Verificar que a sessao existe e pertence ao tenant (RLS garante isolamento)
  const { data: session, error: sessionError } = await supabase
    .from('client_portal_sessions')
    .select('id, tenant_id, job_id, is_active, deleted_at, permissions')
    .eq('id', sessionId)
    .is('deleted_at', null)
    .single();

  if (sessionError || !session) {
    throw new AppError('NOT_FOUND', 'Sessao nao encontrada', 404);
  }

  // Verificar se sessao esta ativa (produtor pode responder mesmo em sessoes expiradas,
  // mas nao em sessoes desativadas ou deletadas)
  if (!session.is_active) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Sessao esta desativada. Reative a sessao antes de responder.', 409);
  }

  // Verificar permissao de mensagens na sessao
  const permissions = session.permissions as { messages?: boolean } | null;
  if (permissions?.messages === false) {
    throw new AppError('FORBIDDEN', 'Mensagens nao estao habilitadas nesta sessao', 403);
  }

  // Idempotency key gerada automaticamente para reply do produtor
  const idempotencyKey = `producer-reply-${sessionId}-${auth.userId}-${Date.now()}`;

  // Inserir resposta do produtor (producer_to_client, sender_user_id = auth.userId)
  const { data: message, error: insertError } = await supabase
    .from('client_portal_messages')
    .insert({
      tenant_id: auth.tenantId,
      session_id: sessionId,
      job_id: session.job_id,
      direction: 'producer_to_client',
      sender_name: validated.sender_name,
      sender_user_id: auth.userId, // produtor autenticado
      content: validated.content,
      attachments: validated.attachments ?? [],
      idempotency_key: idempotencyKey,
    })
    .select(`
      id,
      direction,
      sender_name,
      sender_user_id,
      content,
      attachments,
      read_at,
      created_at
    `)
    .single();

  if (insertError) {
    console.error(`[client-portal/reply-message] erro insert: ${insertError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao enviar resposta', 500);
  }

  console.log(`[client-portal/reply-message] resposta criada: id=${message.id}, job_id=${session.job_id}`);

  return created(message);
}
