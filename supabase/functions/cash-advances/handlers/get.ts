import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

export async function handleGet(
  _req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[cash-advances/get] buscando adiantamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    id,
  });

  const client = getSupabaseClient(auth.token);

  // Buscar adiantamento com todos os comprovantes vinculados
  const { data: advance, error: fetchError } = await client
    .from('cash_advances')
    .select(
      `*,
       expense_receipts(
         id, amount, description, receipt_type,
         document_url, document_filename, expense_date,
         status, review_note, reviewed_by, reviewed_at,
         created_by, created_at, updated_at
       )`,
    )
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !advance) {
    throw new AppError('NOT_FOUND', 'Adiantamento nao encontrado', 404);
  }

  console.log('[cash-advances/get] adiantamento encontrado', { id });
  return success(advance);
}
