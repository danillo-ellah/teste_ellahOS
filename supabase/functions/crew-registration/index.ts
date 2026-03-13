import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { error } from '../_shared/response.ts'
import { AppError } from '../_shared/errors.ts'

import { handleEnable } from './handlers/enable.ts'
import { handlePublicInfo } from './handlers/public-info.ts'
import { handlePublicLookup } from './handlers/public-lookup.ts'
import { handlePublicSubmit } from './handlers/public-submit.ts'
import { handleListRegistrations } from './handlers/list-registrations.ts'

// Roteamento:
//
// --- AUTENTICADAS ---
// POST /crew-registration/enable                       -> enable
// GET  /crew-registration/registrations/:jobId        -> list-registrations
//
// --- PUBLICAS (sem auth) ---
// GET  /crew-registration/public/:token               -> public-info
// POST /crew-registration/public/:token/lookup        -> public-lookup
// POST /crew-registration/public/:token/submit        -> public-submit

Deno.serve(async (req: Request) => {
  // Preflight OPTIONS — para rotas publicas aceitar qualquer origin
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    const fnIndex = pathSegments.findIndex((s) => s === 'crew-registration')

    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null
    const segment3 = fnIndex >= 0 && pathSegments.length > fnIndex + 3
      ? pathSegments[fnIndex + 3]
      : null

    const method = req.method

    // ----------------------------------------------------------------
    // POST /crew-registration/enable (autenticado)
    // ----------------------------------------------------------------
    if (segment1 === 'enable' && !segment2 && method === 'POST') {
      return await handleEnable(req)
    }

    // ----------------------------------------------------------------
    // GET /crew-registration/registrations/:jobId (autenticado)
    // ----------------------------------------------------------------
    if (segment1 === 'registrations' && segment2 && !segment3 && method === 'GET') {
      return await handleListRegistrations(req, segment2)
    }

    // ----------------------------------------------------------------
    // Rotas publicas — CORS wildcard (formulario publico)
    // ----------------------------------------------------------------
    if (segment1 === 'public' && segment2) {
      const token = segment2

      // GET /crew-registration/public/:token
      if (!segment3 && method === 'GET') {
        return await handlePublicInfo(req, token)
      }

      // POST /crew-registration/public/:token/lookup
      if (segment3 === 'lookup' && method === 'POST') {
        return await handlePublicLookup(req, token)
      }

      // POST /crew-registration/public/:token/submit
      if (segment3 === 'submit' && method === 'POST') {
        return await handlePublicSubmit(req, token)
      }

      return new Response(
        JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Metodo nao permitido' } }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ----------------------------------------------------------------
    // Rota nao encontrada
    // ----------------------------------------------------------------
    return error('NOT_FOUND', 'Rota nao encontrada', 404)
  } catch (err) {
    if (err instanceof AppError) {
      return new Response(
        JSON.stringify({ error: { code: err.code, message: err.message } }),
        { status: err.statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    console.error('[crew-registration] erro nao tratado:', err)
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500)
  }
})
