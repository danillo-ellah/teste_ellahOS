// GET /budget-letter?job_id=X
//
// Lista todas as versoes de Carta Orcamento de um job (job_files onde category = 'budget_letter').
// Retorna em ordem decrescente de versao (mais recente primeiro).

import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles com permissao para listar cartas orcamento
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listHandler(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para listar Cartas Orcamento',
      403,
    );
  }

  // Extrair job_id da query string
  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'Parametro job_id e obrigatorio', 400);
  }

  if (!UUID_REGEX.test(jobId)) {
    throw new AppError('VALIDATION_ERROR', 'job_id deve ser um UUID valido', 400);
  }

  const supabase = getSupabaseClient(auth.token);

  console.log(
    `[budget-letter/list] user=${auth.userId} tenant=${auth.tenantId} job_id=${jobId}`,
  );

  // Verificar que o job pertence ao tenant (RLS ja garante, mas loga para debug)
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id, code, title')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (jobError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao verificar job: ${jobError.message}`,
      500,
    );
  }

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar todas as versoes de carta orcamento, ordenado por versao decrescente
  const { data: files, error: filesError } = await supabase
    .from('job_files')
    .select(`
      id,
      file_name,
      file_url,
      file_type,
      category,
      version,
      superseded_by,
      metadata,
      uploaded_by,
      created_at,
      updated_at
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .eq('category', 'budget_letter')
    .is('deleted_at', null)
    .order('version', { ascending: false });

  if (filesError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao buscar cartas orcamento: ${filesError.message}`,
      500,
    );
  }

  // Enriquecer resultados com flags de status
  const enrichedFiles = (files ?? []).map((f) => {
    const meta = (f.metadata as Record<string, unknown>) ?? {};
    const isActive = f.superseded_by === null;

    return {
      id: f.id,
      file_name: f.file_name,
      file_url: f.file_url,
      category: f.category,
      version: f.version,
      superseded_by: f.superseded_by,
      is_active: isActive,
      // Conteudo markdown disponivel em metadata.content
      has_content: Boolean(meta.content),
      generated_by_ai: Boolean(meta.generated_by_ai),
      model: (meta.model as string) ?? null,
      uploaded_by: f.uploaded_by,
      created_at: f.created_at,
      updated_at: f.updated_at,
    };
  });

  return success(
    {
      job_id: jobId,
      job_code: job.code,
      job_title: job.title,
      category: 'budget_letter',
      total: enrichedFiles.length,
      active_version: enrichedFiles.find((f) => f.is_active)?.version ?? null,
      files: enrichedFiles,
    },
    200,
    req,
  );
}
