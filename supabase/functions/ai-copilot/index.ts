import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from './_shared/cors.ts';
import { getAuthContext } from './_shared/auth.ts';
import { error, fromAppError } from './_shared/response.ts';
import { AppError } from './_shared/errors.ts';
import { handleChat, handleChatSync } from './handlers/chat.ts';
import {
  handleListConversations,
  handleGetConversation,
  handleDeleteConversation,
} from './handlers/conversations.ts';

// Roteamento:
// POST   /ai-copilot/chat                  -> Chat com streaming SSE
// POST   /ai-copilot/chat-sync             -> Chat sem streaming (resposta completa)
// GET    /ai-copilot/conversations          -> Lista conversas do usuario
// GET    /ai-copilot/conversations/:id      -> Busca mensagens de uma conversa
// DELETE /ai-copilot/conversations/:id      -> Deleta uma conversa (soft delete)

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Todos os endpoints sao autenticados
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'ai-copilot');

    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;

    const segment2 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 2
        ? pathSegments[fnIndex + 2]
        : null;

    const method = req.method;

    // POST /chat
    if (method === 'POST' && segment1 === 'chat' && !segment2) {
      return await handleChat(req, auth);
    }

    // POST /chat-sync
    if (method === 'POST' && segment1 === 'chat-sync') {
      return await handleChatSync(req, auth);
    }

    // GET /conversations
    if (method === 'GET' && segment1 === 'conversations' && !segment2) {
      return await handleListConversations(req, auth);
    }

    // GET /conversations/:id
    if (method === 'GET' && segment1 === 'conversations' && segment2) {
      return await handleGetConversation(req, auth, segment2);
    }

    // DELETE /conversations/:id
    if (method === 'DELETE' && segment1 === 'conversations' && segment2) {
      return await handleDeleteConversation(req, auth, segment2);
    }

    return error('NOT_FOUND', 'Rota nao encontrada', 404);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em ai-copilot:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
