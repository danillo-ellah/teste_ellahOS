import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Roles permitidos para vincular NF a cost_item
const ALLOWED_ROLES = ['admin', 'ceo', 'financeiro'];

// Schema de validacao do payload
const LinkCostItemSchema = z.object({
  nf_document_id: z.string().uuid('nf_document_id deve ser UUID valido'),
  cost_item_id: z.string().uuid('cost_item_id deve ser UUID valido'),
});

type LinkCostItemInput = z.infer<typeof LinkCostItemSchema>;

export async function linkCostItem(req: Request, auth: AuthContext): Promise<Response> {
  // Verificar role do usuario
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para vincular NF a cost_item', 403);
  }

  // Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = LinkCostItemSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: LinkCostItemInput = result.data;
  const supabase = getSupabaseClient(auth.token);

  console.log(`[link-cost-item] user=${auth.userId} nf_document_id=${input.nf_document_id} cost_item_id=${input.cost_item_id}`);

  // 1. Buscar nf_document por id (verificar tenant_id, deleted_at is null)
  const { data: doc, error: docError } = await supabase
    .from('nf_documents')
    .select('id, status, drive_url, nf_value')
    .eq('id', input.nf_document_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (docError || !doc) {
    throw new AppError('NOT_FOUND', 'Documento NF nao encontrado', 404);
  }

  // 2. Buscar cost_item por id (verificar tenant_id, deleted_at is null)
  const { data: costItem, error: costItemError } = await supabase
    .from('cost_items')
    .select('id, nf_document_id, nf_request_status')
    .eq('id', input.cost_item_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (costItemError || !costItem) {
    throw new AppError('NOT_FOUND', 'Cost item nao encontrado', 404);
  }

  // 3. Montar dados de atualizacao do cost_item
  const isConfirmed = doc.status === 'confirmed';

  const updateData: Record<string, unknown> = {
    nf_document_id: input.nf_document_id,
    nf_request_status: isConfirmed ? 'aprovado' : 'recebido',
    nf_validation_ok: isConfirmed,
  };

  if (doc.drive_url) {
    updateData.nf_drive_url = doc.drive_url;
  }

  if (doc.nf_value != null) {
    updateData.nf_extracted_value = doc.nf_value;
  }

  // 4. Atualizar cost_item
  const { data: updatedCostItem, error: updateError } = await supabase
    .from('cost_items')
    .update(updateData)
    .eq('id', input.cost_item_id)
    .eq('tenant_id', auth.tenantId)
    .select('id, nf_document_id, nf_request_status, nf_drive_url, nf_extracted_value, nf_validation_ok')
    .single();

  if (updateError || !updatedCostItem) {
    console.error('[link-cost-item] falha ao atualizar cost_item:', updateError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao vincular NF ao cost_item', 500);
  }

  console.log(`[link-cost-item] vinculo criado: cost_item_id=${updatedCostItem.id} nf_request_status=${updatedCostItem.nf_request_status}`);

  return success({
    cost_item_id: updatedCostItem.id,
    nf_document_id: updatedCostItem.nf_document_id,
    nf_request_status: updatedCostItem.nf_request_status,
    nf_drive_url: updatedCostItem.nf_drive_url,
    nf_extracted_value: updatedCostItem.nf_extracted_value,
    nf_validation_ok: updatedCostItem.nf_validation_ok,
  });
}
