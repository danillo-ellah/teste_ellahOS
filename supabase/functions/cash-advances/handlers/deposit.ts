import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para registrar depositos
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de validacao
const DepositSchema = z.object({
  amount: z.number().positive(),
});

export async function handleDeposit(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[cash-advances/deposit] iniciando deposito', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    advanceId: id,
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

  const parseResult = DepositSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { amount } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar adiantamento atual
  const { data: advance, error: fetchError } = await client
    .from('cash_advances')
    .select('id, job_id, status, amount_deposited, amount_authorized, recipient_name')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !advance) {
    throw new AppError('NOT_FOUND', 'Adiantamento nao encontrado', 404);
  }

  // Validar que o adiantamento esta aberto
  if (advance.status !== 'aberta') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Adiantamento nao esta aberto (status atual: ${advance.status})`,
      422,
    );
  }

  const newAmountDeposited = (advance.amount_deposited ?? 0) + amount;

  // Atualizar amount_deposited com lock otimista (verifica valor anterior para evitar race condition)
  const { data: updatedAdvance, error: updateError } = await client
    .from('cash_advances')
    .update({ amount_deposited: newAmountDeposited })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .eq('amount_deposited', advance.amount_deposited ?? 0)
    .select('*')
    .single();

  if (updateError) {
    console.error('[cash-advances/deposit] erro ao atualizar:', updateError.message);
    // Se o update nao encontrou a row, houve conflito (outro deposito simultaneo)
    if (updateError.code === 'PGRST116') {
      throw new AppError(
        'CONFLICT',
        'Conflito de atualizacao — outro deposito foi registrado simultaneamente. Tente novamente.',
        409,
      );
    }
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar deposito', 500, {
      detail: updateError.message,
    });
  }

  if (!updatedAdvance) {
    throw new AppError(
      'CONFLICT',
      'Conflito de atualizacao — outro deposito foi registrado simultaneamente. Tente novamente.',
      409,
    );
  }

  // Inserir historico no job
  if (advance.job_id) {
    try {
      await insertHistory(client, {
        tenantId: auth.tenantId,
        jobId: advance.job_id,
        eventType: 'financial_update',
        userId: auth.userId,
        dataBefore: { amount_deposited: advance.amount_deposited },
        dataAfter: { amount_deposited: newAmountDeposited },
        description: `Deposito de R$ ${amount.toFixed(2)} registrado para adiantamento de ${advance.recipient_name}`,
      });
    } catch (histErr) {
      console.error('[cash-advances/deposit] erro ao inserir historico:', histErr);
    }
  }

  console.log('[cash-advances/deposit] deposito registrado', {
    id,
    amount,
    new_total: newAmountDeposited,
  });

  return success(updatedAdvance);
}
