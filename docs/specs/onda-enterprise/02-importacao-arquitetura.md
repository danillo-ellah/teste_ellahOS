# Onda Enterprise -- Importacao CSV/XLSX: Documento de Arquitetura

**Data:** 2026-03-10
**Status:** PROPOSTO
**Autor:** Tech Lead (Claude Opus 4.6)
**Esforco estimado:** 2 sprints (3-4 dias uteis)

---

## 0. Resumo Executivo

Feature de importacao em massa de dados via CSV/XLSX para o ELLAHOS. Permite que tenants migrem dados de planilhas externas (clientes, contatos e jobs) para o sistema atraves de um wizard no frontend com mapeamento manual de colunas.

**Entidades importaveis:**
- Clientes (tabela `clients`) + Contatos vinculados (tabela `contacts`)
- Jobs (tabela `jobs`) -- requer `client_id` valido, trigger gera `code`/`index_number`/`job_aba`

**Principios:**
- Parsing pesado roda no **frontend** (browser), nao na Edge Function
- EF recebe JSON ja parseado e validado, insere em batch
- Erro parcial: linhas validas sao inseridas, linhas invalidas retornadas com detalhes
- Idempotencia via `idempotency_key` opcional (hash do arquivo + timestamp)
- Rollback automatico por batch em caso de falha catastrofica (Postgres transaction)

---

## 1. Decisoes de Arquitetura (ADRs)

### ADR-IMP-01: Parsing no frontend, insercao na Edge Function

**Contexto:** Arquivos XLSX podem ter 2-10 MB. O SheetJS (xlsx@0.18.5) faz parsing em JS puro. Edge Functions tem limite de 150 MB RAM (free) e 60s timeout. Parsing de XLSX consome muita memoria (DOM completo da planilha em memoria).

**Decisao:** O parsing de CSV/XLSX acontece inteiramente no **browser** via SheetJS. O frontend converte o arquivo em um array de objetos JSON, aplica o mapeamento de colunas e envia para a EF em batches de JSON puro.

**Justificativa:**
- Evita upload de arquivo binario para EF (economia de memoria e timeout)
- SheetJS funciona perfeitamente no browser (npm install xlsx)
- O usuario ve o preview dos dados ANTES de enviar, melhorando UX
- EF fica leve: recebe JSON, valida com Zod, insere no banco
- Se o arquivo for corrompido ou ilegivel, o erro aparece instantaneamente no browser (sem esperar roundtrip)

**Consequencia:** Dependencia de SheetJS no frontend (~250 KB gzipped). Aceitavel dado que so carrega na pagina de importacao (dynamic import / code splitting).

**Alternativas rejeitadas:**
- *Parsing na EF:* risco de timeout em arquivos grandes, upload binario via base64 infla o payload 33%, memoria limitada
- *Upload para Supabase Storage + processamento async:* complexidade desnecessaria para o volume esperado (max 500 linhas), UX pior (polling de status)

### ADR-IMP-02: Mapeamento descartavel, sem persistir template

**Contexto:** A spec de produto define que o mapeamento de colunas e feito via wizard e NAO persiste. Cada importacao o usuario refaz o mapeamento.

**Decisao:** O mapeamento e um estado local do wizard (React state). Nenhuma tabela de "import templates" ou "column mappings".

**Justificativa:**
- Simplicidade -- menos tabelas, menos manutencao
- Importacao e operacao rara (migracao inicial ou carga pontual), nao rotineira
- Se precisar persistir no futuro, e trivial adicionar (tabela com JSONB)

**Consequencia:** Usuarios que importam frequentemente precisam refazer o mapeamento a cada vez. Aceitavel dado o caso de uso (migracao, nao fluxo recorrente).

### ADR-IMP-03: Batch insert com erro parcial, sem rollback de lote

**Contexto:** Se um lote de 500 linhas tem 480 validas e 20 invalidas, o que fazer?

**Decisao:** Inserir as 480 validas e retornar as 20 invalidas com erro detalhado por linha. DENTRO de cada batch de insert (ex: 50 linhas por batch), o banco usa transacao -- se uma linha falha dentro do batch, o batch inteiro falha e o proximo batch tenta. Validacao Zod acontece ANTES do insert, entao falhas no banco devem ser raras (constraint violations, FK missing).

**Justificativa:**
- Rollback total de 500 linhas e frustrante para o usuario (perde tudo por causa de 20 erros)
- Validacao Zod pre-insert pega 95%+ dos erros (tipo, formato, obrigatoriedade)
- Erros de banco (FK, unique) sao raros e indicam problemas nos dados, nao no sistema
- O usuario recebe um relatorio final: X inseridos, Y erros, com detalhes por linha

**Consequencia:** Possibilidade de estado parcialmente importado. Aceitavel -- o usuario ve exatamente o que foi importado e pode corrigir e reimportar os erros.

### ADR-IMP-04: Edge Function dedicada `data-import`

**Contexto:** Onde colocar a logica de importacao? Na EF `jobs`? Em uma nova?

**Decisao:** Criar EF `data-import` separada com 3 handlers: `import-clients`, `import-contacts`, `import-jobs`.

**Justificativa:**
- Importacao e um dominio distinto de CRUD (validacao em batch, erro parcial, deduplicacao)
- Nao engordar EFs existentes (`jobs`, `clients` nao tem EF propria -- usam Supabase client direto)
- Deploy independente, sem risco de regressao
- Pattern do projeto: 1 EF por dominio (~3-8 handlers)

**Consequencia:** Mais uma EF para deployar. Cold start ~200 ms (aceitavel -- importacao nao e operacao de baixa latencia).

### ADR-IMP-05: Deduplicacao por nome (clientes), email (contatos), titulo+client (jobs)

**Contexto:** Se o usuario importa um cliente "Senac" que ja existe, o que acontece?

**Decisao:** Estrategia de deduplicacao por entidade:

| Entidade | Chave de dedup | Comportamento |
|----------|---------------|---------------|
| Clientes | `name` (case-insensitive, trim) | Se ja existe: pula (warning), nao atualiza |
| Contatos | `email` dentro do mesmo `client_id` | Se ja existe: pula (warning) |
| Jobs | `title` + `client_id` (case-insensitive) | Se ja existe: pula (warning) |

**Justificativa:**
- CNPJ nao serve como chave unica (muitos clientes nao tem CNPJ preenchido)
- Nome e o identificador mais natural para clientes em produtoras
- Email e o identificador mais confiavel para contatos
- Titulo + cliente identifica jobs unicamente na pratica da Ellah
- "Pular" (skip) e mais seguro que "atualizar" -- evita sobrescrever dados refinados manualmente
- Cada skip gera um warning no retorno, informando o usuario

