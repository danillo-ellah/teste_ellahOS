# G-02: Dashboard Financeiro por Job — Arquitetura Tecnica

**Autor:** Tech Lead / Arquiteto
**Data:** 2026-03-04
**Status:** APROVADO PARA IMPLEMENTACAO

---

## 1. Diagnostico: O Que Ja Existe

Antes de projetar qualquer coisa nova, e essencial mapear o que ja temos implementado e funcionando.

### 1.1 Backend Existente

| Componente | Status | O que faz |
|---|---|---|
| **EF `financial-dashboard`** | Deployed | 2 handlers: `job/:jobId` (GET) e `tenant` (GET) |
| **Handler `job-dashboard.ts`** | Completo | Agrega KPIs, alertas, resumo por categoria, calendario, vencidos, NFs pendentes |
| **View `vw_resumo_custos_job`** | Ativa no banco | CTE com aggregacao por categoria + linha TOTAL sintetica |
| **View `vw_calendario_pagamentos`** | Ativa no banco | Agrupamento por data/job com contagens de pendentes/pagos |
| **Handler `budget-summary.ts`** (cost-items) | Deployed | Resumo orcamentario com margem, balance, breakdown por categoria |

### 1.2 Frontend Existente

| Componente | Status | O que faz |
|---|---|---|
| **`/jobs/[id]/financeiro/dashboard/page.tsx`** | Implementado | KPI cards, alertas, tabela de categorias, proximos pagamentos |
| **`useJobFinancialDashboard` hook** | Implementado | useQuery com staleTime 5min, chama `financial-dashboard/job/:id` |
| **Types em `cost-management.ts`** | Completos | `JobFinancialDashboard`, `CostCategorySummary`, `PaymentCalendarEntry`, `FinancialDashboardAlert` |
| **`finDashboardKeys`** | Implementado | Query keys para job e tenant |

### 1.3 O Que FALTA (Gap Real)

O dashboard existente e funcional mas faltam:

1. **Graficos visuais** — Recharts ja instalado mas nao usado na pagina de dashboard do job
2. **Timeline de gastos** — Nenhuma agregacao temporal (por mes/semana) no backend
3. **Comparativo orcado vs real** — Dados existem mas sem visualizacao comparativa
4. **Status breakdown visual** — Donut/bar chart de payment_status e item_status
5. **Top vendors** — Quais fornecedores concentram mais gasto
6. **Margem real vs planejada** — Evolucao da margem ao longo do tempo

---

## 2. Decisao Arquitetural: Estender, Nao Recriar

**Decisao:** Adicionar um novo handler `job-dashboard-v2.ts` na EF `financial-dashboard` existente, expondo uma rota adicional `GET /financial-dashboard/job/:jobId/charts`. O handler original permanece inalterado (backward compatible). O frontend ganha novos componentes Recharts na mesma pagina.

**Justificativa:**
- A EF `financial-dashboard` ja tem auth, CORS, routing — nao faz sentido criar outra
- O handler original retorna dados tabulares (KPIs + tabela) que continuam uteis
- Os graficos precisam de dados agregados diferente (por periodo, por status) — handler separado evita poluir o response existente
- Duas queries menores sao melhores que uma query gigante (tempo de resposta)

---

## 3. Endpoints

### 3.1 Endpoint Existente (nao muda)

```
GET /financial-dashboard/job/:jobId
```

Retorna: KPIs, alertas, by_category, payment_calendar, overdue_items, pending_nf.

### 3.2 Novo Endpoint: Charts Data

```
GET /financial-dashboard/job/:jobId/charts
```

**Query params opcionais:**
| Param | Tipo | Default | Descricao |
|---|---|---|---|
| `period` | `monthly` ou `weekly` | `monthly` | Granularidade da timeline |

**Roles permitidos:** `financeiro`, `produtor_executivo`, `admin`, `ceo` (mesmo do handler existente)

**Response (200):**

