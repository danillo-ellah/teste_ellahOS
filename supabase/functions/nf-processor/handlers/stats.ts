import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para acessar estatisticas
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

// Helper: count por status usando head:true (sem carregar rows)
async function countByStatus(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantId: string,
  status: string,
  extraFilters?: { gte?: [string, string] },
): Promise<number> {
  let query = supabase
    .from('nf_documents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', status)
    .is('deleted_at', null);

  if (extraFilters?.gte) {
    query = query.gte(extraFilters.gte[0], extraFilters.gte[1]);
  }

  const { count, error } = await query;
  if (error) {
    console.warn(`[stats] falha ao contar status=${status}:`, error.message);
    return 0;
  }
  return count ?? 0;
}

export async function statsNfs(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar estatisticas de NF', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(`[stats] tenant=${auth.tenantId} user=${auth.userId}`);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Queries paralelas usando count (head:true — nao carrega rows em memoria)
  const [pendingReview, autoMatched, confirmed, rejected, processing, confirmedMonth, rejectedMonth] =
    await Promise.all([
      countByStatus(supabase, auth.tenantId, 'pending_review'),
      countByStatus(supabase, auth.tenantId, 'auto_matched'),
      countByStatus(supabase, auth.tenantId, 'confirmed'),
      countByStatus(supabase, auth.tenantId, 'rejected'),
      countByStatus(supabase, auth.tenantId, 'processing'),
      countByStatus(supabase, auth.tenantId, 'confirmed', { gte: ['validated_at', firstDayOfMonth] }),
      countByStatus(supabase, auth.tenantId, 'rejected', { gte: ['validated_at', firstDayOfMonth] }),
    ]);

  const total = pendingReview + autoMatched + confirmed + rejected + processing;

  console.log(`[stats] total=${total} pending=${pendingReview} auto_matched=${autoMatched} confirmed_month=${confirmedMonth}`);

  return success({
    pending_review: pendingReview,
    auto_matched: autoMatched,
    confirmed,
    rejected,
    processing,
    confirmed_month: confirmedMonth,
    rejected_month: rejectedMonth,
    total,
  });
}
