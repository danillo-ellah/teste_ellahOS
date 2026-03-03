import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para auto-conciliar
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Tolerancia para match fuzzy
const FUZZY_AMOUNT_TOLERANCE = 0.05;  // 5% de variacao no valor
const FUZZY_DATE_TOLERANCE_DAYS = 3;  // ate 3 dias de diferenca

// Schema do body
const AutoReconcileSchema = z.object({
  statement_id: z.string().uuid('statement_id deve ser UUID valido'),
  apply: z.boolean().default(false), // se false, apenas sugere sem aplicar
});

// Resultado de um match candidato
interface MatchCandidate {
  transaction_id: string;
  cost_item_id: string | null;
  payment_proof_id: string | null;
  match_method: 'auto_exact' | 'auto_fuzzy';
  match_confidence: number;
  cost_item?: Record<string, unknown> | null;
  payment_proof?: Record<string, unknown> | null;
}

// Calcula diferenca absoluta em dias entre duas datas YYYY-MM-DD
function dateDiffDays(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)));
}

// Normaliza texto para comparacao fuzzy: remove acentos, maiusculas, pontuacao
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ')   // remove pontuacao
    .replace(/\s+/g, ' ')            // colapsa espacos
    .trim();
}

// Verifica se dois textos tem correspondencia relevante (ao menos 1 palavra de 4+ chars em comum)
function textsHaveCommonWord(textA: string, textB: string): boolean {
  const wordsA = new Set(normalizeText(textA).split(' ').filter((w) => w.length >= 4));
  const wordsB = normalizeText(textB).split(' ').filter((w) => w.length >= 4);
  return wordsB.some((w) => wordsA.has(w));
}

