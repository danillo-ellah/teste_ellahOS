import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// GET /client-portal/sessions/:id/messages
// Lista todas as mensagens de uma sessao especifica.
// Inclui mensagens do cliente (client_to_producer) e do produtor (producer_to_client).
// Paginacao simples via cursor (before_id) para historico longo.
export async function listMessages(
  req: Request,
  auth: AuthContext,
  sessionId: string,
): Promise<Response> {
  // Validar UUID do sessionId
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(sessionId)) {
    throw new AppError('VALIDATION_ERROR', 'ID de sessao invalido', 400);
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);
  const beforeId = url.searchParams.get('before_id');

  const supabase = getSupabaseClient(auth.token);

  console.log(`[client-portal/list-messages] tenant=${auth.tenantId}, session_id=${sessionId}, limit=${limit}`);

  // Verificar que a sessao existe e pertence ao tenant (RLS garante isolamento)
  const { data: session, error: sessionError } = await supabase
    .from('client_portal_sessions')
    .select('id, job_id')
    .eq('id', sessionId)
    .is('deleted_at', null)
    .single();

  if (sessionError || !session) {
    throw new AppError('NOT_FOUND', 'Sessao nao encontrada', 404);
  }

  // Buscar mensagens ordenadas por data (mais antigas primeiro — padrao de chat)
  let query = supabase
    .from('client_portal_messages')
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
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(limit);

  // Cursor: buscar mensagens anteriores a um ID especifico (paginacao regressiva)
  if (beforeId) {
    if (!UUID_REGEX.test(beforeId)) {
      throw new AppError('VALIDATION_ERROR', 'before_id deve ser um UUID valido', 400);
    }
    // Buscar o created_at do cursor para paginacao por timestamp
    const { data: cursorMsg } = await supabase
      .from('client_portal_messages')
      .select('created_at')
      .eq('id', beforeId)
      .single();

    if (cursorMsg) {
      query = query.lt('created_at', cursorMsg.created_at);
    }
  }

  const { data: messages, error: fetchError } = await query;

  if (fetchError) {
    console.error(`[client-portal/list-messages] erro: ${fetchError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar mensagens', 500);
  }

  // Marcar mensagens do cliente como lidas (producer visualizou)
  // Apenas mensagens client_to_producer sem read_at
  const unreadIds = (messages ?? [])
    .filter(m => m.direction === 'client_to_producer' && !m.read_at)
    .map(m => m.id);

  if (unreadIds.length > 0) {
    await supabase
      .from('client_portal_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .then(({ error: readError }) => {
        if (readError) {
          console.warn(`[client-portal/list-messages] falha ao marcar mensagens como lidas: ${readError.message}`);
        }
      });
  }

  console.log(`[client-portal/list-messages] ${(messages ?? []).length} mensagens retornadas para sessao ${sessionId}`);

  return success({
    messages: messages ?? [],
    session_id: sessionId,
    job_id: session.job_id,
  });
}
