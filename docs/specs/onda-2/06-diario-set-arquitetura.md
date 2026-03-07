# Onda 2.3 -- Diario de Set + Boletim de Producao: Arquitetura de Implementacao

**Data:** 2026-03-07
**Status:** RASCUNHO - aguardando validacao
**Autor:** Tech Lead (Claude Opus 4.6)
**Spec de referencia:** 05-diario-set-spec.md
**Esforco estimado:** 2 sprints (2-3 dias uteis)

---

## 0. Estado Atual -- O que ja existe

### Backend existente

| Artefato | Estado | Observacao |
|----------|--------|------------|
| Tabela `production_diary_entries` | EXISTE (migration 20260303030000) | 13 colunas, UNIQUE (job_id, shooting_date, tenant_id), RLS ativo |
| Tabela `production_diary_photos` | EXISTE (migration 20260303030000) | FK diary_entry_id, CHECK photo_type em ingles |
| EF `production-diary` | EXISTE com 6 handlers | create, update, delete, get, list, photos |
| RLS policies | 7 policies | 3 em entries, 4 em photos |
| Indices | 7 indices | 4 em entries, 3 em photos |

### Frontend existente

| Arquivo | O que faz | Reutilizavel? |
|---------|-----------|---------------|
| `TabProductionDiary.tsx` (~878 linhas) | CRUD completo de diario com formulario, listagem de cards, dialog de fotos, confirmacao de delete | SIM -- extender formulario e cards |
| `TabDiarias.tsx` (~227 linhas) | Listagem de shooting_dates com CRUD via ShootingDateDialog | SIM -- adicionar indicadores de diario |
| `useJobShootingDates.ts` | Hook TanStack Query para CRUD de shooting_dates | SIM -- reutilizar para popular Select de datas |
| `query-keys.ts` | `jobKeys.shootingDates(jobId)` ja definida | SIM -- adicionar `productionDiaryKeys` |

### Gap pre-existente critico: desalinhamento de nomes

A migration original criou colunas com nomes diferentes dos usados pela EF e frontend. A EF **ja usa os nomes corretos** (weather_condition, planned_scenes, etc.) e faz INSERT/UPDATE com esses nomes -- que NAO existem no banco. Isso significa que **a feature esta quebrada em producao**: os inserts passam null nas colunas reais (weather, scenes_planned, etc.) e ignoram os dados enviados pela EF.

| Coluna no banco (migration) | Nome na EF/frontend | Status |
|----|----|----|
| `weather` | `weather_condition` | EF envia `weather_condition`, banco tem `weather` -- dado perdido |
| `scenes_planned` | `planned_scenes` | Idem |
| `scenes_completed` | `filmed_scenes` | Idem |
| `takes_count` | `total_takes` | Idem |
| `notes` | `observations` | Idem |
| `problems` | `issues` | Idem |
| `diary_entry_id` (photos) | `entry_id` | Idem |
| `file_url` (photos) | `url` | Idem |

A migration desta onda faz RENAME COLUMN para corrigir. Apos a migration, a EF e o frontend passam a funcionar corretamente sem alteracao.

### Colunas de horario: TIME vs TEXT

A migration original criou `call_time` e `wrap_time` como `TIME`. A EF envia strings `HH:MM`. O Supabase aceita a conversao implicita `TEXT -> TIME`, entao funciona. Porem, os novos campos de horario (`filming_start_time`, `lunch_time`) serao `TEXT` para consistencia com o padrao de `shooting_day_orders`. Os campos existentes `call_time` e `wrap_time` nao serao alterados (manter TIME) para evitar quebra desnecessaria; a conversao implicita continuara funcionando.

---

## 1. Decisoes de Arquitetura (ADRs)

### ADR-DS-01: RENAME COLUMN antes de ADD COLUMN

**Contexto:** O banco tem nomes de colunas diferentes dos usados pela EF. Precisamos alinhar antes de adicionar colunas novas.

**Decisao:** Executar RENAME COLUMN em bloco DO $$ com verificacao idempotente via `pg_attribute`. So renomeia se o nome antigo ainda existe.

**Justificativa:**
- RENAME COLUMN preserva dados e indice (operacao DDL leve, sem reescrita de tabela)
- A verificacao via `pg_attribute` garante idempotencia (rodar 2x nao quebra)
- Deploy seguro: a EF atual ja usa os nomes novos, entao apos o RENAME tudo alinha automaticamente

**Consequencia:** Nenhum rollback automatico. Se precisar reverter, criar migration de RENAME inverso. Risco baixo: nao ha dados reais em producao (feature nunca funcionou corretamente).

### ADR-DS-02: Novos campos JSONB para dados estruturados (scenes_list, attendance_list, equipment_list)

**Contexto:** Cenas filmadas, presenca da equipe e equipamentos sao listas dinamicas com campos heterogeneos.

**Decisao:** Usar JSONB com `DEFAULT '[]'::jsonb` para scenes_list, attendance_list e equipment_list. Nao criar tabelas separadas.

**Justificativa:**
- Volume baixo por registro: tipicamente 5-20 cenas, 10-20 membros, 5-15 equipamentos
- Dados fortemente acoplados ao diario (nao existem fora dele)
- Nao ha queries cross-diary ("todas as cenas de todos os diarios do tenant") como requisito
- JSONB em Postgres suporta indexacao GIN se necessario no futuro
- Pattern consolidado no projeto: `custom_fields` (jobs), `items` (preproduction_checklist_templates)
- Performance: 1 INSERT/UPDATE em vez de N para sub-registros

**Consequencia:** Queries de busca global por cena ou equipamento nao sao possiveis. Se surgir esse requisito, migrar para tabelas. Custo de migracao: baixo (extrair arrays, inserir em tabelas).

### ADR-DS-03: Nao criar tabela de boletim separada

**Contexto:** O boletim de producao (status do dia, resumo, proximos passos) poderia ser uma tabela separada vinculada ao diary_entry.

**Decisao:** Adicionar campos do boletim diretamente na tabela `production_diary_entries` como colunas nullable.

