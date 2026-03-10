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

  // Tentar extrair user_id e email do Authorization header se nao foi fornecido no body
  let resolvedUserId = user_id;
  let resolvedUserEmail: string | null = null;
  if (!resolvedUserId) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const jwtToken = authHeader.replace('Bearer ', '');
      try {
        const serviceClient = getServiceClient();
        const { data: { user } } = await serviceClient.auth.getUser(jwtToken);
        if (user?.id) {
          resolvedUserId = user.id;
          resolvedUserEmail = user.email ?? null;
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
      accepted_by,
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
    // Idempotente: se ja aceito pelo mesmo usuario, retornar sucesso
    if (resolvedUserId && invitation.accepted_by === resolvedUserId) {
      console.log('[tenant-management/accept-invitation] convite ja aceito pelo mesmo usuario (idempotente)');
      return jsonPublic(
        {
          data: {
            invitation_id: invitation.id,
            tenant: invitation.tenant,
            role: invitation.role,
            user_id: resolvedUserId,
            accepted: true,
            already_accepted: true,
          },
        },
        200,
      );
    }
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

  // Verificar se o email do usuario logado corresponde ao email do convite
  // Previne que usuario A aceite convite destinado ao usuario B
  if (resolvedUserEmail && invitation.email) {
    if (resolvedUserEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      console.warn('[tenant-management/accept-invitation] email mismatch', {
        userEmail: resolvedUserEmail.substring(0, 3) + '***',
        inviteEmail: invitation.email.substring(0, 3) + '***',
      });
      return jsonPublic(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Este convite foi enviado para outro email. Faca login com o email correto.',
          },
        },
        403,
      );
    }
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

  // Criar profile do convidado e atualizar app_meta_data (requer service client)
  if (resolvedUserId) {
    // Buscar dados do auth.users para obter full_name do user_metadata
    let fullName: string | null = null;
    try {
      const { data: { user: authUser } } = await service.auth.admin.getUserById(resolvedUserId);
      fullName = authUser?.user_metadata?.full_name ?? authUser?.user_metadata?.name ?? null;
    } catch (err) {
      console.warn(
        '[tenant-management/accept-invitation] nao foi possivel buscar user_metadata:',
        err,
      );
    }

    // Upsert profile — idempotente caso o perfil ja exista
    const { error: profileError } = await service
      .from('profiles')
      .upsert(
        {
          id: resolvedUserId,
          tenant_id: invitation.tenant_id,
          email: invitation.email ?? null,
          full_name: fullName,
          role: invitation.role,
        },
        { onConflict: 'id' },
      );

    if (profileError) {
      console.error(
        '[tenant-management/accept-invitation] erro ao criar profile:',
        profileError.message.substring(0, 120),
      );
      // Nao bloqueia — retorna sucesso parcial para nao deixar o convite em estado inconsistente
    } else {
      console.log('[tenant-management/accept-invitation] profile criado/atualizado', {
        userId: resolvedUserId.substring(0, 8),
        tenantId: invitation.tenant_id.substring(0, 8),
      });
    }

    // Atualizar app_meta_data para que o JWT subsequente inclua tenant_id e role
    try {
      await service.auth.admin.updateUserById(resolvedUserId, {
        app_metadata: {
          tenant_id: invitation.tenant_id,
          role: invitation.role,
        },
      });
    } catch (err) {
      console.warn(
        '[tenant-management/accept-invitation] erro ao atualizar app_metadata:',
        err,
      );
    }
  }

  console.log('[tenant-management/accept-invitation] convite aceito', {
    invitationId: invitation.id,
    tenantId: invitation.tenant_id,
    resolvedUserId: resolvedUserId?.substring(0, 8),
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
