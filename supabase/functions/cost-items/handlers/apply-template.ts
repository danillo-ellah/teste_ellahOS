import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { flattenTemplate, GG_TEMPLATE, GG_TEMPLATE_NAME } from '../data/gg-template.ts';
import { flattenMonstroTemplate, MONSTRO_TEMPLATE, MONSTRO_TEMPLATE_NAME } from '../data/monstro-template.ts';
import { flattenDigitalTemplate, DIGITAL_TEMPLATE, DIGITAL_TEMPLATE_NAME } from '../data/digital-template.ts';
import { flattenMotionTemplate, MOTION_TEMPLATE, MOTION_TEMPLATE_NAME } from '../data/motion-template.ts';

const ALLOWED_ROLES = ['ceo', 'produtor_executivo', 'admin', 'diretor_producao', 'coordenador_producao'];

const VALID_TEMPLATES = ['gg', 'monstro', 'digital', 'motion'] as const;
type TemplateName = typeof VALID_TEMPLATES[number];

function resolveTemplate(name: TemplateName) {
  switch (name) {
    case 'gg':
      return { items: flattenTemplate(), categories: GG_TEMPLATE.length, templateName: GG_TEMPLATE_NAME };
    case 'monstro':
      return { items: flattenMonstroTemplate(), categories: MONSTRO_TEMPLATE.length, templateName: MONSTRO_TEMPLATE_NAME };
    case 'digital':
      return { items: flattenDigitalTemplate(), categories: DIGITAL_TEMPLATE.length, templateName: DIGITAL_TEMPLATE_NAME };
    case 'motion':
      return { items: flattenMotionTemplate(), categories: MOTION_TEMPLATE.length, templateName: MOTION_TEMPLATE_NAME };
  }
}

export async function handleApplyTemplate(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  // Resolver template: aceita query param ou body param, default 'gg'
  const url = new URL(req.url);
  let templateKey: string = url.searchParams.get('template') ?? 'gg';

  // Se vier via body POST, body tem prioridade sobre query param
  if (req.method === 'POST') {
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.template) {
        templateKey = body.template;
      }
    } catch {
      // body invalido ou vazio — mantém o valor do query param
    }
  }

  if (!VALID_TEMPLATES.includes(templateKey as TemplateName)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Template invalido: "${templateKey}". Templates disponiveis: ${VALID_TEMPLATES.join(', ')}`,
      400,
      { valid_templates: VALID_TEMPLATES },
    );
  }

  const template = templateKey as TemplateName;

  console.log('[cost-items/apply-template] aplicando template ao job', {
    jobId,
    template,
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

  // Resolver template selecionado
  const { items: templateItems, categories, templateName } = resolveTemplate(template);

  // Gerar dados de insercao a partir do template
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

  console.log('[cost-items/apply-template] template aplicado com sucesso', {
    jobId,
    template,
    templateName,
    created: createdItems?.length ?? 0,
    categories,
  });

  return created({
    template: template,
    template_name: templateName,
    created: createdItems?.length ?? 0,
    categories,
    items: createdItems,
  });
}
