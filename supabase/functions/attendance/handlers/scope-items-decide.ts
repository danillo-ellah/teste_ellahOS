import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { createNotification } from '../../_shared/notification-helper.ts';

// Apenas ceo, produtor_executivo e admin podem decidir extras
const DECISION_ROLES = ['ceo', 'produtor_executivo', 'admin'];

const DecideScopeItemSchema = z.object({
  extra_status: z.enum(
    ['aprovado_gratuito', 'cobrar_aditivo', 'recusado'],
    { errorMap: () => ({ message: 'extra_status invalido para decisao' }) },
  ),
  ceo_notes: z.string().max(2000).optional().nullable(),
}).strict();

export async function handleScopeItemsDecide(
  req: Request,
  auth: AuthContext,
  id: string,
): Promise<Response> {
  console.log('[attendance/scope-items-decide] decidindo extra de escopo', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!DECISION_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas ceo, produtor_executivo ou admin pode decidir extras de escopo',
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = DecideScopeItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar o item para validar que existe e esta pendente
  const { data: current, error: fetchError } = await client
    .from('scope_items')
    .select('id, is_extra, extra_status, created_by, job_id, description')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Item de escopo nao encontrado', 404);
  }

  if (!current.is_extra) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Apenas itens extras podem ser decididos',
      422,
    );
  }

  if (current.extra_status !== 'pendente_ceo') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Item ja foi decidido com status "${current.extra_status}"`,
      422,
      { current_status: current.extra_status },
    );
  }

  const { data: updated, error: updateError } = await client
    .from('scope_items')
    .update({
      extra_status: data.extra_status,
      ceo_notes: data.ceo_notes ?? null,
      ceo_decision_by: auth.userId,
      ceo_decision_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[attendance/scope-items-decide] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao registrar decisao', 500, {
      detail: updateError.message,
    });
  }

  console.log('[attendance/scope-items-decide] decisao registrada', {
    id,
    extra_status: data.extra_status,
  });

  // Notificar o criador do item da decisao
  try {
    const { data: job } = await client
      .from('jobs')
      .select('code')
      .eq('id', current.job_id)
      .single();

    const statusLabel: Record<string, string> = {
      aprovado_gratuito: 'aprovado (gratuito)',
      cobrar_aditivo: 'cobrar como aditivo',
      recusado: 'recusado',
    };

    await createNotification(client, {
      tenant_id: auth.tenantId,
      user_id: current.created_by,
      type: 'extra_decided' as Parameters<typeof createNotification>[1]['type'],
      priority: 'normal',
      title: `Extra decidido — Job ${job?.code ?? ''}`,
      body: `Extra "${current.description.slice(0, 80)}${current.description.length > 80 ? '...' : ''}" foi ${statusLabel[data.extra_status] ?? data.extra_status}`,
      metadata: {
        scope_item_id: id,
        job_id: current.job_id,
        decision: data.extra_status,
        ceo_notes: data.ceo_notes ?? null,
      },
      action_url: `/jobs/${current.job_id}?tab=atendimento`,
      job_id: current.job_id,
    });
  } catch (notifyErr) {
    console.error(
      '[attendance/scope-items-decide] falha ao notificar criador (nao critico):',
      notifyErr,
    );
  }

  return success(updated, 200, req);
}
