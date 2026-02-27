import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para copiar itens
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Schema da requisicao de copia
const CopySchema = z.object({
  target_job_id: z.string().uuid(),
});

// Campos que NAO devem ser copiados (resetados ou proprios da nova instancia)
const EXCLUDED_FIELDS = new Set([
  'id',
  'job_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'nf_request_status',
  'nf_requested_at',
  'nf_requested_by',
  'nf_document_id',
  'nf_drive_url',
  'nf_filename',
  'nf_extracted_value',
  'nf_validation_ok',
  'payment_status',
  'payment_date',
  'payment_proof_url',
  'payment_proof_filename',
  'actual_paid_value',
  'suggested_status',
  // GENERATED columns — PostgreSQL nao permite INSERT em colunas GENERATED ALWAYS
  'is_category_header',
  'total_value',
  'overtime_value',
  'total_with_overtime',
]);

export async function handleCopy(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[cost-items/copy] copiando item de custo para outro job', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para copiar itens de custo',
      403,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CopySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { target_job_id } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar item original
  const { data: original, error: fetchError } = await client
    .from('cost_items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !original) {
    throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
  }

  // Verificar se o job destino existe e pertence ao mesmo tenant
  const { data: targetJob, error: jobError } = await client
    .from('jobs')
    .select('id, title')
    .eq('id', target_job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !targetJob) {
    throw new AppError('NOT_FOUND', 'Job destino nao encontrado', 404);
  }

  // Construir objeto copiado excluindo campos nao copiados e resetando status
  const copyData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(original)) {
    if (!EXCLUDED_FIELDS.has(key)) {
      copyData[key] = value;
    }
  }

  // Definir os valores corretos para a copia
  copyData.job_id = target_job_id;
  copyData.item_status = 'orcado';
  copyData.nf_request_status = 'pendente';
  copyData.payment_status = 'pendente';
  copyData.created_by = auth.userId;
  // Remover tenant_id do copyData pois sera re-adicionado abaixo
  delete copyData.tenant_id;

  const { data: copiedItem, error: insertError } = await client
    .from('cost_items')
    .insert({ ...copyData, tenant_id: auth.tenantId })
    .select('*')
    .single();

  if (insertError) {
    console.error('[cost-items/copy] erro ao copiar:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao copiar item de custo', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cost-items/copy] item copiado com sucesso', {
    original_id: id,
    new_id: copiedItem.id,
    target_job_id,
  });

  return created(copiedItem);
}
