import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = ['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao'];

const ImportFromJobSchema = z.object({
  source_job_id: z.string().uuid(),
});

export async function handleImportFromJob(
  req: Request,
  auth: AuthContext,
  targetJobId: string,
): Promise<Response> {
  console.log('[cost-items/import-from-job] iniciando importacao de estrutura', {
    targetJobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // 1. Role check
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para importar estrutura', 403);
  }

  // 2. Parse body com Zod
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = ImportFromJobSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'source_job_id invalido', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { source_job_id: sourceJobId } = parseResult.data;

  // 3. Validar source != target
  if (sourceJobId === targetJobId) {
    throw new AppError('VALIDATION_ERROR', 'Job de origem e destino sao o mesmo', 400);
  }

  const client = getSupabaseClient(auth.token);

  // 4. Validar target job existe, pertence ao tenant, nao deletado
  const { data: targetJob, error: targetJobError } = await client
    .from('jobs')
    .select('id, title, code')
    .eq('id', targetJobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (targetJobError || !targetJob) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 5. Validar target job vazio — count cost_items = 0 (409 CONFLICT se ja tem itens)
  const { count: targetCount, error: targetCountError } = await client
    .from('cost_items')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', targetJobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (targetCountError) {
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar itens existentes', 500);
  }

  if (targetCount && targetCount > 0) {
    throw new AppError(
      'CONFLICT',
      'Job ja possui itens de custo. Import so pode ser feito em job vazio.',
      409,
      { existing_items: targetCount },
    );
  }

  // 6. Validar source job existe, pertence ao tenant, nao deletado
  const { data: sourceJob, error: sourceJobError } = await client
    .from('jobs')
    .select('id, title, code')
    .eq('id', sourceJobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (sourceJobError || !sourceJob) {
    throw new AppError('NOT_FOUND', 'Job de origem nao encontrado', 404);
  }

  // 7. Buscar cost_items do source: apenas campos de estrutura
  const { data: sourceItems, error: sourceItemsError } = await client
    .from('cost_items')
    .select('item_number, sub_item_number, service_description, sort_order')
    .eq('job_id', sourceJobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });

  if (sourceItemsError) {
    console.error('[cost-items/import-from-job] erro ao buscar itens do source:', sourceItemsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao importar itens', 500, {
      detail: sourceItemsError.message,
    });
  }

  // 8. Validar source tem itens
  if (!sourceItems || sourceItems.length === 0) {
    throw new AppError('VALIDATION_ERROR', 'Job de origem nao possui itens de custo', 400);
  }

  // 9. Montar insertData com campos FIXOS (is_category_header e GENERATED column, nao incluir)
  const insertData = sourceItems.map((item) => ({
    tenant_id: auth.tenantId,
    job_id: targetJobId,
    item_number: item.item_number,
    sub_item_number: item.sub_item_number,
    service_description: item.service_description,
    sort_order: item.sort_order,
    item_status: 'orcado',
    nf_request_status: 'nao_aplicavel',
    payment_status: 'pendente',
    quantity: 1,
    created_by: auth.userId,
  }));

  // 10. Insert batch
  const { data: createdItems, error: insertError } = await client
    .from('cost_items')
    .insert(insertData)
    .select('*');

  if (insertError) {
    console.error('[cost-items/import-from-job] erro ao inserir itens:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao importar itens', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cost-items/import-from-job] importacao concluida com sucesso', {
    targetJobId,
    sourceJobId,
    created: createdItems?.length ?? 0,
  });

  // 11. Return created com contagem, job de origem e itens criados
  return created({
    created: createdItems?.length ?? 0,
    source_job: {
      id: sourceJob.id,
      title: sourceJob.title,
      code: sourceJob.code,
    },
    items: createdItems,
  });
}