**Justificativa:**
- Relacao 1:1 estrita (um diario tem exatamente um boletim ou nenhum)
- Evita JOIN desnecessario em toda query de listagem
- Boletim e parte do relato do dia, nao uma entidade independente
- Campos opcionais (nullable) permitem criar diario sem boletim (RN-04)
- Simplicidade: 1 INSERT/UPDATE para salvar tudo

### ADR-DS-04: Novos campos de horario como TEXT, nao TIME

**Contexto:** Os campos `call_time` e `wrap_time` existentes sao `TIME`. A spec pede `filming_start_time` e `lunch_time`.

**Decisao:** Criar `filming_start_time` e `lunch_time` como `TEXT`. Manter `call_time` e `wrap_time` como `TIME` (nao alterar).

**Justificativa:**
- Pattern do projeto: `shooting_day_orders` usa TEXT para horarios (evita timezone)
- A EF ja envia strings `HH:MM`; Supabase faz conversao implicita para TIME
- Alterar colunas existentes de TIME para TEXT quebraria a constraint `chk_diary_wrap_after_call` (que compara TIME)
- Manter ambos os formatos nao causa problema: a EF e o frontend sempre trabalham com strings

**Consequencia:** Inconsistencia de tipo entre campos de horario na mesma tabela. Aceitavel: nao ha queries que comparem `call_time` com `filming_start_time`.

### ADR-DS-05: Validacao de shooting_date_id na EF, nao via trigger

**Contexto:** O campo `shooting_date_id` referencia `job_shooting_dates`. Precisamos garantir que o shooting_date pertence ao mesmo job.

**Decisao:** Validacao na EF (query antes do insert). Nao criar trigger no banco.

**Justificativa:**
- A FK garante referencial, mas nao garante que o shooting_date pertence ao mesmo job
- Trigger cross-table (verificar job_id do shooting_date) adiciona complexidade
- A EF ja faz validacoes similares (job pertence ao tenant, data nao duplicada)
- Pattern consolidado: validacao de negocio na EF, constraints de integridade no banco

### ADR-DS-06: Roles ampliados com diretor_producao e cco

**Contexto:** ALLOWED_ROLES atual nao inclui `diretor_producao` e `cco`, impedindo o principal usuario da feature.

**Decisao:** Adicionar `diretor_producao` e `cco` ao ALLOWED_ROLES de create, update e photos. Manter delete restrito a `ceo` e `produtor_executivo` (spec secao 3).

**Justificativa:**
- O papel `diretor_producao` ja existe no enum (migration 20260306200000)
- O DP e o principal autor de diarios (spec Persona P1)
- O CCO acompanha criativamente e precisa registrar observacoes
- Delete restrito a ceo/pe segue a tabela de permissoes da spec

**Consequencia:** Mais roles com acesso de escrita. Risco baixo: RLS garante isolamento por tenant.

### ADR-DS-07: Edicao de diarios de outros usuarios controlada na EF

**Contexto:** RN-06: "editar diario de outro usuario requer ceo ou produtor_executivo".

**Decisao:** O handler update.ts compara `created_by` do registro com `auth.userId`. Se diferentes, verifica se `auth.role` e `ceo` ou `produtor_executivo`. Se nao, retorna 403.

**Justificativa:**
- Nao e possivel implementar essa regra apenas com RLS (RLS nao sabe quem criou o registro para fins de role check)
- A EF ja carrega o registro existente antes de atualizar (para checar conflito de data)
- Adicionar uma verificacao de `created_by` e trivial no mesmo fluxo

---

## 2. Migration SQL

### 2.1 Arquivo: `supabase/migrations/20260307200000_extend_production_diary_v2.sql`

