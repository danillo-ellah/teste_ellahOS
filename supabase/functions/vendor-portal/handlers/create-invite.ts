import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, z } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const CreateInviteSchema = z.object({
  // Se informado, associa o convite a um vendor existente (reenvio/atualizacao)
  vendor_id:    z.string().uuid('vendor_id deve ser UUID valido').optional().nullable(),

  // Contexto opcional do job (rastreabilidade)
  job_id:       z.string().uuid('job_id deve ser UUID valido').optional().nullable(),

  // Dados pre-preenchidos no formulario — opcionais
  email:        z.string().email('E-mail invalido').max(300).optional().nullable(),
  name:         z.string().max(300).optional().nullable(),

  // Validade em dias (padrao: 30)
  expires_days: z.number().int().min(1).max(365).optional(),
});

// POST /vendor-portal/invite — admin cria um convite de auto-cadastro para fornecedor
export async function createInvite(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Apenas admins, ceos e financeiros podem criar convites
  const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro', 'producer'];
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar convites', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const validated = validate(CreateInviteSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar que o vendor existe no tenant (se informado)
  if (validated.vendor_id) {
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, full_name, email')
      .eq('id', validated.vendor_id)
      .is('deleted_at', null)
      .single();

    if (vendorError || !vendor) {
      throw new AppError('NOT_FOUND', 'Fornecedor nao encontrado', 404);
    }
  }

  // Verificar que o job existe no tenant (se informado)
  if (validated.job_id) {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', validated.job_id)
      .is('deleted_at', null)
      .single();

    if (jobError || !job) {
      throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
    }
  }

  // Calcular expiracao
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (validated.expires_days ?? 30));

  // Criar token de convite (service client para garantir insert sem RLS de SELECT)
  const serviceClient = getServiceClient();
  const { data: invite, error: insertError } = await serviceClient
    .from('vendor_invite_tokens')
    .insert({
      tenant_id:  auth.tenantId,
      vendor_id:  validated.vendor_id ?? null,
      job_id:     validated.job_id ?? null,
      email:      validated.email ?? null,
      name:       validated.name ?? null,
      expires_at: expiresAt.toISOString(),
      created_by: auth.userId,
    })
    .select('id, token, email, name, expires_at, vendor_id, job_id, created_at')
    .single();

  if (insertError || !invite) {
    console.error('[vendor-portal/create-invite] erro insert:', insertError?.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar convite', 500);
  }

  // Montar a URL publica do portal
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://teste-ellah-os.vercel.app';
  const portalUrl = `${siteUrl}/vendor/${invite.token}`;

  return created({
    ...invite,
    portal_url: portalUrl,
  }, req);
}
