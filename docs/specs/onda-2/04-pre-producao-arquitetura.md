# Onda 2.2 -- Pre-Producao: Arquitetura de Implementacao

**Data:** 2026-03-06
**Status:** APROVADO
**Autor:** Tech Lead (Claude Opus 4.6)
**Spec de referencia:** 03-pre-producao-spec.md
**Esforco estimado:** 3 sprints (3-4 dias uteis)

---

## 0. Estado Atual -- O que ja existe

### Frontend existente

| Arquivo | O que faz | Reutilizavel? |
|---------|-----------|---------------|
| `TabPPM.tsx` (450 linhas) | Aba PPM com 6 checklist items hardcoded (`PpmChecklist` com 6 chaves booleanas), formulario de status/data/local/participantes/observacoes, save via `PATCH /jobs` com merge de `custom_fields.ppm` | SIM -- refatorar internamente, manter a mutation de save |
| `JobDetailTabs.tsx` | Sistema de tabs com grupos. PPM ja esta no grupo "Producao" (area `producao`) | SIM -- nao precisa alterar |
| `constants.ts` | `JobDetailTabId` inclui `'ppm'`, tab ja no `JOB_TAB_GROUPS` grupo Producao | SIM -- nao precisa alterar |
| `query-keys.ts` | `jobKeys` usado por TabPPM para invalidar cache apos save | SIM -- adicionar `preproductionTemplateKeys` |

### Backend existente

| Recurso | Estado |
|---------|--------|
| Tabela `jobs` com `custom_fields JSONB` | Existe. Campo `ppm` ja usado. Indice GIN em `custom_fields` |
| `PATCH /jobs/:id` (EF `jobs`, handler `update.ts`) | Existe. Aceita `custom_fields` como `z.record(z.unknown())`. Faz merge nativo (Postgres `||` operator via Supabase `.update()`) |
| `UpdateJobSchema` (validation.ts) | Aceita `custom_fields`, URLs (ppm_url, drive_folder_url, script_url, etc.) |
| Campos URL na tabela `jobs` | Todos existem: `drive_folder_url`, `ppm_url`, `script_url`, `pre_production_url`, `schedule_url`, `contracts_folder_url` |
| Settings page `/settings/` | Layout com tabs e `useRouteGuard`. Roles: `admin`, `ceo` |
| Pattern EF com handlers/ | Consolidado: `attendance/` como referencia (18 handlers, router com named routes) |

### Formato legado de custom_fields.ppm

```json
{
  "status": "rascunho",
  "document_url": "...",
  "date": "2026-03-01",
  "location": "...",
  "participants": ["Ana", "Carlos"],
  "notes": "...",
  "checklist": {
    "roteiro": true,
    "locacoes": false,
    "equipe": true,
    "elenco": false,
    "cronograma": false,
    "orcamento": true
  }
}
```

**O que muda:** adicionar `checklist_items` (array), `pre_production_complete` (boolean), `decisions` (array). O campo `checklist` (objeto) permanece para leitura legada; o frontend detecta qual formato usar.

---

## 1. Decisoes de Arquitetura (ADRs)

### ADR-PPM-01: Tabela dedicada para templates, JSONB para dados de job

**Contexto:** A spec pede templates de checklist configurados por tenant/project_type E dados de checklist armazenados por job.

**Decisao:** Criar **uma tabela nova** `preproduction_checklist_templates` para os templates. Manter os dados de checklist do job em `custom_fields.ppm` (JSONB).

**Justificativa:**
- Templates precisam de constraint UNIQUE parcial `(tenant_id, project_type) WHERE is_active = true` -- impossivel em JSONB
- Templates sao entidades independentes do job (CRUD proprio, listagem, seed) -- relacional e superior
- Dados de checklist do job sao **copias locais** dos templates (RN-03), nao referencias -- JSONB e adequado
- Manter checklist_items, decisions e pre_production_complete em `custom_fields.ppm` evita migration de ALTER TABLE (zero downtime) e segue o pattern existente
- O indice GIN ja existe em `custom_fields`, entao queries como `custom_fields->'ppm'->'pre_production_complete'` sao performantes

**Consequencia:** Precisamos de uma EF dedicada para CRUD de templates (nao cabe no PATCH /jobs). Os dados de checklist do job continuam sendo salvos via PATCH /jobs.

### ADR-PPM-02: Edge Function `preproduction-templates` separada da EF `jobs`

**Contexto:** A spec requer CRUD de templates. O PATCH /jobs ja suporta custom_fields. Avaliar se precisa EF nova.

**Decisao:** Criar EF `preproduction-templates` com 4 handlers (list, create, update, deactivate). NAO reutilizar a EF `jobs` para templates.

**Justificativa:**
- Templates sao entidades de configuracao (tabela propria), nao campos do job
- CRUD de templates tem validacao especifica (unique active por type, role check, items array)
- Separar evita engordar a EF `jobs` que ja tem 6 handlers
- Checklist/decisions do job continuam usando PATCH /jobs (sem mudanca no backend)

**Consequencia:** Um deploy adicional de EF. Baixo custo (cold start ~200ms, compartilha _shared/).

### ADR-PPM-03: Frontend calcula `pre_production_complete`, sem trigger no banco

