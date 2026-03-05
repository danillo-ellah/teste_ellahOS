# Cronograma/Timeline - Arquitetura Tecnica

**Autor:** Tech Lead / Arquiteto
**Data:** 2026-03-04
**Status:** PROPOSTA
**Modulo:** Cronograma (Gantt por job)

---

## 1. Visao Geral

O modulo Cronograma adiciona uma visualizacao Gantt editavel por job, mostrando as fases de producao com datas de inicio/fim. Deve ser exportavel em PDF para enviar ao cliente e funcionar em mobile (visualizacao simplificada).

### Fluxo principal

```
Criar Job -> Auto-populate fases (template do tenant) -> Editar fases -> Visualizar Gantt -> Exportar PDF -> Enviar ao cliente
```

### Principios de design

- **Template-driven:** cada tenant configura seu template de fases padrao em `tenants.settings.timeline_phases`
- **Gantt custom com CSS Grid:** sem dependencia de lib pesada (vis-timeline = 300KB+, recharts nao faz Gantt)
- **Dados normalizados:** tabela `job_phases` com uma row por fase (nao JSONB monolitico)
- **Integracao bidirecional:** conecta com `job_shooting_dates` e `jobs.expected_delivery_date`

---

## 2. Schema do Banco

### 2.1. Tabela `job_phases`

```sql
-- Migration: 20260305100000_create_job_phases.sql
SET search_path TO public;

CREATE TABLE IF NOT EXISTS job_phases (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id          UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Fase
  phase_key       TEXT        NOT NULL,
  -- chave unica por job (ex: 'orcamento', 'pre_producao', 'filmagem')
  -- permite lookup programatico + i18n futuro
  phase_label     TEXT        NOT NULL,
  -- label customizavel (ex: 'Pre-Producao', 'Filmagem Reel')
  phase_color     TEXT        NOT NULL DEFAULT '#3B82F6',
  -- hex color para o Gantt bar
  phase_icon      TEXT,
  -- nome do icone Lucide (opcional, ex: 'Camera', 'Scissors')

  -- Datas
  start_date      DATE        NOT NULL,
  end_date        DATE        NOT NULL,
  skip_weekends   BOOLEAN     NOT NULL DEFAULT false,
  -- se true, a barra visual desconsidera sabados/domingos no calculo de "dias uteis"
  -- mas as datas reais permanecem (start_date/end_date sao calendario corrido)

  -- Progresso
  progress        INTEGER     NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  -- percentual de conclusao (0-100), editavel manualmente ou auto via status do job

  -- Dependencia (simples: fase B depende de fase A terminar)
  depends_on_id   UUID        REFERENCES job_phases(id) ON DELETE SET NULL,
  -- se preenchido, start_date >= depends_on.end_date (validado na EF, nao constraint)

  -- Observacoes
  notes           TEXT,

  -- Ordenacao
  sort_order      INTEGER     NOT NULL DEFAULT 0,

  -- Controle
  is_locked       BOOLEAN     NOT NULL DEFAULT false,
  -- fases locked nao podem ser editadas por coordenador (apenas admin/produtor_executivo)
  created_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE(job_id, phase_key),
  CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_phases_tenant ON job_phases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_job ON job_phases(job_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_depends ON job_phases(depends_on_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_dates ON job_phases(job_id, start_date, end_date);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_job_phases_updated_at ON job_phases;
CREATE TRIGGER trg_job_phases_updated_at
  BEFORE UPDATE ON job_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS (padrao tenant-based, identico a todas as tabelas do projeto)
ALTER TABLE job_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_phases_select ON job_phases;
CREATE POLICY job_phases_select ON job_phases
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_phases_insert ON job_phases;
CREATE POLICY job_phases_insert ON job_phases
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_phases_update ON job_phases;
CREATE POLICY job_phases_update ON job_phases
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_tenant_id()));

DROP POLICY IF EXISTS job_phases_delete ON job_phases;
CREATE POLICY job_phases_delete ON job_phases
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT get_tenant_id()));

COMMENT ON TABLE job_phases IS 'Fases do cronograma de producao por job — alimenta Gantt chart';
COMMENT ON COLUMN job_phases.phase_key IS 'Chave unica por job (ex: orcamento, filmagem) — usado para auto-populate e integracao';
COMMENT ON COLUMN job_phases.depends_on_id IS 'Dependencia sequencial — validada na EF, nao via constraint DB';
COMMENT ON COLUMN job_phases.skip_weekends IS 'Se true, Gantt exibe somente dias uteis na barra visual';
COMMENT ON COLUMN job_phases.progress IS 'Percentual de conclusao (0-100), manual ou auto via status do job';
```

