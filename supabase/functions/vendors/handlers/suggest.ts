import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

export async function suggestVendors(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';

  console.log('[vendors/suggest] sugestao de vendors', {
    q,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Termo de busca deve ter ao menos 2 caracteres
  if (q.length < 2) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Parametro q deve ter ao menos 2 caracteres',
      400,
    );
  }

  const safeQ = q.replace(/[%_]/g, '').slice(0, 100);
  const supabase = getSupabaseClient(auth.token);

  const { data: vendors, error: dbError } = await supabase
    .from('vendors')
    .select('id, full_name, entity_type, email, cpf, cnpj')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .ilike('full_name', `%${safeQ}%`)
    .order('full_name', { ascending: true })
    .limit(5);

  if (dbError) {
    console.error('[vendors/suggest] erro na query:', dbError);
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  console.log('[vendors/suggest] retornando', vendors?.length ?? 0, 'sugestoes');

  return success(vendors ?? []);
}