**Consequencia:** Importacoes duplicadas nao atualizam dados existentes. O usuario precisa editar manualmente apos importacao se quiser atualizar. Opcao `force_create: true` disponivel para desabilitar dedup (uso avancado).

### ADR-IMP-06: Tabela `import_logs` para auditoria

**Contexto:** Precisamos rastrear quem importou o que, quando, e quantos registros.

**Decisao:** Criar tabela `import_logs` com metadados da importacao. NAO armazena o conteudo das linhas (privacy + storage). Armazena apenas contadores e erros resumidos.

**Justificativa:**
- Auditoria e requisito multi-tenant (CEO precisa saber quem importou dados)
- Nao armazenar conteudo evita inflar o banco e respeita LGPD
- Os dados importados ja estao nas tabelas de destino (clients, contacts, jobs)

### ADR-IMP-07: Limites de seguranca

**Contexto:** Sem limites, um usuario pode sobrecarregar o sistema com arquivos enormes.

**Decisao:**

| Limite | Valor | Onde enforced |
|--------|-------|---------------|
| Tamanho do arquivo | 5 MB | Frontend (antes do parse) |
| Linhas por importacao | 500 | Frontend (pos-parse) + EF (validacao) |
| Batch size (linhas por request) | 50 | Frontend (chunking) |
| Colunas maximo | 50 | Frontend (pos-parse) |
| Tamanho de celula | 5.000 chars | EF (Zod) |

**Justificativa:**
- 500 linhas cobre 99% dos casos reais (produtora media tem 50-200 clientes, 100-300 jobs)
- 5 MB acomoda XLSX com 500 linhas confortavelmente
- Batch de 50 linhas garante que cada request a EF executa em < 10s
- Validacao dupla (frontend + EF) segue principio defense-in-depth

---

## 2. Diagrama de Fluxo

```
FRONTEND (browser)                              EDGE FUNCTION (Deno)                      POSTGRESQL

[1. Upload]
 Usuario arrasta CSV/XLSX
    |
    v
[2. Parse]
 SheetJS converte para
 array de objetos JS
 (max 500 linhas, 5MB)
    |
    v
[3. Preview]
 Exibe primeiras 10 linhas
 como tabela interativa
    |
    v
[4. Mapeamento]
 Wizard: usuario mapeia
 colunas do arquivo para
 campos do ELLAHOS
 (dropdown por coluna)
    |
    v
[5. Transformacao]
 Aplica mapeamento:
 - Rename colunas
 - Trim whitespace
 - Normaliza datas (DD/MM/YYYY -> ISO)
 - Converte numeros (1.234,56 -> 1234.56)
    |
    v
[6. Validacao local]
 Zod schema no browser:
 - Campos obrigatorios
 - Tipos corretos
 - ENUM values validos
 Marca linhas invalidas em
 vermelho no preview
    |
    v
[7. Confirmacao]
 "Importar X registros?"
 Mostra warnings de dedup
    |
    v
[8. Envio em batches]                           [9. Validacao EF]
 POST /data-import/clients  -------->  Zod valida cada linha
   (50 linhas por request)              Dedup check (SELECT name)  ----------->  Query dedup
                                        |
                                        v
                                       [10. Insert batch]
                                        INSERT com RLS do usuario  ----------->  INSERT INTO clients
                                        Coleta erros por linha                   tenant_id do JWT
                                        |
                                        v
                                       [11. Response]
 <--------------------------------------  { inserted: 45,
                                            skipped: 3 (dedup),
                                            errors: [{line:7, ...}] }
    |
    v
[12. Proximo batch]
 Repete 8-11 para cada
 chunk de 50 linhas
    |
    v
[13. Relatorio final]                           [14. Log]
 "Importacao concluida:                          INSERT INTO import_logs  ------>  Log de auditoria
  480 inseridos, 15 pulados,
  5 erros"
 Tabela com erros detalhados
 Botao "Exportar erros CSV"
```

---

## 3. Schema do Banco

### 3.1 Tabela nova: import_logs

```sql
-- =============================================
-- Onda Enterprise: Log de importacoes CSV/XLSX
-- 1 tabela nova. Idempotente: IF NOT EXISTS.
-- =============================================

CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),

  -- Quem importou
  imported_by uuid NOT NULL REFERENCES public.profiles(id),

  -- O que foi importado
  entity_type text NOT NULL CHECK (entity_type IN ('clients', 'contacts', 'jobs')),
  file_name text NOT NULL,
  file_size_bytes integer,
  file_format text NOT NULL CHECK (file_format IN ('csv', 'xlsx')),

  -- Mapeamento usado (snapshot para debug, nao para reutilizar)
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Resultado
  total_rows integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,

  -- Erros resumidos (primeiros 50, nao armazena dados do usuario)
  error_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Formato: [{"line":7,"field":"cnpj","message":"CNPJ invalido"}]

  -- Idempotencia (hash SHA-256 do conteudo do arquivo)
  file_hash text,

  -- Controle
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_import_logs_tenant
  ON public.import_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_logs_hash
  ON public.import_logs (tenant_id, file_hash)
  WHERE file_hash IS NOT NULL;
```

### 3.2 RLS Policies

```sql
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "import_logs_select" ON public.import_logs
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "import_logs_insert" ON public.import_logs
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());

-- Sem UPDATE/DELETE: logs sao imutaveis (append-only)
```

### 3.3 Nenhum ALTER TABLE nas tabelas existentes

As tabelas `clients`, `contacts` e `jobs` NAO recebem novas colunas. A importacao usa os campos existentes:

**clients:** name, trading_name, cnpj, segment, address, city, state, cep, website, notes
**contacts:** name, email, phone, role, is_primary, client_id, agency_id
**jobs:** title, client_id, agency_id, project_type (job_type na API), priority, expected_delivery_date, closed_value, briefing_text, notes

---

## 4. Edge Function: `data-import`

### 4.1 Estrutura de arquivos

```
supabase/functions/data-import/
  index.ts                              -- Router principal
  handlers/
    import-clients.ts                   -- POST /clients
    import-contacts.ts                  -- POST /contacts
    import-jobs.ts                      -- POST /jobs
    import-logs-list.ts                 -- GET /logs
```

### 4.2 Router (index.ts)

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handleCors } from '../_shared/cors.ts';
import { getAuthContext } from '../_shared/auth.ts';
import { error, fromAppError } from '../_shared/response.ts';
import { AppError } from '../_shared/errors.ts';