```jsonc
{
  "data": {
    // 1. Timeline de gastos acumulados (budget_value como referencia constante)
    "spending_timeline": [
      {
        "period": "2026-01",        // YYYY-MM (monthly) ou YYYY-Wnn (weekly)
        "period_label": "Jan/26",   // Label formatado para o eixo X
        "estimated_cumulative": 45000.00,  // acumulado de total_with_overtime
        "paid_cumulative": 32000.00,       // acumulado de actual_paid_value (pagos)
        "paid_in_period": 12000.00,        // pago NESTE periodo (barra)
        "items_paid_in_period": 3           // qtd de itens pagos no periodo
      }
      // ... mais periodos
    ],
    "budget_reference_line": 150000.00,  // closed_value do job (linha horizontal)

    // 2. Breakdown por status de pagamento (donut chart)
    "payment_status_breakdown": [
      { "status": "pendente",  "count": 12, "total": 45000.00 },
      { "status": "pago",      "count": 8,  "total": 32000.00 },
      { "status": "cancelado", "count": 2,  "total": 5000.00 }
    ],

    // 3. Breakdown por status do item (horizontal bar chart)
    "item_status_breakdown": [
      { "status": "orcado",         "count": 5,  "total": 20000.00 },
      { "status": "aguardando_nf",  "count": 3,  "total": 12000.00 },
      { "status": "nf_pedida",      "count": 2,  "total": 8000.00 },
      { "status": "nf_recebida",    "count": 1,  "total": 5000.00 },
      { "status": "nf_aprovada",    "count": 1,  "total": 5000.00 },
      { "status": "pago",           "count": 8,  "total": 32000.00 },
      { "status": "cancelado",      "count": 2,  "total": 5000.00 }
    ],

    // 4. Top vendors por gasto (bar chart horizontal)
    "top_vendors": [
      { "vendor_id": "uuid", "vendor_name": "Fulano", "total": 18000.00, "items_count": 4, "pct_of_total": 22.5 },
      { "vendor_id": "uuid", "vendor_name": "Ciclano", "total": 12000.00, "items_count": 3, "pct_of_total": 15.0 }
      // ... top 10
    ],

    // 5. Comparativo orcado vs real por categoria (grouped bar chart)
    "budget_vs_actual": [
      {
        "item_number": 1,
        "item_name": "Equipe Tecnica",
        "budgeted": 30000.00,
        "actual_paid": 28000.00,
        "actual_estimated": 31000.00,  // total_with_overtime (inclui nao-pagos)
        "variance_pct": -3.33          // (actual_estimated - budgeted) / budgeted * 100
      }
      // ... por categoria
    ]
  }
}
```

---

## 4. Query SQL do Handler `job-dashboard-charts.ts`

O handler executa 5 queries em paralelo via `Promise.all` — todas leves pois filtram por `job_id` (indice existente `idx_cost_items_tenant_job`).

### 4.1 Spending Timeline (Monthly)

```sql
-- CTE para agregar pagamentos por periodo
WITH paid_by_period AS (
  SELECT
    to_char(payment_date, 'YYYY-MM') AS period,
    to_char(payment_date, 'Mon/YY') AS period_label,
    SUM(COALESCE(actual_paid_value, total_with_overtime)) AS paid_in_period,
    COUNT(*) AS items_paid_in_period
  FROM cost_items
  WHERE job_id = $1
    AND tenant_id = $2
    AND payment_status = 'pago'
    AND payment_date IS NOT NULL
    AND deleted_at IS NULL
  GROUP BY to_char(payment_date, 'YYYY-MM'), to_char(payment_date, 'Mon/YY')
),
-- CTE para budget (estimated) por data de criacao/vencimento
estimated_by_period AS (
  SELECT
    to_char(COALESCE(payment_due_date, created_at::date), 'YYYY-MM') AS period,
    SUM(total_with_overtime) AS estimated_in_period
  FROM cost_items
  WHERE job_id = $1
    AND tenant_id = $2
    AND item_status != 'cancelado'
    AND deleted_at IS NULL
    AND is_category_header = false
  GROUP BY to_char(COALESCE(payment_due_date, created_at::date), 'YYYY-MM')
),
-- Unir periodos e calcular acumulados
all_periods AS (
  SELECT DISTINCT period FROM paid_by_period
  UNION
  SELECT DISTINCT period FROM estimated_by_period
)
SELECT
  ap.period,
  COALESCE(pp.period_label, to_char(to_date(ap.period, 'YYYY-MM'), 'Mon/YY')) AS period_label,
  COALESCE(ep.estimated_in_period, 0) AS estimated_in_period,
  COALESCE(pp.paid_in_period, 0) AS paid_in_period,
  COALESCE(pp.items_paid_in_period, 0) AS items_paid_in_period,
  -- Acumulados calculados via window function
  SUM(COALESCE(ep.estimated_in_period, 0)) OVER (ORDER BY ap.period) AS estimated_cumulative,
  SUM(COALESCE(pp.paid_in_period, 0)) OVER (ORDER BY ap.period) AS paid_cumulative
FROM all_periods ap
LEFT JOIN paid_by_period pp ON pp.period = ap.period
LEFT JOIN estimated_by_period ep ON ep.period = ap.period
ORDER BY ap.period;
```

