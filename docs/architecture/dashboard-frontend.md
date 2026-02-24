# Arquitetura Frontend - Pagina Dashboard

**Data:** 24/02/2026
**Status:** APROVADO
**Autor:** Tech Lead / Arquiteto - ELLAHOS
**Spec de referencia:** docs/specs/dashboard-page.md
**ADRs relacionados:** ADR-012 (Recharts), ADR-013 (Portal separado)

---

## 1. Diagnostico: Estado Atual vs Spec

A pagina Dashboard **ja esta implementada** desde a Fase 7.5. Todos os componentes, hooks, types e a Edge Function backend existem e estao funcionais. A analise completa do codigo revela:

### 1.1 Arquivos existentes (7 arquivos, ~900 linhas)

| Arquivo | Status | Linhas |
|---|---|---|
| `frontend/src/app/(dashboard)/page.tsx` | IMPLEMENTADO | 129 |
| `frontend/src/hooks/use-dashboard.ts` | IMPLEMENTADO | 162 |
| `frontend/src/components/dashboard/kpi-cards.tsx` | IMPLEMENTADO | 303 |
| `frontend/src/components/dashboard/pipeline-chart.tsx` | IMPLEMENTADO | 241 |
| `frontend/src/components/dashboard/alerts-panel.tsx` | IMPLEMENTADO | 261 |
| `frontend/src/components/dashboard/activity-timeline.tsx` | IMPLEMENTADO | 286 |
| `frontend/src/components/dashboard/status-donut.tsx` | IMPLEMENTADO | 188 |
| `frontend/src/components/dashboard/revenue-chart.tsx` | IMPLEMENTADO | 274 |

### 1.2 Itens da spec ja atendidos

- US-D01: Saudacao personalizada com horario (getGreeting + user_metadata)
- US-D02: 5 KPI cards com icones, cores, trend badge, progress bar, urgente pulsante
- US-D03: Pipeline com barras proporcionais, cores por status, links, tooltip
- US-D04: Alertas com 4 tipos, severity derivada, badge, icone, empty state positivo
- US-D05: Timeline agrupada por data com avatares e scroll interno
- US-D06: Donut Recharts reutilizando dados do pipeline (sem request extra)
- US-D07: BarChart com seletor de periodo, tooltip customizado, rodape de resumo
- US-D08: refetchInterval configurado (30s/60s/300s) + handleRefetchAll
- US-D09: Banner de erro global + secoes independentes com skeleton
- US-D10: Grid responsivo mobile-first (grid-cols-2/3/5)
- US-D11: Dark mode com tokens do design system

### 1.3 Unica lacuna identificada: redirect de `/` para o dashboard

O middleware em `frontend/src/middleware.ts` (linha 58-59) redireciona `/ -> /jobs`:

```typescript
if (user && request.nextUrl.pathname === '/') {
  return NextResponse.redirect(new URL('/jobs', request.url))
}
```

A spec exige que `/` exiba o dashboard diretamente, sem redirect. O arquivo `frontend/src/app/(dashboard)/page.tsx` ja existe e renderiza o dashboard, mas o middleware intercepta antes.

---

## 2. Alteracao Necessaria

### 2.1 Remover redirect de `/` para `/jobs`

**Arquivo:** `frontend/src/lib/supabase/middleware.ts`

**Antes (linhas 57-60):**
```typescript
// Redirecionar / para /jobs se logado
if (user && request.nextUrl.pathname === '/') {
  return NextResponse.redirect(new URL('/jobs', request.url))
}
```

**Depois:**
```typescript
// / agora e o Dashboard (page.tsx no route group (dashboard))
// Nenhum redirect necessario para a rota raiz
```

**Impacto:** Zero. O arquivo `frontend/src/app/(dashboard)/page.tsx` ja serve a rota `/` atraves do route group `(dashboard)`. O redirect era um paliativo da Fase 3, quando o dashboard ainda nao existia.

### 2.2 Atualizar redirect de `/login` quando ja logado

**Antes (linhas 62-64):**
```typescript
if (user && request.nextUrl.pathname.startsWith('/login')) {
  return NextResponse.redirect(new URL('/jobs', request.url))
}
```

**Depois:**
```typescript
if (user && request.nextUrl.pathname.startsWith('/login')) {
  return NextResponse.redirect(new URL('/', request.url))
}
```

**Motivo:** Apos login, o usuario deve ir para o Dashboard (visao executiva), nao para a listagem de jobs.

---

## 3. Arquitetura Existente (Documentacao para Referencia)

Como a implementacao ja esta completa, esta secao documenta as decisoes arquiteturais ja tomadas para referencia futura.

### 3.1 Hierarquia de Componentes

```
page.tsx (DashboardPage)
  |-- Banner de erro global (condicional)
  |-- Header (saudacao + subtitulo)
  |-- KpiCards (grid 2/3/5 colunas)
  |     |-- KpiCard x5 (Link com hover/focus)
  |     |-- KpiCardSkeleton x5
  |-- PipelineChart (barras proporcionais)
  |     |-- Link por status
  |-- Grid principal (lg:grid-cols-5)
  |     |-- AlertsPanel (lg:col-span-3)
  |     |     |-- AlertItem (list item)
  |     |-- ActivityTimeline (lg:col-span-2)
  |           |-- ActivityItem (feed item)
  |-- Grid graficos (md:grid-cols-2)
        |-- StatusDonut (PieChart Recharts)
        |-- RevenueChart (BarChart Recharts)
```

### 3.2 Fluxo de Dados

