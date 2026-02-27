import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para submeter comprovantes (produtor tambem pode)
const ALLOWED_ROLES = ['produtor_executivo', 'financeiro', 'admin', 'ceo'];

// Schema de validacao para criacao de comprovante
const CreateReceiptSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  receipt_type: z.enum(['nf', 'recibo', 'ticket', 'outros']).default('nf'),
  document_url: z.string().url().optional().nullable(),
  document_filename: z.string().optional().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export async function handleReceiptCreate(
  req: Request,
  auth: AuthContext,
  advanceId: string,
): Promise<Response> {
  console.log('[cash-advances/receipt-create] iniciando criacao de comprovante', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    advanceId,
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

  const parseResult = CreateReceiptSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const input = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar o adiantamento para obter job_id e validar status
  const { data: advance, error: fetchError } = await client
    .from('cash_advances')
    .select('id, job_id, status, recipient_name')
    .eq('id', advanceId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !advance) {
    throw new AppError('NOT_FOUND', 'Adiantamento nao encontrado', 404);
  }

  // Validar que o adiantamento esta aberto para aceitar comprovantes
  if (advance.status !== 'aberta') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Adiantamento nao esta aberto para prestacao de contas (status: ${advance.status})`,
      422,
    );
  }

  // Inserir o comprovante com status 'pendente' (aguardando revisao do financeiro)
  const { data: receipt, error: insertError } = await client
    .from('expense_receipts')
    .insert({
      tenant_id: auth.tenantId,
      cash_advance_id: advanceId,
      job_id: advance.job_id,
      amount: input.amount,
      description: input.description,
      receipt_type: input.receipt_type,
      document_url: input.document_url ?? null,
      document_filename: input.document_filename ?? null,
      expense_date: input.expense_date ?? null,
      status: 'pendente',
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[cash-advances/receipt-create] erro ao inserir comprovante:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar comprovante', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cash-advances/receipt-create] comprovante criado', {
    receiptId: receipt.id,
    advanceId,
    amount: input.amount,
  });

  return created(receipt);
}