**Contexto:** A spec diz que o calculo de "pronto pra filmar" e feito no frontend antes do save (CA-03.5).

**Decisao:** O frontend calcula `pre_production_complete = items.length > 0 && items.every(i => i.checked)` e inclui no payload do PATCH. Sem trigger, sem computed column, sem EF dedicada.

**Justificativa:**
- Trigger em JSONB parcial (so uma chave do objeto) seria fragil e acoplado
- O dado e derivado -- qualquer inconsistencia e corrigida no proximo save
- Frontend ja faz o merge de custom_fields.ppm (pattern existente em TabPPM.tsx)
- Performance: zero overhead no banco

**Consequencia:** Se alguem alterar custom_fields.ppm via API direta sem calcular o flag, o valor fica desatualizado ate o proximo save via UI. Risco aceitavel -- unico ponto de escrita e a aba PPM.

### ADR-PPM-04: Compatibilidade retroativa via lazy migration no frontend

**Contexto:** Jobs existentes usam formato legado (`checklist` como objeto com 6 chaves booleanas). A spec exige que continuem funcionando (RN-05).

**Decisao:** O frontend detecta o formato no carregamento:
1. Se `checklist_items` existe e tem itens: novo formato (array)
2. Se nao: formato legado -- exibe os 6 itens como read-only com banner "Formato antigo"
3. No primeiro save apos banner, converte o formato legado para o novo array automaticamente
4. Nenhuma migration batch no banco

**Justificativa:**
- Migrations batch em JSONB sao arriscadas (nao ha rollback facil)
- Lazy migration garante que so converte quando o usuario interage
- O formato legado continua funcionando indefinidamente em modo read-only
- O campo `checklist` (objeto) nao e removido -- permanece como historico

### ADR-PPM-05: Decisions em JSONB, nao em tabela separada

**Contexto:** Decisoes da PPM poderiam ser uma tabela relacional ou um array em JSONB.

**Decisao:** Armazenar decisions como array em `custom_fields.ppm.decisions`.

**Justificativa:**
- Decisoes sao fortemente acopladas ao job (nao existem sem ele)
- Volume baixo: tipicamente 3-10 decisoes por PPM
- Nao ha queries cross-job de decisoes (ex: "todas decisoes do tenant" nao e requisito)
- Array em JSONB com ID permite CRUD sem tabela extra
- Mesmo pattern de custom_fields.ppm.checklist_items -- consistencia

**Consequencia:** Queries de busca global por decisoes nao sao posssiveis. Se esse requisito surgir no futuro, migramos para tabela. Custo de migracao: baixo (extrair array, inserir em tabela).

### ADR-PPM-06: CHECK constraint ao inves de ENUM para project_type no template

**Contexto:** O campo `project_type` do template faz referencia ao ENUM `project_type` do Postgres. Alternativa: TEXT com CHECK constraint.

**Decisao:** Usar `project_type::text` com CHECK constraint que replica os 10 valores do ENUM. NULL permitido (template padrao).

**Justificativa:**
- Pattern consolidado do projeto (ADR-D1 da Onda 2.1): CHECK constraints sao mais faceis de evoluir que ENUMs
- Se um novo project_type for adicionado ao ENUM, basta alterar o CHECK (sem migration complexa)
- A constraint UNIQUE parcial funciona igualmente com TEXT

### ADR-PPM-07: Seed de templates sugeridos via migration, nao via EF

**Contexto:** A spec pede templates pre-carregados para os 10 project_types (CA-01.8).

**Decisao:** Criar uma funcao RPC `seed_default_ppm_templates(p_tenant_id)` invocavel pelo frontend (botao "Carregar templates sugeridos") ou automaticamente no primeiro acesso a pagina de templates.

**Justificativa:**
- Uma migration INSERT normal so roda uma vez e nao sabe quais tenants existem no futuro
- Uma RPC permite que cada tenant carregue os templates sob demanda
- Os templates sao sugestoes editaveis (CA-01.8), nao dados imutaveis
- O frontend chama a RPC apenas se `templates.length === 0` (primeiro acesso)

**Consequencia:** Tenants novos criados no futuro tambem recebem as sugestoes ao acessar /settings/pre-producao pela primeira vez.

---

## 2. Schema

### 2.1 Tabela nova: preproduction_checklist_templates

```sql
-- =============================================
-- Onda 2.2: Templates de Checklist Pre-Producao
-- 1 tabela nova, 0 ALTER TABLE em jobs
-- Idempotente: IF NOT EXISTS em tudo
-- =============================================

CREATE TABLE IF NOT EXISTS public.preproduction_checklist_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_type text
    CHECK (project_type IS NULL OR project_type IN (
      'filme_publicitario','branded_content','videoclipe','documentario',
      'conteudo_digital','evento_livestream','institucional',
      'motion_graphics','fotografia','outro'
    )),
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE: maximo 1 template ativo por (tenant_id, project_type) incluindo NULL
-- Para project_type NOT NULL:
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppm_template_active_type
  ON public.preproduction_checklist_templates (tenant_id, project_type)
  WHERE is_active = true AND project_type IS NOT NULL;

-- Para project_type NULL (template padrao):
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppm_template_active_default
  ON public.preproduction_checklist_templates (tenant_id)
  WHERE is_active = true AND project_type IS NULL;

-- Lookup rapido ao carregar a aba PPM (busca por tenant + type)
CREATE INDEX IF NOT EXISTS idx_ppm_templates_tenant_type
  ON public.preproduction_checklist_templates (tenant_id, project_type)
  WHERE is_active = true;

-- Trigger updated_at (reutiliza funcao existente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_ppm_templates'
  ) THEN
    CREATE TRIGGER set_updated_at_ppm_templates
      BEFORE UPDATE ON public.preproduction_checklist_templates
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;
```

