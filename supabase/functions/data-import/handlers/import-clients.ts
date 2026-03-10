import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ENUM validos do banco para client_segment
const CLIENT_SEGMENT_VALUES = [
  'publicidade',
  'varejo',
  'tecnologia',
  'saude',
  'educacao',
  'financeiro',
  'governo',
  'entretenimento',
  'moda',
  'outro',
] as const;

// Schema de uma linha de cliente
const ClientRowSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(255),
  trading_name: z.string().max(255).optional().nullable(),
  segment: z.enum(CLIENT_SEGMENT_VALUES).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  cnpj: z.string().max(20).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Schema do body da requisicao
const ImportClientsBodySchema = z.object({
  rows: z.array(ClientRowSchema).min(1, 'Pelo menos uma linha e obrigatoria').max(500, 'Maximo 500 linhas por importacao'),
  file_name: z.string().optional().nullable(),
  idempotency_key: z.string().optional().nullable(),
});

type ClientRow = z.infer<typeof ClientRowSchema>;

// Estrutura de erro por linha retornado ao cliente
interface RowError {
  row: number;
  field: string;
  message: string;
}

export async function handleImportClients(
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

  const parsed = ImportClientsBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Payload invalido', 400, {
      issues: parsed.error.issues,
    });
  }

  const { rows, file_name, idempotency_key } = parsed.data;

  // 2. Verificar idempotencia: se ja existe log com essa chave, retorna o resultado anterior
  const supabase = getSupabaseClient(auth.token);

  if (idempotency_key) {
    const { data: existingLog } = await supabase
      .from('import_logs')
      .select('id, inserted_rows, skipped_rows, error_rows, errors')
      .eq('tenant_id', auth.tenantId)
      .eq('idempotency_key', idempotency_key)
      .eq('entity_type', 'clients')
      .maybeSingle();

    if (existingLog) {
      console.log(`[data-import/clients] Requisicao idempotente detectada: ${idempotency_key}`);
      return success({
        inserted: existingLog.inserted_rows,
        skipped: existingLog.skipped_rows,
        errors: existingLog.errors ?? [],
        idempotent: true,
      }, 200, req);
    }
  }

  // 3. Buscar todos os nomes de clientes ja existentes no tenant (para deduplicacao)
  const { data: existingClients, error: fetchError } = await supabase
    .from('clients')
    .select('name')
    .eq('tenant_id', auth.tenantId);

  if (fetchError) {
    console.error('[data-import/clients] Erro ao buscar clientes existentes:', fetchError);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar clientes existentes', 500);
  }

  // Conjunto de nomes em lowercase para comparacao case-insensitive
  const existingNames = new Set(
    (existingClients ?? []).map((c: { name: string }) => c.name.toLowerCase().trim()),
  );

  // 4. Separar linhas validas das invalidas e deduplicas
  const rowErrors: RowError[] = [];
  const toInsert: (ClientRow & { tenant_id: string; created_by: string })[] = [];
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1; // numero 1-based para feedback ao usuario
    const row = rows[i];

    // Validacao individual da linha (ja feita pelo Zod no body, mas re-valida para pegar erros de campo)
    const rowParsed = ClientRowSchema.safeParse(row);
    if (!rowParsed.success) {
      for (const issue of rowParsed.error.issues) {
        rowErrors.push({
          row: rowNum,
          field: issue.path.join('.') || 'unknown',
          message: issue.message,
        });
      }
      continue;
    }

    const normalizedName = row.name.toLowerCase().trim();

    // Deduplicacao: pula se ja existe um cliente com o mesmo nome no tenant
    if (existingNames.has(normalizedName)) {
      skippedCount++;
      continue;
    }

    // Adiciona ao conjunto para evitar duplicatas dentro do mesmo batch
    existingNames.add(normalizedName);

    toInsert.push({
      ...row,
      tenant_id: auth.tenantId,
      created_by: auth.userId,
    });
  }

  // 5. Inserir em batch (apenas se houver linhas validas para inserir)
  let insertedCount = 0;

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('clients')
      .insert(toInsert);

    if (insertError) {
      console.error('[data-import/clients] Erro no batch insert:', insertError);
      throw new AppError('INTERNAL_ERROR', 'Erro ao inserir clientes no banco', 500);
    }

    insertedCount = toInsert.length;
  }

  // 6. Registrar log da importacao
  const { error: logError } = await supabase
    .from('import_logs')
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      entity_type: 'clients',
      file_name: file_name ?? null,
      total_rows: rows.length,
      inserted_rows: insertedCount,
      skipped_rows: skippedCount,
      error_rows: rowErrors.length,
      errors: rowErrors,
      idempotency_key: idempotency_key ?? null,
    });

  if (logError) {
    // Log nao bloqueia resposta — apenas registra o problema
    console.warn('[data-import/clients] Erro ao salvar import_log:', logError);
  }

  console.log(
    `[data-import/clients] tenant=${auth.tenantId} inserted=${insertedCount} skipped=${skippedCount} errors=${rowErrors.length}`,
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
