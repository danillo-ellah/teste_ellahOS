import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// ─── Lista conversas do usuario autenticado ───────────────────────────────────

/**
 * GET /conversations
 * Retorna ate 50 conversas do usuario, ordenadas pela atividade mais recente.
 * RLS filtra automaticamente por tenant_id + user_id.
 */
export async function handleListConversations(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  const { userId, tenantId } = auth;

  console.log(
    `[ai-copilot/conversations] list tenant=${tenantId} user=${userId}`,
  );

  const supabase = getSupabaseClient(auth.token);

  const { data: conversations, error } = await supabase
    .from('ai_conversations')
    .select(
      'id, title, job_id, model_used, message_count, last_message_at, created_at',
    )
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error(
      `[ai-copilot/conversations] erro ao listar conversas tenant=${tenantId}`,
      error,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar conversas', 500);
  }

  return success(conversations ?? []);
}

// ─── Busca mensagens de uma conversa especifica ───────────────────────────────

/**
 * GET /conversations/:id
 * Retorna os metadados da conversa e todas as suas mensagens em ordem cronologica.
 * RLS garante que apenas o dono da conversa consegue acessa-la.
 */
export async function handleGetConversation(
  _req: Request,
  auth: AuthContext,
  conversationId: string,
): Promise<Response> {
  console.log(`[ai-copilot/conversations] get id=${conversationId}`);

  const supabase = getSupabaseClient(auth.token);

  // Verifica existencia e acesso antes de buscar mensagens
  const { data: conversation, error: convError } = await supabase
    .from('ai_conversations')
    .select('id, title, job_id, model_used, message_count, created_at')
    .eq('id', conversationId)
    .is('deleted_at', null)
    .maybeSingle();

  if (convError) {
    console.error(
      `[ai-copilot/conversations] erro ao buscar conversa id=${conversationId}`,
      convError,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar conversa', 500);
  }

  if (!conversation) {
    throw new AppError('NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  // Busca mensagens da conversa em ordem cronologica
  const { data: messages, error: msgError } = await supabase
    .from('ai_conversation_messages')
    .select(
      'id, role, content, sources, model_used, input_tokens, output_tokens, duration_ms, created_at',
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgError) {
    console.error(
      `[ai-copilot/conversations] erro ao buscar mensagens id=${conversationId}`,
      msgError,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar mensagens', 500);
  }

  return success({ conversation, messages: messages ?? [] });
}

// ─── Soft delete de uma conversa ──────────────────────────────────────────────

/**
 * DELETE /conversations/:id
 * Marca a conversa como deletada (deleted_at = now()).
 * RLS garante que apenas o dono pode executar a operacao.
 */
export async function handleDeleteConversation(
  _req: Request,
  auth: AuthContext,
  conversationId: string,
): Promise<Response> {
  console.log(`[ai-copilot/conversations] delete id=${conversationId}`);

  const supabase = getSupabaseClient(auth.token);

  const { data, error } = await supabase
    .from('ai_conversations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', conversationId)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    console.error(
      `[ai-copilot/conversations] erro ao deletar conversa id=${conversationId}`,
      error,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao deletar conversa', 500);
  }

  // Nenhuma row afetada = conversa nao existe ou ja foi deletada
  if (!data || data.length === 0) {
    throw new AppError('NOT_FOUND', 'Conversa nao encontrada', 404);
  }

  return success({ deleted: true });
}
