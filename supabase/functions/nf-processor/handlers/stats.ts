import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para acessar estatisticas
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

export async function statsNfs(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para acessar estatisticas de NF', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(`[stats] tenant=${auth.tenantId} user=${auth.userId}`);

  // Contar NFs por status (todos os status, exceto deletados)
  const { data: statusCounts, error: statusError } = await supabase
    .from('nf_documents')
    .select('status')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (statusError) {
    console.error('[stats] falha ao contar NFs por status:', statusError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao buscar estatisticas de NF', 500);
  }

  // Agrupar contagens por status em memoria
  const counts: Record<string, number> = {
    pending_review: 0,
    auto_matched: 0,
    confirmed: 0,
    rejected: 0,
    processing: 0,
  };

  for (const row of statusCounts ?? []) {
    const s = row.status as string;
    if (s in counts) {
      counts[s]++;
    }
  }

  // Contar confirmadas e rejeitadas no mes atual
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: monthDocs, error: monthError } = await supabase
    .from('nf_documents')
    .select('status, validated_at')
    .eq('tenant_id', auth.tenantId)
    .in('status', ['confirmed', 'rejected'])
    .gte('validated_at', firstDayOfMonth)
    .is('deleted_at', null);

  if (monthError) {
    console.error('[stats] falha ao contar NFs do mes:', monthError.message);
    // Nao bloqueia — retorna zeros para o mes
  }

  let confirmedMonth = 0;
  let rejectedMonth = 0;

  for (const row of monthDocs ?? []) {
    if (row.status === 'confirmed') confirmedMonth++;
    if (row.status === 'rejected') rejectedMonth++;
  }

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  console.log(`[stats] total=${total} pending=${counts.pending_review} auto_matched=${counts.auto_matched} confirmed_month=${confirmedMonth}`);

  return success({
    pending_review: counts.pending_review,
    auto_matched: counts.auto_matched,
    confirmed: counts.confirmed,
    rejected: counts.rejected,
    processing: counts.processing,
    confirmed_month: confirmedMonth,
    rejected_month: rejectedMonth,
    total,
  });
}
