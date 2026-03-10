import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Schema de uma linha de contato
const ContactRowSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(255),
  email: z.string().email('Email invalido').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  role: z.string().max(100).optional().nullable(),
  is_primary: z.boolean().optional().nullable(),
  // client_name e obrigatorio para resolver o client_id
  client_name: z.string().min(1, 'client_name e obrigatorio para vincular o contato'),
});

// Schema do body da requisicao
const ImportContactsBodySchema = z.object({
  rows: z.array(ContactRowSchema).min(1, 'Pelo menos uma linha e obrigatoria').max(500, 'Maximo 500 linhas por importacao'),
  file_name: z.string().optional().nullable(),
  idempotency_key: z.string().optional().nullable(),
});

type ContactRow = z.infer<typeof ContactRowSchema>;

// Estrutura de erro por linha retornado ao cliente
interface RowError {
  row: number;
  field: string;
  message: string;
}

export async function handleImportContacts(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Apenas roles com permissao de importacao
  const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para importar dados', 403);
  }

  // 1. Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body da requisicao invalido ou nao e JSON', 400);
  }

  const parsed = ImportContactsBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Payload invalido', 400, {
      issues: parsed.error.issues,
    });
  }

  const { rows, file_name, idempotency_key } = parsed.data;

  const supabase = getSupabaseClient(auth.token);

  // 2. Verificar idempotencia
  if (idempotency_key) {
    const { data: existingLog } = await supabase
      .from('import_logs')
      .select('id, inserted_rows, skipped_rows, error_rows, errors')
      .eq('tenant_id', auth.tenantId)
      .eq('idempotency_key', idempotency_key)
      .eq('entity_type', 'contacts')
      .maybeSingle();

    if (existingLog) {
      console.log(`[data-import/contacts] Requisicao idempotente detectada: ${idempotency_key}`);
      return success({
        inserted: existingLog.inserted_rows,
        skipped: existingLog.skipped_rows,
        errors: existingLog.errors ?? [],
        idempotent: true,
      }, 200, req);
    }
  }

  // 3. Buscar todos os clientes do tenant para resolver client_name -> client_id
  const { data: tenantClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', auth.tenantId);

  if (clientsError) {
    console.error('[data-import/contacts] Erro ao buscar clientes:', clientsError);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar clientes do tenant', 500);
  }

  // Mapa de nome (lowercase) -> client_id para lookup eficiente
  const clientMap = new Map<string, string>();
  for (const client of (tenantClients ?? [])) {
    clientMap.set(client.name.toLowerCase().trim(), client.id);
  }

  // 4. Buscar contatos existentes para deduplicacao por email + client_id
  // Chave de deduplicacao: `${client_id}:${email}`
  const { data: existingContacts, error: contactsError } = await supabase
    .from('contacts')
    .select('client_id, email')
    .eq('tenant_id', auth.tenantId)
    .not('email', 'is', null);

  if (contactsError) {
    console.error('[data-import/contacts] Erro ao buscar contatos existentes:', contactsError);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar contatos existentes', 500);
  }

  // Conjunto de chaves de deduplicacao
  const existingKeys = new Set(
    (existingContacts ?? [])
      .filter((c: { client_id: string; email: string | null }) => c.email)
      .map((c: { client_id: string; email: string }) => `${c.client_id}:${c.email.toLowerCase().trim()}`),
  );

  // 5. Processar linhas
  const rowErrors: RowError[] = [];
  const toInsert: Array<{
    tenant_id: string;
    client_id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    is_primary?: boolean | null;
    created_by: string;
  }> = [];
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const row: ContactRow = rows[i];

    // Resolver client_name -> client_id
    const clientId = clientMap.get(row.client_name.toLowerCase().trim());
    if (!clientId) {
      rowErrors.push({
        row: rowNum,
        field: 'client_name',
        message: `Cliente "${row.client_name}" nao encontrado no tenant`,
      });
      continue;
    }

    // Deduplicacao: pula se email ja existe para o mesmo client_id
    if (row.email) {
      const dedupeKey = `${clientId}:${row.email.toLowerCase().trim()}`;
      if (existingKeys.has(dedupeKey)) {
        skippedCount++;
        continue;
      }
      // Adiciona ao conjunto para evitar duplicatas dentro do mesmo batch
      existingKeys.add(dedupeKey);
    }

    toInsert.push({
      tenant_id: auth.tenantId,
      client_id: clientId,
      name: row.name,
      email: row.email ?? null,
      phone: row.phone ?? null,
      role: row.role ?? null,
      is_primary: row.is_primary ?? null,
      created_by: auth.userId,
    });
  }

  // 6. Inserir em batch
  let insertedCount = 0;

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('contacts')
      .insert(toInsert);

    if (insertError) {
      console.error('[data-import/contacts] Erro no batch insert:', insertError);
      throw new AppError('INTERNAL_ERROR', 'Erro ao inserir contatos no banco', 500);
    }

    insertedCount = toInsert.length;
  }

  // 7. Registrar log da importacao
  const { error: logError } = await supabase
    .from('import_logs')
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      entity_type: 'contacts',
      file_name: file_name ?? null,
      total_rows: rows.length,
      inserted_rows: insertedCount,
      skipped_rows: skippedCount,
      error_rows: rowErrors.length,
      errors: rowErrors,
      idempotency_key: idempotency_key ?? null,
    });

  if (logError) {
    console.warn('[data-import/contacts] Erro ao salvar import_log:', logError);
  }

  console.log(
    `[data-import/contacts] tenant=${auth.tenantId} inserted=${insertedCount} skipped=${skippedCount} errors=${rowErrors.length}`,
  );

  return success(
    {
      inserted: insertedCount,
      skipped: skippedCount,
      errors: rowErrors,
    },
    200,
    req,
  );
}