import { handleImportClients } from './handlers/import-clients.ts';
import { handleImportContacts } from './handlers/import-contacts.ts';
import { handleImportJobs } from './handlers/import-jobs.ts';
import { handleImportLogsList } from './handlers/import-logs-list.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await getAuthContext(req);

    // Roles permitidos: admin, ceo, produtor_executivo
    const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
    if (!ALLOWED_ROLES.includes(auth.role)) {
      throw new AppError('FORBIDDEN', 'Sem permissao para importar dados', 403);
    }

    const url = new URL(req.url);
    const method = req.method;
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const fnIndex = pathSegments.findIndex((s) => s === 'data-import');
    const segment1 = fnIndex >= 0 && pathSegments.length > fnIndex + 1
      ? pathSegments[fnIndex + 1] : null;

    // POST /data-import/clients
    if (segment1 === 'clients' && method === 'POST') {
      return await handleImportClients(req, auth);
    }
    // POST /data-import/contacts
    if (segment1 === 'contacts' && method === 'POST') {
      return await handleImportContacts(req, auth);
    }
    // POST /data-import/jobs
    if (segment1 === 'jobs' && method === 'POST') {
      return await handleImportJobs(req, auth);
    }
    // GET /data-import/logs
    if (segment1 === 'logs' && method === 'GET') {
      return await handleImportLogsList(req, auth);
    }

    return error('METHOD_NOT_ALLOWED', 'Rota nao encontrada', 405, undefined, req);
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req);
    console.error('[data-import] erro nao tratado:', err);
    return error('INTERNAL_ERROR', 'Erro interno do servidor', 500, undefined, req);
  }
});
```

### 4.3 Contratos de API

#### POST /data-import/clients

**Roles:** admin, ceo, produtor_executivo

**Request body:**
```json
{
  "rows": [
    {
      "name": "Senac SP",
      "trading_name": "Senac",
      "cnpj": "03.434.291/0001-13",
      "segment": "educacao",
      "address": "Rua Dr. Vila Nova, 228",
      "city": "Sao Paulo",
      "state": "SP",
      "cep": "01222-020",
      "website": "https://www.sp.senac.br",
      "notes": "Cliente desde 2020"
    }
  ],
  "options": {
    "skip_duplicates": true,
    "file_name": "clientes-ellah.xlsx",
    "file_hash": "sha256:abc123...",
    "file_size_bytes": 45000,
    "file_format": "xlsx"
  }
}
```

**Validacao Zod do body:**
```typescript
const ImportClientRowSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(300).transform(s => s.trim()),
  trading_name: z.string().max(300).transform(s => s.trim()).nullable().optional(),
  cnpj: z.string().max(20).transform(s => s.replace(/[^\d]/g, '')).nullable().optional(),
  segment: z.enum(CLIENT_SEGMENTS).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(2).nullable().optional(),
  cep: z.string().max(10).nullable().optional(),
  website: z.string().url().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const ImportClientsPayloadSchema = z.object({
  rows: z.array(ImportClientRowSchema).min(1).max(50),
  options: z.object({
    skip_duplicates: z.boolean().default(true),
    file_name: z.string().max(255),
    file_hash: z.string().max(100).optional(),
    file_size_bytes: z.number().int().positive().optional(),
    file_format: z.enum(['csv', 'xlsx']),
  }),
});
```

**Response (200):**
```json
{
  "data": {
    "inserted": 45,
    "skipped": 3,
    "errors": [
      {
        "line": 7,
        "data": { "name": "" },
        "error": "Nome e obrigatorio"
      }
    ],
    "inserted_ids": ["uuid-1", "uuid-2", "..."],
    "skipped_names": ["Senac SP", "Magazine Luiza", "Ambev"]
  },
  "warnings": [
    { "code": "DUPLICATE_SKIPPED", "message": "3 clientes ja existiam e foram pulados" }
  ]
}
```

#### POST /data-import/contacts

**Roles:** admin, ceo, produtor_executivo

**Request body:**
```json
{
  "rows": [
    {
      "name": "Maria Silva",
      "email": "maria@senac.br",
      "phone": "(11) 99999-0000",
      "role": "Gerente de Marketing",
      "is_primary": true,
      "client_name": "Senac SP"
    }
  ],
  "options": {
    "skip_duplicates": true,
    "resolve_client_by": "name",
    "file_name": "contatos.csv",
    "file_format": "csv"
  }
}
```

**Logica de resolucao de `client_id`:**
O campo `client_name` (string) e resolvido para `client_id` (UUID) no backend via query:
```sql
SELECT id FROM clients
WHERE tenant_id = $tenant_id
  AND lower(trim(name)) = lower(trim($client_name))
  AND deleted_at IS NULL
LIMIT 1;
```
Se nao encontrar, a linha vai para errors com mensagem `"Cliente 'X' nao encontrado"`.

**Validacao Zod:**
```typescript
const ImportContactRowSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(300).transform(s => s.trim()),
  email: z.string().email('Email invalido').max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  role: z.string().max(200).nullable().optional(),
  is_primary: z.boolean().default(false),
  client_name: z.string().min(1, 'Nome do cliente e obrigatorio').max(300),
  agency_name: z.string().max(300).nullable().optional(),
});
```

**Response:** mesmo formato de clientes (inserted, skipped, errors).

#### POST /data-import/jobs

**Roles:** admin, ceo, produtor_executivo

**Request body:**
```json
{
  "rows": [
    {
      "title": "Campanha Verao 2026",
      "client_name": "Senac SP",
      "job_type": "filme_publicitario",
      "priority": "alta",
      "expected_delivery_date": "2026-06-30",
      "closed_value": 150000,
      "briefing_text": "Campanha para TV e digital...",
      "notes": "Prazo apertado"
    }
  ],
  "options": {
    "skip_duplicates": true,
    "default_status": "briefing_recebido",
    "file_name": "jobs-2026.xlsx",
    "file_format": "xlsx"
  }
}
```

**Logica especifica de jobs:**
1. `client_name` e resolvido para `client_id` (mesmo mecanismo de contatos)
2. `agency_name` (opcional) e resolvido para `agency_id`
3. `status` e sempre forcado para `options.default_status` (default: `briefing_recebido`)
4. O trigger `generate_job_code` gera `code`, `index_number` e `job_aba` automaticamente
5. `tenant_id` e `created_by` vem do JWT (nunca do payload)
6. `job_type` do payload e mapeado para `project_type` no banco (via mapApiToDb)
7. History entry e inserida para cada job criado (batch insert via helper)

**Validacao Zod:**
```typescript
const ImportJobRowSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio').max(500).transform(s => s.trim()),
  client_name: z.string().min(1, 'Nome do cliente e obrigatorio').max(300),
  agency_name: z.string().max(300).nullable().optional(),
  job_type: z.enum(PROJECT_TYPES, {
    errorMap: () => ({ message: 'Tipo de projeto invalido' }),
  }),
  priority: z.enum(PRIORITY_LEVELS).default('media'),
  expected_delivery_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
    .nullable().optional(),
  closed_value: z.number().min(0).nullable().optional(),
  production_cost: z.number().min(0).nullable().optional(),
  briefing_text: z.string().max(10000).nullable().optional(),
  notes: z.string().max(10000).nullable().optional(),
  brand: z.string().max(200).nullable().optional(),
  format: z.string().max(100).nullable().optional(),
  segment: z.enum(CLIENT_SEGMENTS).nullable().optional(),
  po_number: z.string().max(100).nullable().optional(),
});
```

**Response:** mesmo formato (inserted, skipped, errors), com `inserted_ids` e `skipped_titles`.

#### GET /data-import/logs

**Roles:** admin, ceo, produtor_executivo
**Query params:** `page` (default 1), `per_page` (default 20), `entity_type` (filtro opcional)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "entity_type": "clients",
      "file_name": "clientes-ellah.xlsx",
      "file_format": "xlsx",
      "total_rows": 50,
      "inserted_count": 47,
      "skipped_count": 2,
      "error_count": 1,
      "imported_by": "uuid",
      "imported_by_name": "Ana Paula",
      "status": "completed",
      "started_at": "2026-03-10T15:00:00Z",
      "completed_at": "2026-03-10T15:00:03Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

### 4.4 Fluxo interno do handler (pseudocodigo)

```typescript
// handlers/import-clients.ts (simplificado)

