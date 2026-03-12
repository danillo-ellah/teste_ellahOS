import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { flattenTemplate, GG_TEMPLATE } from '../data/gg-template.ts';

const ALLOWED_ROLES = ['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao'];

export async function handleApplyTemplate(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[cost-items/apply-template] aplicando template GG ao job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para aplicar templates', 403);
  }

  const client = getSupabaseClient(auth.token);

  // Validar que o job existe e pertence ao tenant
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, title')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Verificar se o job ja tem cost_items (rejeitar se sim)
  const { count, error: countError } = await client
    .from('cost_items')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (countError) {
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar itens existentes', 500);
  }

  if (count && count > 0) {
    throw new AppError(
      'CONFLICT',
      'Job ja possui itens de custo. Template so pode ser aplicado em job vazio.',
      409,
      { existing_items: count },
    );
  }

  // Gerar dados de insercao a partir do template
  const templateItems = flattenTemplate();
  const insertData = templateItems.map((item) => ({
    tenant_id: auth.tenantId,
    job_id: jobId,
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

  const { data: createdItems, error: insertError } = await client
    .from('cost_items')
    .insert(insertData)
    .select('*');

  if (insertError) {
    console.error('[cost-items/apply-template] erro ao inserir template:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao aplicar template', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cost-items/apply-template] template GG aplicado com sucesso', {
    jobId,
    created: createdItems?.length ?? 0,
    categories: GG_TEMPLATE.length,
  });

  return created({
    created: createdItems?.length ?? 0,
    categories: GG_TEMPLATE.length,
    items: createdItems,
  });
}
