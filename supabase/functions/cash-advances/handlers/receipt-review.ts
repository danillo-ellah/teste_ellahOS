import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para revisar comprovantes
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de validacao para revisao de comprovante
const ReviewReceiptSchema = z.object({
  status: z.enum(['aprovado', 'rejeitado']),
  review_note: z.string().optional().nullable(),
});

export async function handleReceiptReview(
  req: Request,
  auth: AuthContext,
  advanceId: string,
  receiptId: string,
): Promise<Response> {
  console.log('[cash-advances/receipt-review] iniciando revisao de comprovante', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    advanceId,
    receiptId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = ReviewReceiptSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const input = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar o comprovante validando vinculo com o adiantamento e tenant
  const { data: receipt, error: fetchError } = await client
    .from('expense_receipts')
    .select('id, status, cash_advance_id, amount, description')
    .eq('id', receiptId)
    .eq('cash_advance_id', advanceId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (fetchError || !receipt) {
    throw new AppError('NOT_FOUND', 'Comprovante nao encontrado', 404);
  }

  // Validar que o comprovante esta pendente de revisao
  if (receipt.status !== 'pendente') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Comprovante ja foi revisado (status atual: ${receipt.status})`,
      422,
    );
  }

  const now = new Date().toISOString();

  // Atualizar comprovante com resultado da revisao
  // O trigger fn_recalc_cash_advance_documented recalcula amount_documented automaticamente
  const { data: updatedReceipt, error: updateError } = await client
    .from('expense_receipts')
    .update({
      status: input.status,
      reviewed_by: auth.userId,
      reviewed_at: now,
      review_note: input.review_note ?? null,
    })
    .eq('id', receiptId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error(
      '[cash-advances/receipt-review] erro ao atualizar comprovante:',
      updateError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao revisar comprovante', 500, {
      detail: updateError.message,
    });
  }

  console.log('[cash-advances/receipt-review] comprovante revisado', {
    receiptId,
    status: input.status,
    reviewer: auth.userId,
  });

  return success(updatedReceipt);
}