### 2.2. Template de fases no tenant settings

Nao cria tabela extra. Usa `tenants.settings` JSONB (padrao existente, mesmo usado por OD).

```jsonc
// tenants.settings.timeline_phases (array de objetos)
[
  {
    "phase_key": "orcamento",
    "phase_label": "Orcamento",
    "phase_color": "#F59E0B",
    "phase_icon": "Calculator",
    "default_duration_days": 3,
    "sort_order": 0
  },
  {
    "phase_key": "briefing",
    "phase_label": "Briefing",
    "phase_color": "#8B5CF6",
    "phase_icon": "FileText",
    "default_duration_days": 2,
    "sort_order": 1
  },
  {
    "phase_key": "pre_producao",
    "phase_label": "Pre-Producao",
    "phase_color": "#3B82F6",
    "phase_icon": "ClipboardList",
    "default_duration_days": 10,
    "sort_order": 2
  },
  {
    "phase_key": "ppm",
    "phase_label": "PPM",
    "phase_color": "#06B6D4",
    "phase_icon": "FileCheck",
    "default_duration_days": 1,
    "sort_order": 3
  },
  {
    "phase_key": "filmagem",
    "phase_label": "Filmagem",
    "phase_color": "#EF4444",
    "phase_icon": "Camera",
    "default_duration_days": 3,
    "sort_order": 4
  },
  {
    "phase_key": "pos_producao",
    "phase_label": "Pos-Producao",
    "phase_color": "#A855F7",
    "phase_icon": "Scissors",
    "default_duration_days": 15,
    "sort_order": 5
  },
  {
    "phase_key": "finalizacao",
    "phase_label": "Finalizacao",
    "phase_color": "#10B981",
    "phase_icon": "CheckCircle",
    "default_duration_days": 5,
    "sort_order": 6
  },
  {
    "phase_key": "entrega",
    "phase_label": "Entrega",
    "phase_color": "#22C55E",
    "phase_icon": "Send",
    "default_duration_days": 1,
    "sort_order": 7
  }
]
```

### 2.3. Decisao: tabela normalizada vs JSONB

**Escolha: tabela normalizada (`job_phases`).**

Motivos:
- Permite queries SQL diretas (ex: "todos os jobs em fase Filmagem esta semana")
- RLS nativo por row (JSONB precisaria de RPC wrapper)
- Permite `depends_on_id` como FK real
- Permite indices em datas para queries de calendario
- Volume: ~8-12 rows por job, tipicamente < 1000 rows por tenant = trivial

---

## 3. Edge Function: `job-timeline`

### 3.1. Estrutura de arquivos

```
supabase/functions/job-timeline/
  index.ts              -- Router (padrao identico a shooting-day-order)
  handlers/
    list.ts             -- GET /?job_id=X
    create.ts           -- POST / (criar fase individual)
    update.ts           -- PATCH /:id (atualizar fase)
    delete.ts           -- DELETE /:id
    reorder.ts          -- POST /reorder (array de {id, sort_order})
    bulk-create.ts      -- POST /bulk-create (auto-populate do template)
    export-data.ts      -- GET /:id/export-data (dados formatados para PDF)
```

### 3.2. Rotas

| Metodo | Rota | Handler | Descricao |
|--------|------|---------|-----------|
| GET | `/job-timeline?job_id=X` | list | Lista fases do job ordenadas por sort_order |
| POST | `/job-timeline` | create | Cria uma fase individual |
| PATCH | `/job-timeline/:id` | update | Atualiza fase (datas, label, cor, progresso, notas) |
| DELETE | `/job-timeline/:id` | delete | Remove fase |
| POST | `/job-timeline/reorder` | reorder | Reordena fases (recebe array `[{id, sort_order}]`) |
| POST | `/job-timeline/bulk-create` | bulk-create | Cria todas as fases do template do tenant |
| GET | `/job-timeline/export-data?job_id=X` | export-data | Retorna dados formatados para PDF client-side |

### 3.3. Handler: `bulk-create` (auto-populate)

Logica:
1. Recebe `{ job_id, start_date? }` — se `start_date` nao informado, usa `jobs.briefing_date` ou hoje
2. Busca `tenants.settings.timeline_phases` (template do tenant)
3. Se nao existe template, usa DEFAULT_PHASES hardcoded (as 8 fases padrao)
4. Calcula datas sequenciais: fase N.start_date = fase (N-1).end_date + 1 dia
5. Se job tem `shooting_dates[]`, tenta alinhar a fase "filmagem" com a primeira data
6. Insere todas as fases em batch (`INSERT INTO job_phases ... VALUES ...`)
7. Retorna as fases criadas