**Nota de implementacao:** Como o Supabase client nao suporta raw SQL diretamente com window functions dessa complexidade, a alternativa e usar `client.rpc()` chamando uma function SQL, OU fazer a timeline aggregation no handler TypeScript (fetch de cost_items com campos necessarios e agregar em memoria). Dado que um job tipicamente tem 30-100 cost_items, a agregacao em memoria e perfeitamente viavel e evita criar mais objetos no banco.

**Decisao: Agregacao em memoria no handler TypeScript.** Motivos:
1. Maximo ~100 cost_items por job (fetch rapido com indice)
2. Nao requer migration nova (zero downtime)
3. Mais facil de testar e debugar
4. Evita proliferacao de functions SQL no banco

### 4.2 Queries Supabase (executadas em paralelo)

```typescript
// Todas as queries compartilham este filtro base
const baseFilter = {
  job_id: jobId,
  tenant_id: auth.tenantId,
  deleted_at: null,
};

const [allItemsResult, jobResult] = await Promise.all([
  // Query unica: todos os cost_items do job (nao-headers, nao-deletados)
  client
    .from('cost_items')
    .select(`
      item_number, service_description, is_category_header,
      total_with_overtime, actual_paid_value,
      item_status, payment_status,
      payment_date, payment_due_date,
      vendor_id, vendor_name_snapshot,
      created_at
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('item_number')
    .order('sub_item_number'),

  // Job para closed_value
  client
    .from('jobs')
    .select('closed_value')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .single(),
]);
```

Toda a agregacao (timeline, breakdowns, top vendors, budget vs actual) e feita em TypeScript a partir do array `allItemsResult.data`. Isso significa **uma unica query** ao banco para os cost_items + 1 para o job.

### 4.3 Logica de Agregacao TypeScript (pseudo-codigo)

```typescript
function aggregateChartData(
  items: CostItemRow[],
  closedValue: number,
  period: 'monthly' | 'weekly',
) {
  const dataItems = items.filter(i => !i.is_category_header);
  const headers = items.filter(i => i.is_category_header);

  // --- Spending Timeline ---
  const periodMap = new Map<string, { estimated: number; paid: number; count: number }>();
  for (const item of dataItems) {
    if (item.item_status === 'cancelado') continue;
    const key = toPeriodKey(item.payment_due_date ?? item.created_at, period);
    const bucket = periodMap.get(key) ?? { estimated: 0, paid: 0, count: 0 };
    bucket.estimated += item.total_with_overtime ?? 0;
    if (item.payment_status === 'pago' && item.payment_date) {
      const payKey = toPeriodKey(item.payment_date, period);
      // pagamento vai pro bucket do payment_date
      const payBucket = periodMap.get(payKey) ?? { estimated: 0, paid: 0, count: 0 };
      payBucket.paid += item.actual_paid_value ?? item.total_with_overtime ?? 0;
      payBucket.count += 1;
      periodMap.set(payKey, payBucket);
    }
    periodMap.set(key, bucket);
  }
  // Ordenar por periodo e calcular acumulados
  const sortedPeriods = [...periodMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  let estCum = 0, paidCum = 0;
  const spendingTimeline = sortedPeriods.map(([period, data]) => {
    estCum += data.estimated;
    paidCum += data.paid;
    return {
      period,
      period_label: formatPeriodLabel(period),
      estimated_cumulative: round2(estCum),
      paid_cumulative: round2(paidCum),
      paid_in_period: round2(data.paid),
      items_paid_in_period: data.count,
    };
  });

  // --- Payment Status Breakdown ---
  const payStatusMap = new Map<string, { count: number; total: number }>();
  for (const item of dataItems) {
    const st = item.payment_status;
    const cur = payStatusMap.get(st) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += item.total_with_overtime ?? 0;
    payStatusMap.set(st, cur);
  }

  // --- Item Status Breakdown ---
  // (mesma logica com item_status)

  // --- Top Vendors ---
  const vendorMap = new Map<string, { name: string; total: number; count: number }>();
  for (const item of dataItems) {
    if (!item.vendor_id) continue;
    const cur = vendorMap.get(item.vendor_id) ?? { name: item.vendor_name_snapshot ?? '', total: 0, count: 0 };
    cur.total += item.total_with_overtime ?? 0;
    cur.count += 1;
    vendorMap.set(item.vendor_id, cur);
  }
  const totalAll = dataItems.reduce((s, i) => s + (i.total_with_overtime ?? 0), 0);
  const topVendors = [...vendorMap.entries()]
    .map(([id, v]) => ({ vendor_id: id, ...v, pct_of_total: round2(v.total / totalAll * 100) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // --- Budget vs Actual por Categoria ---
  const catMap = new Map<number, { name: string; budgeted: number; paid: number; estimated: number }>();
  for (const item of dataItems) {
    const cat = catMap.get(item.item_number) ?? {
      name: headers.find(h => h.item_number === item.item_number)?.service_description ?? `Item ${item.item_number}`,
      budgeted: 0, paid: 0, estimated: 0,
    };
    cat.estimated += item.total_with_overtime ?? 0;
    if (item.payment_status === 'pago') {
      cat.paid += item.actual_paid_value ?? item.total_with_overtime ?? 0;
    }
    catMap.set(item.item_number, cat);
  }
  // budgeted = estimated (em bottom_up o orcado E o total dos itens)
  // Para top_down, budgeted viria de budget_items (futuro)

  return { spendingTimeline, paymentStatusBreakdown, itemStatusBreakdown, topVendors, budgetVsActual };
}
```

---

## 5. Componentes Frontend

### 5.1 Arvore de Componentes

```
/jobs/[id]/financeiro/dashboard/page.tsx (EXISTENTE — estender)
  |-- JobFinancialTabs (existente)
  |-- KPI Cards section (existente)
  |-- Alerts section (existente)
  |-- [NOVO] SpendingTimelineChart
  |-- [NOVO] StatusBreakdownCharts
  |    |-- PaymentStatusDonut
  |    |-- ItemStatusBar
  |-- [NOVO] TopVendorsChart
  |-- [NOVO] BudgetVsActualChart
  |-- CategoryTable (existente)
  |-- UpcomingPaymentsList (existente)
```

### 5.2 Novos Componentes

#### `SpendingTimelineChart.tsx`

- **Biblioteca:** Recharts `AreaChart`
- **Dados:** `spending_timeline` do endpoint charts
- **Visualizacao:**
  - Area empilhada: "Estimado acumulado" (cinza claro) + "Pago acumulado" (verde)
  - Linha horizontal tracejada: `budget_reference_line` (vermelho se ultrapassado)
  - Barras finas opcionais: `paid_in_period` (valor pago por periodo)
- **Interacao:** Tooltip customizado mostrando valores formatados em BRL
- **Props:** `data: SpendingTimelineEntry[]`, `budgetLine: number`

#### `StatusBreakdownCharts.tsx`

- **Layout:** Grid 2 colunas (md:2, sm:1)
- **Esquerda:** Recharts `PieChart` (donut) com `payment_status_breakdown`
  - Cores: pendente=amber, pago=green, cancelado=red
  - Centro: total formatado em BRL
- **Direita:** Recharts `BarChart` horizontal com `item_status_breakdown`
  - Cores: usa `ITEM_STATUS_COLORS` do types existente
  - Labels: usa `ITEM_STATUS_LABELS` existente

#### `TopVendorsChart.tsx`

- **Biblioteca:** Recharts `BarChart` horizontal
- **Dados:** `top_vendors` (top 10)
- **Visualizacao:** Barras horizontais com nome do vendor + valor + percentual
- **Props:** `data: TopVendorEntry[]`

#### `BudgetVsActualChart.tsx`

- **Biblioteca:** Recharts `BarChart` agrupado (vertical)
- **Dados:** `budget_vs_actual`
- **Visualizacao:**
  - Barra azul: "Estimado" (total_with_overtime)
  - Barra verde: "Pago" (actual_paid)
  - Label de variancia em % acima de cada grupo
- **Props:** `data: BudgetVsActualEntry[]`

### 5.3 Hook Novo

```typescript
// frontend/src/hooks/useFinancialDashboardCharts.ts

export function useJobFinancialCharts(jobId: string, period: 'monthly' | 'weekly' = 'monthly') {
  return useQuery({
    queryKey: finDashboardKeys.jobCharts(jobId, period),
    queryFn: () => apiGet<JobFinancialCharts>(
      'financial-dashboard',
      { period },
      `job/${jobId}/charts`,
    ),
    enabled: !!jobId,
    staleTime: 5 * 60_000, // 5 minutos — acompanha o dashboard principal
  })
}
```

### 5.4 Tipos Novos

```typescript
// Adicionar em frontend/src/types/cost-management.ts

export interface SpendingTimelineEntry {
  period: string
  period_label: string
  estimated_cumulative: number
  paid_cumulative: number
  paid_in_period: number
  items_paid_in_period: number
}

export interface StatusBreakdownEntry {
  status: string
  count: number
  total: number
}

export interface TopVendorEntry {
  vendor_id: string
  vendor_name: string
  total: number
  items_count: number
  pct_of_total: number
}

export interface BudgetVsActualEntry {
  item_number: number
  item_name: string
  budgeted: number
  actual_paid: number
  actual_estimated: number
  variance_pct: number
}

export interface JobFinancialCharts {
  spending_timeline: SpendingTimelineEntry[]
  budget_reference_line: number
  payment_status_breakdown: StatusBreakdownEntry[]
  item_status_breakdown: StatusBreakdownEntry[]
  top_vendors: TopVendorEntry[]
  budget_vs_actual: BudgetVsActualEntry[]
}
```

### 5.5 Query Key Adicional

```typescript
// Adicionar em finDashboardKeys
export const finDashboardKeys = {
  all: ['financial-dashboard'] as const,
  job: (jobId: string) => [...finDashboardKeys.all, 'job', jobId] as const,
  jobCharts: (jobId: string, period?: string) =>
    [...finDashboardKeys.all, 'job', jobId, 'charts', period] as const,
  tenant: () => [...finDashboardKeys.all, 'tenant'] as const,
}
```

---

## 6. Decisoes de Performance

### 6.1 Agregacao Server-Side vs Client-Side

| Aspecto | Decisao | Motivo |
|---|---|---|
| Timeline, breakdowns, top vendors | **Server-side (Edge Function)** | Evita transferir todos os cost_items para o cliente; response e menor e tipado |
| KPIs (existente) | **Server-side** | Ja implementado, nao muda |
| Formatacao de labels (moeda, %) | **Client-side** | Locale do usuario e informacao do browser |
| Filtragem de periodos no chart | **Client-side** | Dataset ja compacto (<30 pontos), zoom/filter instantaneo |

### 6.2 Cache Strategy

| Camada | TTL | Tipo | Justificativa |
|---|---|---|---|
| React Query (staleTime) | 5 minutos | Client | Dados financeiros mudam a cada pagamento (nao em tempo real) |
| Edge Function | Nenhum cache extra | N/A | Views do PostgreSQL sao calculadas on-demand; indices garantem <200ms |
| Browser | Nenhum (no-store) | N/A | Dados sensiveis, nao cache HTTP |

### 6.3 Indices Existentes (nao requer novos)

O indice `idx_cost_items_tenant_job` ja cobre `(tenant_id, job_id, item_number, sub_item_number)` onde `deleted_at IS NULL`. Como a query do charts filtra por `job_id + tenant_id + deleted_at IS NULL`, este indice e suficiente. Nao ha necessidade de migration.

### 6.4 Tamanho do Response

- Job tipico: 30-100 cost_items, 5-15 categorias, 3-8 meses de timeline, 10-30 vendors
- Response estimado do endpoint `/charts`: ~3-5 KB JSON (compacto)
- Somado ao dashboard principal: ~8-12 KB total por pagina

### 6.5 Parallel Fetch no Frontend

A pagina do dashboard ja faz 1 fetch (`useJobFinancialDashboard`). Com o novo hook, serao 2 fetches paralelos na montagem:

```typescript
// Ambos disparam em paralelo — React Query gerencia
const { data: dashboard } = useJobFinancialDashboard(jobId)
const { data: charts } = useJobFinancialCharts(jobId)
```

Nao ha dependencia entre eles — renderizam independentemente com seus proprios loading states.

---

## 7. Seguranca

- **Auth:** Mesmo mecanismo da EF existente (`getAuthContext` + JWT)
- **Roles:** Mesmo array `ALLOWED_ROLES` do handler existente
- **RLS:** Views usam `security_invoker = true`, queries diretas usam token do usuario (RLS em `cost_items`)
- **Tenant isolation:** `tenant_id` checado em todas as queries

---

## 8. Estrutura de Arquivos (Novos/Modificados)

### Backend (Supabase Edge Functions)

```
supabase/functions/financial-dashboard/
  index.ts                                 [MODIFICAR — adicionar rota /job/:id/charts]
  handlers/
    job-dashboard.ts                       [NAO MEXER]
    job-dashboard-charts.ts                [NOVO]
    tenant-dashboard.ts                    [NAO MEXER]
```

### Frontend

```
frontend/src/
  types/cost-management.ts                 [MODIFICAR — adicionar tipos charts]
  lib/query-keys.ts                        [MODIFICAR — adicionar jobCharts]
  hooks/useFinancialDashboardCharts.ts     [NOVO]
  app/(dashboard)/jobs/[id]/financeiro/dashboard/
    page.tsx                               [MODIFICAR — integrar charts]
    _components/
      SpendingTimelineChart.tsx             [NOVO]
      StatusBreakdownCharts.tsx             [NOVO]
      TopVendorsChart.tsx                   [NOVO]
      BudgetVsActualChart.tsx              [NOVO]
```

### Migrations

**Nenhuma migration necessaria.** Todos os dados e indices ja existem.

---

## 9. Plano de Execucao

| Passo | Descricao | Esforco |
|---|---|---|
| 1 | Criar handler `job-dashboard-charts.ts` + rota no index | 30min |
| 2 | Adicionar tipos + query key + hook no frontend | 15min |
| 3 | Criar `SpendingTimelineChart` (AreaChart Recharts) | 30min |
| 4 | Criar `StatusBreakdownCharts` (PieChart + BarChart) | 30min |
| 5 | Criar `TopVendorsChart` (BarChart horizontal) | 20min |
| 6 | Criar `BudgetVsActualChart` (grouped BarChart) | 20min |
| 7 | Integrar tudo no `page.tsx` existente | 15min |
| 8 | Deploy EF + push frontend | 10min |
| **Total** | | **~2.5h** |

---

## 10. Riscos e Mitigacoes

| Risco | Probabilidade | Mitigacao |
|---|---|---|
| Jobs com 0 cost_items (response vazio) | Media | Tratar no frontend com empty states por secao |
| Periodos sem pagamentos (gaps na timeline) | Alta | Preencher periodos intermediarios com 0 na agregacao |
| Vendor sem nome (vendor_name_snapshot null) | Baixa | Fallback para "Sem fornecedor" no chart |
| Recharts bundle size | N/A | Ja instalado e usado em 5 componentes — tree-shaking ativo |
| Dark mode | Media | Usar variaveis CSS do design system (--foreground, --muted) nas cores dos charts |

---

## 11. Alternativas Consideradas e Descartadas

### A. View materializada no PostgreSQL

Criar uma `MATERIALIZED VIEW` com refresh periodico para pre-computar os dados de charts.

**Descartado porque:**
- Complexidade de manter refresh (cron ou trigger)
- Dados ficam stale entre refreshes
- Volume de dados e pequeno (max 100 rows por job) — nao justifica cache no banco
- Adiciona migration + objeto no banco sem beneficio real

### B. RPC Function SQL para timeline com window functions

Criar uma function PostgreSQL `fn_job_spending_timeline(job_id, tenant_id, period)`.

**Descartado porque:**
- Requer migration
- Logica fica dividida entre SQL e TypeScript (mais dificil de manter)
- Ganho de performance negligivel para ~100 rows
- Testabilidade menor (nao tem unit test facil de function SQL)

### C. Endpoint separado por tipo de chart

Ter `/charts/timeline`, `/charts/vendors`, `/charts/status` etc.

**Descartado porque:**
- Todos os charts derivam dos mesmos dados (cost_items do job)
- Multiplas requests HTTP para a mesma pagina (overhead desnecessario)
- Uma unica query + agregacao em memoria e mais eficiente

### D. Client-side aggregation (fetch raw cost_items e computar no browser)

**Descartado porque:**
- Expoe todos os cost_items (incluindo campos sensiveis como vendor_pix_snapshot)
- Response maior (50-100 rows com todas as colunas vs ~5KB agregado)
- Logica de agregacao duplicada se outro consumidor precisar dos mesmos dados
