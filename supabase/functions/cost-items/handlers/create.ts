import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para criar itens de custo
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Schema de validacao para criacao de item de custo
const CreateCostItemSchema = z.object({
  job_id: z.string().uuid().nullable().optional(),
  item_number: z.number().int().min(1).max(99),
  sub_item_number: z.number().int().min(0).default(0),
  service_description: z.string().min(1).max(500),
  sort_order: z.number().int().default(0),
  period_month: z.string().optional().nullable(),
  unit_value: z.number().min(0).optional().nullable(),
  quantity: z.number().int().min(0).default(1),
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
  vendor_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  item_status: z
    .enum(['orcado', 'aguardando_nf', 'nf_pedida', 'nf_recebida', 'nf_aprovada', 'pago', 'cancelado'])
    .optional()
    .default('orcado'),
});

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
  const { data: vendor, error: vendorError } = await client
    .from('vendors')
    .select('id, full_name, email')
    .eq('id', vendorId)
    .single();

  if (vendorError || !vendor) {
    throw new AppError('NOT_FOUND', `Vendor ${vendorId} nao encontrado`, 404);
  }

  const { data: primaryBank } = await client
    .from('bank_accounts')
    .select('pix_key, bank_name')
    .eq('vendor_id', vendorId)
    .eq('is_primary', true)
    .is('deleted_at', null)
    .maybeSingle();

  return {
    vendor_name_snapshot: vendor.full_name ?? null,
    vendor_email_snapshot: vendor.email ?? null,
    vendor_pix_snapshot: primaryBank?.pix_key ?? null,
    vendor_bank_snapshot: primaryBank?.bank_name ?? null,
  };
}

export async function handleCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[cost-items/create] iniciando criacao de item de custo', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para criar itens de custo',
      403,
    );
  }

  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateCostItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;

  // Custos fixos requerem period_month
  if (!data.job_id && !data.period_month) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Custo fixo (sem job_id) requer period_month',
      400,
    );
  }

  const client = getSupabaseClient(auth.token);

  // Montar snapshot do vendor se fornecido
  let vendorSnapshot = {
    vendor_name_snapshot: null as string | null,
    vendor_email_snapshot: null as string | null,
    vendor_pix_snapshot: null as string | null,
    vendor_bank_snapshot: null as string | null,
  };

  if (data.vendor_id) {
    vendorSnapshot = await fetchVendorSnapshot(client, data.vendor_id);
  }

  // Montar objeto para INSERT
  const insertData = {
    tenant_id: auth.tenantId,
    job_id: data.job_id ?? null,
    item_number: data.item_number,
    sub_item_number: data.sub_item_number,
    service_description: data.service_description,
    sort_order: data.sort_order,
    period_month: data.period_month ?? null,
    unit_value: data.unit_value ?? null,
    quantity: data.quantity,
    overtime_hours: data.overtime_hours ?? null,
    overtime_rate: data.overtime_rate ?? null,
    payment_condition: data.payment_condition ?? null,
    payment_due_date: data.payment_due_date ?? null,
    payment_method: data.payment_method ?? null,
    vendor_id: data.vendor_id ?? null,
    ...vendorSnapshot,
    notes: data.notes ?? null,
    item_status: data.item_status ?? 'orcado',
    created_by: auth.userId,
  };

  const { data: createdItem, error: insertError } = await client
    .from('cost_items')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error('[cost-items/create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar item de custo', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cost-items/create] item criado com sucesso', { id: createdItem.id });
  return created(createdItem);
}
