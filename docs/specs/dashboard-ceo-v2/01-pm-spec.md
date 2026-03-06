# Dashboard CEO v2 -- Spec de Produto (Onda 0.3)

**Arquivo:** docs/specs/dashboard-ceo-v2/01-pm-spec.md
**Data:** 06/03/2026
**Status:** RASCUNHO
**Autor:** Product Manager -- ELLAHOS
**Versao base:** Dashboard v1 (docs/specs/dashboard-page.md, Fase 7.5)

---

## 1. Objetivo

Ampliar o dashboard existente (rota `/`) com quatro secoes novas que fecham as cinco perguntas estrategicas do CEO. O dashboard v1 responde bem a como esta a operacao. O v2 adiciona visibilidade de caixa, pipeline comercial, pagamentos iminentes e equipe -- sem substituir nada do que ja funciona.

---

## 2. O Que NAO Muda

As secoes a seguir permanecem intactas. Esta spec nao altera nenhuma delas:

- KPI cards (US-D02)
- Pipeline visual de jobs por status (US-D03)
- Alertas urgentes (US-D04)
- Atividade recente (US-D05)
- Donut de distribuicao por status (US-D06)
- Revenue chart mensal (US-D07)

---

## 3. Secoes Novas (4)

### 3.1 Faixa de Caixa (CashflowStrip)

**Pergunta respondida:** Quanto dinheiro tenho/vou ter?

Faixa horizontal abaixo dos KPI cards com tres metricas inline:

| Metrica | Campo | Endpoint |
|---------|-------|----------|
| Saldo atual projetado | `opening_balance` | `GET /financial-dashboard/cashflow` |
| Projecao 30 dias | `series[0].cumulative_balance` com `granularity=monthly&months=1` | `GET /financial-dashboard/cashflow` |
| Alerta negativo | `kpis.is_danger` + `kpis.days_until_danger` | `GET /financial-dashboard/cashflow` |

Comportamento:
- `is_danger=false`: fundo neutro, exibe saldo + projecao
- `is_danger=true`: fundo `bg-red-50 dark:bg-red-500/5`, badge vermelho pulsante "Saldo negativo em X dias"
- Label exibido: "Saldo projetado" (nao "Saldo em conta") para nao confundir com extrato bancario real

### 3.2 Pagamentos da Semana (PaymentsWeek)

**Pergunta respondida:** O que vence essa semana?

Card compacto ao lado direito da CashflowStrip exibindo o primeiro agrupamento semanal:

| Dado | Campo | Endpoint |
|------|-------|----------|
| Total a pagar esta semana | `upcoming_payments_30d.by_week[0].total` | `GET /financial-dashboard/tenant-dashboard` |
| Quantidade de itens | `upcoming_payments_30d.by_week[0].items_count` | `GET /financial-dashboard/tenant-dashboard` |
| Label do periodo | `upcoming_payments_30d.by_week[0].week_label` | `GET /financial-dashboard/tenant-dashboard` |

- Se `by_week` vazio: exibe "Nenhum pagamento esta semana"
- Link "Ver calendario" aponta para `/financeiro/calendario`
- Reutiliza o mesmo hook da CashflowStrip -- sem request adicional

### 3.3 Snapshot Comercial (CommercialSnapshot)

**Pergunta respondida:** Como esta o pipeline comercial?

Card com tres metricas do CRM em leitura:

| Metrica | Campo | Endpoint |
|---------|-------|----------|
| Valor total do pipeline ativo | `pipeline_summary.total_value` | `GET /crm/dashboard` |
| Oportunidades ativas | `pipeline_summary.total_count` | `GET /crm/dashboard` |
| Jobs fechados este mes | `month_summary.jobs_closed` | `GET /crm/dashboard` |
| Variacao de receita vs mes anterior | `month_summary.vs_last_month_revenue_pct` | `GET /crm/dashboard` |