```
page.tsx instancia 5 hooks em paralelo
  |
  |-- useDashboardKpis()      --> GET /dashboard/kpis         (stale: 30s, refetch: 30s)
  |-- useDashboardPipeline()  --> GET /dashboard/pipeline      (stale: 60s, refetch: 60s)
  |-- useDashboardAlerts(20)  --> GET /dashboard/alerts?limit=20 (stale: 60s, refetch: 60s)
  |-- useDashboardActivity()  --> GET /dashboard/activity?hours=48&limit=30 (stale: 30s, refetch: 30s)
  |-- useDashboardRevenue(12) --> GET /dashboard/revenue?months=12 (stale: 300s, refetch: 300s)
  |
  Cada hook e independente: falha em um nao bloqueia outros.
  StatusDonut reusa dados de useDashboardPipeline (sem request extra).
```

### 3.3 Types (em use-dashboard.ts)

```typescript
// Tipos ja definidos e estabilizados:
DashboardKpis       // 9 campos numericos
PipelineItem        // status, count, total_value
AlertType           // 6 valores union (4 originais + 2 deadline)
AlertSeverity       // 4 niveis
DashboardAlert      // alert_type, entity_id/title/code, metadata
ActivityEvent       // id, event_type, description, timestamps, user/job refs
RevenueMonth        // month (YYYY-MM), job_count, revenue, cost, profit
```

### 3.4 Padroes Seguidos

| Padrao | Como foi aplicado |
|---|---|
| API layer | `apiGet()` com Bearer token manual via `getToken()` |
| Query keys | `dashboardKeys` no `query-keys.ts` (padrao factory) |
| Skeleton strategy | Cada componente tem seu proprio skeleton (sem spinner global) |
| Responsividade | Mobile-first: grid-cols-2 -> md:3 -> lg:5 |
| Dark mode | Tokens CSS (bg-card, text-foreground, border-border) |
| Acessibilidade | role=article, role=list, role=feed, aria-label, tabIndex |
| Recharts | Cores hexadecimais fixas (funcionam em light+dark) |
| Formatacao | formatCurrency/formatPercent/formatRelativeTime localizados pt-BR |

### 3.5 Contratos Backend (5 RPCs via Edge Function `dashboard`)

| Endpoint | RPC Postgres | Retorno |
|---|---|---|
| GET /dashboard/kpis | get_dashboard_kpis() | Objeto DashboardKpis |
| GET /dashboard/pipeline | get_pipeline_summary() | Array PipelineItem[] |
| GET /dashboard/alerts?limit=N | get_alerts(p_limit) | Array DashboardAlert[] |
| GET /dashboard/activity?hours=N&limit=N | get_recent_activity(p_hours, p_limit) | Array ActivityEvent[] |
| GET /dashboard/revenue?months=N | get_revenue_by_month(p_months) | Array RevenueMonth[] |

---

## 4. Plano de Implementacao

### Sub-tarefa 1: Remover redirect de `/` no middleware
- **Arquivo:** `frontend/src/lib/supabase/middleware.ts`
- **Acao:** Remover bloco que redireciona `/` para `/jobs`
- **Acao:** Alterar redirect pos-login de `/jobs` para `/`
- **Estimativa:** 5 minutos
- **Risco:** NENHUM (o page.tsx ja existe e funciona)

### Sub-tarefa 2: Teste de verificacao
- Acessar `/` logado e confirmar que o Dashboard renderiza sem redirect
- Acessar `/login` ja logado e confirmar redirect para `/` (dashboard)
- Confirmar que 5 secoes carregam independentemente
- Confirmar que botao Atualizar (se existir) dispara refetch de todos os hooks

---

## 5. Observacoes sobre o Botao Atualizar

A spec (CA-D08.4) menciona um botao "Atualizar" com icone RefreshCw no header da pagina. Analisando o `page.tsx` existente, o `handleRefetchAll()` existe mas **nao ha botao visivel** para o usuario dispara-lo. O banner de erro tem um botao "Tentar novamente", mas o refresh manual sem erro nao existe.

**Recomendacao:** Adicionar botao RefreshCw no header da pagina, ao lado da saudacao, conforme o wireframe da spec (canto direito do header). Isso seria uma **Sub-tarefa 3** adicional.

### Sub-tarefa 3 (opcional): Adicionar botao Atualizar no header
- **Arquivo:** `frontend/src/app/(dashboard)/page.tsx`
- **Acao:** Adicionar botao com icone RefreshCw que chama `handleRefetchAll()`
- **Posicao:** flex justify-between no header, ao lado da saudacao
- **Comportamento:** Icone gira (animate-spin) enquanto qualquer hook esta em loading
- **Estimativa:** 15 minutos

---

## 6. Fora de Escopo Confirmado

Itens listados na spec como fora de escopo, confirmados na analise:

1. **RBAC no dashboard** - Todos os roles veem tudo. Nao ha filtro por user_id.
2. **Variacao vs mes anterior** - RPC nao retorna `previous_month`. Cards sem delta.
3. **Widget equipe top-5** - US-707 nao implementada. Sem componente para isso.
4. **Alerta de diaria sem equipe** - Tipo nao incluido na RPC `get_alerts`.
5. **Timestamp de ultima atualizacao** - Nao implementado (mas trivial com state local).
6. **Notificacoes via Realtime** - Usa polling (refetchInterval), nao subscribe.
7. **Export/impressao** - Nao existe para o dashboard.

---

## 7. Conclusao

O dashboard frontend esta **100% implementado** em termos de componentes e logica. A unica acao necessaria para que a rota `/` sirva o dashboard e **remover o redirect no middleware**. A Sub-tarefa 3 (botao Atualizar) e uma melhoria de UX que preenche uma lacuna sutil da implementacao vs spec.

**Total de esforco estimado:** 20 minutos (3 sub-tarefas).