```sql
-- =============================================================================
-- Migration: Onda 2.3 -- Diario de Set + Boletim de Producao
-- Extensao de production_diary_entries e production_diary_photos
-- Idempotente: todas operacoes verificam estado antes de executar
-- =============================================================================

SET search_path TO public;

-- -------------------------------------------------------
-- 1. RENAME COLUMNS em production_diary_entries
-- Alinha nomes do banco com os usados pela EF e frontend.
-- Idempotente: verifica via pg_attribute antes de renomear.
-- -------------------------------------------------------

DO $$
BEGIN
  -- weather -> weather_condition
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'weather' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'weather_condition' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN weather TO weather_condition;
  END IF;

  -- scenes_planned -> planned_scenes
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'scenes_planned' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'planned_scenes' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN scenes_planned TO planned_scenes;
  END IF;

  -- scenes_completed -> filmed_scenes
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'scenes_completed' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'filmed_scenes' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN scenes_completed TO filmed_scenes;
  END IF;

  -- takes_count -> total_takes
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'takes_count' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'total_takes' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN takes_count TO total_takes;
  END IF;

  -- notes -> observations
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'notes' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'observations' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN notes TO observations;
  END IF;

  -- problems -> issues
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'problems' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'issues' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries RENAME COLUMN problems TO issues;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 2. RENAME COLUMNS em production_diary_photos
-- -------------------------------------------------------

DO $$
BEGIN
  -- diary_entry_id -> entry_id
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'diary_entry_id' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'entry_id' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos RENAME COLUMN diary_entry_id TO entry_id;
  END IF;

  -- file_url -> url
  IF EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'file_url' AND NOT attisdropped
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'url' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos RENAME COLUMN file_url TO url;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 3. ADD COLUMNS em production_diary_entries (novos campos)
-- Todos idempotentes via IF NOT EXISTS
-- -------------------------------------------------------

DO $$
BEGIN
  -- shooting_date_id: vinculo com job_shooting_dates
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'shooting_date_id' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN shooting_date_id uuid REFERENCES job_shooting_dates(id) ON DELETE SET NULL;
  END IF;

  -- location: locacao do dia
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'location' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN location text;
  END IF;

  -- filming_start_time: inicio das filmagens (TEXT HH:MM)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'filming_start_time' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN filming_start_time text;
  END IF;

  -- lunch_time: horario do almoco (TEXT HH:MM)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'lunch_time' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN lunch_time text;
  END IF;

  -- scenes_list: lista estruturada de cenas (JSONB array)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'scenes_list' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN scenes_list jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- day_status: status do dia (boletim)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'day_status' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN day_status text;
  END IF;

  -- executive_summary: resumo executivo (boletim)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'executive_summary' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN executive_summary text;
  END IF;

  -- attendance_list: lista de presenca (JSONB array)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'attendance_list' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN attendance_list jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- equipment_list: lista de equipamentos (JSONB array)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'equipment_list' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN equipment_list jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  -- next_steps: proximos passos (boletim)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'next_steps' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN next_steps text;
  END IF;

  -- director_signature: nome do DP (campo texto, nao assinatura digital)
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'director_signature' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries ADD COLUMN director_signature text;
  END IF;

  -- updated_by: ultimo usuario que editou
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_entries'::regclass
      AND attname = 'updated_by' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_entries
      ADD COLUMN updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 4. ADD COLUMNS em production_diary_photos (novos campos)
-- -------------------------------------------------------

DO $$
BEGIN
  -- thumbnail_url
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'thumbnail_url' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos ADD COLUMN thumbnail_url text;
  END IF;

  -- taken_at
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'taken_at' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos ADD COLUMN taken_at timestamptz;
  END IF;

  -- uploaded_by
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'production_diary_photos'::regclass
      AND attname = 'uploaded_by' AND NOT attisdropped
  ) THEN
    ALTER TABLE production_diary_photos
      ADD COLUMN uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- -------------------------------------------------------
-- 5. CHECK CONSTRAINTS
-- -------------------------------------------------------

-- 5a. weather_condition CHECK (apos rename)
-- Dropar se existir com valores antigos, recriar com novos incluindo 'indoor'
DO $$
BEGIN
  -- Tentar dropar constraint antiga (pode nao existir)
  BEGIN
    ALTER TABLE production_diary_entries DROP CONSTRAINT IF EXISTS chk_diary_weather_condition;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Criar constraint com os 5 valores
  ALTER TABLE production_diary_entries
    ADD CONSTRAINT chk_diary_weather_condition
    CHECK (weather_condition IS NULL OR weather_condition IN (
      'sol', 'nublado', 'chuva', 'noturna', 'indoor'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 5b. day_status CHECK
DO $$
BEGIN
  ALTER TABLE production_diary_entries
    ADD CONSTRAINT chk_diary_day_status
    CHECK (day_status IS NULL OR day_status IN (
      'no_cronograma', 'adiantado', 'atrasado'
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 5c. executive_summary max length
DO $$
BEGIN
  ALTER TABLE production_diary_entries
    ADD CONSTRAINT chk_diary_executive_summary_length
    CHECK (executive_summary IS NULL OR length(executive_summary) <= 2000);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 5d. filming_start_time format HH:MM
DO $$
BEGIN
  ALTER TABLE production_diary_entries
    ADD CONSTRAINT chk_diary_filming_start_time_format
    CHECK (filming_start_time IS NULL OR filming_start_time ~ '^\d{2}:\d{2}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 5e. lunch_time format HH:MM
DO $$
BEGIN
  ALTER TABLE production_diary_entries
    ADD CONSTRAINT chk_diary_lunch_time_format
    CHECK (lunch_time IS NULL OR lunch_time ~ '^\d{2}:\d{2}$');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- -------------------------------------------------------
-- 6. photo_type CHECK: ingles -> portugues
-- -------------------------------------------------------

DO $$
BEGIN
  -- Dropar constraint antiga (valores em ingles)
  ALTER TABLE production_diary_photos DROP CONSTRAINT IF EXISTS chk_diary_photo_type;

  -- Migrar dados existentes de ingles para portugues
  UPDATE production_diary_photos SET photo_type = 'referencia' WHERE photo_type = 'reference';
  UPDATE production_diary_photos SET photo_type = 'continuidade' WHERE photo_type = 'continuity';
  UPDATE production_diary_photos SET photo_type = 'problema' WHERE photo_type = 'problem';
  -- 'bts' permanece igual em ambos os idiomas

  -- Recriar com valores em portugues
  ALTER TABLE production_diary_photos
    ADD CONSTRAINT chk_diary_photo_type
    CHECK (photo_type IN ('referencia', 'bts', 'continuidade', 'problema'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- -------------------------------------------------------
-- 7. Indice para busca de diarios por shooting_date_id
-- -------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_production_diary_entries_shooting_date_id
  ON production_diary_entries(shooting_date_id)
  WHERE shooting_date_id IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 8. Atualizar indice de fotos para usar o nome renomeado (entry_id)
-- Os indices existentes continuam validos apos RENAME COLUMN
-- (Postgres atualiza automaticamente), entao nao precisa recriar.
-- -------------------------------------------------------

-- =============================================================================
-- FIM da migration -- Onda 2.3 Diario de Set + Boletim de Producao
-- RENAME: 8 colunas (6 em entries, 2 em photos)
-- ADD: 15 colunas (12 em entries, 3 em photos)
-- CHECK: 6 constraints (5 novas em entries, 1 recriada em photos)
-- INDEX: 1 novo
-- =============================================================================
```

**Nota sobre idempotencia:** A migration pode rodar multiplas vezes sem erro. Cada operacao verifica se ja foi executada antes de alterar. O RENAME verifica ambas as pontas (coluna antiga existe E coluna nova nao existe).

**Nota sobre indices existentes:** O PostgreSQL atualiza automaticamente os indices quando uma coluna e renomeada. Os 7 indices da migration original continuam funcionais apos os RENAMEs.

---

## 3. Edge Function: Mudancas por Handler

Nao ha nova EF. Todos os handlers existentes em `supabase/functions/production-diary/` serao atualizados.

### 3.1 Resumo de mudancas

| Handler | Mudanca | Complexidade |
|---------|---------|-------------|
| `index.ts` | Nenhuma -- router ja suporta todas as rotas necessarias | Nenhuma |
| `create.ts` | Schema Zod expandido, ALLOWED_ROLES ampliado, validacao shooting_date_id, updated_by | Media |
| `update.ts` | Schema Zod expandido, ALLOWED_ROLES ampliado, validacao created_by (RN-06), updated_by | Media |
| `delete.ts` | ALLOWED_ROLES restrito (apenas ceo, pe, admin), validacao created_by | Baixa |
| `get.ts` | Nenhuma -- `SELECT *` ja retorna todos os campos novos | Nenhuma |
| `list.ts` | Nenhuma -- `SELECT *` ja retorna todos os campos novos. O join de photos ja usa `entry_id` (nome na EF, que antes falhava) | Nenhuma |
| `photos.ts` | ALLOWED_ROLES ampliado | Baixa |

