import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para registrar pagamentos
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de validacao para registro de pagamento em lote
const PaySchema = z.object({
  cost_item_ids: z.array(z.string().uuid()).min(1).max(100),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data invalido (YYYY-MM-DD)'),
  payment_method: z.enum(['pix', 'ted', 'dinheiro', 'debito', 'credito', 'outro']),
  payment_proof_url: z.string().url().optional().nullable(),
  actual_paid_value: z.number().min(0).optional().nullable(),
});

export async function handlePay(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[payment-manager/pay] iniciando registro de pagamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
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

  const parseResult = PaySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const input = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar todos os cost_items informados que pertencem ao tenant
  const { data: items, error: fetchError } = await client
    .from('cost_items')
    .select('id, job_id, payment_status, item_status, total_with_overtime, service_description')
    .in('id', input.cost_item_ids)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (fetchError) {
    console.error('[payment-manager/pay] erro ao buscar cost_items:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo', 500);
  }

  // Validar que todos os IDs foram encontrados
  if (!items || items.length !== input.cost_item_ids.length) {
    const foundIds = (items ?? []).map((i) => i.id);
    const missingIds = input.cost_item_ids.filter((id) => !foundIds.includes(id));
    throw new AppError('NOT_FOUND', 'Itens de custo nao encontrados ou sem permissao', 404, {
      missing_ids: missingIds,
    });
  }

  // Validar que nenhum item ja esta pago
  const alreadyPaid = items.filter((i) => i.payment_status === 'pago');
  if (alreadyPaid.length > 0) {
    throw new AppError('CONFLICT', 'Um ou mais itens ja possuem pagamento registrado', 409, {
      already_paid_ids: alreadyPaid.map((i) => i.id),
    });
  }

  // Montar payload de UPDATE
  const updatePayload: Record<string, unknown> = {
    payment_status: 'pago',
    payment_date: input.payment_date,
    payment_method: input.payment_method,
    item_status: 'pago',
  };

  if (input.payment_proof_url != null) {
    updatePayload.payment_proof_url = input.payment_proof_url;
  }

  // actual_paid_value so aplica se houver um unico item no lote
  // Para lotes com multiplos itens, o valor pago individual deve ser definido por item
  if (input.actual_paid_value != null && input.cost_item_ids.length === 1) {
    updatePayload.actual_paid_value = input.actual_paid_value;
  }

  // Executar UPDATE em lote
  const { error: updateError } = await client
    .from('cost_items')
    .update(updatePayload)
    .in('id', input.cost_item_ids)
    .eq('tenant_id', auth.tenantId);

  if (updateError) {
    console.error('[payment-manager/pay] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar pagamentos', 500, {
      detail: updateError.message,
    });
  }

  // Calcular total pago (soma dos total_with_overtime dos itens)
  const totalPaid = items.reduce((acc, item) => acc + (item.total_with_overtime ?? 0), 0);

  // Inserir historico para cada item com job_id (nao bloqueia em caso de falha)
  const itemsWithJob = items.filter((i) => i.job_id != null);
  for (const item of itemsWithJob) {
    try {
      await insertHistory(client, {
        tenantId: auth.tenantId,
        jobId: item.job_id!,
        eventType: 'financial_update',
        userId: auth.userId,
        dataAfter: {
          cost_item_id: item.id,
          payment_status: 'pago',
          payment_date: input.payment_date,
          payment_method: input.payment_method,
        },
        description: `Pagamento registrado para: ${item.service_description}`,
      });
    } catch (histErr) {
      console.error('[payment-manager/pay] erro ao inserir historico:', histErr);
    }
  }

  console.log('[payment-manager/pay] pagamentos registrados com sucesso', {
    items_paid: items.length,
    total_paid: totalPaid,
  });

  return success({
    items_paid: items.length,
    total_paid: totalPaid,
    payment_date: input.payment_date,
  });
}
