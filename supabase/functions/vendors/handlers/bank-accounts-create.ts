import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para criar bank_accounts
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

const CreateBankAccountSchema = z.object({
  account_holder: z.string().optional(),
  bank_name: z.string().optional(),
  bank_code: z.string().optional(),
  agency: z.string().optional(),
  account_number: z.string().optional(),
  account_type: z.enum(['corrente', 'poupanca']).optional(),
  pix_key: z.string().optional(),
  pix_key_type: z
    .enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'])
    .optional(),
  is_primary: z.boolean().default(false),
});

export async function createBankAccount(
  req: Request,
  auth: AuthContext,
  vendorId: string,
): Promise<Response> {
  console.log('[vendors/bank-accounts-create] criando bank_account', {
    vendorId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas financeiro, admin e ceo podem cadastrar dados bancarios',
      403,
    );
  }

  // Parsear e validar body
  const body = await req.json();
  const validated = validate(CreateBankAccountSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se vendor existe e pertence ao tenant
  const { data: vendor, error: vendorErr } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', vendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (vendorErr || !vendor) {
    throw new AppError('NOT_FOUND', 'Vendor nao encontrado', 404);
  }

  // Se is_primary = true, desmarcar todas as outras contas do vendor primeiro
  if (validated.is_primary) {
    const { error: resetErr } = await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('vendor_id', vendorId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null);

    if (resetErr) {
      console.error(
        '[vendors/bank-accounts-create] erro ao resetar is_primary:',
        resetErr,
      );
      throw new AppError('INTERNAL_ERROR', resetErr.message, 500);
    }
  }

  // Inserir nova bank_account
  const { data: bankAccount, error: insertErr } = await supabase
    .from('bank_accounts')
    .insert({
      ...validated,
      vendor_id: vendorId,
      tenant_id: auth.tenantId,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[vendors/bank-accounts-create] erro ao inserir:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[vendors/bank-accounts-create] bank_account criado:', bankAccount.id);

  return created(bankAccount);
}
