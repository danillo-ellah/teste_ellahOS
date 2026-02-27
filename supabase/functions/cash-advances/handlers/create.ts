import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para criar adiantamentos
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de validacao para criacao de adiantamento
const CreateCashAdvanceSchema = z.object({
  job_id: z.string().uuid(),
  cost_item_id: z.string().uuid().optional().nullable(),
  recipient_vendor_id: z.string().uuid().optional().nullable(),
  recipient_name: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  amount_authorized: z.number().positive(),
});

export async function handleCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[cash-advances/create] iniciando criacao de adiantamento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente', 403);
  }

  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateCashAdvanceSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const input = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Validar que o job existe e pertence ao tenant
  const { data: job, error: jobError } = await client
    .from('jobs')
    .select('id, title, code')
    .eq('id', input.job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Se fornecido cost_item_id, validar que pertence ao job
  if (input.cost_item_id) {
    const { data: costItem, error: costItemError } = await client
      .from('cost_items')
      .select('id')
      .eq('id', input.cost_item_id)
      .eq('job_id', input.job_id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .single();

    if (costItemError || !costItem) {
      throw new AppError(
        'NOT_FOUND',
        'Item de custo nao encontrado ou nao pertence ao job',
        404,
      );
    }
  }

  // Se fornecido recipient_vendor_id, validar que existe no tenant
  if (input.recipient_vendor_id) {
    const { data: vendor, error: vendorError } = await client
      .from('vendors')
      .select('id')
      .eq('id', input.recipient_vendor_id)
      .eq('tenant_id', auth.tenantId)
      .is('deleted_at', null)
      .single();

    if (vendorError || !vendor) {
      throw new AppError('NOT_FOUND', 'Fornecedor nao encontrado', 404);
    }
  }

  // Inserir o adiantamento
  const { data: advance, error: insertError } = await client
    .from('cash_advances')
    .insert({
      tenant_id: auth.tenantId,
      job_id: input.job_id,
      cost_item_id: input.cost_item_id ?? null,
      recipient_vendor_id: input.recipient_vendor_id ?? null,
      recipient_name: input.recipient_name,
      description: input.description,
      amount_authorized: input.amount_authorized,
      amount_deposited: 0,
      amount_documented: 0,
      status: 'aberta',
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[cash-advances/create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar adiantamento', 500, {
      detail: insertError.message,
    });
  }

  // Inserir historico no job
  try {
    await insertHistory(client, {
      tenantId: auth.tenantId,
      jobId: input.job_id,
      eventType: 'financial_update',
      userId: auth.userId,
      dataAfter: {
        cash_advance_id: advance.id,
        amount_authorized: input.amount_authorized,
        recipient_name: input.recipient_name,
      },
      description: `Adiantamento criado: R$ ${input.amount_authorized.toFixed(2)} para ${input.recipient_name}`,
    });
  } catch (histErr) {
    console.error('[cash-advances/create] erro ao inserir historico:', histErr);
  }

  console.log('[cash-advances/create] adiantamento criado com sucesso', { id: advance.id });
  return created(advance);
}
