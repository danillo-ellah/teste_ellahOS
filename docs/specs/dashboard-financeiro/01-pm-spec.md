# G-02: Dashboard Financeiro por Job — Spec PM

**Data:** 2026-03-04
**Origem:** Gap G-02 do relatorio Drive (substituir aba DASHBOARD da planilha GG)

---

## Contexto

Cada job tem uma planilha "Gastos Gerais" (GG) no Google Sheets com aba DASHBOARD que mostra:
- Total orcado vs total gasto vs saldo
- Margem real
- Graficos de pizza por categoria de custo
- Resumo visual pra apresentar ao CEO e ao cliente

O ELLAHOS ja tem TODOS os dados (cost_items, budget_items, payment_transactions) mas falta a **visualizacao grafica** consolidada. A pagina `/jobs/[id]/financeiro/dashboard` existe com KPIs em cards + tabela de categorias, mas sem graficos.

---

## User Stories

### US-G02-001: Timeline de gastos acumulados
**Como** produtor executivo,
**Quero** ver um grafico de area mostrando gastos acumulados ao longo do tempo (estimado vs pago),
**Para que** eu entenda o ritmo de execucao financeira do job e se estou dentro do orcamento.

**Criterios:**
- Eixo X: meses (ou semanas se job curto)
- Area cinza: estimado acumulado (todos os cost_items nao-cancelados)
- Area verde: pago acumulado (cost_items com payment_status=pago)
- Linha tracejada vermelha: closed_value do job (referencia do orcamento)
- Tooltip com valores em BRL formatado

### US-G02-002: Breakdown por status de pagamento
**Como** financeiro,
**Quero** ver um donut chart com a distribuicao de valores por status de pagamento (pendente/pago/cancelado),
**Para que** eu saiba rapidamente quanto falta pagar.

**Criterios:**
- Donut com cores: pendente=amber, pago=green, cancelado=red
- Centro do donut: total formatado em BRL
- Legenda com contagem de itens e percentual

### US-G02-003: Breakdown por status do item
**Como** coordenador de producao,
**Quero** ver um grafico de barras horizontais mostrando a distribuicao por status do item (orcado, aguardando_nf, nf_pedida, nf_recebida, pago, cancelado),
**Para que** eu entenda em que etapa estao os custos do job.

**Criterios:**
- Barras horizontais coloridas por status
- Labels com nome do status traduzido e valor

### US-G02-004: Top 10 fornecedores
**Como** CEO,
**Quero** ver quais fornecedores concentram mais gasto neste job,
**Para que** eu identifique dependencias e negocie melhor.

**Criterios:**
- Barras horizontais, top 10 por valor
- Mostrar nome do fornecedor + valor + % do total
- Ordenado do maior para o menor

### US-G02-005: Comparativo orcado vs real por categoria
**Como** produtor executivo,
**Quero** ver um grafico de barras agrupadas comparando orcado vs real por categoria de custo,
**Para que** eu identifique onde estourou e onde sobrou.

**Criterios:**
- Barra azul: estimado (total_with_overtime)
- Barra verde: pago (actual_paid_value)
- Label de variancia em % acima de cada grupo
- Variancia positiva (estourou) em vermelho, negativa (sobrou) em verde

---

## Requisitos Funcionais

| # | Requisito | Prioridade |
|---|-----------|-----------|
| RF-01 | Graficos Recharts integrados na pagina de dashboard existente | MUST |
| RF-02 | Dados agregados server-side (Edge Function) | MUST |
| RF-03 | Loading skeleton individual por grafico | MUST |
| RF-04 | Empty state quando job nao tem cost_items | MUST |
| RF-05 | Responsivo (graficos empilham em mobile) | MUST |
| RF-06 | Toggle mensal/semanal na timeline | SHOULD |
| RF-07 | Dark mode compativel | SHOULD |
| RF-08 | Tooltip com valores formatados em BRL | MUST |

---

## Wireframe Textual

```
/jobs/[id]/financeiro/dashboard

[====== KPI Cards (existente) ======]
[Budget: R$150k] [Gasto: R$80k] [Saldo: R$70k] [Margem: 46%]

[====== Alertas (existente) ======]
⚠ 3 itens vencidos | 2 NFs pendentes

[====== NOVO: Timeline de Gastos ======]
[Toggle: Mensal | Semanal]
┌────────────────────────────────────────┐
│  R$150k ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ (ref) │
│     ╱‾‾‾‾‾‾‾‾‾‾‾‾ (estimado)         │
│    ╱   ╱‾‾‾‾‾‾‾ (pago)               │
│   ╱   ╱                               │
│  ╱   ╱                                │
│ Jan  Fev  Mar  Abr  Mai               │
└────────────────────────────────────────┘

[====== NOVO: Status (2 colunas) ======]
┌──────────────────┐ ┌──────────────────┐
│   [DONUT CHART]  │ │  [BAR CHART]     │
│  Status Pagamento│ │  Status Item     │
│  Centro: R$80k   │ │  orcado ████ 20k │
│  🟡 Pendente 45k │ │  nf_pedida ██ 8k │
│  🟢 Pago 32k    │ │  pago ██████ 32k │
│  🔴 Cancel. 5k  │ │  cancel. █ 5k    │
└──────────────────┘ └──────────────────┘

[====== NOVO: Top Fornecedores ======]
┌────────────────────────────────────────┐
│ Fulano     ████████████████ R$18k (22%)│
│ Ciclano    ██████████ R$12k (15%)      │
│ Beltrano   ████████ R$10k (12%)        │
│ ...                                    │
└────────────────────────────────────────┘

[====== NOVO: Orcado vs Real ======]
┌────────────────────────────────────────┐
│ Equipe    [==azul==][==verde==] -3%    │
│ Locacao   [==azul==][===verde===] +8%  │
│ Elenco    [==azul==][=verde=] -12%     │
│ ...                                    │
└────────────────────────────────────────┘

[====== Tabela Categorias (existente) ======]
[====== Proximos Pagamentos (existente) ====]
```

---

## Decisoes Tecnicas (resumo do Tech Lead)

1. **Estender EF existente** — novo handler `job-dashboard-charts.ts` na mesma `financial-dashboard`
2. **Uma query + agregacao em memoria** — ~100 cost_items por job, nao justifica view materializada
3. **Zero migrations** — indices existentes cobrem todas as queries
4. **Dois fetches paralelos** no frontend — KPIs (existente) + Charts (novo)
5. **Recharts** — ja instalado, tree-shaking ativo
6. **Cache:** staleTime 5min no React Query

---

## Criterios de Aceite

- [ ] Pagina `/jobs/[id]/financeiro/dashboard` mostra 4 novos graficos
- [ ] Graficos carregam independentemente dos KPIs (loading individual)
- [ ] Job sem cost_items mostra empty state gracioso
- [ ] Responsivo: graficos empilham em mobile (1 coluna)
- [ ] Tooltip mostra valores em R$ formatado
- [ ] Dark mode: cores dos graficos visiveis
- [ ] TypeScript: zero errors (`tsc --noEmit`)
- [ ] Edge Function deployada com novo handler
