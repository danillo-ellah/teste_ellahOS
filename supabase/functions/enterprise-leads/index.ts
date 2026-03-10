import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { error } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleSubmit } from './handlers/submit.ts';

// Endpoint PUBLICO — sem JWT.
// POST /enterprise-leads ou POST /enterprise-leads/submit

Deno.serve(async (req: Request) => {
  // CORS pre-flight — wildcard (endpoint publico)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      return await handleSubmit(req);
    }

    return error('METHOD_NOT_ALLOWED', 'Apenas POST permitido', 405);
  } catch (err) {
    if (err instanceof AppError) {
      return error(err.code, err.message, err.statusCode, err.details);
    }
    console.error('[enterprise-leads] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
});
