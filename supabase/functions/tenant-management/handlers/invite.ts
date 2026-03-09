import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { sendFallbackEmail } from '../../_shared/email-fallback.ts';
import { buildNotificationEmail } from '../../_shared/email-template.ts';

// Roles que podem enviar convites
const ADMIN_ROLES = ['admin', 'ceo'];

const VALID_ROLES = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'diretor',
  'financeiro',
  'assistente',
  'membro',
  'freelancer',
] as const;

const InviteSchema = z
  .object({
    email: z.string().email('Email invalido').optional(),
    phone: z.string().min(10, 'Telefone deve ter pelo menos 10 caracteres').optional(),
    role: z.enum(VALID_ROLES).default('membro'),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Email ou telefone e obrigatorio',
  });

/**
 * POST /tenant-management/invitations
 * Cria um convite para um novo usuario entrar no tenant.
 * Apenas admin/ceo podem convidar.
 */
export async function handleInvite(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[tenant-management/invite] criando convite', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas administradores podem enviar convites', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = InviteSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar se ja existe convite pendente para este email/phone no tenant
  if (data.email) {
    const { data: existing } = await client
      .from('tenant_invitations')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('email', data.email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      throw new AppError(
        'CONFLICT',
        'Ja existe um convite pendente para este email',
        409,
        { email: data.email },
      );
    }
  }

  if (data.phone) {
    const { data: existing } = await client
      .from('tenant_invitations')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('phone', data.phone)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existing) {
      throw new AppError(
        'CONFLICT',
        'Ja existe um convite pendente para este telefone',
        409,
        { phone: data.phone },
      );
    }
  }

  const { data: invitation, error: insertError } = await client
    .from('tenant_invitations')
    .insert({
      tenant_id: auth.tenantId,
      email: data.email ?? null,
      phone: data.phone ?? null,
      role: data.role,
      invited_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[tenant-management/invite] erro ao criar convite:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar convite', 500, {
      detail: insertError.message,
    });
  }

  // Construir URL de aceite (frontend, nao EF)
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://teste-ellah-os.vercel.app';
  const acceptUrl = `${siteUrl}/invite/${invitation.token}`;

  console.log('[tenant-management/invite] convite criado', {
    id: invitation.id,
    tenantId: auth.tenantId,
  });

  // Buscar nome do tenant para personalizar o email
  let tenantName = 'ELLAHOS';
  try {
    const { data: tenant } = await client
      .from('tenants')
      .select('name')
      .eq('id', auth.tenantId)
      .single();
    if (tenant?.name) tenantName = tenant.name;
  } catch { /* usa default */ }

  // Enviar email de convite (se email fornecido e RESEND_API_KEY configurada)
  let emailSent = false;
  if (data.email) {
    try {
      const html = buildNotificationEmail({
        title: `Convite para ${tenantName}`,
        body: `Voce foi convidado para participar da equipe ${tenantName} como ${data.role}. Clique no botao abaixo para aceitar o convite. O convite expira em 7 dias.`,
        actionUrl: acceptUrl,
        actionLabel: 'Aceitar Convite',
      });

      emailSent = await sendFallbackEmail(
        data.email,
        `Convite para ${tenantName} — ELLAHOS`,
        html,
      );

      console.log('[tenant-management/invite] email resultado:', { emailSent, to: data.email });
    } catch (err) {
      console.warn('[tenant-management/invite] erro ao enviar email (nao-bloqueante):', err);
    }
  }

  return created(
    {
      ...invitation,
      accept_url: acceptUrl,
      email_sent: emailSent,
    },
    req,
  );
}
