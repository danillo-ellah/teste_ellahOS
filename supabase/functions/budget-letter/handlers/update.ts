// PATCH /budget-letter/:id
//
// Atualiza o conteudo de uma Carta Orcamento existente (edicao manual pos-IA).
// Apenas o conteudo markdown (metadata.content) e atualizado.
// Nao incrementa version — a edicao e in-place na versao atual.

import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { insertHistory } from '../../_shared/history.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles com permissao de edicao
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'financeiro'];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Validacao de input
const UpdateSchema = z.object({
  content: z
    .string()
    .min(1, 'content nao pode ser vazio')
    .max(50_000, 'content excede limite de 50.000 caracteres'),
});

type UpdateInput = z.infer<typeof UpdateSchema>;

export async function updateHandler(
  req: Request,
  auth: AuthContext,
  fileId: string,
): Promise<Response> {
  // Verificar permissao
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para editar Carta Orcamento',
      403,
    );
  }

  // Validar fileId
  if (!fileId || !UUID_REGEX.test(fileId)) {
    throw new AppError('VALIDATION_ERROR', 'ID do arquivo deve ser um UUID valido', 400);
  }

  // Validar body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const parseResult = UpdateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    const firstError = parseResult.error.errors[0];
    throw new AppError('VALIDATION_ERROR', firstError.message, 400, {
      field: firstError.path.join('.'),
    });
  }

  const input: UpdateInput = parseResult.data;
  const supabase = getSupabaseClient(auth.token);
  const serviceClient = getServiceClient();

  console.log(
    `[budget-letter/update] user=${auth.userId} tenant=${auth.tenantId} file_id=${fileId}`,
  );

  // 1. Verificar que o arquivo existe, pertence ao tenant e e uma carta orcamento
  const { data: existingFile, error: fetchError } = await supabase
    .from('job_files')
    .select('id, job_id, version, metadata, superseded_by, category')
    .eq('id', fileId)
    .eq('tenant_id', auth.tenantId)
    .eq('category', 'budget_letter')
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao buscar arquivo: ${fetchError.message}`,
      500,
    );
  }

  if (!existingFile) {
    throw new AppError('NOT_FOUND', 'Carta Orcamento nao encontrada', 404);
  }

  // Impedir edicao de versoes supersedidas (apenas a versao ativa pode ser editada)
  if (existingFile.superseded_by !== null) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'Nao e possivel editar uma versao desatualizada da Carta Orcamento. Edite a versao atual.',
      409,
      { superseded_by: existingFile.superseded_by },
    );
  }

  const jobId = existingFile.job_id as string;
  const currentVersion = (existingFile.version as number) ?? 1;

  // 2. Mesclar novo conteudo no metadata existente (preserva generated_by_ai, model, etc.)
  const existingMeta = (existingFile.metadata as Record<string, unknown>) ?? {};
  const updatedMeta = {
    ...existingMeta,
    content: input.content,
    last_edited_by: auth.userId,
    last_edited_at: new Date().toISOString(),
    manually_edited: true,
  };

  // 3. Atualizar o registro via service client (para evitar problemas de RLS no UPDATE)
  const { error: updateError } = await serviceClient
    .from('job_files')
    .update({
      metadata: updatedMeta,
      file_size_bytes: new TextEncoder().encode(input.content).byteLength,
    })
    .eq('id', fileId)
    .eq('tenant_id', auth.tenantId);

  if (updateError) {
    throw new AppError(
      'INTERNAL_ERROR',
      `Erro ao atualizar Carta Orcamento: ${updateError.message}`,
      500,
    );
  }

  console.log(
    `[budget-letter/update] arquivo ${fileId} atualizado (job=${jobId} version=${currentVersion})`,
  );

  // 4. Registrar no historico
  try {
    await insertHistory(supabase, {
      tenantId: auth.tenantId,
      jobId,
      eventType: 'field_update',
      userId: auth.userId,
      description: `Carta Orcamento v${currentVersion} editada manualmente`,
      dataAfter: {
        action: 'budget_letter_edited',
        job_file_id: fileId,
        version: currentVersion,
        edited_by: auth.userId,
      },
    });
  } catch (histErr) {
    console.warn('[budget-letter/update] falha ao registrar historico (nao critico):', histErr);
  }

  return success(
    {
      id: fileId,
      job_id: jobId,
      version: currentVersion,
      content: input.content,
      updated_at: new Date().toISOString(),
    },
    200,
    req,
  );
}
