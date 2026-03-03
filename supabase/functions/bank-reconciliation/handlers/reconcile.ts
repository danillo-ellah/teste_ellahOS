import { z } from 'https://esm.sh/zod@3.22.4';
import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para conciliar
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de validacao — ao menos um dos dois vinculos deve ser fornecido
const ReconcileSchema = z.object({
  transaction_id: z.string().uuid('transaction_id deve ser UUID valido'),
  cost_item_id: z.string().uuid().optional().nullable(),
  payment_proof_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  (data) => data.cost_item_id || data.payment_proof_id,
  { message: 'Informe ao menos cost_item_id ou payment_proof_id para conciliar' },
);

// Schema para desfazer conciliacao
const UnreconcileSchema = z.object({
  transaction_id: z.string().uuid('transaction_id deve ser UUID valido'),
  unreconcile: z.literal(true),
});

export async function handleReconcile(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[bank-reconciliation/reconcile] iniciando conciliacao manual', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para conciliar transacoes', 403);
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Verificar se e operacao de desfazer conciliacao
  const rawBody = body as Record<string, unknown>;
  if (rawBody?.unreconcile === true) {
    const unreconcileResult = UnreconcileSchema.safeParse(body);
    if (!unreconcileResult.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados invalidos para desfazer conciliacao', 400, {
        issues: unreconcileResult.error.issues,
      });
    }

    return await doUnreconcile(client, auth, unreconcileResult.data.transaction_id, req);
  }

  // Conciliacao manual
  const parseResult = ReconcileSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { transaction_id, cost_item_id, payment_proof_id, notes } = parseResult.data;

  // Buscar transacao e verificar tenant
  const { data: transaction } = await client
    .from('bank_transactions')
    .select('id, statement_id, reconciled, amount, tenant_id')
    .eq('id', transaction_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!transaction) {
    throw new AppError('NOT_FOUND', 'Transacao nao encontrada', 404);
  }

  // Verificar cost_item pertence ao tenant (se fornecido)
  if (cost_item_id) {
    const { data: costItem } = await client
      .from('cost_items')
      .select('id')
      .eq('id', cost_item_id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!costItem) {
      throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
    }
  }

  // Verificar payment_proof pertence ao tenant (se fornecido)
  if (payment_proof_id) {
    const { data: proof } = await client
      .from('payment_proofs')
      .select('id')
      .eq('id', payment_proof_id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!proof) {
      throw new AppError('NOT_FOUND', 'Comprovante de pagamento nao encontrado', 404);
    }
  }

  // Atualizar transacao
  const { data: updated, error: updateError } = await client
    .from('bank_transactions')
    .update({
      reconciled: true,
      reconciled_at: new Date().toISOString(),
      reconciled_by: auth.userId,
      cost_item_id: cost_item_id ?? null,
      payment_proof_id: payment_proof_id ?? null,
      match_method: 'manual',
      match_confidence: 1.0,
      notes: notes ?? null,
    })
    .eq('id', transaction_id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError || !updated) {
    console.error('[bank-reconciliation/reconcile] erro ao atualizar transacao:', updateError?.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar conciliacao', 500, {
      detail: updateError?.message,
    });
  }

  // Incrementar reconciled_entries no extrato
  await adjustReconciledCount(client, transaction.statement_id, auth.tenantId, +1);

  console.log('[bank-reconciliation/reconcile] transacao conciliada', {
    transactionId: transaction_id,
    costItemId: cost_item_id,
    paymentProofId: payment_proof_id,
  });

  return success(updated, 200, req);
}

// Desfaz a conciliacao de uma transacao
async function doUnreconcile(
  client: SupabaseClient,
  auth: AuthContext,
  transaction_id: string,
  req: Request,
): Promise<Response> {
  // Buscar transacao atual
  const { data: transaction } = await client
    .from('bank_transactions')
    .select('id, statement_id, reconciled')
    .eq('id', transaction_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!transaction) {
    throw new AppError('NOT_FOUND', 'Transacao nao encontrada', 404);
  }

  if (!transaction.reconciled) {
    throw new AppError('BUSINESS_RULE_VIOLATION', 'Transacao nao esta conciliada', 400);
  }

  const { data: updated, error: updateError } = await client
    .from('bank_transactions')
    .update({
      reconciled: false,
      reconciled_at: null,
      reconciled_by: null,
      cost_item_id: null,
      payment_proof_id: null,
      match_method: null,
      match_confidence: null,
      notes: null,
    })
    .eq('id', transaction_id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError || !updated) {
    throw new AppError('INTERNAL_ERROR', 'Erro ao desfazer conciliacao', 500, {
      detail: updateError?.message,
    });
  }

  // Decrementar reconciled_entries no extrato
  await adjustReconciledCount(client, transaction.statement_id, auth.tenantId, -1);

  console.log('[bank-reconciliation/reconcile] conciliacao desfeita', { transactionId: transaction_id });

  return success(updated, 200, req);
}

// Ajusta o contador reconciled_entries do extrato (delta: +1 ou -1)
// Garante que o valor nao saia dos limites [0, total_entries]
async function adjustReconciledCount(
  client: SupabaseClient,
  statementId: string,
  tenantId: string,
  delta: number,
): Promise<void> {
  const { data: stmt } = await client
    .from('bank_statements')
    .select('reconciled_entries, total_entries')
    .eq('id', statementId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!stmt) return;

  const newCount = Math.max(0, Math.min(stmt.total_entries, stmt.reconciled_entries + delta));

  await client
    .from('bank_statements')
    .update({ reconciled_entries: newCount })
    .eq('id', statementId)
    .eq('tenant_id', tenantId);
}
