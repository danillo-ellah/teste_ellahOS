import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para encerrar adiantamentos
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

export async function handleClose(
  _req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[cash-advances/close] iniciando encerramento de adiantamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    advanceId: id,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar adiantamento atual
  const { data: advance, error: fetchError } = await client
    .from('cash_advances')
    .select(
      'id, job_id, status, amount_authorized, amount_deposited, amount_documented, recipient_name',
    )
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

  // Verificar se ha comprovantes pendentes de revisao
  const { count: pendingCount, error: pendingError } = await client
    .from('expense_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('cash_advance_id', id)
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'pendente');

  if (pendingError) {
    console.error('[cash-advances/close] erro ao verificar comprovantes pendentes:', pendingError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar comprovantes pendentes', 500);
  }

  if ((pendingCount ?? 0) > 0) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Existem ${pendingCount} comprovante(s) pendente(s) de revisao. Revise todos antes de encerrar.`,
      422,
      { pending_count: pendingCount },
    );
  }

  // Encerrar o adiantamento
  const { data: closedAdvance, error: updateError } = await client
    .from('cash_advances')
    .update({ status: 'encerrada' })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[cash-advances/close] erro ao encerrar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao encerrar adiantamento', 500, {
      detail: updateError.message,
    });
  }

  // Inserir historico no job
  if (advance.job_id) {
    try {
      await insertHistory(client, {
        tenantId: auth.tenantId,
        jobId: advance.job_id,
        eventType: 'financial_update',
        userId: auth.userId,
        dataBefore: { status: 'aberta' },
        dataAfter: {
          status: 'encerrada',
          amount_authorized: advance.amount_authorized,
          amount_deposited: advance.amount_deposited,
          amount_documented: advance.amount_documented,
        },
        description: `Adiantamento encerrado para ${advance.recipient_name} (autorizado: R$ ${(advance.amount_authorized ?? 0).toFixed(2)}, documentado: R$ ${(advance.amount_documented ?? 0).toFixed(2)})`,
      });
    } catch (histErr) {
      console.error('[cash-advances/close] erro ao inserir historico:', histErr);
    }
  }

  console.log('[cash-advances/close] adiantamento encerrado com sucesso', { id });
  return success(closedAdvance);
}
