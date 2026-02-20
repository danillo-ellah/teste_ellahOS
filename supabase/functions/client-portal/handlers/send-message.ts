import { getServiceClient } from '../_shared/supabase-client.ts';
import { success, error } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { validate, z } from '../_shared/validation.ts';
import { notifyJobTeam } from '../_shared/notification-helper.ts';

// UUID v4 regex para validacao de formato
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rate limiting: maximo de mensagens por hora por sessao
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hora em milissegundos

const SendMessageSchema = z.object({
  sender_name: z.string().min(1, 'Nome do remetente e obrigatorio').max(200),
  content: z.string().min(1, 'Conteudo da mensagem e obrigatorio').max(10000),
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
  idempotency_key: z.string().max(200).optional().nullable(),
});

// POST /client-portal/public/:token/message
// Endpoint publico — cliente envia mensagem para a producao.
// Usa service_role para inserir pois cliente nao tem JWT.
export async function sendMessage(
  req: Request,
  token: string,
): Promise<Response> {
  // Validar formato UUID do token
  if (!UUID_REGEX.test(token)) {
    return error('NOT_FOUND', 'Token invalido', 404);
  }

  const serviceClient = getServiceClient();

  // Buscar sessao pelo token (validar existencia, status ativo e permissao de mensagens)
  const { data: session, error: sessionError } = await serviceClient
    .from('client_portal_sessions')
    .select('id, tenant_id, job_id, is_active, expires_at, permissions')
    .eq('token', token)
    .is('deleted_at', null)
    .single();

  if (sessionError || !session) {
    return error('NOT_FOUND', 'Portal nao encontrado ou inativo', 404);
  }

  // Verificar se sessao esta ativa
  if (!session.is_active) {
    return error('BUSINESS_RULE_VIOLATION', 'Este link de acesso esta desativado', 403);
  }

  // Verificar expiracao
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return error('BUSINESS_RULE_VIOLATION', 'Este link de acesso expirou. Entre em contato com a producao para solicitar um novo link.', 410);
  }

  // Verificar permissao de mensagens
  const permissions = session.permissions as { messages?: boolean } | null;
  if (permissions?.messages === false) {
    return error('FORBIDDEN', 'Mensagens nao estao habilitadas neste portal', 403);
  }

  // Rate limiting: contar mensagens client_to_producer da ultima hora para esta sessao
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error: countError } = await serviceClient
    .from('client_portal_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('direction', 'client_to_producer')
    .gte('created_at', windowStart);

  if (countError) {
    console.error(`[client-portal/send-message] erro rate limit check: ${countError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar limite de mensagens', 500);
  }

  if (count && count >= RATE_LIMIT_MAX) {
    console.warn(`[client-portal/send-message] rate limit atingido para sessao ${session.id}: ${count} mensagens na ultima hora`);
    return error('BUSINESS_RULE_VIOLATION', `Limite de ${RATE_LIMIT_MAX} mensagens por hora atingido. Aguarde antes de enviar mais mensagens.`, 429);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Corpo da requisicao invalido (JSON esperado)', 400);
  }

  const validated = validate(SendMessageSchema, body);

  // Gerar idempotency_key se nao fornecido
  const idempotencyKey = validated.idempotency_key ?? `${session.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  console.log(`[client-portal/send-message] sessao=${session.id}, remetente="${validated.sender_name}", idempotency_key=${idempotencyKey}`);

  // Inserir mensagem do cliente (client_to_producer, sender_user_id = null)
  const { data: message, error: insertError } = await serviceClient
    .from('client_portal_messages')
    .insert({
      tenant_id: session.tenant_id,
      session_id: session.id,
      job_id: session.job_id,
      direction: 'client_to_producer',
      sender_name: validated.sender_name,
      sender_user_id: null, // cliente nao tem usuario no sistema
      content: validated.content,
      attachments: validated.attachments ?? [],
      idempotency_key: idempotencyKey,
    })
    .select('id, direction, sender_name, content, attachments, created_at')
    .single();

  if (insertError) {
    // Conflito de idempotency_key: mensagem ja foi enviada (operacao idempotente)
    if (insertError.code === '23505') {
      console.log(`[client-portal/send-message] mensagem duplicada ignorada (idempotency_key=${idempotencyKey})`);
      return success({ message: 'Mensagem ja registrada anteriormente.' });
    }
    console.error(`[client-portal/send-message] erro insert: ${insertError.message}`);
    return error('INTERNAL_ERROR', 'Erro ao enviar mensagem', 500);
  }

  // Notificar equipe do job sobre nova mensagem do cliente (best-effort, nao bloqueia resposta)
  notifyJobTeam(serviceClient, session.job_id, {
    tenant_id: session.tenant_id,
    type: 'portal_message_received',
    priority: 'normal',
    title: `Nova mensagem do cliente: ${validated.sender_name}`,
    body: validated.content.length > 200
      ? `${validated.content.slice(0, 197)}...`
      : validated.content,
    job_id: session.job_id,
    action_url: `/jobs/${session.job_id}?tab=portal`,
  }).catch((notifyErr: Error) => {
    console.warn(`[client-portal/send-message] falha ao notificar equipe (non-fatal): ${notifyErr.message}`);
  });

  console.log(`[client-portal/send-message] mensagem criada: id=${message.id}`);

  return success(message, 201);
}