### 3.2 create.ts -- Mudancas detalhadas

**ALLOWED_ROLES atualizado:**
```typescript
const ALLOWED_ROLES = [
  'admin', 'ceo', 'produtor_executivo', 'coordenador_producao',
  'diretor_producao', 'cco',
];
```

**Schema Zod expandido:**
```typescript
const HH_MM = z.string().regex(/^\d{2}:\d{2}$/, 'Horario deve ser HH:MM');

const SceneItemSchema = z.object({
  scene_number: z.string().min(1).max(50),
  description: z.string().max(500).nullable().optional(),
  takes: z.number().int().min(0).default(0),
  ok_take: z.number().int().min(0).nullable().optional(),
  status: z.enum(['ok', 'incompleta', 'nao_gravada']).default('ok'),
});

const AttendanceItemSchema = z.object({
  person_id: z.string().uuid().nullable().optional(), // null para extras
  person_name: z.string().min(1).max(200),
  role: z.string().max(100),
  present: z.boolean().default(true),
  arrival_time: HH_MM.nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const EquipmentItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const CreateDiaryEntrySchema = z.object({
  job_id: z.string().uuid(),
  shooting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_number: z.number().int().min(1).optional(),

  // Campos existentes (mantidos)
  weather_condition: z.enum(['sol', 'nublado', 'chuva', 'noturna', 'indoor']).default('sol'),
  call_time: HH_MM.nullable().optional(),
  wrap_time: HH_MM.nullable().optional(),
  planned_scenes: z.string().max(2000).nullable().optional(),
  filmed_scenes: z.string().max(2000).nullable().optional(),
  total_takes: z.number().int().min(0).nullable().optional(),
  observations: z.string().max(5000).nullable().optional(),
  issues: z.string().max(5000).nullable().optional(),
  highlights: z.string().max(5000).nullable().optional(),

  // Campos novos
  shooting_date_id: z.string().uuid().nullable().optional(),
  location: z.string().max(500).nullable().optional(),
  filming_start_time: HH_MM.nullable().optional(),
  lunch_time: HH_MM.nullable().optional(),
  scenes_list: z.array(SceneItemSchema).default([]),
  day_status: z.enum(['no_cronograma', 'adiantado', 'atrasado']).nullable().optional(),
  executive_summary: z.string().max(2000).nullable().optional(),
  attendance_list: z.array(AttendanceItemSchema).default([]),
  equipment_list: z.array(EquipmentItemSchema).default([]),
  next_steps: z.string().max(5000).nullable().optional(),
  director_signature: z.string().max(200).nullable().optional(),
});
```

**Nova validacao: shooting_date_id (apos parse, antes do insert):**
```typescript
// Validar que shooting_date_id pertence ao mesmo job
if (data.shooting_date_id) {
  const { data: sd } = await client
    .from('job_shooting_dates')
    .select('id, job_id')
    .eq('id', data.shooting_date_id)
    .eq('job_id', data.job_id)
    .maybeSingle();

  if (!sd) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Data de filmagem (shooting_date_id) nao encontrada ou nao pertence a este job',
      400,
    );
  }
}
```

**Insert data expandido:**
```typescript
const insertData = {
  tenant_id: auth.tenantId,
  job_id: data.job_id,
  shooting_date: data.shooting_date,
  day_number: dayNumber,
  weather_condition: data.weather_condition,
  call_time: data.call_time ?? null,
  wrap_time: data.wrap_time ?? null,
  planned_scenes: data.planned_scenes ?? null,
  filmed_scenes: data.filmed_scenes ?? null,
  total_takes: data.total_takes ?? null,
  observations: data.observations ?? null,
  issues: data.issues ?? null,
  highlights: data.highlights ?? null,
  // Novos campos
  shooting_date_id: data.shooting_date_id ?? null,
  location: data.location ?? null,
  filming_start_time: data.filming_start_time ?? null,
  lunch_time: data.lunch_time ?? null,
  scenes_list: data.scenes_list,
  day_status: data.day_status ?? null,
  executive_summary: data.executive_summary ?? null,
  attendance_list: data.attendance_list,
  equipment_list: data.equipment_list,
  next_steps: data.next_steps ?? null,
  director_signature: data.director_signature ?? null,
  created_by: auth.userId,
  updated_by: auth.userId,
};
```

### 3.3 update.ts -- Mudancas detalhadas

**ALLOWED_ROLES:** Mesmo do create (add `diretor_producao`, `cco`).

**Schema Zod:** Partial do CreateDiaryEntrySchema (sem `job_id`), `.strict()`.

**Nova logica: validacao de autoria (RN-06):**
```typescript
// Buscar entry existente incluindo created_by
const { data: current } = await client
  .from('production_diary_entries')
  .select('id, job_id, shooting_date, created_by')
  .eq('id', id)
  .eq('tenant_id', auth.tenantId)
  .is('deleted_at', null)
  .single();

// Verificar permissao de edicao (RN-06)
const ELEVATED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
if (current.created_by !== auth.userId && !ELEVATED_ROLES.includes(auth.role)) {
  throw new AppError(
    'FORBIDDEN',
    'Apenas CEO e Produtor Executivo podem editar diarios de outros usuarios',
    403,
  );
}
```

**Adicionar updated_by ao update:**
```typescript
const { data: updated } = await client
  .from('production_diary_entries')
  .update({ ...updates, updated_by: auth.userId })
  .eq('id', id)
  .eq('tenant_id', auth.tenantId)
  .select('*')
  .single();
```

### 3.4 delete.ts -- Mudancas detalhadas

**ALLOWED_ROLES restrito:**
```typescript
// Spec: apenas ceo, pe e admin podem excluir
const ALLOWED_ROLES = ['admin', 'ceo', 'produtor_executivo'];
```

Nota: remover `coordenador_producao` do delete (atualmente tem acesso, spec diz que nao deve ter).

### 3.5 photos.ts -- Mudancas detalhadas

