import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles autorizados — suggest e usado em formularios de cost-items
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

export async function suggestVendors(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para buscar vendors', 403);
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';

  console.log('[vendors/suggest] q=' + (q || '(vazio)'));

  const safeQ = q.replace(/[%_]/g, '').slice(0, 100);
  const supabase = getSupabaseClient(auth.token);

  let query = supabase
    .from('vendors')
    .select('id, full_name, entity_type, email, cpf, cnpj')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('full_name', { ascending: true })
    .limit(30);

  // Se tem termo de busca, filtrar por nome
  if (safeQ.length >= 1) {
    query = query.ilike('full_name', `%${safeQ}%`);
  }

  const { data: vendors, error: dbError } = await query;

  if (dbError) {
    console.error('[vendors/suggest] erro na query:', dbError);
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  // Mascarar CPF/CNPJ para seguranca (mostra apenas digitos verificadores)
  const maskedVendors = (vendors ?? []).map((v: Record<string, unknown>) => ({
    ...v,
    cpf: v.cpf ? `***.***.**-${String(v.cpf).slice(-2)}` : null,
    cnpj: v.cnpj ? `**.***.***/****-${String(v.cnpj).slice(-2)}` : null,
  }));

  console.log('[vendors/suggest]', maskedVendors.length, 'resultados');

  return success(maskedVendors);
}