### 2.2 RLS Policies

```sql
ALTER TABLE public.preproduction_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppm_tpl_select" ON public.preproduction_checklist_templates
  FOR SELECT USING (tenant_id = public.get_tenant_id());

CREATE POLICY "ppm_tpl_insert" ON public.preproduction_checklist_templates
  FOR INSERT WITH CHECK (tenant_id = public.get_tenant_id());

CREATE POLICY "ppm_tpl_update" ON public.preproduction_checklist_templates
  FOR UPDATE USING (tenant_id = public.get_tenant_id());

-- DELETE bloqueado via RLS (usar is_active = false)
-- Nenhuma policy de DELETE
```

### 2.3 Seed RPC

```sql
-- Funcao para carregar templates sugeridos para um tenant
-- Idempotente: so insere se o tenant nao tem nenhum template ativo
CREATE OR REPLACE FUNCTION public.seed_default_ppm_templates(p_tenant_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- So insere se nao existe nenhum template para este tenant
  IF EXISTS (
    SELECT 1 FROM preproduction_checklist_templates
    WHERE tenant_id = p_tenant_id AND is_active = true
    LIMIT 1
  ) THEN
    RETURN 0;
  END IF;

  -- Template padrao (fallback para qualquer tipo)
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, NULL, 'Padrao Geral', '[
    {"id":"s01","label":"Roteiro/storyboard aprovado","position":1},
    {"id":"s02","label":"Locacoes confirmadas","position":2},
    {"id":"s03","label":"Equipe tecnica confirmada","position":3},
    {"id":"s04","label":"Elenco confirmado","position":4},
    {"id":"s05","label":"Cronograma de filmagem definido","position":5},
    {"id":"s06","label":"Orcamento aprovado","position":6}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Filme publicitario (producao completa)
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, 'filme_publicitario', 'Filme Publicitario', '[
    {"id":"fp01","label":"Roteiro aprovado pelo cliente","position":1},
    {"id":"fp02","label":"Storyboard ou shooting board aprovado","position":2},
    {"id":"fp03","label":"Locacoes confirmadas e autorizadas","position":3},
    {"id":"fp04","label":"Equipe tecnica completa e confirmada","position":4},
    {"id":"fp05","label":"Elenco aprovado pelo cliente","position":5},
    {"id":"fp06","label":"Cronograma de filmagem definido","position":6},
    {"id":"fp07","label":"Orcamento aprovado","position":7},
    {"id":"fp08","label":"Contratos de equipe assinados","position":8},
    {"id":"fp09","label":"Ordem do dia elaborada","position":9},
    {"id":"fp10","label":"Figurino/arte aprovados","position":10}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Branded content
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, 'branded_content', 'Branded Content', '[
    {"id":"bc01","label":"Briefing de conteudo aprovado","position":1},
    {"id":"bc02","label":"Roteiro ou pauta definidos","position":2},
    {"id":"bc03","label":"Locacoes ou estudio confirmados","position":3},
    {"id":"bc04","label":"Equipe definida","position":4},
    {"id":"bc05","label":"Talento/apresentador confirmado","position":5},
    {"id":"bc06","label":"Cronograma aprovado","position":6},
    {"id":"bc07","label":"Orcamento aprovado","position":7}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Fotografia (mais enxuto)
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, 'fotografia', 'Fotografia', '[
    {"id":"ft01","label":"Briefing visual aprovado","position":1},
    {"id":"ft02","label":"Locacao ou estudio confirmado","position":2},
    {"id":"ft03","label":"Fotografo e assistentes confirmados","position":3},
    {"id":"ft04","label":"Modelo/elenco confirmado","position":4},
    {"id":"ft05","label":"Orcamento aprovado","position":5}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Conteudo digital
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, 'conteudo_digital', 'Conteudo Digital', '[
    {"id":"cd01","label":"Pauta de conteudo aprovada","position":1},
    {"id":"cd02","label":"Formato e plataformas definidos","position":2},
    {"id":"cd03","label":"Equipe minima confirmada","position":3},
    {"id":"cd04","label":"Cronograma de entregas definido","position":4},
    {"id":"cd05","label":"Orcamento aprovado","position":5}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Videoclipe
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, 'videoclipe', 'Videoclipe', '[
    {"id":"vc01","label":"Conceito/tratamento aprovado pelo artista","position":1},
    {"id":"vc02","label":"Locacoes confirmadas","position":2},
    {"id":"vc03","label":"Equipe tecnica confirmada","position":3},
    {"id":"vc04","label":"Figurino/arte aprovados","position":4},
    {"id":"vc05","label":"Cronograma de filmagem definido","position":5},
    {"id":"vc06","label":"Orcamento aprovado","position":6},
    {"id":"vc07","label":"Playback/musica recebida","position":7}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Documentario
  INSERT INTO preproduction_checklist_templates (tenant_id, project_type, name, items, created_by)
  VALUES (p_tenant_id, 'documentario', 'Documentario', '[
    {"id":"dc01","label":"Roteiro ou escaleta aprovados","position":1},
    {"id":"dc02","label":"Entrevistados confirmados","position":2},
    {"id":"dc03","label":"Locacoes de filmagem definidas","position":3},
    {"id":"dc04","label":"Equipe tecnica confirmada","position":4},
    {"id":"dc05","label":"Autorizacoes de imagem coletadas","position":5},
    {"id":"dc06","label":"Cronograma de filmagem definido","position":6},
    {"id":"dc07","label":"Orcamento aprovado","position":7}
  ]'::jsonb, p_user_id);
  v_count := v_count + 1;

  -- Os demais tipos (evento_livestream, institucional, motion_graphics, outro)
  -- usarao o template padrao (project_type = NULL) como fallback

  RETURN v_count;
END;
$$;
```

