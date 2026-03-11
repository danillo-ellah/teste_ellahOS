import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

const WORKFLOW_STATUSES = ['pending', 'in_progress', 'completed', 'skipped', 'blocked', 'rejected'] as const;

const UpdateStepSchema = z.object({
  status: z.enum(WORKFLOW_STATUSES).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  estimated_value: z.number().min(0).nullable().optional(),
  actual_value: z.number().min(0).nullable().optional(),
  rejection_reason: z.string().min(1).max(2000).nullable().optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser informado' },
);

// Roles que podem mudar status de steps
const STATUS_CHANGE_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador', 'diretor'];
// Roles que podem atribuir/modificar steps
const EDIT_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador', 'diretor', 'atendimento'];

export async function handleUpdateStep(
  req: Request,
  auth: AuthContext,
  stepId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Buscar step atual
  const { data: current, error: fetchErr } = await supabase
    .from('job_workflow_steps')
    .select('*, job:job_id(id, title, code)')
    .eq('id', stepId)
    .is('deleted_at', null)
    .single();

  if (fetchErr || !current) {
    throw new AppError('NOT_FOUND', 'Passo do workflow nao encontrado', 404);
  }

  const body = await req.json();
  const validated = validate(UpdateStepSchema, body);

  // RBAC: mudanca de status requer roles especificos
  if (validated.status !== undefined && !STATUS_CHANGE_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para alterar status do workflow', 403);
  }

  // RBAC: edicao geral
  if (!EDIT_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Sem permissao para editar passo do workflow', 403);
  }

  // Montar payload de update
  const updatePayload: Record<string, unknown> = {};

  if (validated.status !== undefined) {
    updatePayload.status = validated.status;

    // Se completando uma aprovacao, registrar quem aprovou
    if (validated.status === 'completed' && current.step_type === 'aprovacao') {
      updatePayload.approved_by = auth.userId;
      updatePayload.approved_at = new Date().toISOString();
    }

    // Se rejeitando, exigir motivo
    if (validated.status === 'rejected') {
      if (!validated.rejection_reason && !current.rejection_reason) {
        throw new AppError('VALIDATION_ERROR', 'Motivo da rejeicao e obrigatorio', 400);
      }
      if (validated.rejection_reason) {
        updatePayload.rejection_reason = validated.rejection_reason;
      }
    }
  }

  if (validated.assigned_to !== undefined) updatePayload.assigned_to = validated.assigned_to;
  if (validated.notes !== undefined) updatePayload.notes = validated.notes;
  if (validated.estimated_value !== undefined) updatePayload.estimated_value = validated.estimated_value;
  if (validated.actual_value !== undefined) updatePayload.actual_value = validated.actual_value;
  if (validated.rejection_reason !== undefined && validated.status !== 'rejected') {
    updatePayload.rejection_reason = validated.rejection_reason;
  }

  // Executar update (trigger validate_workflow_step_transition valida regras)
  const { data: updated, error: updateErr } = await supabase
    .from('job_workflow_steps')
    .update(updatePayload)
    .eq('id', stepId)
    .select(`
      *,
      assigned_profile:assigned_to(id, full_name, avatar_url),
      approved_profile:approved_by(id, full_name)
    `)
    .single();

  if (updateErr) {
    // Erros do trigger de validacao vem como mensagem do PostgreSQL
    if (updateErr.message?.includes('Conferencia exige')) {
      throw new AppError('VALIDATION_ERROR', 'Conferencia exige pelo menos 1 evidencia (foto/NF/recibo) para ser concluida', 400);
    }
    if (updateErr.message?.includes('passo anterior')) {
      throw new AppError('VALIDATION_ERROR', updateErr.message, 400);
    }
    if (updateErr.message?.includes('Aprovacao exige')) {
      throw new AppError('VALIDATION_ERROR', 'Aprovacao exige approved_by e approved_at preenchidos', 400);
    }
    if (updateErr.message?.includes('Rejeicao exige')) {
      throw new AppError('VALIDATION_ERROR', 'Rejeicao exige motivo (rejection_reason)', 400);
    }
    console.error('[update-step] update error:', updateErr.message);
    throw new AppError('INTERNAL_ERROR', 'Erro interno ao atualizar passo do workflow', 500);
  }

  // Historico
  const jobData = current.job as { id: string; title: string; code: string } | null;
  if (jobData && validated.status) {
    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId: jobData.id,
      eventType: 'status_change',
      userId: auth.userId,
      dataBefore: { step: current.step_label, status: current.status },
      dataAfter: { step: current.step_label, status: validated.status },
      description: `Workflow "${current.step_label}" alterado de "${current.status}" para "${validated.status}"`,
    });
  }

  console.log(`[job-workflow/update-step] step=${stepId} status=${validated.status ?? 'unchanged'}`);
  return success(updated, 200, req);
}
