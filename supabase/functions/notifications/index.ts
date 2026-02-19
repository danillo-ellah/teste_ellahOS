import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { listNotifications } from './handlers/list.ts';
import { getUnreadCount } from './handlers/unread-count.ts';
import { markRead } from './handlers/mark-read.ts';
import { markAllRead } from './handlers/mark-all-read.ts';
import { getPreferences } from './handlers/get-preferences.ts';
import { updatePreferences } from './handlers/update-preferences.ts';

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao
    const auth = await getAuthContext(req);

    // Parsear URL para roteamento
    // Formatos possiveis:
    //   GET  /notifications                     → list
    //   GET  /notifications/unread-count        → unread-count
    //   GET  /notifications/preferences         → get-preferences
    //   PATCH /notifications/preferences        → update-preferences
    //   POST /notifications/mark-all-read       → mark-all-read
    //   PATCH /notifications/:id/read           → mark-read
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    const fnIndex = pathSegments.findIndex(s => s === 'notifications');

    // Segmento imediatamente apos "notifications"
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    // Segmento apos o id (ex: /:id/read)
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    const method = req.method;

    // GET /notifications → lista paginada
    if (method === 'GET' && !segment1) {
      return await listNotifications(req, auth);
    }

    // GET /notifications/unread-count → contagem nao lidas
    if (method === 'GET' && segment1 === 'unread-count') {
      return await getUnreadCount(req, auth);
    }

    // GET /notifications/preferences → buscar preferencias
    if (method === 'GET' && segment1 === 'preferences') {
      return await getPreferences(req, auth);
    }

    // PATCH /notifications/preferences → atualizar preferencias
    if (method === 'PATCH' && segment1 === 'preferences') {
      return await updatePreferences(req, auth);
    }

    // POST /notifications/mark-all-read → marcar todas como lidas
    if (method === 'POST' && segment1 === 'mark-all-read') {
      return await markAllRead(req, auth);
    }

    // PATCH /notifications/:id/read → marcar uma como lida
    if (method === 'PATCH' && segment1 && segment2 === 'read') {
      return await markRead(req, auth, segment1);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo nao permitido', 405);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err);
    console.error('Erro nao tratado em notifications:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
