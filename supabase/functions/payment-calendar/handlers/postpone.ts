import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';

// Schema de validacao do body
const BodySchema = z.object({
  cost_item_ids: z
    .array(z.string().uuid('Cada cost_item_id deve ser um UUID valido'))
    .min(1, 'Ao menos um cost_item_id e obrigatorio')
    .max(50, 'Maximo de 50 itens por operacao de prorrogacao'),
  new_due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'new_due_date deve estar no formato YYYY-MM-DD'),
  reason: z
    .string()
    .min(3, 'Motivo e obrigatorio (minimo 3 caracteres)')
    .max(500, 'Motivo muito longo (maximo 500 caracteres)'),
});

// Handler PATCH /payment-calendar/postpone
// Prorroga o vencimento de cost_items pendentes em lote
export async function postponeHandler(req: Request, auth: AuthContext): Promise<Response> {
  // Parsear body JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido ou ausente', 400, undefined, req);
  }

  // Validar body com Zod
  const parseResult = BodySchema.safeParse(body);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    return error('VALIDATION_ERROR', firstError.message, 400, undefined, req);
  }

  const { cost_item_ids, new_due_date, reason } = parseResult.data;
  const today = new Date().toISOString().split('T')[0];

  // Validar que a nova data nao e passada
  if (new_due_date < today) {
    return error(
      'VALIDATION_ERROR',
      'new_due_date nao pode ser uma data passada',
      400,
      undefined,
      req,
    );
  }

  const client = getSupabaseClient(auth.token);

  console.log(`[payment-calendar/postpone] tenant=${auth.tenantId} user=${auth.userId} ids=${cost_item_ids.length} new_due_date=${new_due_date}`);

  try {
    // 1. Buscar os cost_items pelo ids + tenant_id para validar existencia e ownership
    const { data: fetchedItems, error: fetchError } = await client
      .from('cost_items')
      .select('id, payment_due_date, payment_status, job_id, service_description')
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .in('id', cost_item_ids);

    if (fetchError) {
      console.error('[payment-calendar/postpone] erro ao buscar cost_items:', fetchError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao buscar itens de custo', 500);
    }

    if (!fetchedItems || fetchedItems.length === 0) {
      return error(
        'NOT_FOUND',
        'Nenhum item de custo encontrado com os IDs informados',
        404,
        undefined,
        req,
      );
    }

    // 2. Filtrar apenas os que estao com status 'pendente' (nao pode prorrogar pago/cancelado)
    type CostItemRow = {
      id: string;
      payment_due_date: string;
      payment_status: string;
      job_id: string;
      service_description: string | null;
    };

    const pendingItems = (fetchedItems as CostItemRow[]).filter(
      item => item.payment_status === 'pendente',
    );
    const skippedCount = fetchedItems.length - pendingItems.length;

    if (pendingItems.length === 0) {
      return error(
        'BUSINESS_RULE_VIOLATION',
        'Nenhum item pendente encontrado. Apenas itens com status "pendente" podem ser prorrogados.',
        422,
        { skipped_count: skippedCount },
        req,
      );
    }

    const pendingIds = pendingItems.map(item => item.id);

    // 3. Atualizar payment_due_date em lote
    const { error: updateError } = await client
      .from('cost_items')
      .update({ payment_due_date: new_due_date })
      .eq('tenant_id', auth.tenantId)
      .in('id', pendingIds);

    if (updateError) {
      console.error('[payment-calendar/postpone] erro ao atualizar cost_items:', updateError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao prorrogar vencimentos', 500);
    }

    // 4. Inserir historico para cada job afetado (agrupado por job_id)
    // Agrupa por job para nao inserir historico duplicado no mesmo job
    const jobGroups = new Map<string, CostItemRow[]>();
    for (const item of pendingItems) {
      const existing = jobGroups.get(item.job_id) ?? [];
      existing.push(item);
      jobGroups.set(item.job_id, existing);
    }

    // Inserir historico em paralelo para cada job afetado
    const historyPromises = Array.from(jobGroups.entries()).map(([jobId, items]) => {
      const itemSummary = items.map(i => i.service_description ?? i.id).join(', ');
      const oldDates = [...new Set(items.map(i => i.payment_due_date))].join(', ');

      return insertHistory(client, {
        tenantId: auth.tenantId,
        jobId,
        eventType: 'financial_update',
        userId: auth.userId,
        dataBefore: {
          payment_due_dates: items.reduce((acc: Record<string, string>, i) => {
            acc[i.id] = i.payment_due_date;
            return acc;
          }, {}),
        },
        dataAfter: {
          payment_due_date: new_due_date,
          cost_item_ids: items.map(i => i.id),
        },
        description: `Vencimento prorrogado de "${oldDates}" para "${new_due_date}" em ${items.length} item(s): ${itemSummary}. Motivo: ${reason}`,
      });
    });

    // Historico e melhor esforco — falha nao bloqueia a operacao
    await Promise.allSettled(historyPromises);

    console.log(`[payment-calendar/postpone] ${pendingItems.length} itens prorrogados para ${new_due_date} (${skippedCount} ignorados)`);

    return success(
      {
        items_updated: pendingItems.length,
        new_due_date,
        ...(skippedCount > 0 && {
          warning: `${skippedCount} item(s) ignorado(s) por nao estarem com status "pendente"`,
        }),
      },
      200,
      req,
    );
  } catch (err) {
    if (err instanceof AppError) throw err;
    console.error('[payment-calendar/postpone] erro inesperado:', err);
    throw new AppError('INTERNAL_ERROR', 'Erro interno ao prorrogar vencimentos', 500);
  }
}
