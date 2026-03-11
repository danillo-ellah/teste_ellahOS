import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../../_shared/auth.ts';
import { AppError } from '../../../_shared/errors.ts';
import { success } from '../../../_shared/response.ts';
import { getSupabaseClient } from '../../../_shared/supabase-client.ts';

const ListBudgetVersionsSchema = z.object({
  // Por padrao inclui os items de cada versao
  include_items: z.enum(['true', 'false']).optional().default('true'),
});

/**
 * GET /crm/opportunities/:id/budget/versions
 * Retorna todas as versoes de orcamento de uma oportunidade,
 * ordenadas por version DESC, com items opcionais e perfil do criador.
 * RBAC: todos os usuarios autenticados do tenant (leitura).
 */
export async function handleListBudgetVersions(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
): Promise<Response> {
  // Extrair e validar query params
  const url = new URL(req.url);
  const rawParams = Object.fromEntries(url.searchParams.entries());
  const parseResult = ListBudgetVersionsSchema.safeParse(rawParams);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Parametros invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { include_items } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que a oportunidade existe e pertence ao tenant
  const { data: opp, error: oppError } = await client
    .from('opportunities')
    .select('id, orc_code, title')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (oppError || !opp) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Buscar versoes com JOIN no profile do criador
  const versionsQuery = client
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
      created_by_profile:profiles!opportunity_budget_versions_created_by_fkey(
        id,
        full_name
      )
    `)
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('version', { ascending: false });

  const { data: versions, error: versionsError } = await versionsQuery;

  if (versionsError) {
    console.error('[crm/budget/list-versions] erro ao buscar versoes:', versionsError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar versoes de orcamento', 500, {
      detail: versionsError.message,
    });
  }

  // Se solicitado, buscar items de todas as versoes em uma unica query
  let itemsByVersionId: Record<string, unknown[]> = {};
  if (include_items === 'true' && versions && versions.length > 0) {
    const versionIds = versions.map((v) => v.id);

    const { data: allItems, error: itemsError } = await client
      .from('opportunity_budget_items')
      .select('id, version_id, item_number, display_name, value, notes')
      .in('version_id', versionIds)
      .eq('tenant_id', auth.tenantId)
      .order('item_number', { ascending: true });

    if (itemsError) {
      console.error('[crm/budget/list-versions] erro ao buscar items:', itemsError.message);
      // Nao falha — retorna versoes sem items e avisa
    } else if (allItems) {
      // Agrupar items por version_id para merge eficiente
      for (const item of allItems) {
        if (!itemsByVersionId[item.version_id]) {
          itemsByVersionId[item.version_id] = [];
        }
        itemsByVersionId[item.version_id].push(item);
      }
    }
  }

  // Montar resposta final com items embutidos
  const versionsWithItems = (versions ?? []).map((v) => ({
    ...v,
    ...(include_items === 'true' ? { items: itemsByVersionId[v.id] ?? [] } : {}),
  }));

  return success(
    {
      versions: versionsWithItems,
      orc_code: opp.orc_code ?? null,
    },
    200,
    req,
  );
}
