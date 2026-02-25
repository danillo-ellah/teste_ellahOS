# Spec Visual: Dashboard Home (/)

**Data:** 2026-02-20
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Design System:** docs/design/design-system.md
**Fase:** 7 - Dashboard + Relatorios + Portal do Cliente

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Layout Geral](#2-layout-geral)
3. [KPI Cards (Topo)](#3-kpi-cards-topo)
4. [Mini Pipeline de Status](#4-mini-pipeline-de-status)
5. [Painel de Alertas Urgentes](#5-painel-de-alertas-urgentes)
6. [Timeline de Atividades Recentes](#6-timeline-de-atividades-recentes)
7. [Grafico de Distribuicao por Status (Donut)](#7-grafico-de-distribuicao-por-status-donut)
8. [Grafico de Faturamento por Mes (Bar)](#8-grafico-de-faturamento-por-mes-bar)
9. [Estados: Loading, Empty, Error](#9-estados-loading-empty-error)
10. [Responsividade](#10-responsividade)
11. [Interacoes e Animacoes](#11-interacoes-e-animacoes)
12. [Acessibilidade](#12-acessibilidade)
13. [Dark Mode](#13-dark-mode)
14. [Tokens de Referencia Rapida](#14-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

O Dashboard Home e a primeira tela que o CEO ou produtor-executivo ve ao abrir o ELLAHOS. O objetivo e comunicar a saude do negocio em menos de 5 segundos. Nao e um relatorio — e um painel de controle operacional.

**Quem usa:** CEO, produtor-executivo, gerente de producao.
**Quando usa:** Abertura do dia, reunioes rapidas de status, decisoes rapidas.
**O que precisa responder instantaneamente:**
- Quantos jobs ativos existem hoje?
- Qual e o faturamento do mes?
- Ha alguma urgencia ou problema?
- O que aconteceu nas ultimas horas?

**Referencias de UX:** Linear (clareza extrema, numeros grandes), Monday.com (grid de KPIs), Shotgun (pipeline visual).

---

## 2. Layout Geral

### 2.1 Desktop (1280px+, sidebar expandida)

```
+------------------------------------------------------------------+
|  TOPBAR (h-14, fixed top-0, z-50)                                |
+--------+---------------------------------------------------------+
|        |  pt-14 (compensar topbar fixo)                          |
|        |                                                         |
| SIDE   |  PAGE HEADER (nao sticky)                               |
| BAR    |  +---------------------------------------------------+  |
| w-64   |  | Bom dia, [nome].     [Periodo: Este mes v] [...]  |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  KPI CARDS ROW (5 cards, grid 5 colunas)               |
|        |  +-------+-------+-------+-------+-------+            |
|        |  | Jobs  | Fatur.| Marg. | Health| Aprov.|            |
|        |  | Ativos| Mes   | Media | Medio | Pend. |            |
|        |  +-------+-------+-------+-------+-------+            |
|        |                                                         |
|        |  PIPELINE MINI (full width)                             |
|        |  +---------------------------------------------------+  |
|        |  | Briefing | Orc. | Aprov. | Pre | Prod | Pos | ... |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  GRID DE CONTEUDO (2 colunas: 3fr + 2fr)               |
|        |  +-------------------------------+-------------------+  |
|        |  |                               |                   |  |
|        |  |  ALERTAS URGENTES             |  ATIVIDADE        |  |
|        |  |  (card full height)           |  RECENTE          |  |
|        |  |                               |  (timeline)       |  |
|        |  |                               |                   |  |
|        |  +-------------------------------+-------------------+  |
|        |                                                         |
|        |  GRAFICOS ROW (2 colunas: 1fr + 1fr)                   |
|        |  +-------------------------------+-------------------+  |
|        |  |  Distribuicao por Status      |  Faturamento Mes  |  |
|        |  |  (Donut chart)                |  (Bar chart)      |  |
|        |  +-------------------------------+-------------------+  |
|        |                                                         |
+--------+---------------------------------------------------------+
```

### 2.2 Container e Espacamento

```
Container:   max-w-7xl mx-auto px-6 pb-12
Header:      py-6 mb-0
KPIs:        mb-6
Pipeline:    mb-6
Grid-main:   grid grid-cols-5 gap-6 mb-6
  Alertas:   col-span-3
  Atividade: col-span-2
Graficos:    grid grid-cols-2 gap-6
```

---

## 3. KPI Cards (Topo)

### 3.1 Grid de Cards

5 cards em linha, largura igual (`grid grid-cols-5 gap-4`). Em tablet viram 3+2, em mobile empilham 1 coluna.

### 3.2 Wireframe de um KPI Card

```
+-------------------------------+
|  [icone 20px]   [trend badge] |
|                               |
|  42                           |  <- numero principal (display-lg 36px bold)
|  Jobs Ativos                  |  <- label (caption 12px, text-muted)
|                               |
|  +4 vs mes passado            |  <- comparacao (caption 12px)
+-------------------------------+
```

```
Dimensoes:
  min-h: 120px
  padding: p-5
  border-radius: rounded-xl (12px)
  bg: surface (card)
  border: 1px border
  shadow: shadow-sm (light only)

Numero principal:
  font: 36px / font-bold / tracking-tight
  color: text-primary

Label:
  font: 12px / font-medium / uppercase / tracking-wide
  color: text-muted
  mt-1

Comparacao:
  font: 12px
  mt-3
  positivo: text-green-600 dark:text-green-400
  negativo: text-red-600 dark:text-red-400
  neutro:   text-muted

Trend badge (top-right):
  rounded-full px-2 py-0.5
  positivo: bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400
  negativo: bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400
  icone: TrendingUp ou TrendingDown (16px)
```

### 3.3 Os 5 Cards

**Card 1 — Jobs Ativos**
- Icone: `Clapperboard` (rose-500)
- Valor: contagem de jobs nao concluidos/cancelados
- Comparacao: vs semana passada
- Trend: neutro (contagem pura)
- Click: navega para /jobs com filtro "ativos"

**Card 2 — Faturamento do Mes**
- Icone: `DollarSign` (amber-500)
- Valor: soma de `closed_value` dos jobs com data no mes corrente, formatado R$ 0,0k / R$ 0,0M
- Comparacao: vs mes anterior (percentual)
- Trend: verde/vermelho
- Click: navega para /financial

**Card 3 — Margem Media**
- Icone: `Percent` (emerald-500)
- Valor: media de `margin_percentage` dos jobs do mes (1 casa decimal, sufixo %)
- Comparacao: vs mes anterior
- Trend: verde se > 30%, vermelho se < 20%
- Click: navega para /reports?tab=financeiro

**Card 4 — Health Score Medio**
- Icone: `Activity` (blue-500)
- Valor: media dos health_scores dos jobs ativos (inteiro 0-100, sufixo /100)
- Visual: barra de progresso fina abaixo do numero (h-1, rounded-full)
  - 0-40: bg-red-500
  - 41-70: bg-amber-500
  - 71-100: bg-green-500
- Click: navega para /jobs ordenado por health_score asc

**Card 5 — Aprovacoes Pendentes**
- Icone: `ClipboardCheck` (violet-500)
- Valor: contagem de approval_requests com status pending
- Badge de urgencia: se > 0, mostrar ponto vermelho pulsando no icone (como notificacao)
- Comparacao: "X aguardando ha mais de 48h" (se houver)
- Click: navega para /approvals?status=pending
- Estado critico: se > 0, card tem borda rose-500/40 e leve bg-rose-50 dark:bg-rose-500/5

### 3.4 Loading State dos Cards

Skeleton de 5 cards com `animate-pulse`:
```
+-------------------------------+
|  [##] (20px)      [####]      |
|                               |
|  [################] (36px)    |
|  [############] (12px)        |
|                               |
|  [####################]       |
+-------------------------------+
```

---

## 4. Mini Pipeline de Status

### 4.1 Objetivo

Mostrar quantos jobs existem em cada status de forma horizontal e compacta. O CEO vê em 1 segundo se ha gargalos.

### 4.2 Wireframe

```
+-----------------------------------------------------------------------+
|  PIPELINE DE JOBS                              [Ver todos ->]          |
|                                                                        |
|  Briefing    Orcamento  Aprovado   Pre-Prod   Producao   Pos-Prod   Entrega   Concluido
|  [####]      [######]   [##]       [########] [####]     [######]   [##]      [##########]
|    3            5         2           8          4           6         2           10        |
+-----------------------------------------------------------------------+
```

### 4.3 Especificacao Visual

```
Container:
  bg: surface
  border: 1px border
  rounded-xl
  p-5

Titulo:
  "Pipeline de Jobs"
  font: 14px font-medium
  inline com link "Ver todos" (14px, text-rose-500, hover:underline)

Barra de progresso proporcional:
  Layout: flex items-end gap-1 h-10 mt-4
  Cada segmento:
    bg: {status-color}/20 (preenchimento) com borda top {status-color}
    border-radius: rounded-t-sm
    min-width: 32px
    largura: proporcional a contagem
    hover: bg {status-color}/40, cursor-pointer
    click: navega para /jobs?status={status}

Contagem abaixo de cada barra:
  Numero: 13px font-semibold, cor do status
  Label: 11px text-muted, truncado

Tooltip no hover:
  "X jobs em [status]"
  Popover pequeno acima da barra
```

### 4.4 Variante: Lista Compacta (quando nao ha dados suficientes para barra)

Se total de jobs < 5, mostrar como pills horizontais:
```
[• Briefing 3]  [• Orcamento 5]  [• Pre-Producao 8]  ...
```
Cada pill tem a cor do status, formato badge arredondado.

---

## 5. Painel de Alertas Urgentes

### 5.1 Objetivo

Card de alta prioridade com itens que exigem atencao imediata. Inspirado no Linear "Inbox" — lista curta, objetiva, clicavel.

### 5.2 Wireframe

```
+----------------------------------------------+
|  [AlertTriangle 18px rose]  ALERTAS           |
|  3 itens exigem atencao            [Limpar]   |
|                                               |
|  PRAZOS VENCENDO (hoje e amanha)              |
|  +------------------------------------------+|
|  | [CalendarX 16px red]                     ||
|  | BBB_042 - Spot Animado XYZ               ||
|  | Prazo de entrega: HOJE                   ||
|  | [Ver job ->]                             ||
|  +------------------------------------------+|
|  | [CalendarX 16px amber]                   ||
|  | BBB_039 - Campanha Digital               ||
|  | Prazo de entrega: amanha                 ||
|  | [Ver job ->]                             ||
|  +------------------------------------------+|
|                                               |
|  MARGEM CRITICA (< 20%)                       |
|  +------------------------------------------+|
|  | [TrendingDown 16px red]                  ||
|  | BBB_037 - Documentario Corporativo       ||
|  | Margem: 12% (meta: 30%)                  ||
|  | [Ver job ->]                             ||
|  +------------------------------------------+|
|                                               |
|  APROVACOES URGENTES (> 48h aguardando)       |
|  +------------------------------------------+|
|  | [ClipboardX 16px violet]                 ||
|  | BBB_041 - Aprovacao interna de edicao    ||
|  | Aguardando ha 3 dias                     ||
|  | [Aprovar ->]                             ||
|  +------------------------------------------+|
|                                               |
|  [Ver todos os alertas]                       |
+----------------------------------------------+
```

### 5.3 Especificacao Visual

```
Container card:
  bg: surface
  border: 1px border
  border-radius: rounded-xl
  padding: p-5
  height: fit-content (nao fixo)

Header do card:
  flex justify-between items-center
  mb-4
  Titulo: "Alertas" 16px font-semibold
  Icone: AlertTriangle 18px text-rose-500 mr-2
  Contador: badge rose-500 rounded-full px-2 py-0.5 text-xs font-bold text-white
  Botao limpar: ghost 12px text-muted (limpa alertas visualizados do localStorage)

Grupos de alerta:
  mb-4
  Label do grupo:
    text-xs font-semibold uppercase tracking-wide text-muted
    mb-2

Item de alerta:
  flex gap-3 items-start
  p-3 rounded-lg
  bg: neutral-50 dark:bg-neutral-800/50
  border: 1px transparent
  hover: border-neutral-200 dark:border-neutral-700
  cursor-pointer
  mb-2
  transition-colors duration-150

  Icone (left): 16px, cor semantica do tipo de alerta
    prazo hoje: red-500
    prazo amanha: amber-500
    margem critica: red-500
    aprovacao urgente: violet-500

  Conteudo (flex-1):
    Job code: 11px font-mono text-muted
    Titulo: 13px font-medium text-primary, truncado
    Detalhe: 12px text-secondary
    Link: 12px text-rose-500 hover:underline mt-1

Estado sem alertas:
  py-8 text-center
  Icone: CheckCircle2 32px text-green-500
  Texto: "Tudo em ordem por aqui"
  Subtexto: text-muted 13px
```

### 5.4 Logica de Alertas

Alertas gerados por:
1. Jobs com `deadline_date` = hoje ou amanha (e status != concluido/cancelado)
2. Jobs com `margin_percentage` < 20% e status em producao ativa
3. `approval_requests` com status = pending e `created_at` < NOW() - 48h
4. Jobs com `health_score` < 30

Maximo 10 alertas exibidos (os mais urgentes primeiro). Se > 10, mostrar "Ver N outros alertas".

---

## 6. Timeline de Atividades Recentes

### 6.1 Objetivo

Mostrar o que aconteceu nas ultimas 24-48h sem precisar abrir cada job. Inspirado no Git log do Linear.

### 6.2 Wireframe

```
+--------------------------------------+
|  ATIVIDADE RECENTE          [Hoje v] |
|                                      |
|  14:32                               |
|  |  [Avatar MB 24px]                 |
|  |  Maria B. atualizou status        |
|  |  BBB_042 para Pos-Producao        |
|  |  [Pos-Producao badge]             |
|                                      |
|  14:15                               |
|  |  [Avatar JS 24px]                 |
|  |  Joao S. criou novo job           |
|  |  BBB_043 - Campanha Verao 2026    |
|                                      |
|  12:08                               |
|  |  [Icone CheckCircle green 24px]   |
|  |  Aprovacao recebida               |
|  |  BBB_039 - aprovado pelo cliente  |
|                                      |
|  11:45                               |
|  |  [Icone DollarSign amber 24px]    |
|  |  Budget aprovado                  |
|  |  BBB_038 - R$ 85.000             |
|                                      |
|  ONTEM                               |
|  |  [...]                            |
|                                      |
|  [Ver historico completo]            |
+--------------------------------------+
```

### 6.3 Especificacao Visual

```
Container card:
  bg: surface
  border: 1px border
  rounded-xl
  p-5
  max-h: 480px
  overflow-y: auto (scroll interno suave)

Header:
  flex justify-between items-center mb-4
  Titulo: 16px font-semibold
  Filtro de periodo: Select pequeno (Hoje | Ultimas 48h | Esta semana)
  h-8 text-sm

Timeline (lista vertical):
  position: relative

  Linha vertical:
    before: absolute left-[11px] top-0 bottom-0 w-px bg-border

  Item:
    position: relative
    flex gap-3
    pb-4
    pl-1

    Hora:
      text-xs text-muted
      width: 40px
      flex-shrink-0
      pt-0.5

    Avatar ou icone (left):
      w-6 h-6 rounded-full
      flex-shrink-0
      z-10 (fica sobre a linha vertical)
      bg: surface (para cobrir a linha)
      ring: 2px ring-background

      Avatar de usuario: foto ou iniciais
        bg: zinc-200 dark:zinc-700
        text: 10px font-bold text-secondary

      Icone de sistema:
        bg: cor do tipo de evento (20% opacity)
        icone: 12px, cor do tipo

    Conteudo (flex-1):
      Acao: 13px text-primary
      Job: 13px font-medium text-rose-500 hover:underline cursor-pointer
      Badge de status (quando mudanca de status): inline, 11px
      Meta info: 11px text-muted

  Separador de data:
    text-xs font-semibold text-muted uppercase tracking-wide
    py-2

Tipos de evento e cores:
  status_change:    icone ArrowRight, cor do novo status
  job_created:      icone Plus, rose-500
  approval_sent:    icone Send, violet-500
  approval_received:icone CheckCircle2, green-500
  budget_approved:  icone DollarSign, amber-500
  file_uploaded:    icone FileUp, blue-500
  comment:          icone MessageSquare, zinc-400

Loading state:
  5 skeleton items com altura variavel (animate-pulse)

Empty state:
  Icone: Clock 32px text-muted
  Texto: "Nenhuma atividade no periodo"
  Subtexto: 12px text-muted
```

---

## 7. Grafico de Distribuicao por Status (Donut)

### 7.1 Objetivo

Visualizar percentualmente como os jobs estao distribuidos. Identificar acumulos em algum status.

### 7.2 Wireframe

```
+----------------------------------------------+
|  JOBS POR STATUS              [Este mes v]   |
|                                              |
|          +--------+                          |
|         /          \                         |
|        |    42      |    -- Briefing    3    |
|        |   total    |    -- Orcamento   5    |
|         \          /    -- Pre-Prod    8    |
|          +--------+     -- Producao    4    |
|                         -- Pos-Prod    6    |
|                         -- Entrega     2    |
|                         -- Concluido  10    |
|                         -- Cancelado   4    |
|                                              |
+----------------------------------------------+
```

### 7.3 Especificacao Visual

```
Container card:
  bg: surface
  border: 1px border
  rounded-xl
  p-5

Header:
  flex justify-between items-center mb-4
  Titulo: "Jobs por Status" 15px font-semibold
  Select periodo: h-8 text-sm (Este mes | Trimestre | Ano | Tudo)

Layout interno:
  flex gap-6 items-center

  Donut (recharts ou victory-native):
    width: 160px
    height: 160px
    inner radius: 52px (mostrar total no centro)
    outer radius: 72px
    gap entre fatias: 2px
    cores: exatamente as cores de status do design system

    Centro do donut:
      Total (numero): 24px font-bold
      "total" (label): 11px text-muted

    Hover de fatia:
      opacidade: 0.9 -> 1.0
      tooltip custom: "{status}: {N} jobs ({%}%)"

  Legenda (vertical, flex-1):
    Cada item:
      flex items-center gap-2 py-1.5
      hover: cursor-pointer (toggle visibilidade da fatia)

      Dot: w-2.5 h-2.5 rounded-full bg-{status-color}
      Label: 13px text-primary capitalize
      Contagem: 13px font-semibold text-primary ml-auto
      Percentual: 12px text-muted ml-2

    Fonte de dados: job_history ou contagem em tempo real

Loading state:
  Donut: skeleton circular w-40 h-40 rounded-full animate-pulse
  Legenda: 5 skeleton lines

Empty state:
  "Nenhum job no periodo"
```

---

## 8. Grafico de Faturamento por Mes (Bar)

### 8.1 Objetivo

Mostrar tendencia de faturamento nos ultimos 6 meses. Permitir comparar com meta.

### 8.2 Wireframe

```
+----------------------------------------------+
|  FATURAMENTO MENSAL           [6 meses v]    |
|                                              |
| R$120k |         [=]                         |
|        |      [=] [=]                        |
| R$ 80k |   [=] [=] [=]                       |
|        | [=] [=] [=] [=]                     |
| R$ 40k | [=] [=] [=] [=] [=]                 |
|        | [=] [=] [=] [=] [=] [=]             |
|        +----+----+----+----+----+----+       |
|         Set  Out  Nov  Dez  Jan  Fev          |
|                                              |
|  Total do periodo: R$ 485.000               |
|  Media mensal: R$ 80.833                    |
+----------------------------------------------+
```

### 8.3 Especificacao Visual

```
Container card:
  bg: surface
  border: 1px border
  rounded-xl
  p-5

Header:
  flex justify-between items-center mb-4
  Titulo: "Faturamento Mensal" 15px font-semibold
  Select range: h-8 text-sm (3 meses | 6 meses | 12 meses | Este ano)

Bar chart (recharts BarChart):
  height: 200px
  margin: { top: 8, right: 0, bottom: 0, left: 0 }

  Bars:
    cor primaria: amber-500 (faturamento bruto)
    cor secundaria: amber-200/50 (meta, se configurada) - barras fantasmas atras
    bar-radius: 4px top apenas
    gap entre barras: 20% do width

  Eixo X:
    labels: "Set", "Out", "Nov", etc. (3 chars)
    fonte: 11px text-muted
    sem linha de eixo

  Eixo Y:
    formato: R$ Xk ou R$ XM
    fonte: 11px text-muted
    grid lines: 3-4 linhas horizontais, stroke-dasharray, opacity 30%

  Tooltip custom:
    bg: popover
    border: 1px border
    rounded-lg p-2 shadow-lg
    "Mes: R$ X.XXX.XXX"
    "Jobs concluidos: N"

  Cursor:
    barra: fill transparente com bg de hover sutil

Rodape de resumo:
  flex gap-6 mt-4 pt-4 border-t border-border
  Cada item:
    Label: 11px text-muted uppercase tracking-wide
    Valor: 15px font-semibold
  Itens: Total do periodo | Media mensal | Melhor mes

Loading state:
  7 skeleton bars de altura variada, animate-pulse

Empty state:
  "Nenhum dado financeiro no periodo"
  Botao: "Adicionar registro financeiro" -> /financial/new
```

---

## 9. Estados: Loading, Empty, Error

### 9.1 Loading (primeiro carregamento)

Skeleton completo da pagina — nao usar spinner centralizado.

```
+------------------------------------------------------------------+
|  PAGE HEADER skeleton                                             |
|  [################] [##]                [########] [#######]     |
+------------------------------------------------------------------+
|  KPI CARDS (5x skeleton)                                         |
|  +--------+ +--------+ +--------+ +--------+ +--------+          |
|  |[##]    | |[##]    | |[##]    | |[##]    | |[##]    |          |
|  |[######]| |[######]| |[######]| |[######]| |[######]|          |
|  |[####]  | |[####]  | |[####]  | |[####]  | |[####]  |          |
|  +--------+ +--------+ +--------+ +--------+ +--------+          |
|  PIPELINE skeleton: [############################]               |
|  GRID skeleton: [##################] [##########]                |
|  GRAFICOS skeleton: [##########] [##########]                    |
+------------------------------------------------------------------+
```

Skeleton implementado com shadcn Skeleton (bg-muted animate-pulse).

### 9.2 Empty (produtora nova, sem dados)

```
+------------------------------------------------------------------+
|  KPI Cards: todos zerados (0, R$0, -%, 0/100, 0)                 |
|  Pipeline: todos os status com 0                                 |
|  Alertas:                                                        |
|    [CheckCircle2 40px green]                                     |
|    "Tudo certo por aqui!"                                        |
|    "Crie seu primeiro job para comecar"                          |
|    [+ Criar Primeiro Job] (button primary)                       |
|  Atividade: "Nenhuma atividade ainda"                            |
|  Graficos: empty state com placeholder visual                    |
+------------------------------------------------------------------+
```

### 9.3 Error (falha de rede ou API)

```
Banner no topo da pagina:
  bg-red-50 dark:bg-red-950/30
  border-b border-red-200 dark:border-red-800
  px-6 py-3

  flex items-center gap-3
  [AlertTriangle 16px red-500]
  "Nao foi possivel carregar os dados. Tente novamente."
  [Tentar novamente] (button outline sm, ml-auto)

Cards com erro:
  Mostrar ultimo valor conhecido (se houver cache)
  Badge "Dados desatualizados" em cada card
  opacity-60 para indicar dados possivelmente incorretos
```

---

## 10. Responsividade

### 10.1 Mobile (<768px)

```
+---------------------------+
|  TOPBAR (h-14)            |
+---------------------------+
|  PAGE HEADER              |
|  "Bom dia, [nome]"        |
|  [Periodo v]              |
+---------------------------+
|  KPI CARDS (2 colunas)    |
|  +----------+----------+  |
|  | Jobs Atv | Fatur.   |  |
|  +----------+----------+  |
|  | Margem   | Health   |  |
|  +----------+----------+  |
|  | Aprovac. pendentes  |  |
|  +--------------------+   |
+---------------------------+
|  PIPELINE (scroll horiz.) |
|  [Brief][Orc][Aprov]...   |
+---------------------------+
|  ALERTAS (full width)     |
|  (3 itens visiveis)       |
|  [Ver todos]              |
+---------------------------+
|  ATIVIDADE RECENTE        |
|  (5 itens visiveis)       |
|  [Ver mais]               |
+---------------------------+
|  GRAFICO STATUS (donut)   |
|  (legenda abaixo)         |
+---------------------------+
|  GRAFICO FATURAMENTO      |
|  (bar, scroll horiz.)     |
+---------------------------+
|  BOTTOM NAV (h-16)        |
+---------------------------+

KPI mobile:
  grid-cols-2 gap-3
  Card 5 (aprovacoes): col-span-2

Pipeline mobile:
  scroll horizontal: overflow-x-auto
  pills de status em linha unica
  nao usa barra proporcional

Graficos mobile:
  1 coluna
  Donut: 120px, legenda horizontal abaixo (2 colunas)
  Bar: height 150px, scroll horizontal se necessario
```

### 10.2 Tablet (768px - 1023px)

```
Sidebar: drawer overlay (hamburguer)
KPI Cards: grid-cols-3 (5 cards = 3+2)
  Cards 4 e 5: col-span + centralizado ou grid-cols-2 na segunda linha
Grid main: 1 coluna (alertas + atividade empilhados)
Graficos: grid-cols-2
```

### 10.3 Desktop Grande (1536px+)

```
Container: ainda max-w-7xl (sem crescer alem)
KPIs: 5 colunas com mais padding interno
Grid main: 3fr + 2fr (mais espaco para alertas)
Graficos: dar mais altura (240px nos bar charts)
```

---

## 11. Interacoes e Animacoes

### 11.1 Entrada da Pagina

```
Page load stagger (Framer Motion):
  1. KPI Cards: fade-in + translateY(8px -> 0) com delay staggered (0ms, 60ms, 120ms, 180ms, 240ms)
  2. Pipeline: fade-in delay 300ms
  3. Grid (alertas + atividade): fade-in delay 360ms
  4. Graficos: fade-in delay 420ms

Duracao de cada animacao: 300ms ease-out
Respeitar prefers-reduced-motion: se ativo, sem animacoes
```

### 11.2 Interacoes dos KPI Cards

```
Hover:
  transform: translateY(-2px)
  shadow: shadow-md
  border-color: levemente mais escura
  duration: 150ms ease-out

Click:
  transform: scale(0.98) -> 1 (press feedback)
  navigacao: pushState para a rota associada
```

### 11.3 Pipeline Hover

```
Segmento de barra:
  hover: bg opacity aumenta + mostrar tooltip
  click: push para /jobs?status={status}
  transition: 150ms
```

### 11.4 Alertas — Dismiss

```
Botao "Limpar" (limpa do localStorage apenas):
  Animacao: item sai com slide-left + fade-out (200ms)
  Contador do badge: decrementa com spring animation
```

### 11.5 Atualizacao em Tempo Real

```
Via Supabase Realtime (INSERT em notifications):
  Novo alerta: novo item aparece no topo com slide-down + highlight rose por 2s
  Mudanca de status: KPI cards piscam levemente (border pulse 1x)
  Novas atividades: dot verde no titulo "Atividade Recente" por 5s
```

### 11.6 Header Saudacao

```
Hora do dia -> saudacao personalizada:
  00-11:59 -> "Bom dia"
  12-17:59 -> "Boa tarde"
  18-23:59 -> "Boa noite"

Nome: primeiro nome do usuario do JWT (profiles.full_name)
```

---

## 12. Acessibilidade

```
Estrutura semantica:
  <main> com id="main-content"
  Skip link: "Pular para o conteudo" (primeiro elemento do body)
  <h1>: titulo da pagina (sr-only se visualmente redundante com header)
  <section> com aria-label para cada bloco (KPIs, Pipeline, Alertas, etc.)

KPI Cards:
  role="article" ou <article>
  aria-label="[label]: [valor]"
  tabindex="0" (para navegacao por teclado)
  onKeyDown: Enter/Space -> navegar

Pipeline:
  role="group" aria-label="Pipeline de status dos jobs"
  Cada segmento: role="button" aria-label="[N] jobs em [status], clique para filtrar"

Alertas:
  role="list" aria-label="Alertas urgentes"
  Cada item: role="listitem"
  aria-live="polite" no container (anunciar novos alertas)

Timeline:
  role="feed" aria-label="Atividades recentes"
  Cada item: role="article"

Graficos:
  role="img" aria-label="[descricao completa do grafico]"
  tabindex="0"
  Alternativa textual: sr-only com os dados principais

Contraste:
  Numeros dos KPIs: FAFAFA sobre card dark -> 7:1+ OK
  Labels muted: zinc-400 sobre zinc-900 -> 5.8:1 OK
  Trend verde: green-400 sobre zinc-900 dark -> 5.6:1 OK
  rose-500 sobre white: 4.9:1 OK (AA para texto)

Foco (teclado):
  Tab order: Header -> KPIs -> Pipeline -> Alertas -> Atividade -> Graficos
  Focus ring: ring-2 ring-rose-500/50 ring-offset-2
  Escape: fechar tooltips e popovers
```

---

## 13. Dark Mode

```
Page background: bg-background (#09090B dark)
Cards: bg-card (#1F1F23 dark)
Borders: border-border (#3F3F46 dark)

KPI Cards:
  Numeros: text-foreground (FAFAFA)
  Labels: text-muted-foreground (zinc-400)
  Trend verde: text-green-400
  Trend vermelho: text-red-400

  Card aprovacoes urgentes (alerta):
    dark: border-rose-500/30 bg-rose-500/5
    light: border-rose-500/40 bg-rose-50

Pipeline:
  Barras: cores de status com opacity /15 (dark) vs /10 (light)
  Borda topo: cor plena do status

Alertas:
  Header icone rose: dark: text-rose-400 / light: text-rose-500
  Items: bg-neutral-800/50 (dark) vs bg-neutral-50 (light)

Timeline:
  Linha vertical: bg-border (zinc-700 dark)
  Avatar: bg-zinc-700 text-zinc-200

Graficos:
  Tooltip: bg-popover (zinc-900 dark)
  Grid lines: stroke zinc-700 (dark) com opacity 0.3
  Axis labels: text-muted-foreground (zinc-400)
```

---

## 14. Tokens de Referencia Rapida

```
Espacamento:
  Page padding:     px-6 py-6 (desktop) / px-4 py-4 (mobile)
  Card padding:     p-5
  Card gap:         gap-4 (KPIs) / gap-6 (secoes)
  Section margin:   mb-6

Tipografia:
  KPI numero:       text-4xl font-bold tracking-tight     (36px)
  KPI label:        text-xs font-medium uppercase tracking-wide text-muted  (12px)
  KPI comparacao:   text-xs                               (12px)
  Card titulo:      text-base font-semibold               (16px) - alguns 15px
  Item texto:       text-sm                               (14px)
  Meta / hora:      text-xs text-muted                    (12px)

Border radius:
  Cards:            rounded-xl  (12px)
  Badges:           rounded-full
  Botoes:           rounded-md  (6px)
  Tooltip:          rounded-lg  (8px)

Z-index:
  Topbar:           z-50
  Alertas tooltip:  z-40
  Graficos tooltip: z-50 (via portal)

Biblioteca de graficos: recharts (https://recharts.org)
  Instalacao: npm install recharts
  Import: import { BarChart, Bar, ... } from 'recharts'
  Wrapper: <ResponsiveContainer width="100%" height={200}>

Icones dos cards KPI:
  Jobs Ativos:      Clapperboard     (rose-500)
  Faturamento:      DollarSign       (amber-500)
  Margem:           Percent          (emerald-500)
  Health:           Activity         (blue-500)
  Aprovacoes:       ClipboardCheck   (violet-500)
```

---

## Changelog

| Data       | Versao | Descricao                       |
|------------|--------|---------------------------------|
| 2026-02-20 | 1.0    | Spec inicial - Fase 7           |