### 2.4 Nenhum ALTER TABLE em jobs

A tabela `jobs` nao recebe novas colunas. Todos os novos dados ficam em `custom_fields.ppm` (JSONB):

- `checklist_items`: array de `{id, label, checked, position, is_extra}`
- `pre_production_complete`: boolean
- `decisions`: array de `{id, date, description, responsible, created_by_name, created_at}`

Os campos de URL (`drive_folder_url`, `ppm_url`, `script_url`, `pre_production_url`, `schedule_url`, `contracts_folder_url`) ja existem como colunas reais na tabela jobs e sao editaveis via PATCH /jobs existente.

---

## 3. Edge Function: `preproduction-templates`

### 3.1 Estrutura de arquivos

```
supabase/functions/preproduction-templates/
  index.ts                          -- Router principal
  handlers/
    list.ts                         -- GET / ou GET /?project_type=X
    create.ts                       -- POST /
    update.ts                       -- PATCH /:id
    deactivate.ts                   -- DELETE /:id (soft: is_active = false)
    seed.ts                         -- POST /seed
```

### 3.2 Router (index.ts)

```typescript
// Segmentos apos /preproduction-templates:
// GET  /                              → list (todos templates ativos do tenant)
// GET  /?project_type=filme_publicitario → list filtrado por tipo
// POST /                              → create
// PATCH /:id                          → update
// DELETE /:id                         → deactivate (is_active = false)
// POST /seed                          → seed templates sugeridos

Deno.serve(async (req: Request) => {
  // handleCors, getAuthContext, routing by segments
  // Pattern identico ao attendance/index.ts
});
```

### 3.3 Contratos de API

#### GET /preproduction-templates?project_type=filme_publicitario