**ALLOWED_ROLES atualizado:**
```typescript
const ALLOWED_ROLES = [
  'admin', 'ceo', 'produtor_executivo', 'coordenador_producao',
  'diretor_producao', 'cco',
];
```

Nenhuma outra mudanca -- o schema Zod e o insert data do photos.ts ja usam os nomes corretos (`entry_id`, `url`, `photo_type` em portugues).

### 3.6 get.ts e list.ts -- Sem mudancas

Ambos usam `SELECT *` que automaticamente retorna os novos campos. O join de photos em list.ts ja referencia `url` e `thumbnail_url` (nomes corretos apos o RENAME). Os novos campos JSONB (`scenes_list`, `attendance_list`, `equipment_list`) retornam como arrays JSON no response.

### 3.7 Novo endpoint: GET /production-diary/by-shooting-dates?job_id=X

**Proposito:** Retornar mapa `{ shooting_date_id: diary_entry_id }` para a TabDiarias exibir indicadores sem N+1.

**Opcao adotada:** NAO criar handler novo. Em vez disso, o frontend reutiliza o GET /production-diary?job_id=X (list.ts) que ja retorna todos os entries com `shooting_date_id`. O frontend faz o mapeamento localmente. Justificativa: a query ja roda uma vez (TabProductionDiary); o dado pode ser compartilhado via queryKey.

---

## 4. Frontend -- Componentes e Organizacao

### 4.1 Tipos TypeScript novos

**Arquivo:** `frontend/src/types/production-diary.ts` (novo)

```typescript
// --- Enums ---

export type WeatherCondition = 'sol' | 'nublado' | 'chuva' | 'noturna' | 'indoor'
export type PhotoType = 'referencia' | 'bts' | 'continuidade' | 'problema'
export type DayStatus = 'no_cronograma' | 'adiantado' | 'atrasado'
export type SceneStatus = 'ok' | 'incompleta' | 'nao_gravada'

// --- JSONB sub-schemas ---

export interface SceneItem {
  scene_number: string
  description: string | null
  takes: number
  ok_take: number | null
  status: SceneStatus
}

export interface AttendanceItem {
  person_id: string | null // null para participantes extras
  person_name: string
  role: string
  present: boolean
  arrival_time: string | null // HH:MM
  notes: string | null
}

export interface EquipmentItem {
  name: string
  quantity: number | null
  notes: string | null
}

// --- Entidade principal ---

export interface DiaryPhoto {
  id: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  photo_type: PhotoType
  taken_at: string | null
  created_at: string
}

export interface DiaryEntry {
  id: string
  job_id: string
  shooting_date: string
  day_number: number
  weather_condition: WeatherCondition
  call_time: string | null
  wrap_time: string | null
  planned_scenes: string | null
  filmed_scenes: string | null
  total_takes: number | null
  observations: string | null
  issues: string | null
  highlights: string | null
  // Novos campos Onda 2.3
  shooting_date_id: string | null
  location: string | null
  filming_start_time: string | null
  lunch_time: string | null
  scenes_list: SceneItem[]
  day_status: DayStatus | null
  executive_summary: string | null
  attendance_list: AttendanceItem[]
  equipment_list: EquipmentItem[]
  next_steps: string | null
  director_signature: string | null
  updated_by: string | null
  created_by: string | null
  created_at: string
  production_diary_photos: DiaryPhoto[]
}

// --- Form data ---

export interface DiaryEntryFormData {
  shooting_date: string
  shooting_date_id: string | null
  day_number: string
  weather_condition: WeatherCondition
  call_time: string
  wrap_time: string
  filming_start_time: string
  lunch_time: string
  location: string
  planned_scenes: string
  filmed_scenes: string
  total_takes: string
  observations: string
  issues: string
  highlights: string
  scenes_list: SceneItem[]
  day_status: DayStatus | null
  executive_summary: string
  attendance_list: AttendanceItem[]
  equipment_list: EquipmentItem[]
  next_steps: string
  director_signature: string
}
```

### 4.2 Query Keys

**Arquivo:** `frontend/src/lib/query-keys.ts` -- adicionar:

```typescript
export const productionDiaryKeys = {
  all: ['production-diary'] as const,
  lists: () => [...productionDiaryKeys.all, 'list'] as const,
  list: (jobId: string) => [...productionDiaryKeys.lists(), jobId] as const,
  detail: (id: string) => [...productionDiaryKeys.all, 'detail', id] as const,
}
```

**Nota:** O TabProductionDiary.tsx atual usa `['production-diary', job.id]` como queryKey inline. Migrar para `productionDiaryKeys.list(job.id)` para consistencia.

### 4.3 Arquivos novos

```
frontend/src/
  types/
    production-diary.ts                         -- Tipos (DiaryEntry, SceneItem, etc.)
  hooks/
    useProductionDiary.ts                       -- Hook TanStack Query (CRUD diarios)
  components/
    job-detail/tabs/
      diary/
        ScenesListSection.tsx                   -- Sub-secao "Cenas Filmadas" (lista dinamica)
        AttendanceSection.tsx                   -- Sub-secao "Presenca da Equipe" (checklist)
        BulletinSection.tsx                     -- Sub-secao "Boletim de Producao"
        EquipmentListSection.tsx                -- Sub-secao "Equipamentos" (lista dinamica)
        DiaryDatePicker.tsx                     -- Select de shooting_dates + fallback manual
        DayStatusBadge.tsx                      -- Badge verde/azul/vermelho do status do dia
```

### 4.4 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `TabProductionDiary.tsx` | Refatorar formulario: extrair sub-secoes para componentes em `diary/`, expandir tipos para novos campos, adicionar DiaryDatePicker, indoor no Select clima, badges no card |
| `TabDiarias.tsx` | Adicionar indicador (circulo verde/cinza) por shooting_date, contador no header, clique para navegar/pre-preencher |
| `query-keys.ts` | Adicionar `productionDiaryKeys` |
| `types/jobs.ts` | Nenhuma mudanca (tipos de shooting_date ja existem) |

### 4.5 Detalhamento dos componentes novos

#### DiaryDatePicker

