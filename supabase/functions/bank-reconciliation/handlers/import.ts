import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para importar extratos
const ALLOWED_ROLES = ['financeiro', 'admin', 'ceo'];

// Schema de validacao do body de import
const ImportSchema = z.object({
  ofx_content: z.string().min(1, 'Conteudo OFX vazio'),
  bank_name: z.string().min(1).max(100).optional(),
  account_identifier: z.string().max(50).optional(),
  file_name: z.string().max(255).optional(),
});

// Tipos internos do parser OFX
interface OFXTransaction {
  reference_id: string | null;    // FITID
  transaction_date: string;       // DTPOSTED -> YYYY-MM-DD
  amount: number;                 // TRNAMT
  description: string;            // NAME ou MEMO
  transaction_type: 'credit' | 'debit' | 'transfer' | 'fee' | 'interest';
}

interface OFXHeader {
  bank_name: string | null;
  account_identifier: string | null;
  period_start: string | null;    // DTSTART -> YYYY-MM-DD
  period_end: string | null;      // DTEND -> YYYY-MM-DD
  currency: string | null;
}

// =============================================================================
// Parser OFX
// O formato OFX e SGML (nao XML). Tags nao fechadas, valores na linha seguinte
// ou na mesma linha: <TAG>VALOR  ou <TAG>\nVALOR
// Exemplo real:
//   <TRNTYPE>DEBIT
//   <DTPOSTED>20250315120000[−3:BRT]
//   <TRNAMT>-5000.00
//   <FITID>2025031500001
//   <NAME>PIX JOAO SILVA
// =============================================================================

/**
 * Extrai o valor de uma tag OFX a partir de um trecho de texto.
 * Suporta:
 *   <TAG>valor  (valor na mesma linha)
 *   <TAG>\nvalor (valor na linha seguinte — formato SGML antigo)
 * Retorna null se a tag nao for encontrada.
 */
function extractTag(text: string, tag: string): string | null {
  // Regex: <TAG> seguido de espaco opcional + valor ate fim da linha
  const regex = new RegExp(`<${tag}>([^\r\n<]*)`, 'i');
  const match = text.match(regex);
  if (!match) return null;
  return match[1].trim() || null;
}

/**
 * Converte data OFX para formato ISO YYYY-MM-DD.
 * Formatos OFX:
 *   20250315120000          -> 2025-03-15
 *   20250315120000.000[-3]  -> 2025-03-15
 *   20250315                -> 2025-03-15
 */
