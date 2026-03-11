import type { AuthContext } from '../../../_shared/auth.ts';
import { AppError } from '../../../_shared/errors.ts';
import { success } from '../../../_shared/response.ts';
import { getSupabaseClient } from '../../../_shared/supabase-client.ts';

// Roles que podem ativar versoes de orcamento
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];

/**
 * POST /crm/opportunities/:id/budget/versions/:versionId/activate
 * Ativa uma versao de orcamento que esta em status 'rascunho'.
 * A ativacao e atomica via RPC no banco:
 *   1. Versao ativa anterior vira 'historico'
 *   2. Nova versao vira 'ativa'
 *   3. opportunities.estimated_value e atualizado com o total da versao
 *
 * Pre-condicoes:
 *   - Versao deve estar em status 'rascunho'
 *   - Versao deve ter pelo menos 1 item com value > 0
 *
 * RBAC: admin, ceo, produtor_executivo.
 */
export async function handleActivateBudgetVersion(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
  versionId: string,
): Promise<Response> {
  // RBAC
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin, CEO ou produtor executivo podem ativar versoes de orcamento',
      403,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Verificar que a oportunidade existe e pertence ao tenant
  const { data: opp, error: oppError } = await client
    .from('opportunities')
    .select('id, stage, title')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (oppError || !opp) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Oportunidades ganhas ou perdidas nao permitem ativacao de orcamento
  if (opp.stage === 'ganho' || opp.stage === 'perdido') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Nao e possivel ativar orcamento em oportunidade ${opp.stage}`,
      422,
    );
  }

  // Buscar a versao e seus items
  const { data: version, error: versionError } = await client
    .from('opportunity_budget_versions')
    .select(`
      id,
      opportunity_id,
      orc_code,
      version,
      status,
      total_value,
      notes,
      created_by,
      created_at,
      updated_at,
      items:opportunity_budget_items(id, item_number, value)
    `)
    .eq('id', versionId)
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (versionError || !version) {
    throw new AppError('NOT_FOUND', 'Versao de orcamento nao encontrada', 404);
  }

  // Apenas rascunho pode ser ativado
  if (version.status !== 'rascunho') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Apenas versoes em rascunho podem ser ativadas. Status atual: ${version.status}`,
      422,
    );
  }

  // Validar que a versao tem pelo menos 1 item com value > 0
  const itemsWithValue = (version.items ?? []).filter(
    (item: { value: number }) => item.value > 0,
  );

  if (itemsWithValue.length === 0) {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      'A versao precisa ter pelo menos 1 item com valor maior que zero para ser ativada',
      422,
    );
  }

  // Ativacao atomica via RPC no banco
  // A funcao activate_budget_version garante atomicidade real:
  //   UPDATE status='historico' na versao ativa anterior
  //   UPDATE status='ativa' nesta versao
  //   UPDATE estimated_value na oportunidade
  const { error: rpcError } = await client.rpc('activate_budget_version', {
    p_version_id: versionId,
    p_opportunity_id: opportunityId,
    p_tenant_id: auth.tenantId,
  });

  if (rpcError) {
    console.error('[crm/budget/activate-version] erro na RPC activate_budget_version:', rpcError.message);

    // Fallback: executar as 3 operacoes sequencialmente se a RPC nao existir ainda
    if (rpcError.code === 'PGRST202' || rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
      // Passo 1: arquivar versao ativa anterior (se existir)
      await client
        .from('opportunity_budget_versions')
        .update({ status: 'historico' })
        .eq('opportunity_id', opportunityId)
        .eq('tenant_id', auth.tenantId)
        .eq('status', 'ativa');

      // Passo 2: ativar esta versao
      const { error: activateError } = await client
        .from('opportunity_budget_versions')
        .update({ status: 'ativa' })
        .eq('id', versionId)
        .eq('tenant_id', auth.tenantId);

      if (activateError) {
        throw new AppError('INTERNAL_ERROR', 'Erro ao ativar versao', 500, {
          detail: activateError.message,
        });
      }

      // Passo 3: atualizar estimated_value da oportunidade
      await client
        .from('opportunities')
        .update({ estimated_value: version.total_value })
        .eq('id', opportunityId)
        .eq('tenant_id', auth.tenantId);
    } else {
      throw new AppError('INTERNAL_ERROR', 'Erro ao ativar versao de orcamento', 500, {
        detail: rpcError.message,
      });
    }
  }

  // Buscar versao atualizada para retornar
  const { data: activatedVersion, error: fetchError } = await client
    .from('opportunity_budget_versions')
    .select(`
      id,
      opportunity_id,
      orc_code,
      version,
      status,
      total_value,
      notes,
      created_by,
      created_at,
      updated_at,
      items:opportunity_budget_items(id, version_id, item_number, display_name, value, notes)
    `)
    .eq('id', versionId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (fetchError || !activatedVersion) {
    throw new AppError('INTERNAL_ERROR', 'Versao ativada mas erro ao buscar dados atualizados', 500);
  }

  // Buscar estimated_value atualizado da oportunidade
  const { data: updatedOpp } = await client
    .from('opportunities')
    .select('id, estimated_value')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .single();

  return success(
    {
      activated_version: activatedVersion,
      opportunity: {
        id: opportunityId,
        estimated_value: updatedOpp?.estimated_value ?? version.total_value,
      },
    },
    200,
    req,
  );
}
