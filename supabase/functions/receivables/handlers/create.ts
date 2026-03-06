import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para criar recebimentos
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Schema de validacao para criacao de recebimento
const CreateReceivableSchema = z.object({
  job_id: z.string().uuid(),
  description: z.string().min(1).max(500),
  installment_number: z.number().int().min(1),
  amount: z.number().min(0.01),
  due_date: z.string().optional().nullable(),
  status: z
    .enum(['pendente', 'faturado', 'recebido', 'atrasado', 'cancelado'])
    .default('pendente'),
  invoice_number: z.string().optional().nullable(),
  invoice_url: z.string().optional().nullable(),
  payment_proof_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function handleCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[receivables/create] iniciando criacao de recebimento', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para criar recebimentos',
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

  const parseResult = CreateReceivableSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Montar objeto para INSERT
  const insertData = {
    tenant_id: auth.tenantId,
    job_id: data.job_id,
    description: data.description,
    installment_number: data.installment_number,
    amount: data.amount,
    due_date: data.due_date ?? null,
    status: data.status,
    invoice_number: data.invoice_number ?? null,
    invoice_url: data.invoice_url ?? null,
    payment_proof_url: data.payment_proof_url ?? null,
    notes: data.notes ?? null,
    created_by: auth.userId,
  };

  const { data: createdItem, error: insertError } = await client
    .from('job_receivables')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error('[receivables/create] erro ao inserir:', insertError.message);

    // Tratar violacao de constraint de parcela unica
    if (insertError.code === '23505') {
      throw new AppError(
        'CONFLICT',
        `Ja existe uma parcela ${data.installment_number} para este job`,
        409,
        { detail: insertError.message },
      );
    }

    throw new AppError('INTERNAL_ERROR', 'Erro ao criar recebimento', 500, {
      detail: insertError.message,
    });
  }

  console.log('[receivables/create] recebimento criado com sucesso', {
    id: createdItem.id,
    installment_number: data.installment_number,
  });
  return created(createdItem);
}