**Roles:** ceo, admin, produtor_executivo
**Query params opcionais:** `project_type` (filtra por tipo), `include_inactive` (default false)
**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "project_type": "filme_publicitario",
      "name": "Filme Publicitario",
      "items": [
        {"id": "fp01", "label": "Roteiro aprovado pelo cliente", "position": 1},
        {"id": "fp02", "label": "Storyboard aprovado", "position": 2}
      ],
      "is_active": true,
      "created_by": "uuid",
      "created_at": "2026-03-06T10:00:00Z",
      "updated_at": "2026-03-06T10:00:00Z"
    }
  ]
}
```

#### POST /preproduction-templates

**Roles:** ceo, admin
**Body:**
```json
{
  "project_type": "filme_publicitario",
  "name": "Filme Publicitario Customizado",
  "items": [
    {"label": "Roteiro aprovado", "position": 1},
    {"label": "Equipe confirmada", "position": 2}
  ]
}
```

**Validacao Zod:**
```typescript
const CreateTemplateSchema = z.object({
  project_type: z.enum([...PROJECT_TYPES]).nullable().default(null),
  name: z.string().min(1).max(200),
  items: z.array(z.object({
    label: z.string().min(1).max(500),
    position: z.number().int().positive(),
  })).min(1, 'Template precisa de pelo menos 1 item'),
});
```

**Side effects:**
1. Gera UUID para cada item que nao tenha `id`
2. Se ja existe template ativo para `(tenant_id, project_type)`, desativa o anterior automaticamente (RN-01)
3. Retorna 201 com o template criado

#### PATCH /preproduction-templates/:id

**Roles:** ceo, admin
**Body (parcial):**
```json
{
  "name": "Novo nome",
  "items": [
    {"id": "fp01", "label": "Roteiro editado", "position": 1},
    {"id": "new-uuid", "label": "Item novo", "position": 2}
  ]
}
```

**Validacao:** UpdateTemplateSchema (partial do Create, sem project_type)

**Nota:** project_type NAO pode ser alterado apos criacao. Para mudar o tipo, desative e crie novo.

#### DELETE /preproduction-templates/:id

**Roles:** ceo, admin
**Semantica:** Soft delete -- seta `is_active = false`. Retorna 200.
**Nota:** RLS nao tem policy DELETE. O handler faz UPDATE no campo is_active.

#### POST /preproduction-templates/seed

**Roles:** ceo, admin
**Body:** nenhum
**Semantica:** Chama `seed_default_ppm_templates(tenant_id, user_id)`. Retorna o numero de templates criados.
**Response:**
```json
{
  "data": { "templates_created": 7 }
}
```

### 3.4 Endpoint para carregar template na aba PPM

A aba PPM precisa resolver qual template usar para um job. NAO cria endpoint novo -- usa o GET existente:

```
GET /preproduction-templates?project_type={job.project_type}
```

**Logica no frontend (nao na EF):**
1. GET com `project_type=X`
2. Se retornou 1 resultado: usar esse template
3. Se retornou 0: GET sem `project_type` para buscar o template padrao (project_type=null)
4. Se tambem nao achou: fallback para os 6 itens originais

Essa logica fica no hook `useResolveChecklistTemplate(projectType)` e roda apenas quando `checklist_items` esta vazio no job.

---

## 4. Frontend -- Componentes e Organizacao

### 4.1 Arquivos novos

```
frontend/src/
  types/
    preproduction.ts                    -- Interfaces (ChecklistItem, PpmDecision, Template)
  hooks/
    usePreproductionTemplates.ts        -- CRUD de templates (TanStack Query)
  components/
    job-detail/tabs/
      ppm/
        DynamicChecklist.tsx             -- Checklist que le itens de array
        LegacyChecklistBanner.tsx        -- Banner de migracao do formato legado
        PreProductionBadge.tsx           -- Badge verde/amarelo pronto pra filmar
        DocumentsPanel.tsx               -- Sub-secao com links do job
        PpmDecisionsList.tsx             -- Lista de decisoes com form inline
        PpmDecisionDialog.tsx            -- Dialog para criar/editar decisao
        AddChecklistItemDialog.tsx       -- Dialog para adicionar item extra ao job
    settings/
      preproduction/
        ChecklistTemplateList.tsx        -- Lista de templates por tipo
        ChecklistTemplateForm.tsx        -- Form de criacao/edicao
        ChecklistTemplateItem.tsx        -- Item com reordenacao
  app/(dashboard)/
    settings/
      pre-producao/
        page.tsx                        -- Pagina /settings/pre-producao
```

### 4.2 Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `frontend/src/lib/query-keys.ts` | Adicionar `preproductionTemplateKeys` |
| `frontend/src/components/job-detail/tabs/TabPPM.tsx` | Refatorar: extrair checklist para DynamicChecklist, adicionar sub-secoes Documentos e Decisoes, badge pronto pra filmar |
| `frontend/src/app/(dashboard)/settings/layout.tsx` | Adicionar tab "Pre-Producao" no array SETTINGS_TABS |

### 4.3 Tipos TypeScript

```typescript
// types/preproduction.ts

export interface ChecklistItem {
  id: string          // UUID gerado no frontend
  label: string
  checked: boolean
  position: number
  is_extra: boolean   // true = adicionado ao job, nao veio do template
}

export interface PpmDecision {
  id: string          // UUID gerado no frontend
  date: string        // YYYY-MM-DD
  description: string
  responsible: string | null
  created_by_name: string
  created_at: string  // ISO 8601
}

export interface TemplateItem {
  id: string
  label: string
  position: number
}