- Badge verde se `vs_last_month_revenue_pct >= 0`, vermelho se negativo
- Link no header do card aponta para `/crm`

### 3.4 Equipe Alocada (sub-metrica no card Jobs Ativos)

**Pergunta respondida:** Quem esta trabalhando no que?

O campo `team_allocated` ja e retornado pelo endpoint `/dashboard/kpis` (interface `DashboardKpis`) mas nao esta sendo exibido. A alteracao e minima: adicionar uma linha de texto abaixo do valor principal no card "Jobs Ativos" existente.

- Exibe: "X pessoas alocadas" em `text-muted-foreground text-xs`
- Se `team_allocated=0`: exibe "Nenhuma alocacao"
- Sem request adicional -- dado ja disponivel em `useDashboardKpis()`

---

## 4. Mapa de Dados: Existente vs Novo Endpoint

| Secao | Endpoint | Existe? | Novo endpoint? |
|-------|----------|---------|----------------|
| CashflowStrip | `GET /financial-dashboard/cashflow?granularity=monthly&months=1` | Sim | Nao |
| PaymentsWeek | `GET /financial-dashboard/tenant-dashboard` | Sim | Nao |
| CommercialSnapshot | `GET /crm/dashboard` | Sim | Nao |
| TeamAllocated | `GET /dashboard/kpis` (campo `team_allocated`) | Sim | Nao |

Nenhuma Edge Function nova e necessaria. Todos os dados ja existem no backend.

**Restricao de role:** `/financial-dashboard/cashflow` e `/financial-dashboard/tenant-dashboard` so retornam dados para roles [admin, ceo, financeiro, produtor_executivo]. O frontend deve tratar HTTP 403 ocultando a secao silenciosamente -- sem mensagem de erro visivel para outros roles.

---

## 5. Wireframe do Layout Final

```
+-------------------------------------------------------------------+
| [sidebar]  Bom dia, Ana                         [Atualizar]      |
+-------------------------------------------------------------------+
|  [Jobs Ativos]  [Faturamento]  [Margem]  [Health]  [Aprovacoes]   |
|  X pessoas      (existentes -- sem alteracao, exceto sub-metrica) |
|                                                                    |
|  +-------------------------------------+  +--------------------+  |
|  | Saldo proj.: R$ 120k                |  | Esta semana        |  |
|  | Projecao 30d: R$ 95k                |  | R$ 23.500 (7 it.)  |  |
|  | [\!] Saldo negativo em 18 dias       |  | 10/03 a 16/03      |  |
|  | (fundo vermelho se is_danger=true)  |  | > /financeiro/cal  |  |
|  +-------------------------------------+  +--------------------+  |
|                                                                    |
|  Pipeline de Jobs (barras verticais -- existente)                 |
|                                                                    |
|  +---------------------------+  +--------------------------+      |
|  | Alertas Urgentes          |  | Atividade Recente        |      |
|  | (existente)               |  | (existente)              |      |
|  +---------------------------+  +--------------------------+      |
|                                                                    |
|  +---------------------------+  +--------------------------+      |
|  | Pipeline Comercial        |  | Faturamento Mensal       |      |
|  | R$ 450k em 12 opp.        |  | (existente -- sem alt.)  |      |
|  | 3 jobs fechados este mes  |  |                          |      |
|  | +8% vs mes anterior       |  |                          |      |
|  | > /crm                    |  |                          |      |
|  +---------------------------+  +--------------------------+      |
|                                                                    |
|  Jobs por Status (donut -- existente)                              |
+-------------------------------------------------------------------+
```

Mobile (375px): CashflowStrip e PaymentsWeek em coluna unica. CommercialSnapshot abaixo do Revenue chart.

---

## 6. User Stories

### US-V2-01 -- Faixa de Caixa

Como CEO, quero ver o saldo projetado e a projecao de 30 dias logo apos os KPI cards, para saber em segundos se o caixa esta saudavel sem navegar para o modulo financeiro.

