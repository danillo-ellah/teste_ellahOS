import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Merge e uma operacao critica — apenas admin e ceo
const ALLOWED_ROLES = ['admin', 'ceo'];

const MergeVendorSchema = z.object({
  target_vendor_id: z.string().uuid('target_vendor_id deve ser UUID valido'),
});

export async function mergeVendor(
  req: Request,
  auth: AuthContext,
  sourceVendorId: string,
): Promise<Response> {
  console.log('[vendors/merge] iniciando merge de vendors', {
    sourceVendorId,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  // Verificar permissao (apenas admin e ceo)
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin e ceo podem fazer merge de vendors',
      403,
    );
  }

  // Parsear e validar body
  const body = await req.json();
  const { target_vendor_id } = validate(MergeVendorSchema, body);

  // Nao permitir merge de um vendor consigo mesmo
  if (sourceVendorId === target_vendor_id) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Source e target vendor nao podem ser o mesmo',
      400,
    );
  }

  const supabase = getSupabaseClient(auth.token);

  // Buscar source vendor
  const { data: source, error: sourceErr } = await supabase
    .from('vendors')
    .select('id, full_name')
    .eq('id', sourceVendorId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (sourceErr || !source) {
    throw new AppError('NOT_FOUND', 'Vendor de origem nao encontrado', 404);
  }

  // Buscar target vendor
  const { data: target, error: targetErr } = await supabase
    .from('vendors')
    .select('id, full_name')
    .eq('id', target_vendor_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (targetErr || !target) {
    throw new AppError('NOT_FOUND', 'Vendor de destino nao encontrado', 404);
  }

  // Usar service client para operacoes que podem precisar de bypass de RLS
  const serviceClient = getServiceClient();

  // 1. Reatribuir cost_items do source para o target
  const { count: costItemsCount, error: ciErr } = await serviceClient
    .from('cost_items')
    .update({ vendor_id: target_vendor_id })
    .eq('vendor_id', sourceVendorId)
    .eq('tenant_id', auth.tenantId)
    .select('id', { count: 'exact', head: true });

  if (ciErr) {
    console.error('[vendors/merge] erro ao mover cost_items:', ciErr);
    throw new AppError('INTERNAL_ERROR', 'Erro ao mover itens de custo: ' + ciErr.message, 500);
  }

  console.log('[vendors/merge] cost_items movidos:', costItemsCount ?? 0);

  // 2. Buscar bank_accounts do target para saber quais PIX/contas ja existem (evitar conflito)
  const { data: targetBankAccounts } = await serviceClient
    .from('bank_accounts')
    .select('id, pix_key, account_number')
    .eq('vendor_id', target_vendor_id)
    .is('deleted_at', null);

  const targetPixKeys = new Set(
    (targetBankAccounts ?? []).map((ba) => ba.pix_key).filter(Boolean),
  );
  const targetAccountNumbers = new Set(
    (targetBankAccounts ?? []).map((ba) => ba.account_number).filter(Boolean),
  );

  // Buscar bank_accounts do source
  const { data: sourceBankAccounts } = await serviceClient
    .from('bank_accounts')
    .select('id, pix_key, account_number')
    .eq('vendor_id', sourceVendorId)
    .is('deleted_at', null);

  let bankAccountsMoved = 0;

  // 3. Mover bank_accounts do source para target (apenas os que nao conflitam)
  for (const ba of sourceBankAccounts ?? []) {
    const hasPixConflict = ba.pix_key && targetPixKeys.has(ba.pix_key);
    const hasAccountConflict =
      ba.account_number && targetAccountNumbers.has(ba.account_number);

    if (!hasPixConflict && !hasAccountConflict) {
      const { error: baErr } = await serviceClient
        .from('bank_accounts')
        .update({ vendor_id: target_vendor_id, is_primary: false })
        .eq('id', ba.id);

      if (!baErr) {
        bankAccountsMoved++;
      } else {
        console.warn('[vendors/merge] erro ao mover bank_account', ba.id, baErr.message);
      }
    } else {
      console.log('[vendors/merge] bank_account ignorado por conflito:', ba.id);
    }
  }

  console.log('[vendors/merge] bank_accounts movidos:', bankAccountsMoved);

  // 4. Soft delete do vendor de origem
  const { error: softDeleteErr } = await serviceClient
    .from('vendors')
    .update({
      deleted_at: new Date().toISOString(),
      notes: `Mergeado para vendor ${target_vendor_id} (${target.full_name})`,
    })
    .eq('id', sourceVendorId);

  if (softDeleteErr) {
    console.error('[vendors/merge] erro ao soft-delete source:', softDeleteErr);
    throw new AppError('INTERNAL_ERROR', 'Erro ao finalizar merge: ' + softDeleteErr.message, 500);
  }

  console.log('[vendors/merge] merge concluido. source deletado:', sourceVendorId);

  return success({
    source_vendor_id: sourceVendorId,
    target_vendor_id,
    cost_items_moved: costItemsCount ?? 0,
    bank_accounts_moved: bankAccountsMoved,
  });
}
