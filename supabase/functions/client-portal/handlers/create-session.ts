import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { created } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import { validate, z } from '../_shared/validation.ts';
import type { AuthContext } from '../_shared/auth.ts';

const PermissionsSchema = z.object({
  timeline: z.boolean().default(true),
  documents: z.boolean().default(true),
  approvals: z.boolean().default(true),
  messages: z.boolean().default(true),
}).default({
  timeline: true,
  documents: true,
  approvals: true,
  messages: true,
});

const CreateSessionSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  contact_id: z.string().uuid('contact_id deve ser UUID valido').optional().nullable(),
  label: z.string().min(1, 'Label e obrigatorio').max(500),
  permissions: PermissionsSchema.optional(),
  expires_at: z.string().datetime({ message: 'expires_at deve ser ISO 8601 valido' }).optional().nullable(),
});

// POST /client-portal/sessions
// Cria uma nova sessao de acesso ao portal do cliente.
// Token UUID e gerado automaticamente pelo banco (gen_random_uuid()).
export async function createSession(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Corpo da requisicao invalido (JSON esperado)', 400);
  }

  const validated = validate(CreateSessionSchema, body);
  const supabase = getSupabaseClient(auth.token);

  console.log(`[client-portal/create-session] tenant=${auth.tenantId}, job_id=${validated.job_id}`);

  // Verificar que o job existe e pertence ao tenant
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title')
    .eq('id', validated.job_id)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Verificar que o contact existe no tenant (se fornecido)
  if (validated.contact_id) {
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', validated.contact_id)
      .single();

    if (contactError || !contact) {
      throw new AppError('NOT_FOUND', 'Contato nao encontrado', 404);
    }
  }

  // Inserir sessao — token UUID gerado automaticamente pelo banco
  const { data: session, error: insertError } = await supabase
    .from('client_portal_sessions')
    .insert({
      tenant_id: auth.tenantId,
      job_id: validated.job_id,
      contact_id: validated.contact_id ?? null,
      label: validated.label,
      permissions: validated.permissions ?? {
        timeline: true,
        documents: true,
        approvals: true,
        messages: true,
      },
      expires_at: validated.expires_at ?? null,
      created_by: auth.userId,
      is_active: true,
    })
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

  if (insertError) {
    // Conflito: sessao ativa ja existe para este job + contato
    if (insertError.code === '23505') {
      throw new AppError(
        'CONFLICT',
        'Ja existe uma sessao ativa para este job e contato. Desative a sessao existente antes de criar uma nova.',
        409,
      );
    }
    console.error(`[client-portal/create-session] erro insert: ${insertError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar sessao', 500);
  }

  // Montar URL do portal para retornar ao frontend
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://ellahos.com';
  const sessionWithUrl = {
    ...session,
    portal_url: `${siteUrl}/portal/${session.token}`,
    job: { id: job.id, code: job.code, title: job.title },
  };

  console.log(`[client-portal/create-session] sessao criada: id=${session.id}, token=${session.token}`);

  return created(sessionWithUrl);
}
