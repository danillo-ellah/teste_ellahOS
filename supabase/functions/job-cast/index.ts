import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { handleList } from './handlers/list.ts';
import { handleCreate } from './handlers/create.ts';
import { handleUpdate } from './handlers/update.ts';
import { handleDelete } from './handlers/delete.ts';
import { handleImportCsv } from './handlers/import-csv.ts';
import { handleGenerateContracts } from './handlers/generate-contracts.ts';

// Rotas nomeadas que nao devem ser interpretadas como :id
const NAMED_ROUTES = new Set(['import-csv', 'generate-contracts']);

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao JWT
    const auth = await getAuthContext(req);

    const url = new URL(req.url);
    const method = req.method;

    // Parsear URL para roteamento
    // Formato esperado: /functions/v1/job-cast[/segment1]
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'job-cast');
    const segment1 =
      fnIndex >= 0 && pathSegments.length > fnIndex + 1
        ? pathSegments[fnIndex + 1]
        : null;

    console.log('[job-cast/index] request recebido', {
      method,
      segment1,
      userId: auth.userId,
      tenantId: auth.tenantId,
    });

    // POST /job-cast/import-csv — importar elenco a partir de CSV
    if (segment1 === 'import-csv' && method === 'POST') {
      return await handleImportCsv(req, auth);
    }

    // POST /job-cast/generate-contracts — gerar contratos DocuSeal do elenco
    if (segment1 === 'generate-contracts' && method === 'POST') {
      return await handleGenerateContracts(req, auth);
    }

    // GET /job-cast?job_id=X — listar membros do elenco de um job
    if (!segment1 && method === 'GET') {
      return await handleList(req, auth);
    }

    // POST /job-cast — criar membro do elenco
    if (!segment1 && method === 'POST') {
      return await handleCreate(req, auth);
    }

    // Rotas por :id (apenas quando nao e rota nomeada)
    if (segment1 && !NAMED_ROUTES.has(segment1)) {
      // PATCH /job-cast/:id — atualizar membro do elenco
      if (method === 'PATCH') {
        return await handleUpdate(req, auth, segment1);
      }

      // DELETE /job-cast/:id — deletar membro do elenco
      if (method === 'DELETE') {
        return await handleDelete(req, auth, segment1);
      }
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[job-cast] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