**Idempotencia:** se job ja tem fases, retorna erro `CONFLICT` (409). O usuario deve deletar e recriar, ou editar individualmente.

### 3.4. Handler: `export-data`

Retorna JSON otimizado para renderizacao PDF no frontend:

```typescript
interface TimelineExportData {
  job: {
    code: string
    title: string
    client_name: string
    agency_name: string | null
  }
  phases: Array<{
    label: string
    color: string
    start_date: string  // YYYY-MM-DD
    end_date: string
    duration_days: number
    progress: number
    notes: string | null
  }>
  date_range: {
    min: string  // YYYY-MM-DD
    max: string
    total_days: number
  }
  generated_at: string  // ISO timestamp
  tenant: {
    company_name: string
    logo_url: string | null
    brand_color: string | null
  }
}
```

### 3.5. Validacao (Zod schemas)

```typescript
// create.ts
const createSchema = z.object({
  job_id: z.string().uuid(),
  phase_key: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
  phase_label: z.string().min(1).max(200),
  phase_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  phase_icon: z.string().max(50).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  skip_weekends: z.boolean().default(false),
  progress: z.number().int().min(0).max(100).default(0),
  depends_on_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).default(0),
})

// update.ts
const updateSchema = createSchema.partial().omit({ job_id: true })

// bulk-create.ts
const bulkCreateSchema = z.object({
  job_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// reorder.ts
const reorderSchema = z.object({
  job_id: z.string().uuid(),
  items: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })).min(1).max(30),
})
```

### 3.6. Roles permitidas

Segue padrao do projeto: `admin`, `ceo`, `produtor_executivo`, `coordenador`, `diretor` podem editar. `financeiro`, `atendimento`, `comercial` podem visualizar (GET). `freelancer` bloqueado.

---

## 4. Frontend

### 4.1. Componentes

```
frontend/src/components/job-detail/tabs/
  TabCronograma.tsx          -- Componente principal da aba
  GanttChart.tsx             -- Visualizacao Gantt com CSS Grid
  PhaseDialog.tsx            -- Dialog para criar/editar fase
  TimelinePdfExport.ts       -- Funcao de export PDF (jsPDF programatico)
```

### 4.2. TabCronograma.tsx

Segue padrao identico a `TabOrdemDoDia.tsx`:
- useQuery para buscar fases via `apiGet('job-timeline', { job_id })`
- useMutation para create/update/delete
- Estado vazio com EmptyTabState + botao "Gerar Cronograma" (chama bulk-create)
- Header com contagem de fases + botao "Adicionar Fase" + botao "Exportar PDF"
- Lista de PhaseCards OU visualizacao GanttChart (toggle)

**Dois modos de visualizacao (toggle):**
1. **Lista:** tabela editavel inline (mobile-friendly, padrao)
2. **Gantt:** visualizacao de barras horizontais (melhor em desktop)

### 4.3. GanttChart.tsx - Abordagem CSS Grid

**Decisao: Gantt custom com CSS Grid (sem lib externa).**

Motivos:
- vis-timeline: 300KB+ gzipped, API complexa, problemas com React 18+
- recharts: nao suporta Gantt nativamente, workaround fragil
- dhtmlx-gantt: licenca comercial, 500KB+
- frappe-gantt: 50KB mas sem React wrapper, sem TypeScript types
- **CSS Grid:** 0KB extra, controle total do visual, dark mode nativo via Tailwind

Estrutura do Gantt:

```
+--------+--Mon--Tue--Wed--Thu--Fri--Sat--Sun--Mon--+
| Orcam. | [========]                                |
| Brief. |          [====]                           |
| Pre    |               [====================]      |
| PPM    |                                    [=]    |
| Film.  |                                      [==]|
| Pos    |                                         ..|
+--------+-------------------------------------------+
```

Implementacao:
- **Eixo Y:** lista de fases (CSS Grid rows)
- **Eixo X:** dias do periodo (CSS Grid columns, 1 coluna por dia)
- **Barras:** div absoluto posicionado por `grid-column: start / end`
- **Cores:** variavel por fase (`phase_color`)
- **Scroll horizontal:** container com `overflow-x: auto` para periodos longos
- **Hoje:** linha vertical vermelha pontilhada
- **Hover:** tooltip com datas + duracao + progresso
- **Drag-to-resize:** opcional (fase 2, nao MVP)