**Props:**
```typescript
interface DiaryDatePickerProps {
  jobId: string
  value: string                              // shooting_date selecionada (YYYY-MM-DD)
  shootingDateId: string | null              // id da shooting_date selecionada
  existingDiaryDates: Set<string>            // datas que ja tem diario (para indicador check)
  onChange: (date: string, shootingDateId: string | null, location: string | null) => void
}
```

**Comportamento:**
1. Usa `useJobShootingDates(jobId)` para carregar datas cadastradas
2. Se ha datas: renderiza Select com opcoes (data + locacao), indicador check verde nas ja preenchidas, e opcao "Outra data..." no final
3. Se nao ha datas ou "Outra data" selecionada: renderiza Input type="date"
4. Ao selecionar uma data, chama `onChange` com date, shootingDateId e location (para pre-preencher)

#### ScenesListSection

**Props:**
```typescript
interface ScenesListSectionProps {
  scenes: SceneItem[]
  onChange: (scenes: SceneItem[]) => void
  totalTakes: string
  onTotalTakesChange: (value: string) => void
}
```

**Comportamento:**
- Lista de items com botao "Adicionar Cena"
- Cada item: Input scene_number (obrigatorio), Input description, Input takes, Input ok_take, Select status
- Chips coloridos: ok = verde, incompleta = amarelo, nao_gravada = vermelho
- Botao X por item com confirmacao inline
- total_takes auto-calculado quando scenes_list tem items; editavel manualmente se vazio

#### AttendanceSection

**Props:**
```typescript
interface AttendanceSectionProps {
  jobId: string
  attendance: AttendanceItem[]
  onChange: (attendance: AttendanceItem[]) => void
}
```

**Comportamento:**
- Busca job_team via `apiGet('jobs-team', {}, jobId)` com filtro `hiring_status=confirmado`
- Pre-popula lista com membros (todos presentes por padrao)
- Checkbox por membro + Input arrival_time + Input notes
- Header com contagem: "X/Y presentes"
- Botao "Adicionar participante" para extras sem person_id (input de nome e papel)

#### BulletinSection

**Props:**
```typescript
interface BulletinSectionProps {
  dayStatus: DayStatus | null
  executiveSummary: string
  nextSteps: string
  directorSignature: string
  onChange: (field: string, value: unknown) => void
}
```

**Comportamento:**
- Select para day_status (No cronograma / Adiantado / Atrasado)
- Textarea para executive_summary (max 2000)
- Textarea para next_steps
- Input para director_signature

#### EquipmentListSection

**Props:**
```typescript
interface EquipmentListSectionProps {
  equipment: EquipmentItem[]
  onChange: (equipment: EquipmentItem[]) => void
}
```

**Comportamento:**
- Lista dinamica com botao "Adicionar Equipamento"
- Cada item: Input name (obrigatorio), Input quantity, Input notes
- Botao X por item

#### DayStatusBadge

**Props:**
```typescript
interface DayStatusBadgeProps {
  status: DayStatus | null
  hasBulletin: boolean       // executive_summary preenchido
  className?: string
}
```

**Renderizacao:**
- `no_cronograma` -> Badge verde "No cronograma"
- `adiantado` -> Badge azul "Adiantado"
- `atrasado` -> Badge vermelho "Atrasado"
- `null` e `hasBulletin === false` -> Badge outline "Boletim pendente"

### 4.6 Hook useProductionDiary

**Arquivo:** `frontend/src/hooks/useProductionDiary.ts`

```typescript
// useProductionDiaryList(jobId) -> lista todas as entries do job
// useProductionDiaryCreate(jobId) -> mutation POST
// useProductionDiaryUpdate(jobId) -> mutation PATCH
// useProductionDiaryDelete(jobId) -> mutation DELETE
// useProductionDiaryAddPhoto(jobId) -> mutation POST /:id/photos

// Todas as mutations invalidam productionDiaryKeys.list(jobId)
```

**Nota:** Extrair a logica de queries/mutations que hoje esta inline no TabProductionDiary.tsx para este hook. Melhora testabilidade e permite que TabDiarias reutilize a query.

### 4.7 Mudancas no TabProductionDiary.tsx

O componente sera refatorado para usar sub-componentes:

**Estrutura do Dialog refatorado:**
```
<DialogContent>
  <DialogHeader>...</DialogHeader>

  {/* Secao 1: Data e Info Basica */}
  <DiaryDatePicker />
  <Input day_number />
  <Select weather_condition /> (agora com indoor)
  <Input location />

  {/* Secao 2: Horarios */}
  <Input call_time />
  <Input filming_start_time />  {/* NOVO */}
  <Input lunch_time />          {/* NOVO */}
  <Input wrap_time />

  {/* Secao 3: Cenas (texto livre mantido + lista nova) */}
  <Textarea planned_scenes />
  <Textarea filmed_scenes />
  <ScenesListSection />         {/* NOVO */}

  {/* Secao 4: Relatorio do dia (existente) */}
  <Textarea issues />
  <Textarea highlights />
  <Textarea observations />

  {/* Secao 5: Presenca */}
  <AttendanceSection />         {/* NOVO */}

  {/* Secao 6: Boletim */}
  <BulletinSection />           {/* NOVO */}
  <EquipmentListSection />      {/* NOVO */}

  <DialogFooter>...</DialogFooter>
</DialogContent>
```

**Card de listagem atualizado:**
```
<Card>
  <CardHeader>
    Badge "Dia N" | Data | WeatherIcon | Horarios | Takes
    DayStatusBadge (status do dia)           {/* NOVO */}
    Badge "Boletim pendente" se aplicavel    {/* NOVO */}
  </CardHeader>
  <CardContent>
    Cenas (texto ou scenes_list summary)
    Issues / Highlights / Observations
    "Cenas: X filmadas (ok) / Y total"      {/* NOVO */}
    "Presenca: X/Y presentes"               {/* NOVO */}
    Photos grid
  </CardContent>
</Card>
```

### 4.8 Mudancas no TabDiarias.tsx

**Dados necessarios:** Query de diary entries do mesmo job (reutilizar `productionDiaryKeys.list(jobId)`).

