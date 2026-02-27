import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para deletar bank_accounts
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

export async function deleteBankAccount(
  req: Request,
  auth: AuthContext,
  vendorId: string,
  bankAccountId: string,
): Promise<Response> {
  console.log('[vendors/bank-accounts-delete] soft-delete de bank_account', {
    vendorId,
    bankAccountId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas financeiro, admin e ceo podem remover dados bancarios',
      403,
    );
  }

  const supabase = getSupabaseClient(auth.token);

  // Verificar se bank_account existe e pertence ao vendor e tenant
  const { data: existing, error: findErr } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('id', bankAccountId)
    .eq('vendor_id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Conta bancaria nao encontrada', 404);
  }

  // Soft delete da bank_account
  const { error: deleteErr } = await supabase
    .from('bank_accounts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', bankAccountId)
    .eq('vendor_id', vendorId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[vendors/bank-accounts-delete] erro ao deletar:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[vendors/bank-accounts-delete] bank_account removida (soft):', bankAccountId);

  return success({ deleted: true });
}