```tsx
// Pseudocodigo simplificado
function GanttChart({ phases, dateRange }: GanttProps) {
  const days = eachDayOfInterval({ start: dateRange.min, end: dateRange.max })
  const colWidth = 32 // px por dia

  return (
    <div className="overflow-x-auto border rounded-lg">
      {/* Header: dias */}
      <div className="grid" style={{ gridTemplateColumns: `200px repeat(${days.length}, ${colWidth}px)` }}>
        <div className="sticky left-0 bg-background z-10 p-2 font-semibold text-xs border-r">
          Fase
        </div>
        {days.map(day => (
          <div key={day} className="text-center text-[10px] text-muted-foreground p-1 border-r">
            {format(day, 'dd')}
            <br />
            {format(day, 'EEE', { locale: ptBR })}
          </div>
        ))}
      </div>

      {/* Rows: fases */}
      {phases.map(phase => {
        const startCol = differenceInDays(phase.start_date, dateRange.min) + 2 // +2 = 1-indexed + label col
        const span = differenceInDays(phase.end_date, phase.start_date) + 1

        return (
          <div className="grid" style={{ gridTemplateColumns: `200px repeat(${days.length}, ${colWidth}px)` }}>
            {/* Label */}
            <div className="sticky left-0 bg-background z-10 p-2 text-sm border-r truncate">
              {phase.phase_label}
            </div>
            {/* Bar */}
            <div
              className="h-6 rounded my-1 cursor-pointer"
              style={{
                gridColumn: `${startCol} / span ${span}`,
                backgroundColor: phase.phase_color,
                opacity: 0.85,
              }}
            />
          </div>
        )
      })}

      {/* Linha "Hoje" */}
      {/* ... overlay absoluto na coluna do dia atual */}
    </div>
  )
}
```

### 4.4. Mobile

Em telas < 768px:
- **Gantt oculto** (muito estreito para ser util)
- **Modo lista** com cards de fase (PhaseCard):
  - Barra de progresso colorida
  - Datas inicio/fim
  - Duracao em dias
  - Badge de status (no prazo / atrasada / concluida)
  - Swipe para editar/remover

### 4.5. PhaseDialog.tsx

Dialog (Sheet no mobile) para criar/editar fase:
- Campos: label, cor (color picker), icone (select), datas (date pickers), skip_weekends (switch), progresso (slider), notas (textarea)
- Depende de: select com fases existentes do job
- Preview da cor: barra colorida abaixo do label

### 4.6. Export PDF (jsPDF programatico)

Segue padrao identico ao od-pdf-generator.ts (OD) e claquete:

```typescript
// timeline-pdf-generator.ts
export function generateTimelinePdf(data: TimelineExportData): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header: logo + titulo do job + cliente
  // Tabela de fases: Label | Inicio | Fim | Duracao | Progresso
  // Gantt visual: barras coloridas proporcionais ao tempo
  // Footer: gerado por ELLAHOS + data

  return doc
}
```

Pagina A4 landscape:
- **Metade superior:** tabela de fases (label, datas, duracao, progresso)
- **Metade inferior:** Gantt visual simplificado (barras coloridas, sem interatividade)
- **Branding:** logo do tenant + brand_color nos headers

---

## 5. Integracao com Modulos Existentes

### 5.1. `job_shooting_dates`

Quando a fase "filmagem" existe e o job tem `shooting_dates`:
- `bulk-create` alinha `start_date` = min(shooting_dates), `end_date` = max(shooting_dates)
- Ao editar shooting_dates, exibir warning: "Datas de filmagem mudaram. Atualizar cronograma?"
- NAO atualizar automaticamente (evita surpresas — usuario decide)

### 5.2. `jobs.expected_delivery_date`

- `bulk-create` usa `expected_delivery_date` para a fase "entrega" se disponivel
- Ao exportar PDF, mostra deadline vs data planejada

### 5.3. `jobs.status` (auto-progress)

Opcional (configuravel por tenant em settings):
- Quando job muda de status, calcular progresso das fases automaticamente
- Mapeamento: `orcamento_elaboracao` = fase "orcamento" 50%, `pre_producao` = fase "pre_producao" 50%, etc.
- Default: desligado (progresso manual)

### 5.4. Webhook n8n

Quando fase e criada/atualizada/deletada, disparar webhook (se configurado) via `integration-processor`:
- Evento: `timeline_phase_changed`
- Payload: `{ job_id, phase_key, phase_label, start_date, end_date, progress, action: 'created'|'updated'|'deleted' }`

