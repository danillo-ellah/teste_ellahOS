import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdatePosStageSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';
import type { PosStage, DeliverableStatus } from '../../_shared/types.ts';

const STAGE_TO_STATUS: Record<PosStage, DeliverableStatus> = {
  ingest: 'em_producao',
  montagem: 'em_producao',
  apresentacao_offline: 'aguardando_aprovacao',
  revisao_offline: 'aguardando_aprovacao',
  aprovado_offline: 'aprovado',
  finalizacao: 'em_producao',
  apresentacao_online: 'aguardando_aprovacao',
  revisao_online: 'aguardando_aprovacao',
  aprovado_online: 'aprovado',
  copias: 'aprovado',
  entregue: 'entregue',
};

const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador'];

export async function handleUpdateStage(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para alterar etapa de pos-producao', 403);
  }

  const supabase = getSupabaseClient(auth.token);

  const { data: current, error: fetchErr } = await supabase
    .from('job_deliverables')
    .select('id, job_id, description, pos_stage, status')
    .eq('id', deliverableId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !current) {
    throw new AppError('NOT_FOUND', 'Entregavel nao encontrado', 404);
  }

  const body = await req.json();
  const { pos_stage } = validate(UpdatePosStageSchema, body);
  const syncedStatus = STAGE_TO_STATUS[pos_stage];

  console.log(`[pos-producao/update-stage] deliverable=${deliverableId} stage=${pos_stage} status=${syncedStatus}`);

  const { data: updated, error: updateErr } = await supabase
    .from('job_deliverables')
    .update({ pos_stage, status: syncedStatus })
    .eq('id', deliverableId)
    .select()
    .single();

  if (updateErr) throw new AppError('INTERNAL_ERROR', updateErr.message, 500);

  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId: current.job_id,
    eventType: 'status_change',
    userId: auth.userId,
    dataBefore: { pos_stage: current.pos_stage, status: current.status },
    dataAfter: { pos_stage, status: syncedStatus },
    description: `Etapa de pos do entregavel "${current.description}" alterada de "${current.pos_stage ?? 'nenhuma'}" para "${pos_stage}"`,
  });

  return success(updated, 200, req);
}
