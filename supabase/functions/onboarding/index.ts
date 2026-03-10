import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleGetStatus } from './handlers/get-status.ts';
import { handleUpdateCompany } from './handlers/update-company.ts';
import { handleUpdateProfile } from './handlers/update-profile.ts';
import { handleUpdateIntegrations } from './handlers/update-integrations.ts';
import { handleComplete } from './handlers/complete.ts';

// Roteador da Edge Function de onboarding
// Rotas:
//   GET  /onboarding/status       → status do wizard + dados para pre-preenchimento
//   PATCH /onboarding/company     → passo 1: dados da empresa
//   PATCH /onboarding/profile     → passo 2: dados do perfil do usuario
//   PATCH /onboarding/integrations → passo 4: ciencia das integracoes
//   PATCH /onboarding/complete    → passo 5: conclusao do onboarding

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Autenticacao JWT — todas as rotas requerem token valido
    const auth = await getAuthContext(req);

    // Extrair segmento da rota apos /onboarding/
    // Ex: /onboarding/status       -> segment='status'
    // Ex: /onboarding/company      -> segment='company'
    // Ex: /onboarding/profile      -> segment='profile'
    // Ex: /onboarding/integrations -> segment='integrations'
    // Ex: /onboarding/complete     -> segment='complete'
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'onboarding');
    const segment = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;

    const method = req.method;

    console.log('[onboarding/index] request recebido', {
      method,
      segment,
      userId: auth.userId.substring(0, 8),
      tenantId: auth.tenantId.substring(0, 8),
    });

    // GET /onboarding/status
    if (method === 'GET' && segment === 'status') {
      return await handleGetStatus(req, auth);
    }

    // PATCH /onboarding/company
    if (method === 'PATCH' && segment === 'company') {
      return await handleUpdateCompany(req, auth);
    }

    // PATCH /onboarding/profile
    if (method === 'PATCH' && segment === 'profile') {
      return await handleUpdateProfile(req, auth);
    }

    // PATCH /onboarding/integrations
    if (method === 'PATCH' && segment === 'integrations') {
      return await handleUpdateIntegrations(req, auth);
    }

    // PATCH /onboarding/complete
    if (method === 'PATCH' && segment === 'complete') {
      return await handleComplete(req, auth);
    }

    return error(
      'METHOD_NOT_ALLOWED',
      `Rota nao encontrada: ${method} /onboarding/${segment ?? ''}`,
      405,
      undefined,
      req,
    );
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[onboarding] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
