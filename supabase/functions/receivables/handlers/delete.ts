import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para deletar recebimentos (mais restrito que update)
const ALLOWED_ROLES = ['admin', 'ceo'];

export async function handleDelete(_req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[receivables/delete] deletando recebimento', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role (mais restrita: apenas admin e ceo)
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para deletar recebimentos',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar item atual antes de deletar (para validacao e historico)
  const { data: current, error: fetchError } = await client
    .from('job_receivables')
    .select('id, job_id, description, installment_number, amount, status')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Recebimento nao encontrado', 404);
  }

  // Bloquear delete de recebimento ja recebido (deve cancelar antes)
  if (current.status === 'recebido') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nao e possivel excluir um recebimento com status recebido. Cancele-o antes de excluir.',
      422,
      { current_status: current.status },
    );
  }

  // Soft delete: atualizar deleted_at
  const { error: deleteError } = await client
    .from('job_receivables')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId);

  if (deleteError) {
    console.error('[receivables/delete] erro ao deletar:', deleteError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao deletar recebimento', 500, {
      detail: deleteError.message,
    });
  }

  // Inserir historico no job_history
  await insertHistory(client, {
    tenantId: auth.tenantId,
    jobId: current.job_id as string,
    eventType: 'financial_update',
    userId: auth.userId,
    dataBefore: {
      id: current.id,
      installment_number: current.installment_number,
      description: current.description,
      amount: current.amount,
      status: current.status,
    },
    dataAfter: null,
    description: `Recebimento removido: parcela ${current.installment_number} — ${current.description}`,
  });

  console.log('[receivables/delete] recebimento deletado com sucesso', { id });
  return success({ id, deleted: true });
}
