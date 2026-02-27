import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para criacao em batch
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Schema de um item individual no batch
const BatchCostItemSchema = z.object({
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

// Schema do batch completo
const BatchSchema = z.object({
  items: z.array(BatchCostItemSchema).min(1).max(200),
});

export async function handleBatch(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[cost-items/batch] criando itens em batch', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para criacao em batch',
      403,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = BatchSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { items } = parseResult.data;

  // Validar que todos os itens tem o mesmo job_id (ou todos null)
  const jobIds = items.map((item) => item.job_id ?? null);
  const uniqueJobIds = new Set(jobIds.map((id) => id ?? 'null'));
  if (uniqueJobIds.size > 1) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Todos os itens do batch devem ter o mesmo job_id (ou todos nulos)',
      400,
      { unique_job_ids: [...uniqueJobIds] },
    );
  }

  const client = getSupabaseClient(auth.token);

  // Coletar vendor_ids unicos para busca em batch
  const vendorIds = [...new Set(items.map((item) => item.vendor_id).filter(Boolean) as string[])];

  // Buscar todos os vendors de uma vez
  const vendorMap = new Map<
    string,
    { full_name: string | null; email: string | null }
  >();
  const bankMap = new Map<
    string,
    { pix_key: string | null; bank_name: string | null }
  >();

  if (vendorIds.length > 0) {
    const { data: vendors } = await client
      .from('vendors')
      .select('id, full_name, email')
      .in('id', vendorIds)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null);

    for (const v of vendors ?? []) {
      vendorMap.set(v.id, { full_name: v.full_name, email: v.email });
    }

    const { data: banks } = await client
      .from('bank_accounts')
      .select('vendor_id, pix_key, bank_name')
      .in('vendor_id', vendorIds)
      .eq('is_primary', true)
      .is('deleted_at', null);

    for (const b of banks ?? []) {
      bankMap.set(b.vendor_id, { pix_key: b.pix_key, bank_name: b.bank_name });
    }
  }

  // Montar array de inserção
  const insertData = items.map((item) => {
    const vendor = item.vendor_id ? vendorMap.get(item.vendor_id) : undefined;
    const bank = item.vendor_id ? bankMap.get(item.vendor_id) : undefined;

    return {
      tenant_id: auth.tenantId,
      job_id: item.job_id ?? null,
      item_number: item.item_number,
      sub_item_number: item.sub_item_number,
      service_description: item.service_description,
      sort_order: item.sort_order,
      period_month: item.period_month ?? null,
      unit_value: item.unit_value ?? null,
      quantity: item.quantity,
      overtime_hours: item.overtime_hours ?? null,
      overtime_rate: item.overtime_rate ?? null,
      payment_condition: item.payment_condition ?? null,
      payment_due_date: item.payment_due_date ?? null,
      payment_method: item.payment_method ?? null,
      vendor_id: item.vendor_id ?? null,
      vendor_name_snapshot: vendor?.full_name ?? null,
      vendor_email_snapshot: vendor?.email ?? null,
      vendor_pix_snapshot: bank?.pix_key ?? null,
      vendor_bank_snapshot: bank?.bank_name ?? null,
      notes: item.notes ?? null,
      item_status: item.item_status ?? 'orcado',
      created_by: auth.userId,
    };
  });

  const { data: createdItems, error: insertError } = await client
    .from('cost_items')
    .insert(insertData)
    .select('*');

  if (insertError) {
    console.error('[cost-items/batch] erro ao inserir batch:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar itens em batch', 500, {
      detail: insertError.message,
    });
  }

  console.log('[cost-items/batch] batch criado com sucesso', {
    count: createdItems?.length ?? 0,
  });

  return created(createdItems);
}