Criterios de aceite:
- CA-V2-01.1: Exibe `opening_balance` formatado em R$ abreviado (R$ Xk ou R$ X.XM)
- CA-V2-01.2: Exibe saldo projetado 30 dias (`series[0].cumulative_balance` com `granularity=monthly&months=1`)
- CA-V2-01.3: Se `kpis.is_danger=true`: fundo `bg-red-50 dark:bg-red-500/5`, icone `AlertTriangle` vermelho, texto "Saldo negativo em X dias" onde X = `days_until_danger`
- CA-V2-01.4: Se role retorna HTTP 403, secao completamente oculta (sem skeleton, sem mensagem de erro)
- CA-V2-01.5: Skeleton de 1 linha com altura 56px durante loading
- CA-V2-01.6: `staleTime=120_000`, `refetchInterval=120_000`
- CA-V2-01.7: Label exibido: "Saldo projetado" (nao "Saldo em conta")

### US-V2-02 -- Pagamentos da Semana

Como CEO, quero ver o total de pagamentos que vencem esta semana, para antecipar necessidades de caixa sem abrir o calendario.

Criterios de aceite:
- CA-V2-02.1: Exibe `by_week[0].week_label`, `by_week[0].total` formatado e `by_week[0].items_count`
- CA-V2-02.2: Se `by_week` vazio ou undefined: exibe "Nenhum pagamento esta semana" em `text-muted-foreground`
- CA-V2-02.3: Link "Ver calendario" aponta para `/financeiro/calendario`
- CA-V2-02.4: Reutiliza `useFinancialTenantDashboard()` -- sem request adicional ao backend
- CA-V2-02.5: Se role retorna HTTP 403, card oculto (mesmo comportamento de CA-V2-01.4)

### US-V2-03 -- Snapshot do Pipeline Comercial

Como CEO, quero ver um resumo do pipeline comercial no dashboard principal, para monitorar o comercial diariamente sem precisar ir ate o CRM.

Criterios de aceite:
- CA-V2-03.1: Exibe `pipeline_summary.total_value` formatado e `pipeline_summary.total_count` como "X oportunidades"
- CA-V2-03.2: Exibe `month_summary.jobs_closed` com label "jobs fechados este mes"
- CA-V2-03.3: Badge de variacao: verde se `vs_last_month_revenue_pct >= 0`, vermelho se negativo. Formato "+X%" ou "-X%"
- CA-V2-03.4: Link no header do card aponta para `/crm`
- CA-V2-03.5: `staleTime=120_000`, `refetchInterval=120_000`
- CA-V2-03.6: Skeleton do card durante loading

### US-V2-04 -- Equipe Alocada no Card de Jobs

Como CEO, quero saber quantas pessoas estao ativas em jobs agora, para ter visao rapida da capacidade operacional no proprio card de jobs.

Criterios de aceite:
- CA-V2-04.1: Texto "X pessoas alocadas" abaixo do valor principal no card Jobs Ativos em `text-xs text-muted-foreground`
- CA-V2-04.2: Se `team_allocated=0`: exibe "Nenhuma alocacao"
- CA-V2-04.3: Sem request adicional -- dado ja esta em `useDashboardKpis()`

---

## 7. Novos Hooks

| Hook | Endpoint | Usado em |
|------|----------|----------|
| `useCashflowSummary()` | `GET /financial-dashboard/cashflow?granularity=monthly&months=1` | CashflowStrip |
| `useFinancialTenantDashboard()` | `GET /financial-dashboard/tenant-dashboard` | CashflowStrip + PaymentsWeek |
| `useCrmSnapshot()` | `GET /crm/dashboard` | CommercialSnapshot |

`useDashboardKpis()` nao muda -- `team_allocated` ja e retornado.

Todos os novos hooks seguem o padrao existente em `frontend/src/hooks/use-dashboard.ts`: `useQuery` TanStack Query v5, `apiGet()`, tratamento de `isError`.

