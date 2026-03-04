import { z } from 'https://esm.sh/zod@3.22.4';
import { AppError } from '../../_shared/errors.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';

// Schema de aceite — token obrigatorio, user_id opcional (usuario logado)
const AcceptSchema = z.object({
  token: z.string().min(1, 'Token obrigatorio'),
  user_id: z.string().uuid().optional(),
});

// Monta Response JSON com CORS wildcard (endpoint publico)
function jsonPublic(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * POST /tenant-management/invitations/accept
 * Endpoint PUBLICO — nao requer JWT.
 * Aceita um convite pelo token. Se user_id for fornecido, vincula ao perfil existente.
 * Usa service client para bypass de RLS (token nao pertence ao tenant ainda).
 */
export async function handleAcceptInvitation(req: Request): Promise<Response> {
  console.log('[tenant-management/accept-invitation] processando aceite de convite');

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonPublic({ error: { code: 'VALIDATION_ERROR', message: 'Body JSON invalido' } }, 400);
  }

  const parseResult = AcceptSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonPublic(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados invalidos',
          details: { issues: parseResult.error.issues },
        },
      },
      400,
    );
  }

  const { token, user_id } = parseResult.data;

  // Tentar extrair user_id do Authorization header se nao foi fornecido no body
  let resolvedUserId = user_id;
  if (!resolvedUserId) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const jwtToken = authHeader.replace('Bearer ', '');
      try {
        const serviceClient = getServiceClient();
        const { data: { user } } = await serviceClient.auth.getUser(jwtToken);
        if (user?.id) {
          resolvedUserId = user.id;
        }
      } catch {
        // Ignora erro — continua sem user_id
      }
    }
  }

  const service = getServiceClient();

  // Buscar convite pelo token (bypass RLS via service client)
  const { data: invitation, error: fetchError } = await service
    .from('tenant_invitations')
    .select(
      `
      id,
      tenant_id,
      email,
      phone,
      role,
      accepted_at,
      expires_at,
      tenant:tenants!tenant_invitations_tenant_id_fkey(
        id,
        name,
        slug,
        logo_url,
        brand_color,
        company_name
      )
    `,
    )
    .eq('token', token)
    .maybeSingle();

  if (fetchError) {
    console.error(
      '[tenant-management/accept-invitation] erro ao buscar convite:',
      fetchError.message,
    );
    return jsonPublic(
      { error: { code: 'INTERNAL_ERROR', message: 'Erro ao validar convite' } },
      500,
    );
  }

  if (!invitation) {
    return jsonPublic({ error: { code: 'NOT_FOUND', message: 'Convite nao encontrado ou invalido' } }, 404);
  }

  if (invitation.accepted_at) {
    return jsonPublic(
      { error: { code: 'CONFLICT', message: 'Este convite ja foi aceito' } },
      409,
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return jsonPublic(
      { error: { code: 'BUSINESS_RULE_VIOLATION', message: 'Este convite expirou' } },
      422,
    );
  }

  // Marcar convite como aceito
  const { error: updateError } = await service
    .from('tenant_invitations')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: resolvedUserId ?? null,
    })
    .eq('id', invitation.id);

  if (updateError) {
    console.error(
      '[tenant-management/accept-invitation] erro ao marcar aceito:',
      updateError.message,
    );
    return jsonPublic(
      { error: { code: 'INTERNAL_ERROR', message: 'Erro ao processar aceite' } },
      500,
    );
  }

  console.log('[tenant-management/accept-invitation] convite aceito', {
    invitationId: invitation.id,
    tenantId: invitation.tenant_id,
    resolvedUserId,
  });

  return jsonPublic(
    {
      data: {
        invitation_id: invitation.id,
        tenant: invitation.tenant,
        role: invitation.role,
        user_id: resolvedUserId ?? null,
        accepted: true,
      },
    },
    200,
  );
}
