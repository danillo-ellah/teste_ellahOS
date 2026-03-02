import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles com permissao de visualizar historico de versoes
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

export async function listApprovalFilesHandler(
  req: Request,
  auth: AuthContext,
  jobId: string | null,
): Promise<Response> {
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para listar documentos de aprovacao', 403);
  }

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio na URL', 400);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id deve ser um UUID valido', 400);
  }

  // Suporta filtro opcional por category via query param (default: aprovacao_interna)
  const url = new URL(req.url);
  const category = url.searchParams.get('category') ?? 'aprovacao_interna';

  const supabase = getSupabaseClient(auth.token);

  console.log(
    `[list-files] user=${auth.userId} job_id=${jobId} category=${category}`,
  );

  // Busca todos os registros da category para o job, ordenado por versao decrescente
  // Inclui registros superseded para mostrar o historico completo
  const { data: files, error: filesError } = await supabase
    .from('job_files')
    .select(`
      id,
      file_name,
      file_url,
      file_type,
      category,
      version,
      external_id,
      external_source,
      superseded_by,
      metadata,
      uploaded_by,
      created_at
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .eq('category', category)
    .is('deleted_at', null)
    .order('version', { ascending: false });

  if (filesError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao buscar arquivos: ${filesError.message}`,
      500,
    );
  }

  // Extrair status de aprovacao de cada arquivo a partir do campo metadata
  const enrichedFiles = (files ?? []).map((f) => {
    const meta = (f.metadata as Record<string, unknown>) ?? {};
    const approvalStatus = (meta.approval_status as string) ?? null;
    const approvalAction = (meta.approval_action as string) ?? null;
    const approvedAt = (meta.approved_at as string) ?? null;
    const approvedBy = (meta.approved_by as string) ?? null;
    const approvalComment = (meta.approval_comment as string) ?? null;
    // Versao ativa = sem superseded_by
    const isActive = f.superseded_by === null;

    return {
      id: f.id,
      file_name: f.file_name,
      file_url: f.file_url,
      file_type: f.file_type,
      category: f.category,
      version: f.version,
      external_id: f.external_id,
      external_source: f.external_source,
      superseded_by: f.superseded_by,
      is_active: isActive,
      uploaded_by: f.uploaded_by,
      created_at: f.created_at,
      // Dados de aprovacao extraidos do metadata
      approval_status: approvalStatus,
      approval_action: approvalAction,
      approved_at: approvedAt,
      approved_by: approvedBy,
      approval_comment: approvalComment,
    };
  });

  return success({
    job_id: jobId,
    category,
    total: enrichedFiles.length,
    files: enrichedFiles,
  });
}