**Mudancas:**
1. Importar `useQuery` com `productionDiaryKeys.list(jobId)` para obter entries existentes
2. Criar mapa `diaryByShootingDate: Map<string, string>` -- `shooting_date (DATE) -> diary entry id`
3. Por cada shooting_date no grid:
   - Se tem diary: indicador circulo verde (CheckCircle)
   - Se nao tem: indicador circulo cinza (Circle)
4. Clique no indicador verde: callback para navegar para tab diario (via tab switching no pai)
5. Clique no indicador cinza: callback para abrir formulario pre-preenchido (data + location do shooting_date)
6. Header atualizado: "Diarias (N) -- X de Y com diario"

**Nota:** A navegacao entre tabs requer um callback `onSwitchTab` passado pelo pai (JobDetailTabs.tsx). Se nao existir, usar um simples scroll+highlight via queryParam.

---

## 5. Plano de Implementacao

### Sprint 1: Backend -- Migration + EF Updates (1 dia)

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 1.1 | Criar migration `20260307200000_extend_production_diary_v2.sql` | 1h | -- |
| 1.2 | Aplicar migration via MCP | 15min | 1.1 |
| 1.3 | Verificar RENAMEs: SELECT de dados existentes (se houver) antes e depois | 15min | 1.2 |
| 1.4 | Atualizar `create.ts`: schema expandido, ALLOWED_ROLES, validacao shooting_date_id, novos campos no insert | 1h | 1.2 |
| 1.5 | Atualizar `update.ts`: schema expandido, ALLOWED_ROLES, validacao created_by (RN-06), updated_by | 1h | 1.2 |
| 1.6 | Atualizar `delete.ts`: ALLOWED_ROLES restrito (remover coordenador_producao) | 15min | 1.2 |
| 1.7 | Atualizar `photos.ts`: ALLOWED_ROLES ampliado | 15min | 1.2 |
| 1.8 | Deploy EF via MCP | 15min | 1.4-1.7 |
| 1.9 | Testar com curl: create com campos novos, update, list, delete | 30min | 1.8 |

**Entregavel:** Migration aplicada, EF atualizada e deployada, todos endpoints testados.

### Sprint 2: Frontend -- Formulario + Listagem + TabDiarias (1.5-2 dias)

| # | Tarefa | Estimativa | Dependencia |
|---|--------|------------|-------------|
| 2.1 | Criar `types/production-diary.ts` | 20min | -- |
| 2.2 | Adicionar `productionDiaryKeys` em `query-keys.ts` | 10min | -- |
| 2.3 | Criar hook `useProductionDiary.ts` (extrair logica do TabProductionDiary) | 45min | 2.1, 2.2 |
| 2.4 | Criar `diary/DiaryDatePicker.tsx` | 45min | 2.1 |
| 2.5 | Criar `diary/ScenesListSection.tsx` | 1h | 2.1 |
| 2.6 | Criar `diary/AttendanceSection.tsx` | 1h | 2.1 |
| 2.7 | Criar `diary/BulletinSection.tsx` | 30min | 2.1 |
| 2.8 | Criar `diary/EquipmentListSection.tsx` | 30min | 2.1 |
| 2.9 | Criar `diary/DayStatusBadge.tsx` | 15min | 2.1 |
| 2.10 | Refatorar `TabProductionDiary.tsx`: integrar sub-componentes, expandir formulario, atualizar cards | 2h | 2.3-2.9 |
| 2.11 | Atualizar `TabDiarias.tsx`: indicadores verde/cinza, contador, navegacao | 1h | 2.3 |
| 2.12 | Dark mode review em todos os componentes novos | 30min | 2.10-2.11 |
| 2.13 | Mobile review (formulario responsivo para DP no celular) | 30min | 2.10 |
| 2.14 | QA: testar 7 cenarios E2E da spec | 1h | 2.10-2.11 |
| 2.15 | Fix de issues encontrados no QA | 1h | 2.14 |

**Entregavel:** Onda 2.3 completa, todos os criterios de done verificados.

---

## 6. Riscos e Mitigacoes

### R1: RENAME COLUMN com dados existentes

**Risco:** Se houver dados reais em production_diary_entries, o RENAME pode causar inconsistencia momentanea entre banco e EF.

**Mitigacao:** PA-04 confirmado: verificar se ha dados antes do RENAME. A migration e idempotente. Ordem de deploy obrigatoria: migration primeiro, EF depois (a EF atual ja usa os nomes novos, entao o RENAME so faz o banco alinhar com a EF). Se a EF for deployada antes da migration, nada muda (ja esta usando os nomes "errados" que viram "certos" apos o RENAME).

**Probabilidade:** Baixa (feature provavelmente nunca funcionou corretamente em producao).

### R2: Dialog muito longo no mobile

**Risco:** O formulario expandido tem ~15 campos + 3 sub-secoes dinamicas. No celular do DP no set, o scroll pode ser excessivo.

**Mitigacao:**
- Usar `max-h-[90vh] overflow-y-auto` no DialogContent (ja existe)
- Organizar em secoes colapsaveis (Collapsible do shadcn/ui) para as sub-secoes opcionais (Cenas, Presenca, Boletim, Equipamentos)
- Secoes colapsaveis iniciam fechadas no create; abertas no edit se tiverem dados
- Campos do boletim ficam no final (sao opcionais e podem ser preenchidos depois)

### R3: Performance da lista de presenca

**Risco:** Buscar job_team a cada abertura do formulario pode ser lento se o job tiver muitos membros.

**Mitigacao:**
- A busca de job_team ja e feita via `apiGet('jobs-team', {}, jobId)` que retorna em ~100ms (dados leves)
- Cache via TanStack Query (staleTime: 60s) evita re-fetch ao reabrir o formulario
- A lista e filtrada no frontend (`hiring_status === 'confirmado'`), sem parametro extra na API

### R4: Conflito de total_takes automatico vs manual

**Risco:** Se o usuario tem scenes_list com takes E edita total_takes manualmente, qual valor prevalece?

**Mitigacao:** Logica clara:
1. Se `scenes_list` tem items: total_takes e calculado automaticamente (soma dos takes) e o input fica readonly com tooltip "Calculado automaticamente a partir das cenas"
2. Se `scenes_list` esta vazio: total_takes e editavel manualmente (fallback para quem nao usa a lista estruturada)
3. No submit: se scenes_list tem items, total_takes = soma; senao, usa o valor manual

