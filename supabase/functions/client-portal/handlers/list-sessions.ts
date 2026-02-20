import { getSupabaseClient } from '../_shared/supabase-client.ts';
import { success } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';
import type { AuthContext } from '../_shared/auth.ts';

// GET /client-portal/sessions?job_id=X
// Lista todas as sessoes do portal do tenant (com filtro opcional por job).
// Retorna dados seguros — token UUID para montar o link publico.
export async function listSessions(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  // Validar UUID do job_id se fornecido
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (jobId && !UUID_REGEX.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id deve ser um UUID valido', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(`[client-portal/list-sessions] tenant=${auth.tenantId}, job_id=${jobId ?? 'todos'}`);

  let query = supabase
    .from('client_portal_sessions')
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
      updated_at,
      jobs!inner(id, code, title, status),
      contacts(id, name, email)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (jobId) {
    query = query.eq('job_id', jobId);
  }

  const { data: sessions, error: fetchError } = await query;

  if (fetchError) {
    console.error(`[client-portal/list-sessions] erro: ${fetchError.message}`);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar sessoes', 500);
  }

  // Montar URL do portal para cada sessao (para facilitar copia de link no frontend)
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://ellahos.com';
  const sessionsWithUrl = (sessions ?? []).map(s => ({
    ...s,
    portal_url: `${siteUrl}/portal/${(s as any).token}`,
  }));

  console.log(`[client-portal/list-sessions] ${sessionsWithUrl.length} sessoes encontradas`);

  return success(sessionsWithUrl);
}
