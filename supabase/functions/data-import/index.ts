import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleImportClients } from './handlers/import-clients.ts';
import { handleImportContacts } from './handlers/import-contacts.ts';
import { handleImportJobs } from './handlers/import-jobs.ts';
import { handleListLogs } from './handlers/list-logs.ts';

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /data-import
    // Ex: /data-import/clients   -> segment1 = 'clients'
    // Ex: /data-import/logs      -> segment1 = 'logs'
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'data-import');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    // Todas as rotas desta EF requerem JWT valido
    const auth = await getAuthContext(req);

    // POST /data-import/clients — importar clientes em massa
    if (segment1 === 'clients' && method === 'POST') {
      return await handleImportClients(req, auth);
    }

    // POST /data-import/contacts — importar contatos em massa
    if (segment1 === 'contacts' && method === 'POST') {
      return await handleImportContacts(req, auth);
    }

    // POST /data-import/jobs — importar jobs em massa
    if (segment1 === 'jobs' && method === 'POST') {
      return await handleImportJobs(req, auth);
    }

    // GET /data-import/logs — listar historico de importacoes do tenant
    if (segment1 === 'logs' && method === 'GET') {
      return await handleListLogs(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[data-import] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
