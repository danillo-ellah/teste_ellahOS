import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para atualizar itens de custo
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Campos imutaveis que nao podem ser atualizados via PATCH
const IMMUTABLE_FIELDS = new Set([
  'id',
  'tenant_id',
  'is_category_header',
  'total_value',
  'overtime_value',
  'total_with_overtime',
  'suggested_status',
  'created_at',
  'created_by',
]);

// Transicoes de status validas
// Cancelado so pode voltar para orcado (reativacao)
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  orcado: ['aguardando_nf', 'nf_pedida', 'nf_recebida', 'nf_aprovada', 'pago', 'cancelado'],
  aguardando_nf: ['orcado', 'nf_pedida', 'nf_recebida', 'nf_aprovada', 'pago', 'cancelado'],
  nf_pedida: ['orcado', 'aguardando_nf', 'nf_recebida', 'nf_aprovada', 'pago', 'cancelado'],
  nf_recebida: ['orcado', 'aguardando_nf', 'nf_aprovada', 'pago', 'cancelado'],
  nf_aprovada: ['orcado', 'pago', 'cancelado'],
  pago: ['cancelado'],
  cancelado: ['orcado'],
};

// Schema de atualizacao (todos os campos opcionais)
const UpdateCostItemSchema = z.object({
  item_number: z.number().int().min(1).max(99).optional(),
  sub_item_number: z.number().int().min(0).optional(),
  service_description: z.string().min(1).max(500).optional(),
  sort_order: z.number().int().optional(),
  period_month: z.string().optional().nullable(),
  unit_value: z.number().min(0).optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  overtime_hours: z.number().min(0).optional().nullable(),
  overtime_rate: z.number().min(0).optional().nullable(),
  payment_condition: z
    .enum(['a_vista', 'cnf_30', 'cnf_40', 'cnf_45', 'cnf_60', 'cnf_90', 'snf_30'])
    .optional()
    .nullable(),
  payment_due_date: z.string().optional().nullable(),
  payment_method: z
    .enum(['pix', 'ted', 'dinheiro', 'debito', 'credito', 'outro'])
    .optional()
    .nullable(),
  actual_paid_value: z.number().min(0).optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  item_status: z
    .enum(['orcado', 'aguardando_nf', 'nf_pedida', 'nf_recebida', 'nf_aprovada', 'pago', 'cancelado'])
    .optional(),
  status_note: z.string().optional().nullable(),
  nf_request_status: z
    .enum(['nao_aplicavel', 'pendente', 'pedido', 'recebido', 'rejeitado', 'aprovado'])
    .optional(),
  nf_requested_at: z.string().optional().nullable(),
  nf_requested_by: z.string().uuid().optional().nullable(),
  nf_document_id: z.string().uuid().optional().nullable(),
  nf_drive_url: z.string().optional().nullable(),
  nf_filename: z.string().optional().nullable(),
  nf_extracted_value: z.number().optional().nullable(),
  nf_validation_ok: z.boolean().optional().nullable(),
  payment_status: z.enum(['pendente', 'pago', 'cancelado']).optional(),
  payment_date: z.string().optional().nullable(),
  payment_proof_url: z.string().optional().nullable(),
  payment_proof_filename: z.string().optional().nullable(),
}).strict();

// Busca vendor e conta bancaria primaria para montar snapshot
async function fetchVendorSnapshot(
  client: ReturnType<typeof getSupabaseClient>,
  vendorId: string,
): Promise<{
  vendor_name_snapshot: string | null;
  vendor_email_snapshot: string | null;
  vendor_pix_snapshot: string | null;
  vendor_bank_snapshot: string | null;
}> {
  const { data: vendor } = await client
    .from('vendors')
    .select('full_name, email')
    .eq('id', vendorId)
    .single();

  const { data: primaryBank } = await client
    .from('bank_accounts')
    .select('pix_key, bank_name')
    .eq('vendor_id', vendorId)
    .eq('is_primary', true)
    .is('deleted_at', null)
    .maybeSingle();

  return {
    vendor_name_snapshot: vendor?.full_name ?? null,
    vendor_email_snapshot: vendor?.email ?? null,
    vendor_pix_snapshot: primaryBank?.pix_key ?? null,
    vendor_bank_snapshot: primaryBank?.bank_name ?? null,
  };
}

export async function handleUpdate(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[cost-items/update] atualizando item de custo', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para atualizar itens de custo',
      403,
    );
  }

  // Parsear body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  // Rejeitar campos imutaveis
  for (const field of IMMUTABLE_FIELDS) {
    if (field in body) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Campo '${field}' nao pode ser atualizado`,
        400,
      );
    }
  }

  const parseResult = UpdateCostItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar item atual para validacoes
  const { data: current, error: fetchError } = await client
    .from('cost_items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Item de custo nao encontrado', 404);
  }

  // Validar transicao de status
  if (updates.item_status && updates.item_status !== current.item_status) {
    const allowed = VALID_STATUS_TRANSITIONS[current.item_status as string] ?? [];
    if (!allowed.includes(updates.item_status)) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        `Transicao de status invalida: ${current.item_status} -> ${updates.item_status}`,
        422,
        { current_status: current.item_status, target_status: updates.item_status },
      );
    }
  }

  // Atualizar snapshots se vendor_id mudou
  let vendorSnapshot: Record<string, string | null> = {};
  if ('vendor_id' in updates && updates.vendor_id !== current.vendor_id) {
    if (updates.vendor_id) {
      const snapshot = await fetchVendorSnapshot(client, updates.vendor_id);
      vendorSnapshot = snapshot;
    } else {
      // Limpar snapshots se vendor_id foi removido
      vendorSnapshot = {
        vendor_name_snapshot: null,
        vendor_email_snapshot: null,
        vendor_pix_snapshot: null,
        vendor_bank_snapshot: null,
      };
    }
  }

  const { data: updated, error: updateError } = await client
    .from('cost_items')
    .update({ ...updates, ...vendorSnapshot })
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[cost-items/update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar item de custo', 500, {
      detail: updateError.message,
    });
  }

  // Inserir historico se o item pertence a um job
  if (current.job_id) {
    await insertHistory(client, {
      tenantId: auth.tenantId,
      jobId: current.job_id,
      eventType: 'financial_update',
      userId: auth.userId,
      dataBefore: current,
      dataAfter: updated,
      description: `Item de custo atualizado: ${current.service_description}`,
    });
  }

  console.log('[cost-items/update] item atualizado com sucesso', { id });
  return success(updated);
}
