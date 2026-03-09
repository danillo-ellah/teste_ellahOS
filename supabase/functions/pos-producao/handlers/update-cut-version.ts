import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, UpdateCutVersionSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles que podem aprovar ou rejeitar versoes
const APPROVAL_ROLES = ['admin', 'ceo', 'produtor_executivo', 'atendimento'];

// Mapa de stage resultante apos acao de aprovacao/rejeicao por tipo de versao
const APPROVAL_STAGE_MAP = {
  aprovado: {
    offline: 'aprovado_offline',
    online: 'aprovado_online',
  },
  rejeitado: {
    offline: 'revisao_offline',
    online: 'revisao_online',
  },
} as const;

// Status do deliverable associado a cada stage
const STAGE_TO_DELIVERABLE_STATUS: Record<string, string> = {
  aprovado_offline: 'aprovado',
  aprovado_online: 'aprovado',
  revisao_offline: 'aguardando_aprovacao',
  revisao_online: 'aguardando_aprovacao',
};

export async function handleUpdateCutVersion(
  req: Request,
  auth: AuthContext,
  deliverableId: string,
  versionId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Buscar versao com join no deliverable para obter job_id e pos_stage
  const { data: version, error: vErr } = await supabase
    .from('pos_cut_versions')
    .select(`
      *,
      deliverable:job_deliverables!deliverable_id(id, job_id, description, pos_stage)
    `)
    .eq('id', versionId)
    .eq('deliverable_id', deliverableId)
    .single();

  if (vErr || !version) {
    throw new AppError('NOT_FOUND', 'Versao de corte nao encontrada', 404);
  }

  const body = await req.json();
  const validated = validate(UpdateCutVersionSchema, body);

  // RBAC: aprovar ou rejeitar so para roles especificos
  if (validated.status && ['aprovado', 'rejeitado'].includes(validated.status)) {
    if (!APPROVAL_ROLES.includes(auth.role)) {
      throw new AppError('FORBIDDEN', 'Sem permissao para aprovar ou rejeitar versoes de corte', 403);
    }
  }

  // Rejeicao exige notas de revisao (no corpo atual ou ja existentes na versao)
  if (validated.status === 'rejeitado') {
    const notes = validated.revision_notes ?? version.revision_notes;
    if (!notes || notes.trim().length === 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Notas de revisao sao obrigatorias ao rejeitar uma versao',
        400,
      );
    }
  }

  // Montar payload de update da versao
  const updatePayload: Record<string, unknown> = {};
  if (validated.status !== undefined) updatePayload.status = validated.status;
  if (validated.review_url !== undefined) updatePayload.review_url = validated.review_url;
  if (validated.revision_notes !== undefined) updatePayload.revision_notes = validated.revision_notes;

  // Aprovacao: registrar quem aprovou e quando
  if (validated.status === 'aprovado') {
    updatePayload.approved_by = auth.userId;
    updatePayload.approved_at = new Date().toISOString();
  }

  console.log(`[pos-producao/update-cut-version] version=${versionId} status=${validated.status ?? 'sem-mudanca'}`);

  const { data: updated, error: updateErr } = await supabase
    .from('pos_cut_versions')
    .update(updatePayload)
    .eq('id', versionId)
    .select()
    .single();

  if (updateErr) throw new AppError('INTERNAL_ERROR', updateErr.message, 500);

  // Side-effect: sincronizar pos_stage e status do deliverable ao aprovar ou rejeitar
  if (validated.status === 'aprovado' || validated.status === 'rejeitado') {
    const versionType = version.version_type as 'offline' | 'online';
    const newStage = APPROVAL_STAGE_MAP[validated.status][versionType];
    const newDeliverableStatus = STAGE_TO_DELIVERABLE_STATUS[newStage];

    const { error: delUpdateErr } = await supabase
      .from('job_deliverables')
      .update({
        pos_stage: newStage,
        status: newDeliverableStatus,
      })
      .eq('id', deliverableId);

    if (delUpdateErr) {
      console.error(`[pos-producao/update-cut-version] erro ao sincronizar deliverable: ${delUpdateErr.message}`);
    }

    const actionLabel = validated.status === 'aprovado' ? 'aprovada' : 'rejeitada';

    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId: version.deliverable.job_id,
      eventType: 'approval',
      userId: auth.userId,
      dataBefore: {
        version_status: version.status,
        pos_stage: version.deliverable.pos_stage,
      },
      dataAfter: {
        version_status: validated.status,
        pos_stage: newStage,
      },
      description: `Versao V${version.version_number} (${version.version_type}) do entregavel "${version.deliverable.description}" ${actionLabel}`,
    });
  }

  return success(updated, 200, req);
}
