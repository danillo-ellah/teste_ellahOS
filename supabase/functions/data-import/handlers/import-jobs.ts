import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ENUMs validos do banco
const PROJECT_TYPE_VALUES = [
  'filme_publicitario',
  'branded_content',
  'videoclipe',
  'documentario',
  'conteudo_digital',
  'evento_livestream',
  'institucional',
  'motion_graphics',
  'fotografia',
  'monstro_animatic',
  'outro',
] as const;

const JOB_STATUS_VALUES = [
  'briefing_recebido',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado_selecao_diretor',
  'cronograma_planejamento',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
  'finalizado',
  'cancelado',
  'pausado',
] as const;

const PRIORITY_LEVEL_VALUES = ['alta', 'media', 'baixa'] as const;

// Schema de uma linha de job
const JobRowSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio').max(255),
  // client_name e obrigatorio para resolver o client_id
  client_name: z.string().min(1, 'client_name e obrigatorio'),
  project_type: z.enum(PROJECT_TYPE_VALUES).optional().nullable(),
  status: z.enum(JOB_STATUS_VALUES).optional().nullable(),
  priority_level: z.enum(PRIORITY_LEVEL_VALUES).optional().nullable(),
  // Valores monetarios como numero
  closed_value: z.number().nonnegative().optional().nullable(),
  production_cost: z.number().nonnegative().optional().nullable(),
  tax_percentage: z.number().min(0).max(100).optional().nullable(),
  // Datas como string ISO (YYYY-MM-DD ou ISO completo)
  briefing_date: z.string().optional().nullable(),
  expected_delivery_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

// Schema do body da requisicao
const ImportJobsBodySchema = z.object({
  rows: z.array(JobRowSchema).min(1, 'Pelo menos uma linha e obrigatoria').max(200, 'Maximo 200 jobs por importacao'),
  file_name: z.string().optional().nullable(),
  idempotency_key: z.string().optional().nullable(),
});

type JobRow = z.infer<typeof JobRowSchema>;

// Estrutura de erro por linha retornado ao cliente
interface RowError {
  row: number;
  field: string;
  message: string;
}

export async function handleImportJobs(
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

  const parsed = ImportJobsBodySchema.safeParse(body);
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
      .eq('entity_type', 'jobs')
      .maybeSingle();

    if (existingLog) {
      console.log(`[data-import/jobs] Requisicao idempotente detectada: ${idempotency_key}`);
      return success({
        inserted: existingLog.inserted_rows,
        skipped: existingLog.skipped_rows,
        errors: existingLog.errors ?? [],
        idempotent: true,
      }, 200, req);
    }
  }

  // 3. Buscar clientes do tenant para resolver client_name -> client_id
  const { data: tenantClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('tenant_id', auth.tenantId);

  if (clientsError) {
    console.error('[data-import/jobs] Erro ao buscar clientes:', clientsError);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar clientes do tenant', 500);
  }

  // Mapa de nome (lowercase) -> client_id
  const clientMap = new Map<string, string>();
  for (const client of (tenantClients ?? [])) {
    clientMap.set(client.name.toLowerCase().trim(), client.id);
  }

  // 4. Buscar jobs existentes para deduplicacao por title + client_id
  const { data: existingJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('title, client_id')
    .eq('tenant_id', auth.tenantId);

  if (jobsError) {
    console.error('[data-import/jobs] Erro ao buscar jobs existentes:', jobsError);
    throw new AppError('INTERNAL_ERROR', 'Erro ao verificar jobs existentes', 500);
  }

  // Conjunto de chaves de deduplicacao: `${title.lower}:${client_id}`
  const existingKeys = new Set(
    (existingJobs ?? []).map(
      (j: { title: string; client_id: string }) =>
        `${j.title.toLowerCase().trim()}:${j.client_id}`,
    ),
  );

  // 5. Processar linhas
  const rowErrors: RowError[] = [];
  const toInsert: Array<Record<string, unknown>> = [];
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 1;
    const row: JobRow = rows[i];

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

    // Deduplicacao: pula se title + client_id ja existe
    const dedupeKey = `${row.title.toLowerCase().trim()}:${clientId}`;
    if (existingKeys.has(dedupeKey)) {
      skippedCount++;
      continue;
    }
    // Adiciona ao conjunto para evitar duplicatas dentro do mesmo batch
    existingKeys.add(dedupeKey);

    // Montar payload — NAO incluir code (trigger generate_job_code cuida disso)
    const jobPayload: Record<string, unknown> = {
      tenant_id: auth.tenantId,
      client_id: clientId,
      title: row.title,
      // Status padrao se nao informado
      status: row.status ?? 'briefing_recebido',
      created_by: auth.userId,
    };

    // Campos opcionais — incluir apenas se fornecidos
    if (row.project_type != null) jobPayload.project_type = row.project_type;
    if (row.priority_level != null) jobPayload.priority = row.priority_level;
    if (row.closed_value != null) jobPayload.closed_value = row.closed_value;
    if (row.production_cost != null) jobPayload.production_cost = row.production_cost;
    if (row.tax_percentage != null) jobPayload.tax_percentage = row.tax_percentage;
    if (row.briefing_date != null) jobPayload.briefing_date = row.briefing_date;
    if (row.expected_delivery_date != null) jobPayload.expected_delivery_date = row.expected_delivery_date;
    if (row.notes != null) jobPayload.notes = row.notes;
    if (row.tags != null) jobPayload.tags = row.tags;

    toInsert.push(jobPayload);
  }

  // 6. Inserir em batch
  let insertedCount = 0;

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('jobs')
      .insert(toInsert);

    if (insertError) {
      console.error('[data-import/jobs] Erro no batch insert:', insertError);
      // Erros de FK (23503) ou ENUM invalido (22P02) dao mensagem mais especifica
      if (insertError.code === '23503') {
        throw new AppError('VALIDATION_ERROR', 'Referencia invalida: client_id nao encontrado', 400);
      }
      if (insertError.code === '22P02') {
        throw new AppError('VALIDATION_ERROR', 'Valor de ENUM invalido em uma das linhas', 400);
      }
      throw new AppError('INTERNAL_ERROR', 'Erro ao inserir jobs no banco', 500);
    }

    insertedCount = toInsert.length;
  }

  // 7. Registrar log da importacao
  const { error: logError } = await supabase
    .from('import_logs')
    .insert({
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      entity_type: 'jobs',
      file_name: file_name ?? null,
      total_rows: rows.length,
      inserted_rows: insertedCount,
      skipped_rows: skippedCount,
      error_rows: rowErrors.length,
      errors: rowErrors,
      idempotency_key: idempotency_key ?? null,
    });

  if (logError) {
    console.warn('[data-import/jobs] Erro ao salvar import_log:', logError);
  }

  console.log(
    `[data-import/jobs] tenant=${auth.tenantId} inserted=${insertedCount} skipped=${skippedCount} errors=${rowErrors.length}`,
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