---

## 8. Novos Componentes e Alteracoes

Novos arquivos:
- `frontend/src/components/dashboard/cashflow-strip.tsx` -- CashflowStrip + PaymentsWeek (compartilham hook)
- `frontend/src/components/dashboard/commercial-snapshot.tsx` -- CommercialSnapshot

Alteracoes em arquivos existentes:
- `frontend/src/components/dashboard/kpi-cards.tsx`: adicionar linha `team_allocated` no card Jobs Ativos
- `frontend/src/app/(dashboard)/page.tsx`: instanciar 3 novos hooks, inserir componentes no layout, adicionar novos refetch em `handleRefetchAll`

---

## 9. Fora de Escopo

- Grafico de linha do fluxo de caixa projetado (disponivel em `/financeiro`)
- Funil de conversao completo do CRM (disponivel em `/crm/dashboard`)
- Top-5 pessoas mais alocadas (GAP-28 -- futuro)
- Filtro do dashboard por role (GAP-003 -- RBAC, futuro)
- Alertas de vencimento de receivables/NF (GAP-005 -- futuro)
- Edicao de qualquer dado direto do dashboard

---

## 10. Dependencias

- `GET /financial-dashboard/cashflow` deve aceitar `granularity=monthly&months=1` -- verificar se ja suporta antes de criar o hook
- `GET /financial-dashboard/tenant-dashboard` funciona para role `ceo` -- ja esta no `ALLOWED_ROLES` do handler
- `GET /crm/dashboard` -- verificar se ha restricao de role; se sim, tratar 403 silenciosamente no frontend

---

## 11. Criterio de Done

- [ ] CashflowStrip exibe saldo projetado e projecao 30d; fundo vermelho quando `is_danger=true`
- [ ] PaymentsWeek exibe total e label da primeira semana do calendario de pagamentos
- [ ] CommercialSnapshot exibe pipeline value, oportunidades ativas, jobs fechados no mes e badge de variacao
- [ ] Card Jobs Ativos exibe `team_allocated` como sub-metrica
- [ ] Todas as secoes novas exibem skeleton durante loading
- [ ] Secoes financeiras ocultam silenciosamente em HTTP 403 (sem erro visivel para o usuario)
- [ ] `handleRefetchAll` dispara refetch dos 3 novos hooks
- [ ] Layout correto em 375px mobile (secoes novas em coluna unica)
- [ ] Sem regressao nas 7 secoes existentes (teste manual das US-D01 a US-D11)

---

## 12. Perguntas Abertas

1. **Saldo inicial:** `opening_balance` e calculado (receivables pagos - cost_items pagos) ou vem de integracao bancaria? Se calculado, o label "Saldo projetado" e suficientemente claro para o CEO nao confundir com extrato real?

2. **CommercialSnapshot para produtor_executivo:** O endpoint `/crm/dashboard` tem restricao de role? Se sim, o card deve aparecer para `produtor_executivo`? Exibir ou ocultar?

3. **Posicao da CashflowStrip:** O wireframe posiciona a faixa entre os KPI cards e o pipeline de jobs. Confirmar se o CEO prefere posicao diferente.

---

## 13. Referencias

- Dashboard v1: `docs/specs/dashboard-page.md`
- Auditoria de gaps (GAP-28): `docs/specs/strategic-vision/02-auditoria-gaps-2026-03.md`
- Tipos cashflow: `frontend/src/types/cashflow.ts`
- Hooks existentes: `frontend/src/hooks/use-dashboard.ts`
- EF tenant-dashboard: `supabase/functions/financial-dashboard/handlers/tenant-dashboard.ts`
- EF cashflow: `supabase/functions/financial-dashboard/handlers/cashflow.ts`
- EF CRM dashboard: `supabase/functions/crm/handlers/get-dashboard.ts`
