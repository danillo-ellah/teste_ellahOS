import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Apenas CEO e CFO (admin) podem aprovar adiantamentos acima do threshold
const ALLOWED_ROLES = ['admin', 'ceo'];

export async function handleApprove(
  _req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[cash-advances/approve] iniciando aprovacao de adiantamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    advanceId: id,
  });

  // Apenas CEO e admin (CFO) podem aprovar
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas CEO ou CFO podem aprovar adiantamentos acima do limite automatico',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar o adiantamento
  const { data: advance, error: fetchError } = await client
    .from('cash_advances')
    .select(
      'id, job_id, status, threshold_exceeded, amount_authorized, recipient_name, approved_by',
    )
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !advance) {
    throw new AppError('NOT_FOUND', 'Adiantamento nao encontrado', 404);
  }

  // Validar que o adiantamento ainda esta aberto
  if (advance.status !== 'aberta') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Adiantamento nao esta aberto (status atual: ${advance.status})`,
      422,
    );
  }

  // Validar que o adiantamento realmente excede o threshold
  // (adiantamentos dentro do limite nao precisam de aprovacao)
  if (!advance.threshold_exceeded) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Adiantamento esta dentro do limite automatico e nao requer aprovacao manual',
      422,
    );
  }

  // Verificar se ja foi aprovado por outro usuario
  if (advance.approved_by) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Adiantamento ja foi aprovado anteriormente',
      422,
    );
  }

  const now = new Date().toISOString();

  // Registrar aprovacao sem mudar o status principal (continua 'aberta')
  // O campo approved_by serve como flag de "aprovacao obtida"
  const { data: updatedAdvance, error: updateError } = await client
    .from('cash_advances')
    .update({
      approved_by: auth.userId,
      approved_at: now,
    })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[cash-advances/approve] erro ao registrar aprovacao:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar aprovacao', 500, {
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
        dataBefore: { approved_by: null, approved_at: null },
        dataAfter: { approved_by: auth.userId, approved_at: now },
        description: `Adiantamento de R$ ${(advance.amount_authorized ?? 0).toFixed(2)} para ${advance.recipient_name} aprovado por ${auth.email} (acima do limite de 10% do orcamento)`,
      });
    } catch (histErr) {
      console.error('[cash-advances/approve] erro ao inserir historico:', histErr);
    }
  }

  console.log('[cash-advances/approve] aprovacao registrada com sucesso', {
    id,
    approvedBy: auth.userId,
  });

  return success(updatedAdvance);
}
