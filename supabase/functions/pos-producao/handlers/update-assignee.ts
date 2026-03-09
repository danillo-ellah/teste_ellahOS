import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdatePosAssigneeSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador'];

export async function handleUpdateAssignee(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para atribuir responsavel de pos-producao', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data: current, error: fetchErr } = await supabase
    .from('job_deliverables')
    .select('id, job_id, description, pos_assignee_id')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !current) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const body = await req.json();
  const { pos_assignee_id } = validate(UpdatePosAssigneeSchema, body);

  console.log(`[pos-producao/update-assignee] deliverable=${deliverableId} assignee=${pos_assignee_id ?? 'null'}`);

  const { data: updated, error: updateErr } = await supabase
    .from('job_deliverables')
    .update({ pos_assignee_id: pos_assignee_id ?? null })
    .eq('id', deliverableId)
    .select()
    .single();

  if (updateErr) throw new AppError('INTERNAL_ERROR', updateErr.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: current.job_id,
    eventType: 'field_update',
    userId: auth.userId,
    dataBefore: { pos_assignee_id: current.pos_assignee_id },
    dataAfter: { pos_assignee_id: pos_assignee_id ?? null },
    description: pos_assignee_id
      ? `Responsavel de pos atribuido ao entregavel "${current.description}"`
      : `Responsavel de pos removido do entregavel "${current.description}"`,
  });

  return success(updated, 200, req);
}
