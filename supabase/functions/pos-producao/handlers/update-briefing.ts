import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdatePosBriefingSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador'];

export async function handleUpdateBriefing(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para atualizar briefing tecnico de pos-producao', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data: current, error: fetchErr } = await supabase
    .from('job_deliverables')
    .select('id, job_id, description, pos_briefing')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !current) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const body = await req.json();
  // Schema strict: rejeita campos desconhecidos no objeto pos_briefing
  const { pos_briefing } = validate(UpdatePosBriefingSchema, body);

  console.log(`[pos-producao/update-briefing] deliverable=${deliverableId} briefing=${pos_briefing === null ? 'null' : 'set'}`);

  const { data: updated, error: updateErr } = await supabase
    .from('job_deliverables')
    .update({ pos_briefing: pos_briefing ?? null })
    .eq('id', deliverableId)
    .select()
    .single();

  if (updateErr) throw new AppError('INTERNAL_ERROR', updateErr.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: current.job_id,
    eventType: 'field_update',
    userId: auth.userId,
    dataBefore: { pos_briefing: current.pos_briefing },
    dataAfter: { pos_briefing: pos_briefing ?? null },
    description: pos_briefing
      ? `Briefing tecnico de pos atualizado para entregavel "${current.description}"`
      : `Briefing tecnico de pos removido do entregavel "${current.description}"`,
  });

  return success(updated, 200, req);
}
