import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles que podem aprovar ou rejeitar o documento interno
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

// Acoes validas para o endpoint de aprovacao
type ApprovalAction = 'approve' | 'reject';

// Status mapeados por acao
const ACTION_TO_STATUS: Record<ApprovalAction, string> = {
  approve: 'aprovado',
  reject: 'rejeitado',
};

// Payload esperado no body do request
interface ApprovePayload {
  job_id: string;
  action: ApprovalAction;
  comment?: string;
  // ID do registro em job_files (opcional — se omitido, opera na versao ativa)
  job_file_id?: string;
}

export async function approveInternalDocHandler(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Verificar permissao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para aprovar documento interno', 403);
  }

  // Validar e parsear payload
  let body: ApprovePayload;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const { job_id: jobId, action, comment, job_file_id: jobFileId } = body;

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id deve ser um UUID valido', 400);
  }

  if (!action || !['approve', 'reject'].includes(action)) {
    throw new AppError(
      'VALIDATION_ERROR',
      'action deve ser "approve" ou "reject"',
      400,
    );
  }

  if (action === 'reject' && (!comment || !comment.trim())) {
    throw new AppError(
      'VALIDATION_ERROR',
      'comment e obrigatorio para a acao "reject"',
      400,
    );
  }

  if (jobFileId && !uuidRegex.test(jobFileId)) {
    throw new AppError('VALIDATION_ERROR', 'job_file_id deve ser um UUID valido', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(
    `[approve] user=${auth.userId} job_id=${jobId} action=${action} job_file_id=${jobFileId ?? 'ativo'}`,
  );

  // 1. Verificar que o job existe e pertence ao tenant
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, job_aba, title, internal_approval_doc_url, created_by')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const serviceClient = getServiceClient();

  // 2. Localizar o registro em job_files
  // Se job_file_id foi fornecido, usa direto. Caso contrario, busca a versao ativa (sem superseded_by)
  let targetFileQuery = serviceClient
    .from('job_files')
    .select('id, file_url, version, file_name, metadata')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .eq('category', 'aprovacao_interna')
    .is('deleted_at', null);

  if (jobFileId) {
    targetFileQuery = targetFileQuery.eq('id', jobFileId);
  } else {
    targetFileQuery = targetFileQuery.is('superseded_by', null);
  }

  const { data: targetFile, error: fileError } = await targetFileQuery
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fileError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao buscar documento de aprovacao: ${fileError.message}`,
      500,
    );
  }

  if (!targetFile) {
    throw new AppError(
      'NOT_FOUND',
      'Nenhum documento de aprovacao interna encontrado para este job. Gere o documento primeiro.',
      404,
    );
  }

  const fileVersion = (targetFile.version as number) ?? 1;
  const fileUrl = (targetFile.file_url as string) ?? null;
  const resolvedFileId = targetFile.id as string;
  const newStatus = ACTION_TO_STATUS[action];
  const actionLabel = action === 'approve' ? 'aprovado' : 'rejeitado';
  const approvedAt = new Date().toISOString();

  // 3. Atualizar metadata do registro em job_files com status de aprovacao
  // O schema de job_files nao tem coluna de status de aprovacao, entao usamos o campo metadata (JSONB)
  const existingMeta = (targetFile.metadata as Record<string, unknown>) ?? {};
  const updatedMeta: Record<string, unknown> = {
    ...existingMeta,
    approval_status: newStatus,
    approval_action: action,
    approved_by: auth.userId,
    approved_at: approvedAt,
    approval_comment: comment?.trim() ?? null,
  };

  const { error: updateFileError } = await serviceClient
    .from('job_files')
    .update({ metadata: updatedMeta })
    .eq('id', resolvedFileId)
    .eq('tenant_id', auth.tenantId);

  if (updateFileError) {
    console.error(
      `[approve] erro ao atualizar metadata do job_file ${resolvedFileId}: ${updateFileError.message}`,
    );
    // Nao bloqueia — continua para registrar historico e notificacao
  } else {
    console.log(
      `[approve] job_file ${resolvedFileId} (v${fileVersion}) marcado como ${newStatus}`,
    );
  }

  // 4. Se aprovado, atualizar campo internal_approval_doc_url no job (garante que aponta para versao aprovada)
  if (action === 'approve' && fileUrl) {
    const { error: updateJobError } = await serviceClient
      .from('jobs')
      .update({
        internal_approval_doc_url: fileUrl,
        // Registrar quem aprovou internamente (campos opcionais — ignora se coluna nao existir)
        approved_by_name: auth.email,
      })
      .eq('id', jobId)
      .eq('tenant_id', auth.tenantId);

    if (updateJobError) {
      console.warn(
        `[approve] aviso: falha ao atualizar jobs (nao critico): ${updateJobError.message}`,
      );
    }
  }

  // 5. Registrar no historico do job
  const jobCode = (job.code as string) ?? (job.job_aba as string) ?? jobId.slice(0, 8);
  const historyDescription = action === 'approve'
    ? `Documento de aprovacao interna v${fileVersion} aprovado`
    : `Documento de aprovacao interna v${fileVersion} rejeitado${comment ? `: ${comment.trim()}` : ''}`;

  try {
    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId,
      eventType: 'approval',
      userId: auth.userId,
      description: historyDescription,
      dataAfter: {
        action: `approval_internal_${actionLabel}`,
        job_file_id: resolvedFileId,
        version: fileVersion,
        file_url: fileUrl,
        approved_by: auth.userId,
        approved_at: approvedAt,
        comment: comment?.trim() ?? null,
      },
    });
  } catch (histErr) {
    console.warn('[approve] falha ao registrar historico (nao critico):', histErr);
  }

  // 6. Criar notificacao in-app para o criador do job (se diferente do aprovador)
  const createdBy = job.created_by as string | null;
  if (createdBy && createdBy !== auth.userId) {
    const notificationTitle = action === 'approve'
      ? `Aprovacao interna confirmada — ${jobCode}`
      : `Aprovacao interna rejeitada — ${jobCode}`;

    const notificationBody = action === 'approve'
      ? `O documento de aprovacao interna v${fileVersion} foi aprovado.`
      : `O documento de aprovacao interna v${fileVersion} foi rejeitado${comment ? `: ${comment.trim()}` : '.'}.`;

    try {
      await serviceClient
        .from('notifications')
        .insert({
          tenant_id: auth.tenantId,
          user_id: createdBy,
          type: 'approval_responded',
          priority: action === 'reject' ? 'high' : 'normal',
          title: notificationTitle,
          body: notificationBody,
          job_id: jobId,
          action_url: `/jobs/${jobId}?tab=historico`,
          metadata: {
            job_file_id: resolvedFileId,
            version: fileVersion,
            action,
            approved_by: auth.userId,
          },
        });

      console.log(
        `[approve] notificacao criada para user ${createdBy} (job ${jobId})`,
      );
    } catch (notifErr) {
      console.warn('[approve] falha ao criar notificacao (nao critico):', notifErr);
    }
  }

  const jobTitle = (job.title as string) ?? '';

  return success({
    job_id: jobId,
    job_file_id: resolvedFileId,
    action,
    status: newStatus,
    version: fileVersion,
    file_url: fileUrl,
    approved_by: auth.userId,
    approved_at: approvedAt,
    comment: comment?.trim() ?? null,
    job_code: jobCode,
    job_title: jobTitle,
  });
}
