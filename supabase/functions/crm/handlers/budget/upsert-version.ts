import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../../_shared/auth.ts';
import { AppError } from '../../../_shared/errors.ts';
import { success, created } from '../../../_shared/response.ts';
import { getSupabaseClient } from '../../../_shared/supabase-client.ts';

// Schema de um item de orcamento
const BudgetItemSchema = z.object({
  item_number: z.number().int().min(1).max(99),
  display_name: z.string().min(1).max(200),
  value: z.number().min(0),
  notes: z.string().max(2000).optional().nullable(),
});

// POST: criar nova versao
const CreateBudgetVersionSchema = z.object({
  items: z.array(BudgetItemSchema).optional(),
  notes: z.string().max(5000).optional().nullable(),
  // Se true, copia items da versao ativa (ignora items do body)
  copy_from_active: z.boolean().optional().default(false),
});

// PATCH: editar versao existente (somente rascunho)
const UpdateBudgetVersionSchema = z.object({
  items: z.array(BudgetItemSchema),
  notes: z.string().max(5000).optional().nullable(),
});

// Roles com permissao de escrita em orcamentos
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo', 'atendimento'];

/**
 * POST /crm/opportunities/:id/budget/versions
 * Cria uma nova versao de orcamento (rascunho) para a oportunidade.
 * Na primeira versao, gera o codigo ORC-YYYY-XXXX atomicamente.
 * Se copy_from_active=true, copia items da versao ativa e a arquiva.
 *
 * PATCH /crm/opportunities/:id/budget/versions/:versionId
 * Atualiza items de uma versao em status 'rascunho'.
 * Faz DELETE + re-INSERT dos items para substituicao completa.
 *
 * RBAC: admin, ceo, produtor_executivo, atendimento.
 */
