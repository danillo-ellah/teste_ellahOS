import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { validate, z } from '../_shared/validation.ts';
import type { AuthContext } from '../_shared/auth.ts';

const PermissionsSchema = z.object({
  timeline: z.boolean(),
  documents: z.boolean(),
  approvals: z.boolean(),
  messages: z.boolean(),
});

const UpdateSessionSchema = z
  .object({
    label: z.string().min(1).max(500),
    is_active: z.boolean(),
    permissions: PermissionsSchema,
    expires_at: z.string().datetime({ message: 'expires_at deve ser ISO 8601 valido' }).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

// PATCH /client-portal/sessions/:id
// Atualiza uma sessao existente: ativa/desativa, muda permissoes, label, expiracao.
export async function updateSession(
  req: Request,
  auth: AuthContext,
  sessionId: string,
): Promise<Response> {
  // Validar UUID do sessionId
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(sessionId)) {
    throw new AppError('VALIDATION_ERROR', 'ID de sessao invalido', 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Corpo da requisicao invalido (JSON esperado)', 400);
  }

  const validated = validate(UpdateSessionSchema, body);
  const supabase = getSupabaseClient(auth.token);

  console.log(`[client-portal/update-session] tenant=${auth.tenantId}, session_id=${sessionId}`);

  // Verificar que a sessao existe (RLS garante isolamento por tenant)
  const { data: existing, error: findError } = await supabase
    .from('client_portal_sessions')
    .select('id')
    .eq('id', sessionId)
    .is('deleted_at', null)
    .single();

  if (findError || !existing) {
    throw new AppError('NOT_FOUND', 'Sessao nao encontrada', 404);
  }

  // Montar objeto de atualizacao com apenas campos fornecidos
  const updates: Record<string, unknown> = {};
  if (validated.label !== undefined) updates.label = validated.label;
  if (validated.is_active !== undefined) updates.is_active = validated.is_active;
  if (validated.permissions !== undefined) updates.permissions = validated.permissions;
  if ('expires_at' in validated) updates.expires_at = validated.expires_at ?? null;

  const { data: session, error: updateError } = await supabase
    .from('client_portal_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select(`
      id,
      job_id,
      contact_id,
      token,
      label,
      permissions,
      is_active,
      last_accessed_at,
      expires_at,
      created_by,
      created_at,
      updated_at
    `)
    .single();

  if (updateError) {
    console.error(`[client-portal/update-session] erro update: ${updateError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar sessao', 500);
  }

  // Montar URL do portal
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://ellahos.com';
  const sessionWithUrl = {
    ...session,
    portal_url: `${siteUrl}/portal/${session.token}`,
  };

  console.log(`[client-portal/update-session] sessao atualizada: id=${session.id}, is_active=${session.is_active}`);

  return success(sessionWithUrl);
}
