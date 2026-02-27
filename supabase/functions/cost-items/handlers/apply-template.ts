import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para aplicar templates
const ALLOWED_ROLES = ['produtor_executivo', 'admin', 'ceo'];

export async function handleApplyTemplate(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[cost-items/apply-template] aplicando template de categorias ao job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para aplicar templates',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Buscar project_type do job
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, project_type, title')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Buscar categorias do tenant para o project_type do job e para 'all'
  const { data: categories, error: categoriesError } = await client
    .from('cost_categories')
    .select('id, item_number, display_name, production_type, sort_order')
    .eq('tenant_id', auth.tenantId)
    .in('production_type', [job.project_type, 'all'])
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('item_number', { ascending: true });

  if (categoriesError) {
    console.error('[cost-items/apply-template] erro ao buscar categorias:', categoriesError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar categorias de custo', 500, {
      detail: categoriesError.message,
    });
  }

  if (!categories || categories.length === 0) {
    throw new AppError(
      'NOT_FOUND',
      'Nenhuma categoria de custo encontrada para este tipo de producao',
      404,
      { project_type: job.project_type },
    );
  }

  // Verificar quais item_numbers ja existem no job (para evitar duplicatas)
  const { data: existingItems } = await client
    .from('cost_items')
    .select('item_number')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .eq('sub_item_number', 0)
    .is('deleted_at', null);

  const existingItemNumbers = new Set((existingItems ?? []).map((i) => i.item_number as number));

  // Filtrar categorias que ainda nao tem header no job
  // Deduplicar: se houver tanto 'all' quanto project_type, preferir project_type
  const categoryByItemNumber = new Map<
    number,
    { item_number: number; display_name: string; sort_order: number; production_type: string }
  >();

  for (const cat of categories) {
    const existing = categoryByItemNumber.get(cat.item_number as number);
    // Preferir production_type especifico sobre 'all'
    if (!existing || (existing.production_type === 'all' && cat.production_type !== 'all')) {
      categoryByItemNumber.set(cat.item_number as number, {
        item_number: cat.item_number as number,
        display_name: cat.display_name,
        sort_order: cat.sort_order as number,
        production_type: cat.production_type,
      });
    }
  }

  const categoriesToCreate = [...categoryByItemNumber.values()].filter(
    (cat) => !existingItemNumbers.has(cat.item_number),
  );

  if (categoriesToCreate.length === 0) {
    // Todas as categorias ja existem — retornar sucesso sem criar nada
    console.log('[cost-items/apply-template] todas as categorias ja existem no job', { jobId });
    return created({ created: 0, items: [], message: 'Todas as categorias ja estao presentes no job' });
  }

  // Criar headers (sub_item_number = 0) para cada categoria
  const insertData = categoriesToCreate.map((cat) => ({
    tenant_id: auth.tenantId,
    job_id: jobId,
    item_number: cat.item_number,
    sub_item_number: 0,
    service_description: cat.display_name,
    sort_order: cat.sort_order,
    item_status: 'orcado',
    nf_request_status: 'pendente',
    payment_status: 'pendente',
    created_by: auth.userId,
  }));

  const { data: createdItems, error: insertError } = await client
    .from('cost_items')
    .insert(insertData)
    .select('*');

  if (insertError) {
    console.error('[cost-items/apply-template] erro ao inserir headers:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao aplicar template de categorias', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cost-items/apply-template] template aplicado com sucesso', {
    jobId,
    created: createdItems?.length ?? 0,
  });

  return created({
    created: createdItems?.length ?? 0,
    items: createdItems,
  });
}