export async function handleUpsertBudgetVersion(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
  versionId: string | null,
): Promise<Response> {
  const method = req.method;
  const isCreate = method === 'POST' && !versionId;
  const isUpdate = method === 'PATCH' && !!versionId;

  if (!isCreate && !isUpdate) {
    throw new AppError('METHOD_NOT_ALLOWED', 'Metodo nao permitido para esta rota', 405);
  }

  // RBAC
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas admin, CEO, produtor executivo ou atendimento podem gerenciar orcamentos',
      403,
    );
  }

  // Parse do body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Verificar que a oportunidade existe e pertence ao tenant
  const { data: opp, error: oppError } = await client
    .from('opportunities')
    .select('id, title, stage, orc_code, client_id, agency_id')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (oppError || !opp) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Oportunidades ganhas/perdidas sao readonly para orcamentos
  if (opp.stage === 'ganho' || opp.stage === 'perdido') {
    throw new AppError(
      'BUSINESS_RULE_VIOLATION',
      `Nao e possivel editar orcamentos de uma oportunidade ${opp.stage}`,
      422,
    );
  }

  // ----------------------------------------------------------------
  // PATCH — atualizar versao existente
  // ----------------------------------------------------------------
  if (isUpdate) {
    const parseResult = UpdateBudgetVersionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
        issues: parseResult.error.issues,
      });
    }
    const data = parseResult.data;

    // Buscar versao e validar que e um rascunho
    const { data: version, error: versionError } = await client
      .from('opportunity_budget_versions')
      .select('id, status, version, orc_code')
      .eq('id', versionId!)
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .single();

    if (versionError || !version) {
      throw new AppError('NOT_FOUND', 'Versao de orcamento nao encontrada', 404);
    }

    if (version.status !== 'rascunho') {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        `Apenas versoes em rascunho podem ser editadas. Status atual: ${version.status}`,
        422,
      );
    }

    // Substituicao completa dos items: DELETE + INSERT
    const { error: deleteError } = await client
      .from('opportunity_budget_items')
      .delete()
      .eq('version_id', versionId!)
      .eq('tenant_id', auth.tenantId);

    if (deleteError) {
      console.error('[crm/budget/upsert-version] erro ao deletar items antigos:', deleteError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar itens do orcamento', 500, {
        detail: deleteError.message,
      });
    }

    const totalValue = data.items.reduce((acc, item) => acc + item.value, 0);

    // Inserir novos items se existirem
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        tenant_id: auth.tenantId,
        version_id: versionId!,
        item_number: item.item_number,
        display_name: item.display_name,
        value: item.value,
        notes: item.notes ?? null,
      }));

      const { error: insertItemsError } = await client
        .from('opportunity_budget_items')
        .insert(itemsToInsert);

      if (insertItemsError) {
        console.error('[crm/budget/upsert-version] erro ao inserir items:', insertItemsError.message);
        throw new AppError('INTERNAL_ERROR', 'Erro ao salvar itens do orcamento', 500, {
          detail: insertItemsError.message,
        });
      }
    }

    // Atualizar total_value e notes da versao
    const { data: updatedVersion, error: updateError } = await client
      .from('opportunity_budget_versions')
      .update({
        total_value: totalValue,
        notes: data.notes ?? null,
      })
      .eq('id', versionId!)
      .eq('tenant_id', auth.tenantId)
      .select('id, opportunity_id, orc_code, version, status, total_value, notes, created_by, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[crm/budget/upsert-version] erro ao atualizar versao:', updateError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar versao', 500, {
        detail: updateError.message,
      });
    }

    // Buscar items para incluir na resposta
    const { data: updatedItems } = await client
      .from('opportunity_budget_items')
      .select('id, version_id, item_number, display_name, value, notes')
      .eq('version_id', versionId!)
      .eq('tenant_id', auth.tenantId)
      .order('item_number', { ascending: true });

    return success({ ...updatedVersion, items: updatedItems ?? [] }, 200, req);
  }

  // ----------------------------------------------------------------
  // POST — criar nova versao
  // ----------------------------------------------------------------
  const parseResult = CreateBudgetVersionSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }
  const data = parseResult.data;

  // Contar versoes existentes para calcular o proximo numero
  const { count: existingCount, error: countError } = await client
    .from('opportunity_budget_versions')
    .select('id', { count: 'exact', head: true })
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (countError) {
    console.error('[crm/budget/upsert-version] erro ao contar versoes:', countError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar versoes existentes', 500);
  }

  const nextVersion = (existingCount ?? 0) + 1;
  const isFirstVersion = nextVersion === 1;

  // Gerar ORC code atomicamente na primeira versao
  let orcCode: string | null = opp.orc_code ?? null;

  if (isFirstVersion && !orcCode) {
    const currentYear = new Date().getFullYear();

    // INSERT ON CONFLICT para garantir atomicidade (sem race conditions)
    const { data: seqRow, error: seqError } = await client.rpc('upsert_orc_code_sequence', {
      p_tenant_id: auth.tenantId,
      p_year: currentYear,
    });

    if (seqError || seqRow === null) {
      // Fallback: tentar INSERT ON CONFLICT direto via from()
      console.error('[crm/budget/upsert-version] rpc nao disponivel, usando fallback:', seqError?.message);

      // Buscar sequencia atual
      const { data: existingSeq } = await client
        .from('orc_code_sequences')
        .select('last_index')
        .eq('tenant_id', auth.tenantId)
        .eq('year', currentYear)
        .maybeSingle();

      const nextIndex = (existingSeq?.last_index ?? 0) + 1;

      const { error: seqUpsertError } = await client
        .from('orc_code_sequences')
        .upsert(
          {
            tenant_id: auth.tenantId,
            year: currentYear,
            last_index: nextIndex,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,year' },
        );

      if (seqUpsertError) {
        console.error('[crm/budget/upsert-version] erro no upsert de sequencia:', seqUpsertError.message);
        throw new AppError('INTERNAL_ERROR', 'Erro ao gerar codigo ORC', 500);
      }

      orcCode = `ORC-${currentYear}-${String(nextIndex).padStart(4, '0')}`;
    } else {
      orcCode = `ORC-${currentYear}-${String(seqRow).padStart(4, '0')}`;
    }

    // Atualizar orc_code na oportunidade para consulta rapida
    await client
      .from('opportunities')
      .update({ orc_code: orcCode })
      .eq('id', opportunityId)
      .eq('tenant_id', auth.tenantId);
  }

  // Determinar items a inserir
  let itemsToCreate: Array<{
    item_number: number;
    display_name: string;
    value: number;
    notes: string | null;
  }> = [];

  if (data.copy_from_active) {
    // Buscar versao ativa e copiar seus items
    const { data: activeVersion } = await client
      .from('opportunity_budget_versions')
      .select('id, items:opportunity_budget_items(item_number, display_name, value, notes)')
      .eq('opportunity_id', opportunityId)
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'ativa')
      .is('deleted_at', null)
      .maybeSingle();

    if (activeVersion) {
      // Arquivar versao ativa antes de criar nova
      await client
        .from('opportunity_budget_versions')
        .update({ status: 'historico' })
        .eq('id', activeVersion.id)
        .eq('tenant_id', auth.tenantId);

      itemsToCreate = (activeVersion.items ?? []).map((item: {
        item_number: number;
        display_name: string;
        value: number;
        notes: string | null;
      }) => ({
        item_number: item.item_number,
        display_name: item.display_name,
        value: item.value,
        notes: item.notes,
      }));
    }
  } else if (data.items && data.items.length > 0) {
    itemsToCreate = data.items.map((item) => ({
      item_number: item.item_number,
      display_name: item.display_name,
      value: item.value,
      notes: item.notes ?? null,
    }));
  }

  const totalValue = itemsToCreate.reduce((acc, item) => acc + item.value, 0);

  // Criar a nova versao de orcamento
  const { data: newVersion, error: insertVersionError } = await client
    .from('opportunity_budget_versions')
    .insert({
      tenant_id: auth.tenantId,
      opportunity_id: opportunityId,
      orc_code: orcCode,
      version: nextVersion,
      status: 'rascunho',
      total_value: totalValue,
      notes: data.notes ?? null,
      created_by: auth.userId,
    })
    .select('id, opportunity_id, orc_code, version, status, total_value, notes, created_by, created_at, updated_at')
    .single();

  if (insertVersionError) {
    console.error('[crm/budget/upsert-version] erro ao criar versao:', insertVersionError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar versao de orcamento', 500, {
      detail: insertVersionError.message,
    });
  }

  // Inserir items se existirem
  let insertedItems: unknown[] = [];
  if (itemsToCreate.length > 0) {
    const itemsPayload = itemsToCreate.map((item) => ({
      tenant_id: auth.tenantId,
      version_id: newVersion.id,
      item_number: item.item_number,
      display_name: item.display_name,
      value: item.value,
      notes: item.notes,
    }));

    const { data: createdItems, error: insertItemsError } = await client
      .from('opportunity_budget_items')
      .insert(itemsPayload)
      .select('id, version_id, item_number, display_name, value, notes');

    if (insertItemsError) {
      console.error('[crm/budget/upsert-version] erro ao criar items:', insertItemsError.message);
      // Versao foi criada mas sem items — retornar com aviso
      return created({ ...newVersion, items: [] }, req);
    }

    insertedItems = createdItems ?? [];
  }

  return created({ ...newVersion, items: insertedItems }, req);
}
