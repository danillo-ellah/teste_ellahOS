import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleTemplatesList } from './handlers/list.ts';
import { handleTemplatesCreate } from './handlers/create.ts';
import { handleTemplatesUpdate } from './handlers/update.ts';
import { handleTemplatesDeactivate } from './handlers/deactivate.ts';
import { handleTemplatesSeed } from './handlers/seed.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /preproduction-templates
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'preproduction-templates');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    // -------------------------------------------------------
    // POST /preproduction-templates/seed
    // Verificado ANTES de interpretar segment1 como :id
    // -------------------------------------------------------
    if (segment1 === 'seed' && method === 'POST') {
      return await handleTemplatesSeed(req, auth);
    }

    // -------------------------------------------------------
    // GET /preproduction-templates
    // -------------------------------------------------------
    if (!segment1 && method === 'GET') {
      return await handleTemplatesList(req, auth);
    }

    // -------------------------------------------------------
    // POST /preproduction-templates
    // -------------------------------------------------------
    if (!segment1 && method === 'POST') {
      return await handleTemplatesCreate(req, auth);
    }

    // -------------------------------------------------------
    // PATCH /preproduction-templates/:id
    // -------------------------------------------------------
    if (segment1 && method === 'PATCH') {
      return await handleTemplatesUpdate(req, auth, segment1);
    }

    // -------------------------------------------------------
    // DELETE /preproduction-templates/:id
    // -------------------------------------------------------
    if (segment1 && method === 'DELETE') {
      return await handleTemplatesDeactivate(req, auth, segment1);
    }

    return error('METHOD_NOT_ALLOWED', 'Metodo ou rota nao permitido', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[preproduction-templates] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
