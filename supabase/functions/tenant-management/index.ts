import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleInvite } from './handlers/invite.ts';
import { handleListInvitations } from './handlers/list-invitations.ts';
import { handleRevokeInvitation } from './handlers/revoke-invitation.ts';
import { handleAcceptInvitation } from './handlers/accept-invitation.ts';
import { handleListMembers } from './handlers/list-members.ts';
import { handleUpdateMember } from './handlers/update-member.ts';
import { handleRemoveMember } from './handlers/remove-member.ts';
import { handleGetSettings } from './handlers/get-settings.ts';
import { handleUpdateSettings } from './handlers/update-settings.ts';

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const method = req.method;

    // Extrair segmentos do path apos /tenant-management
    // Ex: /tenant-management/invitations          -> segment1='invitations', segment2=null
    // Ex: /tenant-management/invitations/accept   -> segment1='invitations', segment2='accept'
    // Ex: /tenant-management/invitations/:id      -> segment1='invitations', segment2=uuid
    // Ex: /tenant-management/members              -> segment1='members', segment2=null
    // Ex: /tenant-management/members/:id          -> segment1='members', segment2=uuid
    // Ex: /tenant-management/settings             -> segment1='settings', segment2=null
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'tenant-management');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1]
      : null;
    const segment2 = fnIndex >= 0 && pathSegments.length > fnIndex + 2
      ? pathSegments[fnIndex + 2]
      : null;

    // ----------------------------------------------------------------
    // Rotas PUBLICAS (sem autenticacao)
    // ----------------------------------------------------------------

    // POST /tenant-management/invitations/accept
    if (segment1 === 'invitations' && segment2 === 'accept' && method === 'POST') {
      return await handleAcceptInvitation(req);
    }

    // GET /tenant-management/invitations/details?token=X
    if (segment1 === 'invitations' && segment2 === 'details' && method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return error('VALIDATION_ERROR', 'Token obrigatorio', 400);
      }
      const { getServiceClient } = await import('../_shared/supabase-client.ts');
      const { corsHeaders } = await import('../_shared/cors.ts');
      const service = getServiceClient();
      const { data: invite } = await service
        .from('tenant_invitations')
        .select('id, email, phone, role, expires_at, tenant_id, tenants(name, company_name)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (!invite) {
        return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Convite invalido ou expirado' } }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ data: invite }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ----------------------------------------------------------------
    // Rotas autenticadas — requerem JWT valido
    // ----------------------------------------------------------------
    const auth = await getAuthContext(req);

    // --- Invitations ---

    // GET /tenant-management/invitations
    if (segment1 === 'invitations' && !segment2 && method === 'GET') {
      return await handleListInvitations(req, auth);
    }

    // POST /tenant-management/invitations
    if (segment1 === 'invitations' && !segment2 && method === 'POST') {
      return await handleInvite(req, auth);
    }

    // DELETE /tenant-management/invitations/:id
    if (segment1 === 'invitations' && segment2 && segment2 !== 'accept' && method === 'DELETE') {
      return await handleRevokeInvitation(req, auth, segment2);
    }

    // --- Members ---

    // GET /tenant-management/members
    if (segment1 === 'members' && !segment2 && method === 'GET') {
      return await handleListMembers(req, auth);
    }

    // PATCH /tenant-management/members/:id
    if (segment1 === 'members' && segment2 && method === 'PATCH') {
      return await handleUpdateMember(req, auth, segment2);
    }

    // DELETE /tenant-management/members/:id
    if (segment1 === 'members' && segment2 && method === 'DELETE') {
      return await handleRemoveMember(req, auth, segment2);
    }

    // --- Settings ---

    // GET /tenant-management/settings
    if (segment1 === 'settings' && method === 'GET') {
      return await handleGetSettings(req, auth);
    }

    // PATCH /tenant-management/settings
    if (segment1 === 'settings' && method === 'PATCH') {
      return await handleUpdateSettings(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Rota nao encontrada', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[tenant-management] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