---

## 6. Registro da Aba no Job Detail

### 6.1. constants.ts

Adicionar `'cronograma'` ao `JobDetailTabId` e ao grupo "Producao" do `JOB_TAB_GROUPS`:

```typescript
// Em JobDetailTabId union type:
| 'cronograma'

// Em JOB_DETAIL_TABS:
{ id: 'cronograma', label: 'Cronograma', icon: 'GanttChart' }

// Em JOB_TAB_GROUPS, grupo "Producao", apos 'ppm' e antes de 'diarias':
{ id: 'cronograma', label: 'Cronograma', icon: 'GanttChart' }
```

Icone: `GanttChart` do Lucide (disponivel desde v0.312).

### 6.2. JobDetailTabs.tsx

Adicionar import de `TabCronograma` e case no switch/map de renderizacao.

---

## 7. Tipos TypeScript

```typescript
// types/timeline.ts

export interface JobPhase {
  id: string
  tenant_id: string
  job_id: string
  phase_key: string
  phase_label: string
  phase_color: string
  phase_icon: string | null
  start_date: string  // YYYY-MM-DD
  end_date: string    // YYYY-MM-DD
  skip_weekends: boolean
  progress: number
  depends_on_id: string | null
  notes: string | null
  sort_order: number
  is_locked: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PhaseTemplate {
  phase_key: string
  phase_label: string
  phase_color: string
  phase_icon: string | null
  default_duration_days: number
  sort_order: number
}

export interface TimelineExportData {
  job: {
    code: string
    title: string
    client_name: string
    agency_name: string | null
  }
  phases: Array<{
    label: string
    color: string
    start_date: string
    end_date: string
    duration_days: number
    progress: number
    notes: string | null
  }>
  date_range: {
    min: string
    max: string
    total_days: number
  }
  generated_at: string
  tenant: {
    company_name: string
    logo_url: string | null
    brand_color: string | null
  }
}
```

---

## 8. Estimativa de Esforco

| Item | Complexidade | Horas estimadas |
|------|-------------|-----------------|
| Migration SQL | Baixa | 0.5h |
| Edge Function (7 handlers) | Media | 3h |
| TabCronograma + PhaseDialog | Media | 2h |
| GanttChart (CSS Grid) | Alta | 4h |
| PDF Export (jsPDF) | Media | 2h |
| Integracao (shooting dates, status) | Baixa | 1h |
| Registro aba + tipos TS | Baixa | 0.5h |
| Testes + QA | Media | 2h |
| **Total** | | **15h** |

### Prioridade de implementacao

1. **MVP (8h):** Migration + EF (list, create, update, delete, bulk-create) + TabCronograma modo lista + PhaseDialog
2. **Gantt (4h):** GanttChart CSS Grid + toggle lista/gantt
3. **PDF + Polish (3h):** Export PDF + integracao com shooting_dates + reorder

---

## 9. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Gantt CSS Grid nao escala para jobs longos (>90 dias) | Media | Media | Scroll horizontal + zoom out (coluna = semana ao inves de dia) |
| Drag-to-resize conflita com scroll no mobile | Alta | Baixa | Adiado para fase 2; MVP usa dialog para editar datas |
| Template do tenant nao configurado | Baixa | Baixa | Fallback para DEFAULT_PHASES hardcoded |
| Performance com muitos jobs abertos simultaneamente | Baixa | Baixa | Lazy load do Gantt (so renderiza quando aba ativa) |

---

## 10. Alternativas Consideradas e Descartadas

### 10.1. JSONB monolitico em `jobs.custom_fields`

Descartada: impossibilita queries SQL diretas, indices, FK para dependencias, e RLS granular.

### 10.2. Biblioteca frappe-gantt

Descartada: sem TypeScript types nativos, sem React wrapper oficial, estilo nao combina com shadcn/ui, 50KB adicionais.

### 10.3. vis-timeline / vis-network

Descartada: 300KB+ gzipped, API imperativa (conflita com React declarativo), problemas conhecidos com React 18 StrictMode.

### 10.4. recharts (Bar chart horizontal)

Descartada: workaround fragil (BarChart rotacionado), sem suporte nativo a datas no eixo X, sem dependencias entre barras.

### 10.5. @dhtmlx/gantt

Descartada: licenca GPL (ou comercial paga), 500KB+, overkill para o caso de uso.

---

## 11. ADR Relacionado

Ver: `docs/decisions/ADR-026-cronograma-gantt-css-grid.md`