export async function handleAutoReconcile(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[bank-reconciliation/auto-reconcile] iniciando matching automatico', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para auto-conciliacao', 403);
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = AutoReconcileSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { statement_id, apply } = parseResult.data;

  const client = getSupabaseClient(auth.token);

  // Verificar que o extrato pertence ao tenant
  const { data: statement } = await client
    .from('bank_statements')
    .select('id, bank_name, period_start, period_end')
    .eq('id', statement_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!statement) {
    throw new AppError('NOT_FOUND', 'Extrato nao encontrado', 404);
  }

  // Buscar transacoes nao-conciliadas do extrato
  const { data: transactions, error: txError } = await client
    .from('bank_transactions')
    .select('id, transaction_date, amount, description, transaction_type')
    .eq('statement_id', statement_id)
    .eq('tenant_id', auth.tenantId)
    .eq('reconciled', false)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: true });

  if (txError) {
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar transacoes', 500, {
      detail: txError.message,
    });
  }

  if (!transactions || transactions.length === 0) {
    return success({
      message: 'Nenhuma transacao pendente de conciliacao',
      matches: [],
      applied_count: 0,
    }, 200, req);
  }

  console.log('[bank-reconciliation/auto-reconcile] processando transacoes', {
    count: transactions.length,
    apply,
  });

  // Determinar janela de datas para buscar cost_items (com tolerancia)
  const minDate = transactions.reduce(
    (min, t) => t.transaction_date < min ? t.transaction_date : min,
    transactions[0].transaction_date,
  );
  const maxDate = transactions.reduce(
    (max, t) => t.transaction_date > max ? t.transaction_date : max,
    transactions[0].transaction_date,
  );

  // Adicionar tolerancia de 3 dias nas bordas
  const searchFrom = new Date(new Date(minDate).getTime() - FUZZY_DATE_TOLERANCE_DAYS * 86400000)
    .toISOString().slice(0, 10);
  const searchTo = new Date(new Date(maxDate).getTime() + FUZZY_DATE_TOLERANCE_DAYS * 86400000)
    .toISOString().slice(0, 10);

  // Buscar cost_items pagos (ou com data de vencimento proxima) do tenant no periodo
  const { data: costItems } = await client
    .from('cost_items')
    .select(`
      id, service_description, unit_value, total_with_overtime, actual_paid_value,
      payment_due_date, vendor_name_snapshot,
      vendors:vendor_id(id, full_name)
    `)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .gte('payment_due_date', searchFrom)
    .lte('payment_due_date', searchTo)
    .neq('item_status', 'cancelado');

  // Buscar payment_proofs no periodo
  const { data: paymentProofs } = await client
    .from('payment_proofs')
    .select('id, amount, payment_date, payer_name, bank_reference, file_name')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .gte('payment_date', searchFrom)
    .lte('payment_date', searchTo);

  const matches: MatchCandidate[] = [];
  const appliedIds: string[] = [];

  // Para cada transacao, tentar match
  for (const tx of transactions) {
    const absAmount = Math.abs(tx.amount);
    const isDebit = tx.amount < 0;
    let bestMatch: MatchCandidate | null = null;

    // -------------------------------------------------------
    // Estrategia 1: Match exato com cost_item
    // Criterios: valor exato (unit_value ou total_with_overtime) + payment_due_date == transaction_date
    // -------------------------------------------------------
    if (isDebit && costItems) {
      for (const ci of costItems) {
        const ciAmount = Number(ci.total_with_overtime ?? ci.unit_value ?? 0);
        if (ciAmount === 0) continue;

        if (ciAmount === absAmount && ci.payment_due_date === tx.transaction_date) {
          bestMatch = {
            transaction_id: tx.id,
            cost_item_id: ci.id,
            payment_proof_id: null,
            match_method: 'auto_exact',
            match_confidence: 1.0,
            cost_item: ci,
          };
          break;
        }
      }
    }

    // -------------------------------------------------------
    // Estrategia 2: Match exato com payment_proof
    // Criterios: valor exato + payment_date == transaction_date
    // -------------------------------------------------------
    if (!bestMatch && paymentProofs) {
      for (const pp of paymentProofs) {
        const ppAmount = Number(pp.amount ?? 0);
        if (ppAmount === 0) continue;

        if (ppAmount === absAmount && pp.payment_date === tx.transaction_date) {
          bestMatch = {
            transaction_id: tx.id,
            cost_item_id: null,
            payment_proof_id: pp.id,
            match_method: 'auto_exact',
            match_confidence: 1.0,
            payment_proof: pp,
          };
          break;
        }
      }
    }

    // -------------------------------------------------------
    // Estrategia 3: Match fuzzy com cost_item
    // Criterios: valor +/-5%, data +/-3 dias, nome do vendor na descricao
    // -------------------------------------------------------
    if (!bestMatch && isDebit && costItems) {
      let bestFuzzyScore = 0;
      let bestFuzzyItem: typeof costItems[0] | null = null;

      for (const ci of costItems) {
        const ciAmount = Number(ci.total_with_overtime ?? ci.unit_value ?? 0);
        if (ciAmount === 0) continue;

        // Verificar tolerancia de valor
        const amountDiff = Math.abs(ciAmount - absAmount) / ciAmount;
        if (amountDiff > FUZZY_AMOUNT_TOLERANCE) continue;

        // Verificar tolerancia de data
        const daysDiff = dateDiffDays(
          ci.payment_due_date ?? tx.transaction_date,
          tx.transaction_date,
        );
        if (daysDiff > FUZZY_DATE_TOLERANCE_DAYS) continue;

        // Score baseado em proximidade de valor e data
        const amountScore = 1 - (amountDiff / FUZZY_AMOUNT_TOLERANCE); // 0 a 1
        const dateScore = 1 - (daysDiff / (FUZZY_DATE_TOLERANCE_DAYS + 1)); // 0 a 1

        // Bonus por correspondencia textual (nome do vendor na descricao da transacao)
        const vendorName = (ci.vendor_name_snapshot ?? (ci.vendors as Record<string, unknown> | null)?.full_name ?? '') as string;
        const textBonus = vendorName && textsHaveCommonWord(tx.description, vendorName) ? 0.2 : 0;

        const totalScore = Math.min(0.95, 0.4 * amountScore + 0.4 * dateScore + textBonus);

        if (totalScore > bestFuzzyScore && totalScore >= 0.5) {
          bestFuzzyScore = totalScore;
          bestFuzzyItem = ci;
        }
      }

      if (bestFuzzyItem) {
        bestMatch = {
          transaction_id: tx.id,
          cost_item_id: bestFuzzyItem.id,
          payment_proof_id: null,
          match_method: 'auto_fuzzy',
          match_confidence: Math.round(bestFuzzyScore * 100) / 100,
          cost_item: bestFuzzyItem,
        };
      }
    }

    // -------------------------------------------------------
    // Estrategia 4: Match fuzzy com payment_proof
    // -------------------------------------------------------
    if (!bestMatch && paymentProofs) {
      let bestFuzzyScore = 0;
      let bestFuzzyProof: typeof paymentProofs[0] | null = null;

      for (const pp of paymentProofs) {
        const ppAmount = Number(pp.amount ?? 0);
        if (ppAmount === 0) continue;

        const amountDiff = Math.abs(ppAmount - absAmount) / ppAmount;
        if (amountDiff > FUZZY_AMOUNT_TOLERANCE) continue;

        const daysDiff = dateDiffDays(pp.payment_date, tx.transaction_date);
        if (daysDiff > FUZZY_DATE_TOLERANCE_DAYS) continue;

        const amountScore = 1 - (amountDiff / FUZZY_AMOUNT_TOLERANCE);
        const dateScore = 1 - (daysDiff / (FUZZY_DATE_TOLERANCE_DAYS + 1));

        // Bonus por bank_reference na descricao
        const refBonus = pp.bank_reference &&
          tx.description.toLowerCase().includes(pp.bank_reference.toLowerCase().slice(-8))
          ? 0.2
          : 0;

        const totalScore = Math.min(0.95, 0.4 * amountScore + 0.4 * dateScore + refBonus);

        if (totalScore > bestFuzzyScore && totalScore >= 0.5) {
          bestFuzzyScore = totalScore;
          bestFuzzyProof = pp;
        }
      }

      if (bestFuzzyProof) {
        bestMatch = {
          transaction_id: tx.id,
          cost_item_id: null,
          payment_proof_id: bestFuzzyProof.id,
          match_method: 'auto_fuzzy',
          match_confidence: Math.round(bestFuzzyScore * 100) / 100,
          payment_proof: bestFuzzyProof,
        };
      }
    }

    if (!bestMatch) continue;

    matches.push(bestMatch);

    // Aplicar match se apply=true e confianca >= 0.8 (exato ou fuzzy de alta confianca)
    if (apply && bestMatch.match_confidence >= 0.8) {
      const { error: updateError } = await client
        .from('bank_transactions')
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: auth.userId,
          cost_item_id: bestMatch.cost_item_id,
          payment_proof_id: bestMatch.payment_proof_id,
          match_method: bestMatch.match_method,
          match_confidence: bestMatch.match_confidence,
        })
        .eq('id', tx.id)
        .eq('tenant_id', auth.tenantId);

      if (!updateError) {
        appliedIds.push(tx.id);
      } else {
        console.error('[bank-reconciliation/auto-reconcile] erro ao aplicar match:', updateError.message, {
          transactionId: tx.id,
        });
      }
    }
  }

  // Atualizar reconciled_entries no extrato se apply=true
  if (apply && appliedIds.length > 0) {
    const { data: stmt } = await client
      .from('bank_statements')
      .select('reconciled_entries, total_entries')
      .eq('id', statement_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();

    if (stmt) {
      const newCount = Math.min(
        stmt.total_entries,
        stmt.reconciled_entries + appliedIds.length,
      );
      await client
        .from('bank_statements')
        .update({ reconciled_entries: newCount })
        .eq('id', statement_id)
        .eq('tenant_id', auth.tenantId);
    }
  }

  console.log('[bank-reconciliation/auto-reconcile] matching concluido', {
    statementId: statement_id,
    totalTransactions: transactions.length,
    matchesFound: matches.length,
    applied: appliedIds.length,
  });

  return success({
    matches,
    total_transactions: transactions.length,
    matches_found: matches.length,
    applied_count: appliedIds.length,
    apply_mode: apply,
  }, 200, req);
}