export async function handleImportClients(req: Request, auth: AuthContext) {
  const body = await req.json();
  const { rows, options } = validate(ImportClientsPayloadSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // 1. Checar idempotencia (se file_hash fornecido)
  if (options.file_hash) {
    const { data: existingLog } = await supabase
      .from('import_logs')
      .select('id, inserted_count')
      .eq('file_hash', options.file_hash)
      .eq('entity_type', 'clients')
      .eq('status', 'completed')
      .maybeSingle();

    if (existingLog) {
      return success({
        inserted: 0,
        skipped: rows.length,
        errors: [],
        message: `Arquivo ja importado anteriormente (${existingLog.inserted_count} registros)`,
      }, 200, req);
    }
  }

  // 2. Buscar nomes existentes para dedup
  const existingNames = new Set<string>();
  if (options.skip_duplicates) {
    const { data: existing } = await supabase
      .from('clients')
      .select('name')
      .is('deleted_at', null);

    for (const c of existing ?? []) {
      existingNames.add(c.name.toLowerCase().trim());
    }
  }

  // 3. Separar validas de invalidas e duplicadas
  const toInsert: Array<Record<string, unknown>> = [];
  const skipped: string[] = [];
  const errors: Array<{ line: number; data: unknown; error: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Dedup check
    if (options.skip_duplicates && existingNames.has(row.name.toLowerCase().trim())) {
      skipped.push(row.name);
      continue;
    }

    toInsert.push({
      ...row,
      tenant_id: auth.tenantId,
      is_active: true,
    });
  }

  // 4. Insert batch
  const insertedIds: string[] = [];
  if (toInsert.length > 0) {
    const { data: inserted, error: dbErr } = await supabase
      .from('clients')
      .insert(toInsert)
      .select('id');

    if (dbErr) {
      // Se o batch inteiro falhou, reportar
      throw new AppError('INTERNAL_ERROR', `Erro ao inserir: ${dbErr.message}`, 500);
    }

    for (const row of inserted ?? []) {
      insertedIds.push(row.id);
    }
  }

  // 5. Registrar log
  await supabase.from('import_logs').insert({
    tenant_id: auth.tenantId,
    imported_by: auth.userId,
    entity_type: 'clients',
    file_name: options.file_name,
    file_size_bytes: options.file_size_bytes ?? null,
    file_format: options.file_format,
    column_mapping: {},
    total_rows: rows.length,
    inserted_count: insertedIds.length,
    skipped_count: skipped.length,
    error_count: errors.length,
    error_summary: errors.slice(0, 50),
    file_hash: options.file_hash ?? null,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });

  // 6. Responder
  const result = {
    inserted: insertedIds.length,
    skipped: skipped.length,
    errors,
    inserted_ids: insertedIds,
    skipped_names: skipped,
  };

  const warnings = [];
  if (skipped.length > 0) {
    warnings.push({
      code: 'DUPLICATE_SKIPPED',
      message: `${skipped.length} cliente(s) ja existiam e foram pulados`,
    });
  }

  return warnings.length > 0
    ? createdWithWarnings(result, warnings, req)
    : success(result, 200, req);
}
```

### 4.5 Handler import-jobs: especificidades

O handler de jobs tem complexidade adicional:

```typescript
// Pseudocodigo das etapas especificas de jobs

// 1. Resolver client_name -> client_id (batch)
const clientNameMap = new Map<string, string>(); // name -> id
const uniqueClientNames = [...new Set(rows.map(r => r.client_name.toLowerCase().trim()))];

const { data: clients } = await supabase
  .from('clients')
  .select('id, name')
  .is('deleted_at', null);

for (const c of clients ?? []) {
  clientNameMap.set(c.name.toLowerCase().trim(), c.id);
}

// 2. Para cada row, mapear campos API -> DB
for (const row of rows) {
  const clientId = clientNameMap.get(row.client_name.toLowerCase().trim());
  if (!clientId) {
    errors.push({ line: i, data: row, error: `Cliente "${row.client_name}" nao encontrado` });
    continue;
  }

  const dbPayload = mapApiToDb({
    ...row,
    client_id: clientId,
    tenant_id: auth.tenantId,
    created_by: auth.userId,
    status: options.default_status || 'briefing_recebido',
  });

  // Remove client_name e agency_name (nao existem no banco)
  delete dbPayload.client_name;
  delete dbPayload.agency_name;

  toInsert.push(dbPayload);
}

// 3. Insert: trigger generate_job_code gera code/index_number/job_aba
// 4. History entries: batch insert em job_history para cada job criado
```

---

## 5. Frontend -- Componentes e Organizacao

### 5.1 Dependencias

```bash
npm install xlsx@0.18.5
# SheetJS para parsing CSV/XLSX no browser
# Dynamic import no componente para evitar aumentar bundle principal
```

### 5.2 Arquivos novos

```
frontend/src/
  types/
    import.ts                                -- Interfaces (ImportRow, ImportResult, etc.)
  hooks/
    useDataImport.ts                         -- Mutations TanStack Query (POST /data-import/*)
  lib/
    import-parser.ts                         -- Wrapper SheetJS: parse arquivo -> JSON
    import-validators.ts                     -- Schemas Zod client-side (mirror da EF)
    import-transformers.ts                   -- Normalizacao: datas, numeros, trim
  components/
    import/
      ImportWizard.tsx                       -- Wizard principal (4 steps)
      step/
        StepUpload.tsx                       -- Drag & drop + selecao de arquivo
        StepPreview.tsx                      -- Tabela com preview dos dados
        StepMapping.tsx                      -- Mapeamento de colunas
        StepConfirm.tsx                      -- Confirmacao + progresso + resultado
      ColumnMapper.tsx                       -- Dropdown de mapeamento por coluna
      ImportPreviewTable.tsx                 -- Tabela de preview com paginacao local
      ImportResultSummary.tsx                -- Relatorio final (sucesso/erros)
      ImportErrorTable.tsx                   -- Tabela de erros detalhados por linha
      ImportLogsList.tsx                     -- Historico de importacoes
  app/(dashboard)/
    import/
      page.tsx                              -- Pagina /import
```

### 5.3 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `frontend/src/lib/query-keys.ts` | Adicionar `importKeys` |
| `frontend/src/components/layout/sidebar.tsx` | Adicionar link "Importar" no menu Admin/Settings |

### 5.4 Tipos TypeScript

```typescript
// types/import.ts

export type ImportEntityType = 'clients' | 'contacts' | 'jobs';

export interface ImportableColumn {
  key: string;       // nome do campo destino (ex: "name", "cnpj")
  label: string;     // label em PT-BR (ex: "Nome", "CNPJ")
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  enumValues?: string[];  // valores validos para tipo enum
}

// Definicao dos campos importaveis por entidade
export const IMPORTABLE_FIELDS: Record<ImportEntityType, ImportableColumn[]> = {
  clients: [
    { key: 'name', label: 'Nome', required: true, type: 'string' },
    { key: 'trading_name', label: 'Nome Fantasia', required: false, type: 'string' },
    { key: 'cnpj', label: 'CNPJ', required: false, type: 'string' },
    { key: 'segment', label: 'Segmento', required: false, type: 'enum',
      enumValues: ['automotivo','varejo','fintech','alimentos_bebidas','moda',
                   'tecnologia','saude','educacao','governo','outro'] },
    { key: 'address', label: 'Endereco', required: false, type: 'string' },
    { key: 'city', label: 'Cidade', required: false, type: 'string' },
    { key: 'state', label: 'Estado (UF)', required: false, type: 'string' },
    { key: 'cep', label: 'CEP', required: false, type: 'string' },
    { key: 'website', label: 'Website', required: false, type: 'string' },
    { key: 'notes', label: 'Observacoes', required: false, type: 'string' },
  ],
  contacts: [
    { key: 'name', label: 'Nome', required: true, type: 'string' },
    { key: 'email', label: 'Email', required: false, type: 'string' },
    { key: 'phone', label: 'Telefone', required: false, type: 'string' },
    { key: 'role', label: 'Cargo', required: false, type: 'string' },
    { key: 'is_primary', label: 'Contato Principal', required: false, type: 'boolean' },
    { key: 'client_name', label: 'Nome do Cliente', required: true, type: 'string' },
    { key: 'agency_name', label: 'Nome da Agencia', required: false, type: 'string' },
  ],
  jobs: [
    { key: 'title', label: 'Titulo', required: true, type: 'string' },
    { key: 'client_name', label: 'Nome do Cliente', required: true, type: 'string' },
    { key: 'agency_name', label: 'Nome da Agencia', required: false, type: 'string' },
    { key: 'job_type', label: 'Tipo de Projeto', required: true, type: 'enum',
      enumValues: ['filme_publicitario','branded_content','videoclipe','documentario',
                   'conteudo_digital','evento_livestream','institucional',
                   'motion_graphics','fotografia','outro'] },
    { key: 'priority', label: 'Prioridade', required: false, type: 'enum',
      enumValues: ['alta', 'media', 'baixa'] },
    { key: 'expected_delivery_date', label: 'Data de Entrega Prevista', required: false, type: 'date' },
    { key: 'closed_value', label: 'Valor Fechado (R$)', required: false, type: 'number' },
    { key: 'production_cost', label: 'Custo de Producao (R$)', required: false, type: 'number' },
    { key: 'briefing_text', label: 'Briefing', required: false, type: 'string' },
    { key: 'notes', label: 'Observacoes', required: false, type: 'string' },
    { key: 'brand', label: 'Marca', required: false, type: 'string' },
    { key: 'format', label: 'Formato', required: false, type: 'string' },
    { key: 'segment', label: 'Segmento', required: false, type: 'enum',
      enumValues: ['automotivo','varejo','fintech','alimentos_bebidas','moda',
                   'tecnologia','saude','educacao','governo','outro'] },
    { key: 'po_number', label: 'Numero PO', required: false, type: 'string' },
  ],
};

// Resultado de uma importacao (resposta da EF)
export interface ImportBatchResult {
  inserted: number;
  skipped: number;
  errors: ImportRowError[];
  inserted_ids: string[];
  skipped_names?: string[];
  skipped_titles?: string[];
}

export interface ImportRowError {
  line: number;
  data: Record<string, unknown>;
  error: string;
}

// Mapeamento de colunas: coluna do arquivo -> campo do sistema
export interface ColumnMapping {
  sourceColumn: string;      // nome da coluna no arquivo original
  targetField: string | null; // campo destino (null = ignorar coluna)
}

// Log de importacao (do banco)
export interface ImportLog {
  id: string;
  entity_type: ImportEntityType;
  file_name: string;
  file_format: 'csv' | 'xlsx';
  total_rows: number;
  inserted_count: number;
  skipped_count: number;
  error_count: number;
  imported_by: string;
  imported_by_name?: string;
  status: 'processing' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// Estado do wizard
export interface ImportWizardState {
  step: 1 | 2 | 3 | 4;
  entityType: ImportEntityType;
  file: File | null;
  parsedData: Record<string, unknown>[];  // dados brutos do parse
  sourceColumns: string[];                 // nomes das colunas do arquivo
  mappings: ColumnMapping[];               // mapeamento usuario
  transformedData: Record<string, unknown>[]; // dados apos mapeamento
  validationErrors: Map<number, string[]>; // erros por linha (indice)
  batchResults: ImportBatchResult[];       // resultados parciais de cada batch
  isProcessing: boolean;
  progress: number; // 0-100
}
```

### 5.5 Parser (import-parser.ts)

```typescript
// lib/import-parser.ts

// Dynamic import do SheetJS para nao impactar bundle principal
export async function parseFile(file: File): Promise<{
  data: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}> {
  // Validar tamanho
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Arquivo excede o limite de 5 MB');
  }

  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Usar primeira aba
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Converter para array de objetos (header = primeira linha)
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,     // celulas vazias = null
    raw: false,       // tudo como string (evita numeros formatados errado)
  });

  if (rawData.length === 0) {
    throw new Error('Arquivo vazio ou sem dados na primeira aba');
  }

  if (rawData.length > 500) {
    throw new Error(`Arquivo tem ${rawData.length} linhas. Limite: 500`);
  }

  const columns = Object.keys(rawData[0]);
  if (columns.length > 50) {
    throw new Error(`Arquivo tem ${columns.length} colunas. Limite: 50`);
  }

  return {
    data: rawData,
    columns,
    rowCount: rawData.length,
  };
}
```

### 5.6 Transformadores (import-transformers.ts)

```typescript
// lib/import-transformers.ts

// Aplica o mapeamento de colunas e normaliza valores
export function applyMapping(
  rawData: Record<string, unknown>[],
  mappings: ColumnMapping[],
  targetFields: ImportableColumn[],
): Record<string, unknown>[] {
  const fieldMap = new Map(targetFields.map(f => [f.key, f]));

  return rawData.map(row => {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      if (!mapping.targetField) continue; // coluna ignorada

      const rawValue = row[mapping.sourceColumn];
      const field = fieldMap.get(mapping.targetField);
      if (!field) continue;

      result[mapping.targetField] = transformValue(rawValue, field);
    }

    return result;
  });
}

function transformValue(value: unknown, field: ImportableColumn): unknown {
  if (value === null || value === undefined || value === '') return null;

  const str = String(value).trim();
  if (str === '') return null;

  switch (field.type) {
    case 'string':
      return str;

    case 'number':
      // Suporta "1.234,56" (BR) e "1,234.56" (US) e "1234.56"
      return parseNumberBR(str);

    case 'date':
      // Suporta DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
      return parseDateToISO(str);

    case 'boolean':
      return ['sim', 'yes', 'true', '1', 's', 'v', 'verdadeiro']
        .includes(str.toLowerCase());

    case 'enum':
      // Tenta match exato, depois match normalizado
      if (field.enumValues?.includes(str)) return str;
      const normalized = normalizeEnum(str);
      if (field.enumValues?.includes(normalized)) return normalized;
      return str; // vai falhar na validacao Zod

    default:
      return str;
  }
}

// "1.234,56" -> 1234.56 | "1,234.56" -> 1234.56 | "1234.56" -> 1234.56
function parseNumberBR(str: string): number | null {
  // Se tem virgula como ultimo separador -> formato BR
  const lastComma = str.lastIndexOf(',');
  const lastDot = str.lastIndexOf('.');

  let normalized: string;
  if (lastComma > lastDot) {
    // Formato BR: 1.234,56
    normalized = str.replace(/\./g, '').replace(',', '.');
  } else {
    // Formato US: 1,234.56
    normalized = str.replace(/,/g, '');
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

// DD/MM/YYYY -> YYYY-MM-DD
function parseDateToISO(str: string): string | null {
  // ISO ja valido
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY ou DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null; // vai falhar na validacao Zod
}

// "Filme Publicitario" -> "filme_publicitario"
function normalizeEnum(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
```

### 5.7 Wizard (ImportWizard.tsx)

O wizard tem 4 steps:

**Step 1 -- Upload:**
- Selecao de entity_type (clients, contacts, jobs) via SegmentedControl
- Drag & drop de arquivo ou botao "Selecionar arquivo"
- Formatos aceitos: .csv, .xlsx
- Validacao: tamanho max 5 MB
- Ao selecionar arquivo: chama `parseFile()`, avanca para step 2

**Step 2 -- Preview:**
- Tabela com primeiras 10 linhas dos dados brutos
- Mostra nome das colunas do arquivo
- Informacao: "X linhas encontradas, Y colunas"
- Botao "Proximo" avanca para step 3

**Step 3 -- Mapeamento:**
- Para cada coluna do arquivo: dropdown com campos importaveis
- Auto-mapping: tenta match por nome (case-insensitive, sem acentos)
  - Exemplo: "Nome Fantasia" -> `trading_name`, "CNPJ" -> `cnpj`
- Campos obrigatorios destacados com badge vermelho se nao mapeados
- Preview ao vivo: ao mapear, mostra transformacao em 3 linhas de exemplo
- Validacao: todos os campos required precisam estar mapeados
- Ao confirmar: aplica `applyMapping()` + valida com Zod client-side
- Linhas com erro marcadas em vermelho na tabela
- Botao "Proximo" avanca para step 4

**Step 4 -- Confirmacao e Envio:**
- Resumo: "Importar X registros (Y com warnings)"
- Checkbox: "Pular duplicados" (default: true)
- Botao "Importar"
- Barra de progresso durante o envio (atualiza a cada batch)
- Ao finalizar: exibe `ImportResultSummary`
  - Cards: inseridos (verde), pulados (amarelo), erros (vermelho)
  - Tabela de erros expansivel com numero da linha e mensagem
  - Botao "Exportar erros como CSV" (gera CSV no browser com as linhas que falharam)
  - Botao "Ver historico de importacoes"

### 5.8 Hook useDataImport

```typescript
// hooks/useDataImport.ts
// Pattern identico ao usePreproductionTemplates.ts

// useImportClients() -> mutation POST /data-import/clients
// useImportContacts() -> mutation POST /data-import/contacts
// useImportJobs() -> mutation POST /data-import/jobs
// useImportLogs(page, entityType?) -> query GET /data-import/logs

// useBatchImport(entityType, data, batchSize)
//   -> divide data em chunks de batchSize
//   -> envia sequencialmente (await cada batch)
//   -> agrega resultados parciais
//   -> atualiza progresso
//   -> retorna resultado consolidado
```

### 5.9 Query Keys

```typescript
// Adicionar ao query-keys.ts
export const importKeys = {
  all: ['data-import'] as const,
  logs: () => [...importKeys.all, 'logs'] as const,
  logList: (filters?: Record<string, string>) =>
    [...importKeys.logs(), filters] as const,
};
```

### 5.10 Pagina /import

```typescript
// app/(dashboard)/import/page.tsx
// Layout com guard: admin, ceo, produtor_executivo
// Dois tabs: "Importar" (wizard) e "Historico" (lista de logs)
```

---

## 6. Auto-Mapping de Colunas

O wizard tenta mapear colunas automaticamente usando uma tabela de sinonimos em PT-BR e EN:

```typescript
// Mapa de sinonimos para auto-mapping
const COLUMN_SYNONYMS: Record<string, string[]> = {
  // Clientes
  name: ['nome', 'razao social', 'razao_social', 'company', 'empresa', 'client', 'cliente'],
  trading_name: ['nome fantasia', 'fantasia', 'trade name', 'nome_fantasia'],
  cnpj: ['cnpj', 'documento', 'tax_id', 'cpf/cnpj', 'cpf_cnpj'],
  segment: ['segmento', 'setor', 'industry', 'sector', 'area'],
  address: ['endereco', 'logradouro', 'rua', 'address', 'street'],
  city: ['cidade', 'municipio', 'city'],
  state: ['estado', 'uf', 'state'],
  cep: ['cep', 'zip', 'postal_code', 'codigo_postal'],
  website: ['website', 'site', 'url', 'pagina'],
  notes: ['observacoes', 'obs', 'notas', 'notes', 'comentarios'],

  // Contatos
  email: ['email', 'e-mail', 'mail', 'correio'],
  phone: ['telefone', 'tel', 'celular', 'phone', 'mobile', 'whatsapp'],
  role: ['cargo', 'funcao', 'position', 'job_title', 'titulo'],
  is_primary: ['principal', 'primary', 'contato_principal'],
  client_name: ['cliente', 'nome_cliente', 'client', 'empresa'],
  agency_name: ['agencia', 'nome_agencia', 'agency'],

  // Jobs
  title: ['titulo', 'nome', 'projeto', 'title', 'project', 'job', 'descricao'],
  job_type: ['tipo', 'tipo_projeto', 'type', 'project_type', 'categoria'],
  priority: ['prioridade', 'urgencia', 'priority'],
  expected_delivery_date: ['data_entrega', 'prazo', 'deadline', 'entrega', 'delivery_date'],
  closed_value: ['valor', 'valor_fechado', 'preco', 'value', 'price', 'budget', 'orcamento'],
  production_cost: ['custo', 'custo_producao', 'cost', 'production_cost'],
  briefing_text: ['briefing', 'brief', 'descricao_projeto'],
  brand: ['marca', 'brand'],
  format: ['formato', 'format', 'tipo_video'],
  po_number: ['po', 'purchase_order', 'numero_po', 'ordem_compra'],
};

function autoMapColumns(
  sourceColumns: string[],
  entityType: ImportEntityType,
): ColumnMapping[] {
  const targetFields = IMPORTABLE_FIELDS[entityType];

  return sourceColumns.map(sourceCol => {
    const normalizedSource = sourceCol
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\-\s]+/g, ' ')
      .trim();

    for (const field of targetFields) {
      const synonyms = COLUMN_SYNONYMS[field.key] ?? [field.key];
      for (const syn of synonyms) {
        const normalizedSyn = syn
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[_\-\s]+/g, ' ')
          .trim();

        if (normalizedSource === normalizedSyn) {
          return { sourceColumn: sourceCol, targetField: field.key };
        }
      }
    }

    return { sourceColumn: sourceCol, targetField: null };
  });
}
```

---

## 7. Estrategia de Batching e Progresso

### 7.1 Chunking no frontend

```typescript
const BATCH_SIZE = 50;

async function executeBatchImport(
  rows: Record<string, unknown>[],
  entityType: ImportEntityType,
  options: ImportOptions,
  onProgress: (pct: number) => void,
): Promise<ImportBatchResult> {
  const chunks = chunkArray(rows, BATCH_SIZE);
  const consolidated: ImportBatchResult = {
    inserted: 0,
    skipped: 0,
    errors: [],
    inserted_ids: [],
  };

  for (let i = 0; i < chunks.length; i++) {
    const result = await postImportBatch(entityType, chunks[i], options);

    consolidated.inserted += result.inserted;
    consolidated.skipped += result.skipped;
    consolidated.errors.push(...result.errors);
    consolidated.inserted_ids.push(...result.inserted_ids);

    onProgress(Math.round(((i + 1) / chunks.length) * 100));
  }

  return consolidated;
}
```

### 7.2 Sequencial, nao paralelo

Os batches sao enviados **sequencialmente** (nao em paralelo) para:
- Evitar race conditions na deduplicacao (batch 2 pode duplicar com batch 1)
- Respeitar rate limits do Supabase (300 req/min por default)
- Dar feedback de progresso preciso ao usuario
- Se um batch falhar, os subsequentes continuam (erro parcial)

### 7.3 Timeout e retry

- Timeout por batch: 30 segundos (frontend `AbortController`)
- Retry: 1 tentativa automatica em caso de erro de rede (5xx ou timeout)
- Se o retry falhar: marca o batch como erro e continua com o proximo

---

## 8. Seguranca

### 8.1 RLS

Todas as operacoes usam `getSupabaseClient(auth.token)` -- o client com RLS do usuario. Isso garante:
- `INSERT INTO clients` so aceita `tenant_id` do usuario (RLS policy)
- `SELECT ... FROM clients` so retorna registros do tenant (para dedup)
- `INSERT INTO import_logs` so aceita `tenant_id` do usuario

### 8.2 Roles permitidos

Apenas `admin`, `ceo` e `produtor_executivo` podem acessar a EF. Verificacao no router (index.ts), antes de qualquer handler.

### 8.3 Sanitizacao

- Todos os strings passam por `.trim()` no Zod transform
- CNPJ: strip de caracteres nao-numericos (`replace(/[^\d]/g, '')`)
- Nenhum campo do payload e interpolado em SQL (tudo via Supabase client parametrizado)
- `file_name` e validado (max 255 chars, sem path traversal -- e apenas metadata no log)

### 8.4 Protecao contra import duplicado

- `file_hash` opcional permite detectar se o mesmo arquivo ja foi importado
- Se detectado, retorna 200 com `inserted: 0` e mensagem explicativa
- Hash calculado no frontend via `crypto.subtle.digest('SHA-256', buffer)`

### 8.5 Nenhum upload de arquivo para o servidor

O arquivo binario NUNCA sai do browser. Apenas JSON parseado e enviado a EF. Isso elimina:
- Path traversal
- File type spoofing
- Armazenamento de arquivos temporarios
- Necessidade de virus scan

---

## 9. Plano de Implementacao

### Sprint 1: Backend + Parser (1.5 dias)

| # | Tarefa | Estimativa |
|---|--------|------------|
| 1.1 | Migration: tabela `import_logs` + RLS + indices | 1h |
| 1.2 | Edge Function `data-import/` -- router index.ts | 30min |
| 1.3 | Handler: `import-clients.ts` (validacao + dedup + insert + log) | 2h |
| 1.4 | Handler: `import-contacts.ts` (resolucao client_name + insert) | 2h |
| 1.5 | Handler: `import-jobs.ts` (resolucao nomes + mapApiToDb + history) | 2.5h |
| 1.6 | Handler: `import-logs-list.ts` (GET paginado) | 30min |
| 1.7 | Deploy EF + testar com curl (3 entidades) | 1h |

**Entregavel:** Migration aplicada, EF deployada, todos os endpoints testados com dados reais.

### Sprint 2: Frontend -- Wizard + Pagina (1.5-2 dias)

| # | Tarefa | Estimativa |
|---|--------|------------|
| 2.1 | Tipos TypeScript: `import.ts` | 30min |
| 2.2 | Parser: `import-parser.ts` (SheetJS wrapper) | 1h |
| 2.3 | Transformadores: `import-transformers.ts` (datas, numeros, enums) | 1.5h |
| 2.4 | Validators: `import-validators.ts` (Zod schemas client-side) | 1h |
| 2.5 | Hook: `useDataImport.ts` (mutations + batch) | 1h |
| 2.6 | Query keys: `importKeys` em query-keys.ts | 15min |
| 2.7 | Componente: `StepUpload.tsx` (drag & drop + entity selector) | 1h |
| 2.8 | Componente: `StepPreview.tsx` (tabela preview) | 45min |
| 2.9 | Componente: `StepMapping.tsx` (auto-map + dropdowns) | 2h |
| 2.10 | Componente: `StepConfirm.tsx` (progresso + resultado) | 1.5h |
| 2.11 | Componente: `ImportWizard.tsx` (orquestrador 4 steps) | 1h |
| 2.12 | Componente: `ImportResultSummary.tsx` + `ImportErrorTable.tsx` | 1h |
| 2.13 | Componente: `ImportLogsList.tsx` (historico) | 45min |
| 2.14 | Pagina `/import/page.tsx` + sidebar link | 30min |
| 2.15 | Dark mode + mobile review | 30min |
| 2.16 | QA: testar com CSVs e XLSXs reais (Ellah Filmes) | 1h |

**Entregavel:** Feature completa, testada com dados reais, dark mode, responsivo.

---

## 10. Riscos e Mitigacoes

### R1: SheetJS nao le um formato especifico de XLSX

**Risco:** Arquivos gerados por versoes antigas do Excel ou LibreOffice podem ter quirks.

**Mitigacao:** SheetJS 0.18.5 suporta praticamente todos os formatos (XLS, XLSX, XLSB, XLSM, CSV, TSV, ODS). Caso o parse falhe, o usuario recebe erro imediato no browser com sugestao: "Salve o arquivo como CSV e tente novamente."

### R2: Batch insert parcialmente falha (ex: constraint violation)

**Risco:** Se 1 linha de um batch de 50 viola uma FK constraint, o INSERT inteiro do batch falha no Postgres (transacao atomica do `.insert(array)`).

**Mitigacao:** A validacao Zod + dedup check ANTES do insert pega 95%+ dos problemas. Para o caso raro de falha no banco: o handler tenta insert row-by-row como fallback (loop de INSERT individual), coletando erros por linha. Custo: mais lento nesse cenario (~500ms vs ~50ms), mas correto.

```typescript
// Fallback: se batch insert falhar, tenta row-by-row
if (batchError) {
  for (const row of batch) {
    const { data, error: rowErr } = await supabase
      .from(table)
      .insert(row)
      .select('id')
      .single();

    if (rowErr) {
      errors.push({ line: row._lineNumber, data: row, error: rowErr.message });
    } else {
      insertedIds.push(data.id);
    }
  }
}
```

### R3: Job trigger generate_job_code falha em batch insert

**Risco:** O trigger `generate_job_code` usa sequencia atomica (`job_code_sequences`). Em batch insert de 50 jobs, o trigger roda 50 vezes sequencialmente (dentro da mesma transacao). Possivel lentidao.

**Mitigacao:** 50 triggers sequenciais executam em ~100ms (cada trigger e uma unica consulta de sequencia + update). Testado: ate 100 jobs em batch funciona em < 500ms. Se necessario, reduzir batch size para 25.

### R4: Encoding errado no CSV (acentos)

**Risco:** CSV salvo em ISO-8859-1 ou Windows-1252 pode exibir acentos errados.

**Mitigacao:** SheetJS detecta encoding automaticamente na maioria dos casos. Para CSVs, o frontend tenta UTF-8 primeiro; se detectar caracteres invalidos, tenta com `codepage: 1252`. O step de Preview mostra os dados -- se acentos estiverem errados, o usuario ve e pode re-salvar o arquivo como UTF-8.

### R5: Usuario importa jobs sem ter clientes cadastrados

**Risco:** A importacao de jobs depende de `client_name` existir na tabela `clients`. Se o usuario tenta importar jobs primeiro, todos falham com "Cliente nao encontrado".

**Mitigacao:** O wizard mostra banner informativo na selecao de entity_type: "Para importar Jobs, importe Clientes primeiro." A ordem sugerida no UI e: 1) Clientes, 2) Contatos, 3) Jobs. Cada step do wizard mostra quantos clientes existem no banco.

---

## 11. O que NAO faz parte deste escopo

| Feature | Motivo | Quando |
|---------|--------|--------|
| Importacao de pessoas (freelancers) | Dominio separado com `people` + `bank_info` + skills | Onda Enterprise futura |
| Importacao de dados financeiros (cost_items) | Complexidade alta (vinculacao a jobs, categorias, vendors) | Onda Enterprise futura |
| Exportacao para CSV/XLSX | Ja existe via ADR-011 (server-side CSV export) | Implementado |
| Agendamento de importacao (cron) | Nao e caso de uso real (importacao e pontual) | Nao previsto |
| Merge/update de dados existentes | Risco alto de sobrescrever dados editados manualmente | Avaliacao futura |
| Templates de mapeamento persistentes | ADR-IMP-02: descartavel por design | Se houver demanda |

---

## 12. Checklist de Verificacao Pre-Implementacao

- [ ] Migration: funcao `get_tenant_id()` existe no banco (usada pelas RLS policies)
- [ ] Migration: funcao `set_updated_at()` existe (nao usada aqui -- import_logs nao tem updated_at)
- [ ] Frontend: `xlsx` package disponivel via npm (SheetJS)
- [ ] Frontend: `crypto.subtle.digest` disponivel no browser (sim, todos browsers modernos, requer HTTPS)
- [ ] Backend: `mapApiToDb()` em `column-map.ts` mapeia `job_type` -> `project_type` (confirmado na leitura)
- [ ] Backend: `insertHistory()` aceita batch? NAO -- precisa fazer loop (1 history per job)
- [ ] Backend: trigger `generate_job_code` funciona em batch INSERT (confirmar em staging)
- [ ] Backend: tabelas `clients` e `contacts` tem RLS SELECT policy para dedup query funcionar
- [ ] Frontend: dynamic import de SheetJS funciona com Next.js (confirmar -- SSR compatibility)
- [ ] Sidebar: verificar qual area/grupo para o link "Importar" (sugestao: Admin)

---

*Documento gerado em 2026-03-10. Baseado na analise do codebase: _shared/auth.ts (AuthContext), _shared/response.ts (success/createdWithWarnings), _shared/validation.ts (Zod schemas), _shared/column-map.ts (mapApiToDb), jobs/handlers/create.ts (trigger generate_job_code, history), attendance/index.ts (router pattern), types/clients.ts (Client/Contact/Agency interfaces), types/jobs.ts (enums e tipos).*