export interface ChecklistTemplate {
  id: string
  tenant_id: string
  project_type: string | null
  name: string
  items: TemplateItem[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Formato novo do custom_fields.ppm (estende o existente)
export interface PpmDataV2 {
  // Campos existentes (mantidos)
  status: 'rascunho' | 'agendado' | 'realizado' | 'cancelado'
  document_url: string | null
  date: string | null
  location: string | null
  participants: string[]
  notes: string | null
  checklist?: Record<string, boolean>  // formato legado, read-only

  // Campos novos
  checklist_items?: ChecklistItem[]
  pre_production_complete?: boolean
  decisions?: PpmDecision[]
  suggestion_dismissed?: boolean  // US-2.2.06: se o usuario ignorou a sugestao
}

// Payloads para mutations
export interface CreateTemplatePayload {
  project_type: string | null
  name: string
  items: Array<{ label: string; position: number }>
}

export interface UpdateTemplatePayload {
  name?: string
  items?: TemplateItem[]
}
```

### 4.4 Query Keys

```typescript
// Adicionar ao query-keys.ts

export const preproductionTemplateKeys = {
  all: ['preproduction-templates'] as const,
  lists: () => [...preproductionTemplateKeys.all, 'list'] as const,
  list: (filters?: Record<string, string>) =>
    [...preproductionTemplateKeys.lists(), filters] as const,
  detail: (id: string) =>
    [...preproductionTemplateKeys.all, 'detail', id] as const,
  forType: (projectType: string | null) =>
    [...preproductionTemplateKeys.all, 'for-type', projectType] as const,
}
```

### 4.5 Hook usePreproductionTemplates

```typescript
// hooks/usePreproductionTemplates.ts
// Pattern identico ao useAttendance.ts

// useTemplateList(filters?) -> lista todos templates ativos
// useTemplateForType(projectType) -> busca template para um project_type
// useCreateTemplate() -> mutation POST
// useUpdateTemplate() -> mutation PATCH
// useDeactivateTemplate() -> mutation DELETE (soft)
// useSeedTemplates() -> mutation POST /seed

// useResolveChecklistTemplate(projectType) -> resolve template com fallback:
//   1. Busca por projectType
//   2. Se nao achou, busca por null (padrao)
//   3. Se nao achou, retorna DEFAULT_CHECKLIST_ITEMS (os 6 originais)
```

### 4.6 Componente DynamicChecklist

**Props:**
```typescript
interface DynamicChecklistProps {
  items: ChecklistItem[]
  onChange: (items: ChecklistItem[]) => void
  readOnly?: boolean           // modo legado
  onAddExtraItem?: () => void  // abre dialog para item extra
}
```

**Comportamento:**
- Renderiza lista de items com Checkbox + label
- Barra de progresso: checked / total
- Itens extras marcados com badge "adicionado"
- Items nao podem ser removidos (CA-02.6), apenas desmarcados
- Drag-and-drop desabilitado no checklist do job (ordem vem do template)

### 4.7 Componente PreProductionBadge

**Props:**
```typescript
interface PreProductionBadgeProps {
  items: ChecklistItem[]
  className?: string
}
```

**Logica:**
- `items.length === 0` -> nada renderizado
- `items.length > 0 && items.every(i => i.checked)` -> Badge verde "Pronto pra filmar"
- Caso contrario -> Badge amarelo "Pre-producao: X/Y pendentes"

**Onde renderiza:**
1. TabPPM header (dentro da aba)
2. Card do job na listagem /jobs (lendo `custom_fields.ppm.pre_production_complete`)
3. JobHeader no job detail (lendo `custom_fields.ppm.pre_production_complete`)

Nos pontos 2 e 3, o badge e simplificado: so le o boolean `pre_production_complete`, sem contar itens.

### 4.8 Componente DocumentsPanel

**Props:**
```typescript
interface DocumentsPanelProps {
  job: JobDetail
  canEdit: boolean  // true para ceo, pe, admin
  onSave: (fields: Partial<JobDetail>) => void
}
```

**Links exibidos (todos ja existem como colunas em jobs):**

| Campo | Label | Icone |
|-------|-------|-------|
| `drive_folder_url` | Pasta Drive | FolderOpen |
| `ppm_url` | Documento PPM | FileText |
| `script_url` | Roteiro | FileEdit |
| `pre_production_url` | Pasta Pre-Producao | FolderOpen |
| `schedule_url` | Cronograma | CalendarDays |
| `contracts_folder_url` | Contratos | PenLine |

**Comportamento:**
- Link preenchido: icone + label + botao "Abrir" (target=_blank)
- Link vazio: label + indicador "Nao informado" em muted
- canEdit=true: campo de texto inline para editar URL
- Save: PATCH /jobs com o campo alterado (nao via custom_fields)
- Banner informativo quando `drive_folder_url` esta vazio (CA-05.6)

### 4.9 Componente PpmDecisionsList

**Props:**
```typescript
interface PpmDecisionsListProps {
  decisions: PpmDecision[]
  currentUserEmail: string
  userRole: string
  onChange: (decisions: PpmDecision[]) => void
}
```

**Comportamento:**
- Lista em ordem cronologica reversa (mais recente no topo)
- Botao "Nova decisao" abre PpmDecisionDialog
- Cada decisao mostra: data, descricao, responsavel, criado por
- Botoes editar/excluir: visivel para criador OU ceo/admin (RN-07)
- Exclusao pede confirmacao via AlertDialog

### 4.10 Pagina /settings/pre-producao

**Estrutura:**
- Titulo: "Templates de Checklist de Pre-Producao"
- Descricao: "Configure os checklists padrao para cada tipo de projeto"
- Botao "Carregar templates sugeridos" (visivel quando lista vazia, chama POST /seed)
- Grid de cards: um card por project_type com template configurado
- Card mostra: nome do template, tipo de projeto, quantidade de itens, botoes Editar/Desativar
- Botao "Novo template" abre ChecklistTemplateForm em dialog
- ChecklistTemplateForm: select de project_type, input de nome, lista de itens reordenaveis

**Acesso:** Mesmo guard das outras settings: roles `ceo`, `admin`.

**Integracao com settings layout:**

```typescript
// Em settings/layout.tsx, adicionar ao SETTINGS_TABS:
{ href: '/settings/pre-producao', label: 'Pre-Producao', icon: ClipboardList }
```

---

## 5. Fluxo de Dados Detalhado

### 5.1 Primeiro acesso a aba PPM (job sem checklist_items)

```
[Usuario abre aba PPM]
  -> TabPPM carrega job.custom_fields.ppm
  -> Detecta: checklist_items nao existe ou esta vazio
  -> Hook useResolveChecklistTemplate(job.project_type)
    -> GET /preproduction-templates?project_type=filme_publicitario
    -> Se encontrou: converte template.items em ChecklistItem[] (todos checked=false)
    -> Se nao encontrou: tenta project_type=null (padrao)
    -> Se nao encontrou nenhum: exibe fallback (US-2.2.06)
      -> "Usar como ponto de partida" (6 itens originais) ou "Iniciar vazio"
  -> Renderiza DynamicChecklist com os items
  -> isDirty = true (dados foram populados, precisa salvar)
```

### 5.2 Save da aba PPM

```
[Usuario clica Salvar]
  -> Calcula pre_production_complete:
     items.length > 0 && items.every(i => i.checked)
  -> Monta payload:
     {
       custom_fields: {
         ...existingCustomFields,
         ppm: {
           ...existingPpm,           // preserva status, date, location, etc.
           checklist_items: items,    // novo formato
           pre_production_complete: calculado,
           decisions: decisions,      // array atual
         }
       },
       ppm_url: form.document_url,   // campo dedicado do job
       kickoff_ppm_date: form.date,  // campo dedicado do job
     }
  -> PATCH /jobs/:id
  -> Invalidate jobKeys.detail(job.id)
```

### 5.3 Job com formato legado

```
[Usuario abre aba PPM de job antigo]
  -> TabPPM carrega job.custom_fields.ppm
  -> Detecta: checklist_items nao existe, mas checklist (objeto) existe
  -> Renderiza LegacyChecklistBanner:
     "Este checklist usa o formato antigo com 6 itens fixos.
      Ao salvar, sera convertido para o novo formato."
  -> Renderiza os 6 itens do objeto como read-only (checked conforme valores)
  -> No save:
     -> Converte checklist (objeto) para checklist_items (array):
        Object.entries(checklist).map(([key, checked], idx) => ({
          id: crypto.randomUUID(),
          label: LEGACY_LABELS[key],  // mapa de key para label pt-BR
          checked,
          position: idx + 1,
          is_extra: false,
        }))
     -> Salva com o novo formato (checklist_items)
     -> Campo checklist (objeto) e preservado no payload (nao remove)
```

### 5.4 Badge na listagem /jobs

```
[Listagem de jobs renderiza]
  -> Cada job tem custom_fields.ppm.pre_production_complete
  -> Se true: badge verde "Pronto"
  -> Se false E custom_fields.ppm.checklist_items existe: badge amarelo "PPM pendente"
  -> Se undefined/null: sem badge (job ainda nao tem checklist)
```

Nota: nenhuma query adicional. O campo ja vem no JSONB retornado pelo GET /jobs.

---

## 6. Plano de Implementacao

### Sprint 1: Backend -- Migration + Edge Function (1 dia)

| # | Tarefa | Estimativa |
|---|--------|------------|
| 1.1 | Migration: tabela `preproduction_checklist_templates` + RLS + indices + trigger + RPC seed | 2h |
| 1.2 | Edge Function `preproduction-templates/` -- router index.ts | 30min |
| 1.3 | Handler: `list.ts` (GET, filtro por project_type, apenas ativos) | 45min |
| 1.4 | Handler: `create.ts` (POST, valida unique active, gera IDs, desativa anterior se conflitar) | 1h |
| 1.5 | Handler: `update.ts` (PATCH, atualiza nome e/ou items) | 45min |
| 1.6 | Handler: `deactivate.ts` (DELETE, seta is_active=false) | 30min |
| 1.7 | Handler: `seed.ts` (POST, chama RPC seed_default_ppm_templates) | 30min |
| 1.8 | Deploy EF + testar com curl | 30min |

**Entregavel:** Migration aplicada, EF deployada, todos os endpoints testados.

### Sprint 2: Frontend -- TabPPM refatorada + Settings (1.5 dias)

| # | Tarefa | Estimativa |
|---|--------|------------|
| 2.1 | Tipos TypeScript: `preproduction.ts` | 30min |
| 2.2 | Query keys: `preproductionTemplateKeys` em query-keys.ts | 15min |
| 2.3 | Hook: `usePreproductionTemplates.ts` (CRUD + resolve) | 1h |
| 2.4 | Componente: `DynamicChecklist.tsx` (checklist de array) | 1.5h |
| 2.5 | Componente: `LegacyChecklistBanner.tsx` (banner + conversao) | 45min |
| 2.6 | Componente: `PreProductionBadge.tsx` (badge verde/amarelo) | 30min |
| 2.7 | Componente: `DocumentsPanel.tsx` (links do job) | 1h |
| 2.8 | Componente: `PpmDecisionsList.tsx` + `PpmDecisionDialog.tsx` | 1.5h |
| 2.9 | Componente: `AddChecklistItemDialog.tsx` (item extra) | 30min |
| 2.10 | Refatorar `TabPPM.tsx`: integrar novos componentes, manter mutation existente | 2h |
| 2.11 | Pagina `/settings/pre-producao/page.tsx` com ChecklistTemplateList + Form | 2h |
| 2.12 | Atualizar settings/layout.tsx com nova tab | 15min |

**Entregavel:** TabPPM refatorada funcional, pagina de settings funcional.

### Sprint 3: Polish + Badge na listagem + QA (0.5-1 dia)

| # | Tarefa | Estimativa |
|---|--------|------------|
| 3.1 | Badge PreProductionBadge na listagem /jobs (card do job) | 45min |
| 3.2 | Badge no JobHeader do job detail | 30min |
| 3.3 | Dark mode review em todos os componentes novos | 30min |
| 3.4 | Sugestao de itens US-2.2.06 (fallback com botao "Usar como ponto de partida") | 45min |
| 3.5 | QA: testar cenarios da spec (7 testes de aceite) | 1.5h |
| 3.6 | Fix de issues encontrados no QA | 1h |
| 3.7 | Compatibilidade retroativa: testar com dados legados reais | 30min |

**Entregavel:** Onda 2.2 completa, todos os criterios de done verificados.

---

## 7. Riscos e Mitigacoes

### R1: Merge de custom_fields JSONB pode sobrescrever dados

**Risco:** O PATCH /jobs faz `.update({ custom_fields: payload })` que substitui o objeto inteiro se nao houver merge no Postgres.

**Mitigacao:** O frontend ja faz `{ ...existingCustomFields, ppm: { ...existingPpm, ...newData } }` antes de enviar (pattern existente em TabPPM.tsx, linhas 160-175). O Supabase `.update()` com JSONB faz replace da coluna, mas como o frontend envia o objeto completo com merge, nao ha perda. Testar com cenario onde duas pessoas editam PPM e custom_fields.elenco simultaneamente -- o ultimo save vence para `ppm` mas preserva `elenco`. Risco baixo dado que a aba PPM e raramente editada por 2 pessoas ao mesmo tempo.

### R2: Template desativado enquanto usuario esta editando aba PPM

**Risco:** CEO desativa um template enquanto outro usuario esta com a aba PPM aberta e sem checklist salvo.

**Mitigacao:** O template e copiado para o job no momento em que o usuario abre a aba (RN-03: "copia dos itens do template no momento em que foi carregado"). Uma vez copiado para `checklist_items`, o job nao depende mais do template. O hook `useResolveChecklistTemplate` roda apenas quando `checklist_items` esta vazio.

### R3: UNIQUE partial index com NULL em project_type

**Risco:** Postgres trata NULLs como distintos em UNIQUE constraints, permitindo multiplos templates padrao ativos.

**Mitigacao:** Dois indices separados (secao 2.1): `uq_ppm_template_active_type` para `project_type IS NOT NULL` e `uq_ppm_template_active_default` para `project_type IS NULL`. O segundo garante no maximo 1 template padrao ativo por tenant.

### R4: Volume de decisoes em JSONB

**Risco:** Se um job acumular centenas de decisoes, o campo JSONB fica grande.

**Mitigacao:** Na pratica, PPMs tem 3-15 decisoes. O frontend ja renderiza `custom_fields` inteiro em cada load. Se um tenant extremo criar 100+ decisoes por job, migraremos para tabela. Probabilidade baixa.

### R5: Fallback dos 6 itens originais pode confundir

**Risco:** Se o tenant nunca configurou templates, todos os jobs caem no fallback com os 6 itens. O usuario pode achar que o sistema esta "quebrado".

**Mitigacao:** US-2.2.06: sugestao de itens com banner explicativo + botao "Usar como ponto de partida". A pagina de settings mostra banner "Nenhum template configurado" com CTA para o seed. O seed e chamavel com um clique.

---

## 8. Checklist de Verificacao Pre-Implementacao

Antes de iniciar cada sprint, verificar:

- [ ] Migration: funcao `set_updated_at()` ja existe no banco (usada pelo trigger)
- [ ] Migration: funcao `get_tenant_id()` ja existe (usada pelas RLS policies)
- [ ] Migration: tipo `project_type` ENUM existe com os 10 valores
- [ ] Frontend: `ClipboardList` icon esta disponivel no lucide-react (para settings tab)
- [ ] Frontend: `crypto.randomUUID()` disponivel no browser (sim, todos browsers modernos)
- [ ] Backend: `UpdateJobSchema` aceita `custom_fields` como `z.record(z.unknown())` (confirmado na leitura do codigo)
- [ ] Backend: PATCH /jobs handler faz merge correto de JSONB (confirmado: frontend envia objeto completo)

---

## 9. O que NAO muda

Para clareza, listando explicitamente o que permanece inalterado:

| Componente | Por que nao muda |
|------------|------------------|
| EF `jobs` (index.ts, handlers/) | PATCH /jobs continua sendo o endpoint de save da aba PPM; nenhum handler novo necessario |
| `UpdateJobSchema` em _shared/validation.ts | Ja aceita `custom_fields: z.record(z.unknown())` e todas as URLs |
| `JobDetailTabs.tsx` | PPM ja esta registrada no grupo Producao; nenhuma tab nova |
| `constants.ts` JOB_TAB_GROUPS | PPM ja esta la como `{ id: 'ppm', label: 'PPM', icon: 'FileCheck' }` |
| Campos URL na tabela `jobs` | Todos os 6 campos necessarios ja existem como colunas |
| Indice GIN em `custom_fields` | Ja cobre queries no novo formato JSONB |

---

*Documento gerado em 2026-03-06. Baseado na analise completa do codebase: TabPPM.tsx (450 linhas), jobs/update.ts, validation.ts, attendance/ (18 handlers como referencia), settings/ (layout e guard), constants.ts (tabs e areas), query-keys.ts (pattern de keys).*
