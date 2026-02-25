# Spec Visual: Relatorios (/reports)

**Data:** 2026-02-20
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Design System:** docs/design/design-system.md
**Fase:** 7 - Dashboard + Relatorios + Portal do Cliente

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Layout Geral](#2-layout-geral)
3. [Header e Seletor de Tipo de Relatorio](#3-header-e-seletor-de-tipo-de-relatorio)
4. [Barra de Filtros](#4-barra-de-filtros)
5. [Relatorio: Performance](#5-relatorio-performance)
6. [Relatorio: Financeiro](#6-relatorio-financeiro)
7. [Relatorio: Equipe](#7-relatorio-equipe)
8. [Tabela de Dados (compartilhada)](#8-tabela-de-dados-compartilhada)
9. [Export CSV](#9-export-csv)
10. [Estados: Loading, Empty, Error](#10-estados-loading-empty-error)
11. [Responsividade](#11-responsividade)
12. [Interacoes e Animacoes](#12-interacoes-e-animacoes)
13. [Acessibilidade](#13-acessibilidade)
14. [Dark Mode](#14-dark-mode)
15. [Tokens de Referencia Rapida](#15-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

A pagina de Relatorios e onde o CEO e gestores analisam dados historicos para tomada de decisao estrategica. Diferente do Dashboard (visao do dia), aqui o foco e em tendencias, comparacoes e exportacao de dados.

**Quem usa:** CEO, produtor-executivo, financeiro, gerente de producao.
**Quando usa:** Reunioes de diretoria, fechamento mensal, analise de performance de equipe.
**O que precisa entregar:**
- Graficos comparativos por periodo
- Tabela de dados detalhada
- Exportacao para Excel/CSV

**Referencias de UX:** Linear (filtros inline, graficos clean), Monday.com (relatorios com tabs), Notion (densidade de informacao organizada).

---

## 2. Layout Geral

### 2.1 Desktop (1280px+, sidebar expandida)

```
+------------------------------------------------------------------+
|  TOPBAR (h-14, fixed top-0, z-50)                                |
+--------+---------------------------------------------------------+
|        |                                                         |
| SIDE   |  PAGE HEADER (nao sticky)                               |
| BAR    |  +---------------------------------------------------+  |
| w-64   |  | Relatorios             [Export CSV] [Compartilhar]|  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  TIPO DE RELATORIO (tabs sticky top-14)                 |
|        |  +---------------------------------------------------+  |
|        |  | [Performance] [Financeiro] [Equipe]               |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  BARRA DE FILTROS (sticky top-14+48)                   |
|        |  +---------------------------------------------------+  |
|        |  | [Periodo] [Cliente] [Diretor] [Tipo] [+ Filtros]  |  |
|        |  | Chips de filtros ativos: [x] [x] [x]  [Limpar]   |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  KPI SUMMARY ROW (3-4 cards, resumo do periodo)        |
|        |  +--------+--------+--------+--------+                 |
|        |  | Total  | Media  | Melhor | Pior   |                 |
|        |  +--------+--------+--------+--------+                 |
|        |                                                         |
|        |  AREA DE GRAFICOS (1 ou 2 graficos, dependendo do tipo)|
|        |  +-------------------------------+-------------------+  |
|        |  |  Grafico Principal (2/3)      | Grafico Aux (1/3) |  |
|        |  +-------------------------------+-------------------+  |
|        |                                                         |
|        |  TABELA DE DADOS (full width)                          |
|        |  +---------------------------------------------------+  |
|        |  | col1 | col2 | col3 | col4 | col5 | col6 | col7   |  |
|        |  | ...                                               |  |
|        |  | PAGINATION                                        |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
+--------+---------------------------------------------------------+
```

### 2.2 Container e Espacamento

```
Container:   max-w-7xl mx-auto px-6 pb-12
Header:      pt-6 pb-4
Tabs:        mb-0 (colam nos filtros)
Filtros:     py-3 bg-background border-b mb-6
KPIs:        grid-cols-4 gap-4 mb-6
Graficos:    grid grid-cols-3 gap-6 mb-6
Tabela:      mb-8
```

---

## 3. Header e Seletor de Tipo de Relatorio

### 3.1 Header da Pagina

```
+------------------------------------------------------------------+
| Relatorios                     [Export CSV v] [Compartilhar]     |
| Analise detalhada de performance e financeiro                    |
+------------------------------------------------------------------+
```

```
Titulo: "Relatorios" — text-2xl font-semibold tracking-tight
Subtitulo: text-sm text-muted-foreground mt-0.5
  Texto dinamico: "Exibindo dados de [periodo selecionado]"

Acoes (flex gap-2 ml-auto):
  Export CSV: Button outline sm
    Icone: Download 16px
    Label: "Exportar"
    Dropdown ao clicar: [CSV | Excel | PDF]
    Loading state: Loader2 animate-spin, texto "Gerando..."

  Compartilhar: Button ghost sm
    Icone: Share2 16px
    Label: "Compartilhar"
    Acao: copia URL com filtros como query params + toast "Link copiado"
```

### 3.2 Tabs de Tipo de Relatorio

Tabs horizontais usando shadcn/ui Tabs component.

```
TABS BAR:
+------------------------------------------------------------------+
| [Performance] [Financeiro] [Equipe]                               |
+------------------------------------------------------------------+

Styling:
  bg: background (merge com page, sem card proprio)
  border-bottom: 1px border-border
  padding: px-0 (alinha com conteudo)
  sticky: top-14 z-30 (abaixo do topbar, acima do conteudo)

Tab item:
  h: 44px
  padding: px-4
  font: 14px font-medium
  color default: text-muted-foreground
  color active: text-foreground
  border-bottom active: 2px solid rose-500 (dentro do tab, nao abaixo)
  hover: text-foreground bg-muted/50
  transition: 150ms

URL: /reports?tab=performance | financeiro | equipe
  (tabs refletem na URL para permitir link direto e botao voltar)
```

---

## 4. Barra de Filtros

### 4.1 Layout

```
+------------------------------------------------------------------+
| [Calendario: Jan 2026 - Fev 2026 v]  [Cliente: Todos v]          |
| [Diretor: Todos v]  [Tipo: Todos v]  [+ Mais filtros]            |
+------------------------------------------------------------------+
| Filtros ativos:                                                   |
| [x Jan-Fev 2026] [x Cliente: Ambev] [x Tipo: Documentario]       |
| [Limpar tudo]                                                     |
+------------------------------------------------------------------+
```

### 4.2 Especificacao dos Filtros

```
Container:
  bg: background
  border-bottom: 1px border-border
  sticky: top-[calc(56px+44px)] = top-[100px] z-20
  py-3 px-6

Linha 1 (filtros principais):
  flex flex-wrap gap-3

  Filtro de Periodo (DateRangePicker):
    Trigger: Button variant="outline" size="sm"
    Icone: CalendarDays 16px mr-2
    Label: "Jan 2026 - Fev 2026" (formato resumido)
    Popover: calendario de range (shadcn/ui DatePicker adaptado)
    Atalhos rapidos no popover:
      [Esta semana] [Este mes] [Mes passado] [Este trimestre] [Este ano]

  Filtro Cliente:
    Trigger: Button variant="outline" size="sm"
    Icone: Building2 16px mr-2
    Popover: lista searchable de clientes
    Multi-select: checkbox por cliente
    Badge: contador de selecionados "+N"

  Filtro Diretor (visivel apenas em Performance e Equipe):
    Trigger: Button variant="outline" size="sm"
    Icone: Users 16px mr-2
    Popover: lista searchable de pessoas com role=director

  Filtro Tipo de Projeto:
    Trigger: Button variant="outline" size="sm"
    Icone: Tag 16px mr-2
    Options: Todos | TVC | Digital | Documentario | Corporativo | Evento | etc.
    Single-select (Combobox)

  Botao "+ Mais filtros":
    variant="ghost" size="sm"
    Abre drawer lateral com filtros avancados:
      Status do job, Faixa de valor, Range de margem, Tag, Diretor de arte, etc.

Linha 2 (chips de filtros ativos - condicional):
  Aparece apenas quando ha filtros ativos
  flex flex-wrap gap-2 mt-2 pt-2 border-t border-border

  Chip:
    inline-flex items-center gap-1
    h-6 px-2 rounded-full
    bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400
    text-xs font-medium
    Botao X: w-4 h-4, remove o filtro
    Hover: bg levemente mais escuro

  Botao "Limpar tudo":
    variant="ghost" size="sm"
    text-muted-foreground hover:text-foreground
    ml-2
```

---

## 5. Relatorio: Performance

### 5.1 KPI Summary (cards do topo)

```
+----------+----------+----------+----------+
| Jobs     | Health   | Taxa de  | Prazo    |
| Ativos   | Medio    | Entrega  | Cumprido |
| 42       | 78/100   | 94%      | 89%      |
+----------+----------+----------+----------+
```

```
4 cards em grid-cols-4
Cada card identico ao design dos KPI Cards do Dashboard (ver dashboard-home.md sec 3.2)
Exceto: sem trend badge, sem link de navegacao ao clicar

Icones:
  Jobs Ativos:     Clapperboard rose-500
  Health Medio:    Activity blue-500
  Taxa de Entrega: CheckCircle2 emerald-500
  Prazo Cumprido:  Calendar green-500
```

### 5.2 Grafico Principal: Jobs por Periodo (Line Chart)

```
+----------------------------------------------+
|  JOBS POR PERIODO           [Mensal v]        |
|                                               |
| 20 |                    *                     |
|    |               *  *                       |
| 15 |          *  *                            |
|    |     *  *                                 |
| 10 | *  *                                     |
|    +--+--+--+--+--+--                         |
|    Set Out Nov Dez Jan Fev                    |
|    -- Jobs criados  -- Jobs concluidos        |
+----------------------------------------------+
```

```
recharts LineChart
height: 240px
Linhas:
  Jobs criados: rose-500, stroke-width 2, dot: w-3 h-3
  Jobs concluidos: emerald-500, stroke-width 2, dot: w-3 h-3
  Jobs cancelados: zinc-400, stroke-width 1, stroke-dasharray "4 4"

Legenda: abaixo do grafico, inline
Tooltip: bg popover, mostra todos os valores do mes com icone da linha
```

### 5.3 Grafico Auxiliar: Health Score por Diretor (Bar horizontal)

```
+------------------------+
|  HEALTH POR DIRETOR    |
|                        |
| Maria B.  [========] 85|
| Joao S.   [======] 72  |
| Ana P.    [=====] 61   |
| Pedro L.  [====] 48    |
+------------------------+
```

```
recharts BarChart horizontal
width: 100%
height: 200px
Bars: cor por range (verde 71+, amber 41-70, red 0-40)
Label: nome do diretor truncado 100px
Valor: numerico na ponta da barra
```

### 5.4 Tabela de Performance

Colunas: Job | Cliente | Diretor | Status | Health | Prazo | Entrega | Margem

---

## 6. Relatorio: Financeiro

### 6.1 KPI Summary

```
+----------+----------+----------+----------+
| Fatur.   | Custo    | Margem   | Inadim.  |
| Total    | Total    | Bruta    | plencia  |
| R$485k   | R$312k   | 35,7%    | R$12k    |
+----------+----------+----------+----------+
```

```
Icones:
  Faturamento:  DollarSign amber-500
  Custo Total:  TrendingDown red-500
  Margem Bruta: Percent emerald-500
  Inadimplencia:AlertTriangle orange-500

Faturamento e Custo: formato R$ Xk / R$ XM
Margem: percentual com 1 casa decimal
Inadimplencia: vermelho se > 0
```

### 6.2 Grafico Principal: Faturamento vs Custo vs Margem (Stacked Bar + Line)

```
+----------------------------------------------+
|  FATURAMENTO vs CUSTO         [Mensal v]      |
|                                               |
| R$120k |  [####][####][####][####][####][####]|
|         |  [~~~~][~~~~][~~~~][~~~~][~~~~][~~~~]|
| R$ 80k  |                                     |
|   40% -.  . - . - . - . - . - . - . - . - .   |
| R$ 40k  |                                     |
|   20% -|                                     |
|         +--+--+--+--+--+--                    |
|          Set Out Nov Dez Jan Fev               |
|    [####] Faturamento  [~~~~] Custo  [--] Margem %
+----------------------------------------------+
```

```
recharts ComposedChart
height: 260px

Bars (stacked): faturamento (amber-500) + custo (red-400)
Line: margem % (emerald-500, eixo Y direito 0-100%)

Eixo Y esquerdo: R$ valores (format Xk/XM)
Eixo Y direito: percentual (apenas se margem habilitada)
Legend: abaixo, com toggle de visibilidade por item
```

### 6.3 Grafico Auxiliar: Faturamento por Cliente (Pie / Donut)

```
+------------------------+
|  POR CLIENTE           |
|                        |
|    ( donut )           |
|                        |
| Ambev      R$ 145k 30% |
| Natura     R$ 98k  20% |
| Magazine   R$ 72k  15% |
| Outros     R$ 170k 35% |
+------------------------+
```

```
recharts PieChart (donut)
width: 160px
Legenda: lista vertical a direita
Itens ordenados por valor desc
"Outros": agrupa clientes com < 5% do total
```

### 6.4 Tabela Financeira

Colunas: Job | Cliente | Valor Bruto | Custo | Margem % | Status Pagamento | Vencimento | NF

Margem %: colorida (verde/amber/vermelho por faixa)
Status pagamento: badge (Pendente/Parcial/Pago/Atrasado)

---

## 7. Relatorio: Equipe

### 7.1 KPI Summary

```
+----------+----------+----------+----------+
| Membros  | Jobs por | Horas    | Conflitos|
| Ativos   | Pessoa   | Alocadas | de Agenda|
| 12       | 3,5      | 840h     | 4        |
+----------+----------+----------+----------+
```

```
Icones:
  Membros:    Users blue-500
  Jobs/pessoa:Clapperboard rose-500
  Horas:      Clock amber-500
  Conflitos:  AlertTriangle red-500 (borda vermelha se > 0)
```

### 7.2 Grafico Principal: Ocupacao por Membro (Heatmap / Bar horizontal)

```
+----------------------------------------------+
|  OCUPACAO DA EQUIPE         [Esta semana v]   |
|                                               |
| Maria B.   [========================] 100%    |
| Joao S.    [==================] 85%           |
| Ana P.     [==============] 70%               |
| Pedro L.   [==========] 50%                  |
| Carlos M.  [======] 30%                       |
|                                               |
|   [0%]     [50%]        [100%]                |
|   Disponivel  Parcial    Sobrecarregado        |
+----------------------------------------------+
```

```
recharts BarChart horizontal
height: 280px (varia com numero de membros)
Bars: coloridas por faixa:
  0-50%:   emerald-500 "Disponivel"
  51-80%:  amber-500 "Parcial"
  81-100%: red-500 "Ocupado"
  > 100%:  red-700 + icone AlertTriangle "Sobrecarregado"

Cada bar: hover mostra tooltip com lista de jobs alocados
```

### 7.3 Grafico Auxiliar: Distribuicao de Roles

```
+------------------------+
|  POR FUNCAO            |
|                        |
|    ( donut )           |
|                        |
| Diretor    3  25%      |
| Camera     4  33%      |
| Edicao     3  25%      |
| Producao   2  17%      |
+------------------------+
```

### 7.4 Tabela de Equipe

Colunas: Membro | Funcao | Jobs Ativos | Jobs Concluidos | Ocupacao % | Health Medio | Ultimo Projeto

---

## 8. Tabela de Dados (compartilhada)

### 8.1 Layout

```
+------------------------------------------------------------------+
|  DADOS DETALHADOS (32 registros)     [Colunas v]  [Export CSV]   |
|  Busca: [_______________________]                                 |
+------------------------------------------------------------------+
| [ ] | Coluna 1 [v] | Coluna 2 [v] | ... | Acoes                  |
+------------------------------------------------------------------+
| [x] | dado         | dado         | ... | [...]                  |
|     | dado         | dado         | ... | [...]                  |
|     | dado         | dado         | ... | [...]                  |
+------------------------------------------------------------------+
| Mostrando 1-25 de 32   [<] [1] [2] [>]   [25 por pagina v]      |
+------------------------------------------------------------------+
```

### 8.2 Especificacao

```
Header da tabela:
  flex justify-between items-center mb-3

  Titulo: "Dados Detalhados (N registros)" — 14px font-medium

  Acoes direita:
    Colunas: Button ghost sm, Icone Columns 16px
      Dropdown com toggle de colunas visiveis (checkboxes)
    Export: Button ghost sm, Icone Download 16px
      Acao: download CSV com filtros atuais

Busca inline:
  Input com Search 16px prefix
  placeholder: "Buscar na tabela..."
  h-8 text-sm
  max-w-xs

Tabela (shadcn/ui Table):
  Seguir spec de tabelas do design system (secao 6.4)
  Header: sticky top (se tabela alta)
  Sorting: click no header da coluna (ChevronUp/Down)
  Row hover: bg-muted/50

  Checkbox primeira coluna:
    Selecionar para bulk export
    Header checkbox: selecionar tudo

  Coluna Acoes (ultima):
    DropdownMenu com icone MoreHorizontal
    Opcoes: "Ver job" | "Copiar link" | "Exportar linha"

Paginacao:
  flex justify-between items-center mt-4

  Info: "Mostrando 1-25 de 32 registros" — text-sm text-muted

  Navegacao:
    < > (anterior/proximo), desabilitado nas extremidades
    Numeros de pagina (max 5 visiveis)
    ...  se muitas paginas

  Por pagina:
    Select: [10 | 25 | 50 | 100]
    text-sm

Sem dados:
  Empty state padrao (icone FileSearch, texto, sem CTA de criacao)
```

---

## 9. Export CSV

### 9.1 Fluxo de Export

```
1. Usuario clica em "Exportar" (header ou tabela)
2. Dropdown aparece com opcoes:
   [CSV] — comma-separated, UTF-8 BOM (para Excel BR)
   [Excel] — .xlsx via client-side ou edge function
   [PDF] — snapshot do relatorio atual (via print stylesheet)

3. Loading: botao vira Loader2 + "Gerando..."
4. Download inicia automaticamente
5. Toast: "Relatorio exportado com sucesso"

Logica:
  - Exporta todos os dados do periodo/filtros (nao so a pagina atual)
  - Cabecalho: nomes legíveis (nao nomes de coluna do banco)
  - Valores monetarios: formato BR com separadores
  - Datas: DD/MM/YYYY
  - Percentuais: sem o simbolo % (apenas numero)
  - Encoding: UTF-8 com BOM para compatibilidade Excel

Nome do arquivo:
  ellahos-{tipo}-{data-inicio}-{data-fim}-{timestamp}.csv
  ex: ellahos-financeiro-jan2026-fev2026-20260220.csv
```

### 9.2 Dropdown Export

```
+---------------------------+
| [FileText] CSV            |
| [Sheet] Excel (.xlsx)     |
| [Printer] PDF             |
+---------------------------+
```

---

## 10. Estados: Loading, Empty, Error

### 10.1 Loading

```
KPI Summary: 4 skeleton cards (animate-pulse)
Graficos:
  Principal: skeleton retangular h-60 w-full rounded-xl
  Auxiliar: skeleton circular w-40 h-40 + 4 linhas de legenda
Tabela: skeleton header + 10 skeleton rows de h-11
```

### 10.2 Empty (periodo sem dados)

```
Graficos:
  Container com ilustracao centralizada:
  Icone: BarChart2 48px text-muted
  Titulo: "Nenhum dado no periodo"
  Subtexto: "Tente selecionar um periodo com jobs registrados"
  Sem CTA (usuario so ajusta filtros)

Tabela:
  Icone: FileSearch 40px text-muted
  "Nenhum registro encontrado"
  "Ajuste os filtros para ver resultados"
```

### 10.3 Error (falha de API)

```
Banner no topo (identico ao Dashboard):
  bg-red-50 dark:bg-red-950/30
  [AlertTriangle] "Erro ao carregar relatorio. [Tentar novamente]"

Graficos com erro: mostrar esqueleto com icone de erro no centro
  Icone: WifiOff 32px text-muted
  Texto: "Nao foi possivel carregar"
  Botao: "Retry" (ghost sm)
```

---

## 11. Responsividade

### 11.1 Mobile (<768px)

```
+---------------------------+
|  TOPBAR                   |
+---------------------------+
|  Relatorios               |
|  [Export] [...]           |
+---------------------------+
|  [Performance][Fin][Eq]   |  <- tabs scroll horizontal
+---------------------------+
|  FILTROS (colapsavel)     |
|  [Filtrar v]              |
|  (expand: filtros full)   |
+---------------------------+
|  KPIs (grid 2 cols)       |
|  +--------+--------+      |
|  |        |        |      |
|  +--------+--------+      |
+---------------------------+
|  GRAFICO PRINCIPAL        |
|  (height 180px, scroll)   |
+---------------------------+
|  GRAFICO AUX              |
|  (donut menor + legenda)  |
+---------------------------+
|  TABELA -> CARDS          |
|  Cada row vira card:      |
|  +----------------------+ |
|  | Nome do Job          | |
|  | Cliente | Margem 35% | |
|  | Status badge | [...] | |
|  +----------------------+ |
+---------------------------+
|  BOTTOM NAV               |
+---------------------------+

Filtros mobile:
  Botao "Filtrar" expande drawer bottom (Sheet component)
  Filtros em coluna unica no drawer
  CTA "Aplicar filtros" no rodape do drawer
```

### 11.2 Tablet (768px - 1023px)

```
Tabs: visiveis (sem scroll)
KPIs: grid-cols-2 (4 cards = 2+2)
Graficos: 1 coluna (principal full width, auxiliar abaixo)
Tabela: scroll horizontal com primeiras colunas fixas (sticky)
```

### 11.3 Desktop Grande (1536px+)

```
KPIs: grid-cols-4 com mais espaco interno
Graficos: grid-cols-3 com main (2/3) + aux (1/3)
Tabela: mais colunas visiveis sem scroll
```

---

## 12. Interacoes e Animacoes

### 12.1 Transicao entre Tabs

```
Conteudo (KPIs + graficos + tabela):
  Ao trocar tab:
  saida: fade-out 100ms
  entrada: fade-in 150ms + translateX(8px -> 0) (sutil, indica direcao)
  total: 250ms

  Nao recarregar se ja tem dados em cache (React Query)
  Mostrar skeleton apenas no primeiro load
```

### 12.2 Filtros — Aplicacao

```
Ao alterar qualquer filtro:
  Debounce: 400ms antes de re-fetch
  Graficos e tabela: mostrar overlay de loading sutil
    (spinner pequeno no canto do card, nao skeleton completo)
  Chips de filtro: aparecem com scale(0.8) -> scale(1) + fade-in

Ao limpar filtros:
  Transicao suave (150ms)
  Focus retorna ao primeiro filtro
```

### 12.3 Graficos — Hover e Interacao

```
Recharts:
  Tooltip: animacao padrao do recharts (fade 150ms)
  Hover em barra/linha: highlight instantaneo
  Click em legenda: toggle de visibilidade com fade
  Cursor custom: vertical line no hover do area/line chart
```

### 12.4 Export

```
Botao export ao clicar:
  width expande de auto para "Gerando..." + spinner (150ms)
  Apos download: volta ao estado normal + toast

Sem animacoes de loading desnecessarias: se gerar em < 500ms, pular
```

---

## 13. Acessibilidade

```
Tabs:
  role="tablist" / role="tab" / role="tabpanel"
  aria-selected, aria-controls, tabindex
  Navegacao: Arrow keys entre tabs, Enter/Space para selecionar

Filtros:
  aria-label em cada Select/Popover
  DateRangePicker: aria-label="Selecionar periodo do relatorio"
  Chips: role="button" aria-label="Remover filtro [nome]"
  "Limpar tudo": aria-label="Limpar todos os filtros ativos"

Graficos:
  role="img" aria-label="[titulo do grafico]: [descricao resumida dos dados]"
  tabindex="0" (focavel via teclado)
  Alternativa textual (sr-only): tabela com os dados brutos do grafico
  Exemplo: <caption className="sr-only">Dados do grafico: Set 15, Out 18, ...</caption>

Tabela:
  <caption> com titulo descritivo
  scope="col" em <th>
  Sorting: aria-sort="ascending" | "descending" | "none"
  Paginacao: aria-label="Navegacao de paginas" no nav

Contraste de cores dos graficos:
  Todas as cores (rose-500, amber-500, etc.): testadas com fundo escuro (#09090B)
  Garantir 3:1 minimo para elementos graficos
  NAO usar apenas cor para diferenciar (sempre adicionar label/padrao)
```

---

## 14. Dark Mode

```
Background da pagina: bg-background
Cards KPI: bg-card border-border
Tabs: sem card proprio, merge com background

Graficos:
  Tooltip bg: bg-popover (zinc-900)
  Grid lines: zinc-700 opacity 0.3
  Axis text: text-muted-foreground (zinc-400)
  Bars: cores de status/status (mesmas do light, legivel no dark)
  Linha de margem: emerald-400 (dark) vs emerald-500 (light)

Filtros:
  Chips ativos: bg-rose-500/10 text-rose-400 (dark)
  Select trigger: bg-transparent border-border

Tabela:
  Header: bg-muted/50 (zinc-800/50 dark)
  Row hover: bg-muted/30
  Border: border-border (zinc-700 dark)

Export button: sem alteracao (outline variant funciona em ambos)
```

---

## 15. Tokens de Referencia Rapida

```
Sticky positions:
  Topbar:            top-0         h-14 = 56px
  Tabs relatorio:    top-14        (56px)
  Filtros:           top-[100px]   (56px + 44px da tab)
  z-index: topbar=50, tabs=30, filtros=20

Graficos (recharts):
  Line chart main:   height 240px
  Bar horizontal:    height 280px (varia)
  Donut:             width 160px, innerRadius 52, outerRadius 72
  Bar faturamento:   height 260px
  ResponsiveContainer: width "100%" sempre

Tipografia tabela:
  Header:   text-sm font-medium text-muted-foreground
  Body:     text-sm text-foreground
  Badge:    text-xs (caption)
  Meta:     text-xs text-muted-foreground

Cores das tabs (indicador ativo):
  border-bottom: 2px solid hsl(var(--primary))  (rose)

Formato de valores:
  Monetario BR:   Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' })
  Percentual:     N.toFixed(1) + '%'
  Numero simples: Intl.NumberFormat('pt-BR').format(N)
  Data:           format(date, 'dd/MM/yyyy', { locale: ptBR })

Exportacao (biblioteca):
  CSV:   Papa.parse ou implementacao manual (simples)
  Excel: xlsx (SheetJS)
  PDF:   window.print() com print stylesheet customizado
```

---

## Changelog

| Data       | Versao | Descricao                       |
|------------|--------|---------------------------------|
| 2026-02-20 | 1.0    | Spec inicial - Fase 7           |