function parseOFXDate(raw: string): string | null {
  if (!raw) return null;
  // Remove timezone suffix: [+/-N:XXX] ou .000
  const cleaned = raw.replace(/[\.\[].+$/, '').trim();
  if (cleaned.length < 8) return null;

  const year = cleaned.substring(0, 4);
  const month = cleaned.substring(4, 6);
  const day = cleaned.substring(6, 8);

  // Validacao basica
  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  return `${year}-${month}-${day}`;
}

/**
 * Mapeia TRNTYPE OFX para o enum do banco.
 */
function mapTransactionType(
  trntype: string | null,
  amount: number,
): 'credit' | 'debit' | 'transfer' | 'fee' | 'interest' {
  const t = (trntype ?? '').toUpperCase();
  if (t === 'CREDIT' || t === 'DEP' || t === 'DIRECTDEP' || t === 'XFER' && amount > 0) return 'credit';
  if (t === 'DEBIT' || t === 'PAYMENT' || t === 'DIRECTDEBIT' || t === 'CHECK') return 'debit';
  if (t === 'XFER' || t === 'TRANSFER') return 'transfer';
  if (t === 'SRVCHG' || t === 'FEE' || t === 'CHARGE') return 'fee';
  if (t === 'INT' || t === 'INTEREST' || t === 'DIV') return 'interest';
  // Fallback: positivo = credito, negativo = debito
  return amount >= 0 ? 'credit' : 'debit';
}

/**
 * Extrai os dados do cabecalho do extrato OFX.
 * Procura por: BANKID, ACCTID, DTSTART, DTEND, CURDEF
 */
function parseOFXHeader(content: string): OFXHeader {
  return {
    bank_name: extractTag(content, 'BANKID') ?? extractTag(content, 'ORG'),
    account_identifier: extractTag(content, 'ACCTID'),
    period_start: parseOFXDate(extractTag(content, 'DTSTART') ?? ''),
    period_end: parseOFXDate(extractTag(content, 'DTEND') ?? ''),
    currency: extractTag(content, 'CURDEF'),
  };
}

/**
 * Parser principal OFX.
 * Extrai todas as transacoes STMTTRN do conteudo OFX.
 * O formato SGML permite tanto <TAG>VALOR (sem fechamento) quanto
 * <TAG>VALOR</TAG> (XML-like). O parser suporta ambos.
 */
function parseOFX(content: string): { header: OFXHeader; transactions: OFXTransaction[] } {
  const header = parseOFXHeader(content);
  const transactions: OFXTransaction[] = [];

  // Extrair blocos <STMTTRN>...</STMTTRN> ou <STMTTRN>...</STMTTRN> (com ou sem fechamento)
  // Estrategia: dividir pelo abre-tag e processar cada bloco individualmente
  // Suporte a SGML (sem fechamento) e XML (com fechamento)
  const stmtBlocks = content.split(/<STMTTRN>/i).slice(1); // primeiro elemento e antes do bloco

  for (const block of stmtBlocks) {
    // Pegar apenas ate o proximo </STMTTRN> ou proximo <STMTTRN> (SGML sem fechamento)
    const endTag = block.search(/<\/STMTTRN>/i);
    const nextOpen = block.search(/<STMTTRN>/i);

    let blockContent: string;
    if (endTag !== -1) {
      blockContent = block.substring(0, endTag);
    } else if (nextOpen !== -1) {
      blockContent = block.substring(0, nextOpen);
    } else {
      blockContent = block;
    }

    // Extrair campos
    const fitid = extractTag(blockContent, 'FITID');
    const dtposted = extractTag(blockContent, 'DTPOSTED');
    const trnamt = extractTag(blockContent, 'TRNAMT');
    const trntype = extractTag(blockContent, 'TRNTYPE');
    const name = extractTag(blockContent, 'NAME');
    const memo = extractTag(blockContent, 'MEMO');

    // Campos obrigatorios: data e valor
    if (!dtposted || !trnamt) {
      console.warn('[bank-reconciliation/import] bloco STMTTRN sem data ou valor, ignorando');
      continue;
    }

    const parsedDate = parseOFXDate(dtposted);
    if (!parsedDate) {
      console.warn('[bank-reconciliation/import] data OFX invalida:', dtposted);
      continue;
    }

    const amount = parseFloat(trnamt.replace(',', '.'));
    if (isNaN(amount)) {
      console.warn('[bank-reconciliation/import] valor OFX invalido:', trnamt);
      continue;
    }

    // Descricao: preferir NAME, fallback para MEMO, fallback para 'Sem descricao'
    const description = (name || memo || 'Sem descricao').trim();

    transactions.push({
      reference_id: fitid,
      transaction_date: parsedDate,
      amount,
      description,
      transaction_type: mapTransactionType(trntype, amount),
    });
  }

  return { header, transactions };
}

export async function handleImport(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[bank-reconciliation/import] iniciando importacao OFX', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para importar extratos', 403);
  }

  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = ImportSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { ofx_content, bank_name: bankNameOverride, account_identifier: accountOverride, file_name } = parseResult.data;

  // Parsear OFX
  let parsed: ReturnType<typeof parseOFX>;
  try {
    parsed = parseOFX(ofx_content);
  } catch (parseErr) {
    console.error('[bank-reconciliation/import] erro no parser OFX:', parseErr);
    throw new AppError('VALIDATION_ERROR', 'Arquivo OFX invalido ou corrompido', 400);
  }

  const { header, transactions } = parsed;

  if (transactions.length === 0) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Nenhuma transacao encontrada no arquivo OFX. Verifique se o arquivo esta no formato correto.',
      400,
    );
  }

  // Determinar periodo: usar header OFX ou calcular a partir das transacoes
  const periodStart = header.period_start ?? transactions.reduce(
    (min, t) => t.transaction_date < min ? t.transaction_date : min,
    transactions[0].transaction_date,
  );
  const periodEnd = header.period_end ?? transactions.reduce(
    (max, t) => t.transaction_date > max ? t.transaction_date : max,
    transactions[0].transaction_date,
  );

  const bankName = bankNameOverride ?? header.bank_name ?? 'Banco desconhecido';
  const accountIdentifier = accountOverride ?? header.account_identifier ?? null;

  const client = getSupabaseClient(auth.token);

  // Inserir o extrato
  const { data: statement, error: stmtError } = await client
    .from('bank_statements')
    .insert({
      tenant_id: auth.tenantId,
      bank_name: bankName,
      account_identifier: accountIdentifier,
      period_start: periodStart,
      period_end: periodEnd,
      file_name: file_name ?? null,
      total_entries: transactions.length,
      reconciled_entries: 0,
      imported_by: auth.userId,
    })
    .select('*')
    .single();

  if (stmtError || !statement) {
    console.error('[bank-reconciliation/import] erro ao criar extrato:', stmtError?.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar registro do extrato', 500, {
      detail: stmtError?.message,
    });
  }

  console.log('[bank-reconciliation/import] extrato criado', {
    statementId: statement.id,
    transactionCount: transactions.length,
  });

  // Preparar batch de transacoes para insercao
  // Remover duplicatas por reference_id dentro do proprio arquivo
  const seen = new Set<string>();
  const transactionRows = [];

  for (const t of transactions) {
    // Dedup por FITID dentro do arquivo (o UNIQUE do DB trata reimportacoes)
    const dedupKey = `${statement.id}:${t.reference_id ?? t.transaction_date + ':' + t.amount}`;
    if (seen.has(dedupKey)) {
      console.warn('[bank-reconciliation/import] transacao duplicada ignorada:', dedupKey);
      continue;
    }
    seen.add(dedupKey);

    transactionRows.push({
      tenant_id: auth.tenantId,
      statement_id: statement.id,
      transaction_date: t.transaction_date,
      description: t.description,
      amount: t.amount,
      reference_id: t.reference_id,
      transaction_type: t.transaction_type,
      reconciled: false,
    });
  }

  // Inserir transacoes em batch (upsert com conflict ignore para idempotencia)
  const BATCH_SIZE = 100;
  let insertedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < transactionRows.length; i += BATCH_SIZE) {
    const batch = transactionRows.slice(i, i + BATCH_SIZE);

    const { data: inserted, error: txError } = await client
      .from('bank_transactions')
      .upsert(batch, {
        onConflict: 'statement_id,reference_id',
        ignoreDuplicates: true,
      })
      .select('id');

    if (txError) {
      console.error('[bank-reconciliation/import] erro ao inserir transacoes batch', i, txError.message);
      throw new AppError('INTERNAL_ERROR', 'Erro ao inserir transacoes', 500, {
        detail: txError.message,
        batch_index: i,
      });
    }

    insertedCount += inserted?.length ?? 0;
    skippedCount += batch.length - (inserted?.length ?? 0);
  }

  // Atualizar total_entries com o count real inserido
  await client
    .from('bank_statements')
    .update({ total_entries: insertedCount })
    .eq('id', statement.id);

  console.log('[bank-reconciliation/import] importacao concluida', {
    statementId: statement.id,
    inserted: insertedCount,
    skipped: skippedCount,
  });

  return created({
    statement: { ...statement, total_entries: insertedCount },
    inserted_count: insertedCount,
    skipped_count: skippedCount,
    period_start: periodStart,
    period_end: periodEnd,
  }, req);
}
