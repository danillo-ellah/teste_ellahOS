import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para atualizar bank_accounts
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

const UpdateBankAccountSchema = z
  .object({
    account_holder: z.string().nullable(),
    bank_name: z.string().nullable(),
    bank_code: z.string().nullable(),
    agency: z.string().nullable(),
    account_number: z.string().nullable(),
    account_type: z.enum(['corrente', 'poupanca']).nullable(),
    pix_key: z.string().nullable(),
    pix_key_type: z
      .enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'])
      .nullable(),
    is_primary: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function updateBankAccount(
  req: Request,
  auth: AuthContext,
  vendorId: string,
  bankAccountId: string,
): Promise<Response> {
  console.log('[vendors/bank-accounts-update] atualizando bank_account', {
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
      'Apenas financeiro, admin e ceo podem atualizar dados bancarios',
      403,
    );
  }

  // Parsear e validar body
  const body = await req.json();
  const validated = validate(UpdateBankAccountSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se bank_account existe e pertence ao vendor e tenant
  const { data: existing, error: findErr } = await supabase
    .from('bank_accounts')
    .select('id, is_primary')
    .eq('id', bankAccountId)
    .eq('vendor_id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Conta bancaria nao encontrada', 404);
  }

  // Se is_primary mudou para true, desmarcar as outras contas do vendor
  if (validated.is_primary === true && !existing.is_primary) {
    const { error: resetErr } = await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('vendor_id', vendorId)
      .eq('tenant_id', auth.tenantId)
      .neq('id', bankAccountId)
      .is('deleted_at', null);

    if (resetErr) {
      console.error(
        '[vendors/bank-accounts-update] erro ao resetar is_primary:',
        resetErr,
      );
      throw new AppError('INTERNAL_ERROR', resetErr.message, 500);
    }
  }

  // Atualizar bank_account
  const { data: bankAccount, error: updateErr } = await supabase
    .from('bank_accounts')
    .update(validated)
    .eq('id', bankAccountId)
    .eq('vendor_id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .select()
    .single();

  if (updateErr) {
    console.error('[vendors/bank-accounts-update] erro ao atualizar:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  console.log('[vendors/bank-accounts-update] bank_account atualizado:', bankAccount.id);

  return success(bankAccount);
}
