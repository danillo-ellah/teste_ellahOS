import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// GET /vendor-portal/invites — lista convites do tenant com filtros opcionais
// Query params:
//   job_id    — filtra por job (opcional)
//   vendor_id — filtra por vendor (opcional)
//   status    — 'pending' | 'used' | 'expired' (opcional)
export async function listInvites(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Qualquer usuario autenticado do tenant pode visualizar convites
  const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro', 'producer', 'coordinator'];
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  const url = new URL(req.url);
  const jobId    = url.searchParams.get('job_id');
  const vendorId = url.searchParams.get('vendor_id');
  const status   = url.searchParams.get('status'); // 'pending' | 'used' | 'expired'

  const supabase = getSupabaseClient(auth.token);

  let query = supabase
    .from('vendor_invite_tokens')
    .select(`
      id,
      token,
      email,
      name,
      expires_at,
      used_at,
      created_at,
      vendor_id,
      job_id,
      vendors (id, full_name, email),
      jobs (id, title, code),
      profiles:created_by (id, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (jobId)    query = query.eq('job_id', jobId);
  if (vendorId) query = query.eq('vendor_id', vendorId);

  // Filtrar por status derivado
  const now = new Date().toISOString();
  if (status === 'pending') {
    query = query.is('used_at', null).gt('expires_at', now);
  } else if (status === 'used') {
    query = query.not('used_at', 'is', null);
  } else if (status === 'expired') {
    query = query.is('used_at', null).lt('expires_at', now);
  }

  const { data: invites, error: fetchError } = await query;

  if (fetchError) {
    console.error('[vendor-portal/list-invites] erro fetch:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar convites', 500);
  }

  // Montar URL do portal para cada convite
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://teste-ellah-os.vercel.app';
  const result = (invites ?? []).map((invite) => ({
    ...invite,
    portal_url: `${siteUrl}/vendor/${invite.token}`,
    // Status derivado para facilitar exibicao no frontend
    computed_status: invite.used_at
      ? 'used'
      : new Date(invite.expires_at) < new Date()
        ? 'expired'
        : 'pending',
  }));

  return success(result, 200, req);
}
