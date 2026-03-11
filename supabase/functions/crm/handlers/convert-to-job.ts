import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ConvertToJobSchema = z.object({
  job_title: z.string().min(1, 'Titulo do job e obrigatorio').max(300),
  project_type: z.string().max(100).optional().nullable(),
  client_id: z.string().uuid().optional().nullable(),
  agency_id: z.string().uuid().optional().nullable(),
  closed_value: z.number().min(0).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  deliverable_format: z.string().max(500).optional().nullable(),
  campaign_period: z.string().max(200).optional().nullable(),
  // Onda 2.4: transferir orcamento ativo como cost_items no job
  transfer_budget: z.boolean().optional().default(false),
});

/**
 * POST /crm/opportunities/:id/convert-to-job
 * Converte uma oportunidade em job ATOMICAMENTE via RPC PostgreSQL.
 * D1 fix: usa transacao atomica — se update falhar, job nao e criado.
 */
export async function handleConvertToJob(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
): Promise<Response> {
  console.log('[crm/convert-to-job] convertendo oportunidade em job', {
    opportunityId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Apenas admin, ceo e produtor_executivo podem converter
  const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin, CEO ou produtor executivo podem converter oportunidades em job',
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = ConvertToJobSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // D1: Usar RPC atomica para criar job + atualizar oportunidade na mesma transacao
  const { data: rpcResult, error: rpcError } = await client.rpc('convert_opportunity_to_job', {
    p_opportunity_id: opportunityId,
    p_tenant_id: auth.tenantId,
    p_job_title: data.job_title.trim(),
    p_project_type: data.project_type ?? null,
    p_client_id: data.client_id ?? null,
    p_agency_id: data.agency_id ?? null,
    p_closed_value: data.closed_value ?? null,
    p_description: data.description ?? null,
    p_deliverable_format: data.deliverable_format ?? null,
    p_campaign_period: data.campaign_period ?? null,
    p_created_by: auth.userId,
  });

  if (rpcError) {
    console.error('[crm/convert-to-job] RPC error:', rpcError.message);
    // Traduzir mensagens do PostgreSQL para respostas amigaveis
    if (rpcError.message?.includes('nao encontrada')) {
      throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
    }
    if (rpcError.message?.includes('perdida')) {
      throw new AppError('BUSINESS_RULE_VIOLATION', 'Nao e possivel converter uma oportunidade perdida em job', 422);
    }
    if (rpcError.message?.includes('ja convertida')) {
      throw new AppError('CONFLICT', 'Oportunidade ja foi convertida em job', 409);
    }
    throw new AppError('INTERNAL_ERROR', 'Erro ao converter oportunidade em job', 500);
  }

  const jobId = rpcResult?.job_id;
  const jobCode = rpcResult?.job_code;

  // Buscar dados completos do job e oportunidade criados
  const { data: createdJob } = await client
    .from('jobs')
    .select('id, title, code, status')
    .eq('id', jobId)
    .single();

  const { data: updatedOpp } = await client
    .from('opportunities')
    .select('*')
    .eq('id', opportunityId)
    .single();

  // ------------------------------------------------------------------
  // Onda 2.4: Transferir orcamento ativo como cost_items (se solicitado)
  // A transferencia NAO bloqueia a conversao — se falhar, o job existe normalmente
  // ------------------------------------------------------------------
  let budgetTransfer: {
    success: boolean;
    cost_items_created: number;
    error?: string;
  } | null = null;

  if (data.transfer_budget && jobId) {
    try {
      // 1. Buscar versao ativa do orcamento
      const { data: activeVersion, error: budgetError } = await client
        .from('opportunity_budget_versions')
        .select('id, orc_code, version, total_value, items:opportunity_budget_items(item_number, display_name, value, notes)')
        .eq('opportunity_id', opportunityId)
        .eq('tenant_id', auth.tenantId)
        .eq('status', 'ativa')
        .is('deleted_at', null)
        .maybeSingle();

      if (budgetError || !activeVersion) {
        budgetTransfer = {
          success: false,
          cost_items_created: 0,
          error: 'Nenhuma versao ativa de orcamento encontrada',
        };
      } else {
        // 2. Para cada item com value > 0: criar cost_item
        const budgetItems = (activeVersion.items ?? []) as Array<{
          item_number: number;
          display_name: string;
          value: number;
          notes: string | null;
        }>;

        const itemsToCreate = budgetItems
          .filter((item) => item.value > 0)
          .map((item) => ({
            tenant_id: auth.tenantId,
            job_id: jobId,
            item_number: item.item_number,
            sub_item_number: 0,
            service_description: item.display_name,
            unit_value: item.value,
            quantity: 1,
            sort_order: item.item_number,
            item_status: 'orcado',
            import_source: `crm_opportunity_${opportunityId}`,
            notes: item.notes,
          }));

        if (itemsToCreate.length > 0) {
          const { data: createdItems, error: itemsError } = await client
            .from('cost_items')
            .insert(itemsToCreate)
            .select('id');

          if (itemsError) {
            console.error('[convert-to-job] erro ao criar cost_items:', itemsError.message);
            budgetTransfer = {
              success: false,
              cost_items_created: 0,
              error: 'Erro ao criar itens de custo',
            };
          } else {
            budgetTransfer = {
              success: true,
              cost_items_created: createdItems?.length ?? 0,
            };
          }
        } else {
          budgetTransfer = {
            success: true,
            cost_items_created: 0,
          };
        }
      }
    } catch (transferError) {
      console.error('[convert-to-job] erro na transferencia de orcamento:', transferError);
      budgetTransfer = {
        success: false,
        cost_items_created: 0,
        error: 'Erro inesperado na transferencia de orcamento',
      };
    }
  }

  // Registrar atividade
  const budgetNote = budgetTransfer?.success
    ? ` ${budgetTransfer.cost_items_created} categorias de custo transferidas.`
    : '';

  await client.from('opportunity_activities').insert({
    tenant_id: auth.tenantId,
    opportunity_id: opportunityId,
    activity_type: 'note',
    description: `Oportunidade convertida em job: "${createdJob?.title ?? data.job_title}" (${jobCode ?? jobId}).${budgetNote}`,
    created_by: auth.userId,
    completed_at: new Date().toISOString(),
  });

  console.log('[crm/convert-to-job] conversao concluida', {
    opportunityId,
    jobId,
    budgetTransferred: budgetTransfer?.success ?? false,
  });

  return success(
    {
      opportunity: updatedOpp,
      job: createdJob ?? { id: jobId, code: jobCode, title: data.job_title, status: 'briefing' },
      budget_transfer: budgetTransfer,
    },
    200,
    req,
  );
}
