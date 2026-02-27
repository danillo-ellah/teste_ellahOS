import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles com permissao irrestrita (sem limite de 48h)
const ADMIN_ROLES = ['admin', 'ceo'];

// Roles que podem desfazer pagamento dentro da janela de 48h
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

export async function handleUndoPay(
  _req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[payment-manager/undo-pay] iniciando desfazer pagamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    costItemId: id,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar o cost_item
  const { data: item, error: fetchError } = await client
    .from('cost_items')
    .select(
      'id, job_id, payment_status, payment_date, item_status, nf_validation_ok, service_description, suggested_status',
    )
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !item) {
    throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
  }

  // Validar que o item esta realmente pago
  if (item.payment_status !== 'pago') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Item de custo nao possui pagamento registrado',
      422,
    );
  }

  // Validar janela de 48h (apenas para roles nao-admin)
  if (!ADMIN_ROLES.includes(auth.role) && item.payment_date) {
    const paymentDateMs = new Date(item.payment_date).getTime();
    const limit48h = Date.now() - 48 * 60 * 60 * 1000;
    if (paymentDateMs < limit48h) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        'Prazo de 48 horas para desfazer pagamento expirado. Contate um administrador.',
        422,
      );
    }
  }

  // Determinar o item_status ao reverter:
  // - Se nf_validation_ok, retorna para 'nf_aprovada'
  // - Senao, usa suggested_status ou cai para 'orcado'
  const revertedItemStatus = item.nf_validation_ok
    ? 'nf_aprovada'
    : (item.suggested_status ?? 'orcado');

  // Salvar dados antes da mudanca para o historico
  const dataBefore = {
    payment_status: item.payment_status,
    payment_date: item.payment_date,
    item_status: item.item_status,
  };

  // Desfazer pagamento
  const { data: updatedItem, error: updateError } = await client
    .from('cost_items')
    .update({
      payment_status: 'pendente',
      payment_date: null,
      payment_method: null,
      payment_proof_url: null,
      payment_proof_filename: null,
      actual_paid_value: null,
      item_status: revertedItemStatus,
    })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[payment-manager/undo-pay] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao desfazer pagamento', 500, {
      detail: updateError.message,
    });
  }

  // Inserir historico se item tem job_id
  if (item.job_id) {
    try {
      await insertHistory(client, {
        tenantId: auth.tenantId,
        jobId: item.job_id,
        eventType: 'financial_update',
        userId: auth.userId,
        dataBefore,
        dataAfter: {
          payment_status: 'pendente',
          item_status: revertedItemStatus,
        },
        description: `Pagamento desfeito para: ${item.service_description}`,
      });
    } catch (histErr) {
      console.error('[payment-manager/undo-pay] erro ao inserir historico:', histErr);
    }
  }

  console.log('[payment-manager/undo-pay] pagamento desfeito com sucesso', { id });
  return success(updatedItem);
}
