import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate, ApproveJobSchema } from '../../_shared/validation.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Mapa de approval_type API -> banco
const APPROVAL_TYPE_MAP: Record<string, string> = {
  internal: 'interna',
  external: 'externa_cliente',
};

export async function approveJob(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // 1. Buscar job atual
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('id, status, title')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Validar payload
  const body = await req.json();
  const validated = validate(ApproveJobSchema, body);

  // 3. Atualizar job com dados de aprovacao
  const { data: updatedJob, error: updateError } = await supabase
    .from('jobs')
    .update({
      status: 'aprovado_selecao_diretor',
      approval_type: APPROVAL_TYPE_MAP[validated.approval_type] ?? validated.approval_type,
      approved_by_name: auth.email,
      approval_date: validated.approval_date,
      closed_value: validated.closed_value,
      internal_approval_doc_url: validated.approval_document_url ?? null,
      status_updated_at: new Date().toISOString(),
      status_updated_by: auth.userId,
    })
    .eq('id', jobId)
    .select('id, status, approval_type, approved_by_name, approval_date, closed_value, internal_approval_doc_url')
    .single();

  if (updateError) {
    throw new AppError('INTERNAL_ERROR', updateError.message, 500);
  }

  // 4. Registrar no historico
  await insertHistory(supabase, {
    tenantId: auth.tenantId,
    jobId,
    eventType: 'approval',
    userId: auth.userId,
    dataBefore: { status: job.status },
    dataAfter: {
      status: 'aprovado_selecao_diretor',
      approval_type: validated.approval_type,
      closed_value: validated.closed_value,
    },
    description: `Job "${job.title}" aprovado (${validated.approval_type}) com valor R$ ${validated.closed_value.toLocaleString('pt-BR')}`,
  });

  return success({
    id: updatedJob.id,
    status: updatedJob.status,
    approval_type: validated.approval_type,
    approved_by_name: updatedJob.approved_by_name,
    approval_date: updatedJob.approval_date,
    closed_value: updatedJob.closed_value,
    approval_document_url: updatedJob.internal_approval_doc_url,
  });
}