### R5: TabDiarias depende de dados do production-diary

**Risco:** TabDiarias precisa saber quais shooting_dates ja tem diario. Isso cria uma dependencia entre duas tabs.

**Mitigacao:** Ambas as tabs compartilham a query `productionDiaryKeys.list(jobId)`. TanStack Query garante que a mesma query nao e executada duas vezes (deduplication). Se o usuario criar um diario na TabProductionDiary, a invalidacao atualiza ambas as tabs automaticamente.

### R6: Campos JSONB muito grandes

**Risco:** Se um dia de filmagem tiver 100+ cenas ou 50+ equipamentos, o JSONB fica grande.

**Mitigacao:** Na pratica, um dia de filmagem tem 5-30 cenas e 5-15 equipamentos. O limite natural do dia de trabalho restringe o volume. Se necessario, adicionar limite no frontend (max 50 cenas, max 30 equipamentos) com mensagem explicativa.

---

## 7. O que NAO muda

| Componente | Por que nao muda |
|------------|------------------|
| `index.ts` (router) | Todas as rotas necessarias ja existem (CRUD + photos) |
| `get.ts` (handler) | SELECT * retorna novos campos automaticamente |
| `list.ts` (handler) | SELECT * retorna novos campos; join de photos ja usa nomes corretos da EF |
| `JobDetailTabs.tsx` | Tab "diario" ja registrada no grupo Producao |
| `ShootingDateDialog.tsx` | Dialog de CRUD de shooting_dates nao muda |
| `useJobShootingDates.ts` | Hook reutilizado pelo DiaryDatePicker, sem alteracao |
| RLS policies | Policies existentes por tenant_id continuam validas |
| Indices existentes | Postgres atualiza automaticamente apos RENAME COLUMN |

---

## 8. Checklist de Verificacao Pre-Implementacao

Antes de iniciar cada sprint, verificar:

- [ ] Migration: tabela `job_shooting_dates` existe no banco (para FK de shooting_date_id)
- [ ] Migration: funcao `update_updated_at()` existe (usada pelo trigger existente)
- [ ] Migration: funcao `get_tenant_id()` existe (usada pelas RLS policies)
- [ ] Migration: papel `diretor_producao` existe no enum (migration 20260306200000)
- [ ] Migration: papel `cco` existe no enum
- [ ] EF: importar `jobs-team` endpoint funciona para buscar membros (presenca)
- [ ] Frontend: `Collapsible` disponivel em shadcn/ui (para secoes colapsaveis)
- [ ] Frontend: `CheckCircle2` e `Circle` icons disponiveis em lucide-react (para indicadores)
- [ ] Frontend: `Building2` icon disponivel em lucide-react (para indoor/weather)

---

## 9. Contratos de API (referencia rapida)

### POST /production-diary (create)

**Roles:** admin, ceo, produtor_executivo, coordenador_producao, diretor_producao, cco

**Body completo:**
```json
{
  "job_id": "uuid",
  "shooting_date": "2026-03-15",
  "shooting_date_id": "uuid | null",
  "day_number": 3,
  "weather_condition": "sol",
  "call_time": "07:00",
  "filming_start_time": "08:30",
  "lunch_time": "12:00",
  "wrap_time": "18:00",
  "location": "Parque Ibirapuera, Sao Paulo",
  "planned_scenes": "Cenas 3, 4A, 5",
  "filmed_scenes": "Cenas 3, 4A (cena 5 adiada)",
  "total_takes": 47,
  "observations": "Dia produtivo",
  "issues": "Chuva as 14h",
  "highlights": "Cena 4A em um take",
  "scenes_list": [
    { "scene_number": "3", "description": "Abertura parque", "takes": 12, "ok_take": 8, "status": "ok" },
    { "scene_number": "4A", "description": "Dialogo banco", "takes": 5, "ok_take": 1, "status": "ok" },
    { "scene_number": "5", "description": null, "takes": 0, "ok_take": null, "status": "nao_gravada" }
  ],
  "day_status": "adiantado",
  "executive_summary": "Dia produtivo apesar da chuva. 2 de 3 cenas concluidas.",
  "attendance_list": [
    { "person_id": "uuid", "person_name": "Ana Silva", "role": "diretor_producao", "present": true, "arrival_time": "07:00", "notes": null },
    { "person_id": null, "person_name": "Carlos Extra", "role": "assistente", "present": true, "arrival_time": "08:00", "notes": "Chamado no dia" }
  ],
  "equipment_list": [
    { "name": "Camera RED Komodo", "quantity": 2, "notes": null },
    { "name": "Drone DJI Mavic 3 Pro", "quantity": 1, "notes": "Usado na cena 3" }
  ],
  "next_steps": "Filmar cena 5 amanha. Prever plano B indoor se chover.",
  "director_signature": "Ana Silva"
}
```

**Response 201:**
```json
{
  "data": { "id": "uuid", "...todos os campos..." }
}
```

**Erros:**
- 400: Dados invalidos (Zod)
- 403: Permissao insuficiente
- 404: Job nao encontrado
- 409: Ja existe diario para esta data

### PATCH /production-diary/:id (update)

**Roles:** admin, ceo, produtor_executivo, coordenador_producao, diretor_producao, cco
**Body:** Parcial (todos os campos opcionais, exceto job_id)
**Restricao:** Editar diario de outro usuario requer ceo/pe/admin (RN-06)

### DELETE /production-diary/:id (soft delete)

**Roles:** admin, ceo, produtor_executivo (apenas)

### GET /production-diary?job_id=X (list)

**Roles:** Qualquer autenticado do tenant (sem restricao de role)
**Response:** Array de entries com photos embarcados, ordenado por shooting_date DESC

### POST /production-diary/:id/photos (add photo)

**Roles:** admin, ceo, produtor_executivo, coordenador_producao, diretor_producao, cco

---

*Documento gerado em 2026-03-07. Baseado na analise completa do codebase: TabProductionDiary.tsx (878 linhas), TabDiarias.tsx (227 linhas), migration 20260303030000 (232 linhas), 6 handlers da EF production-diary, useJobShootingDates.ts, query-keys.ts, types/jobs.ts.*
