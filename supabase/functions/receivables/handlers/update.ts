import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { insertHistory } from '../../_shared/history.ts';

// Roles autorizados para atualizar recebimentos
const ALLOWED_ROLES = ['financeiro', 'produtor_executivo', 'admin', 'ceo'];

// Campos imutaveis que nao podem ser atualizados via PATCH
const IMMUTABLE_FIELDS = new Set([
  'id',
  'tenant_id',
  'created_at',
  'created_by',
]);

// Transicoes de status validas para recebimentos
// recebido so pode ser cancelado (nao pode voltar para outros estados sem cancelar)
// cancelado so pode voltar para pendente (reativacao)
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pendente: ['faturado', 'recebido', 'atrasado', 'cancelado'],
  faturado: ['pendente', 'recebido', 'atrasado', 'cancelado'],
  atrasado: ['pendente', 'faturado', 'recebido', 'cancelado'],
  recebido: ['cancelado'],
  cancelado: ['pendente'],
};

// Schema de atualizacao (todos os campos opcionais exceto imutaveis)
const UpdateReceivableSchema = z.object({
  description: z.string().min(1).max(500).optional(),
  installment_number: z.number().int().min(1).optional(),
  amount: z.number().min(0.01).optional(),
  due_date: z.string().optional().nullable(),
  received_date: z.string().optional().nullable(),
  status: z.enum(['pendente', 'faturado', 'recebido', 'atrasado', 'cancelado']).optional(),
  invoice_number: z.string().optional().nullable(),
  invoice_url: z.string().optional().nullable(),
  payment_proof_url: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).strict();

export async function handleUpdate(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[receivables/update] atualizando recebimento', {
    id,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para atualizar recebimentos',
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

  const parseResult = UpdateReceivableSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const updates = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Buscar item atual para validacoes
  const { data: current, error: fetchError } = await client
    .from('job_receivables')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !current) {
    throw new AppError('NOT_FOUND', 'Recebimento nao encontrado', 404);
  }

  // Validar transicao de status
  if (updates.status && updates.status !== current.status) {
    const allowed = VALID_STATUS_TRANSITIONS[current.status as string] ?? [];
    if (!allowed.includes(updates.status)) {
      throw new AppError(
        'BUSINESS_RULE_VIOLATION',
        `Transicao de status invalida: ${current.status} -> ${updates.status}`,
        422,
        { current_status: current.status, target_status: updates.status },
      );
    }
  }

  // Regras automaticas de received_date baseadas na mudanca de status
  let receivedDateOverride: { received_date: string | null } | Record<string, never> = {};

  if (updates.status && updates.status !== current.status) {
    if (updates.status === 'recebido') {
      // Auto-set received_date para hoje se nao foi fornecida explicitamente
      if (!updates.received_date) {
        receivedDateOverride = {
          received_date: new Date().toISOString().slice(0, 10),
        };
        console.log('[receivables/update] received_date auto-set para hoje', { id });
      }
    } else if (current.status === 'recebido') {
      // Saindo do status recebido: limpar received_date (a menos que o usuario tenha fornecido)
      if (!('received_date' in updates)) {
        receivedDateOverride = { received_date: null };
        console.log('[receivables/update] received_date limpo ao sair de recebido', { id });
      }
    }
  }

  // Montar payload final de update
  const updatePayload: Record<string, unknown> = {
    ...updates,
    ...receivedDateOverride,
  };

  const { data: updated, error: updateError } = await client
    .from('job_receivables')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[receivables/update] erro ao atualizar:', updateError.message);

    // Tratar violacao de constraint de parcela unica
    if (updateError.code === '23505') {
      throw new AppError(
        'CONFLICT',
        `Ja existe uma parcela ${updates.installment_number} para este job`,
        409,
        { detail: updateError.message },
      );
    }

    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar recebimento', 500, {
      detail: updateError.message,
    });
  }

  // Inserir historico no job_history
  await insertHistory(client, {
    tenantId: auth.tenantId,
    jobId: current.job_id as string,
    eventType: 'financial_update',
    userId: auth.userId,
    dataBefore: current,
    dataAfter: updated,
    description: `Recebimento atualizado: parcela ${current.installment_number} — ${current.description}`,
  });

  console.log('[receivables/update] recebimento atualizado com sucesso', { id });
  return success(updated);
}
