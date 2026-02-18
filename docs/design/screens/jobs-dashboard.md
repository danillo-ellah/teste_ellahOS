# Spec Visual: Dashboard de Jobs (/jobs)

**Data:** 2026-02-18
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Design System:** docs/design/design-system.md
**User Stories:** US-F3-008 a US-F3-013 (docs/specs/fase-3-frontend.md)
**Arquitetura:** docs/architecture/fase-3-frontend.md

---

## Indice

1. [Layout Geral](#1-layout-geral)
2. [Header da Pagina](#2-header-da-pagina)
3. [Barra de Filtros](#3-barra-de-filtros)
4. [Tabela de Jobs](#4-tabela-de-jobs)
5. [Kanban View](#5-kanban-view)
6. [Modal Criar Job](#6-modal-criar-job)
7. [Paginacao](#7-paginacao)
8. [Bulk Actions Bar](#8-bulk-actions-bar)
9. [Especificacoes Responsive](#9-especificacoes-responsive)
10. [Tokens do Design System](#10-tokens-do-design-system)
11. [Estados Especiais](#11-estados-especiais)
12. [Acessibilidade](#12-acessibilidade)

---

## 1. Layout Geral

### 1.1 Posicionamento dentro do Dashboard Layout

A pagina `/jobs` renderiza dentro do `(dashboard)/layout.tsx` que ja fornece:
- **Sidebar** fixa a esquerda (w-64 expandida / w-16 colapsada) em `lg+`
- **Topbar** sticky `top-0` com `h-14`
- **BottomNav** fixo no rodape em `< md`

O conteudo da pagina `/jobs` ocupa o espaco restante apos sidebar e topbar.

### 1.2 Hierarquia Visual da Pagina

```
+------------------------------------------------------------------+
|  TOPBAR (h-14, sticky top-0, z-40)                               |
+--------+---------------------------------------------------------+
|        |  PAGINA /jobs (pt-14 para compensar topbar)             |
|        |                                                         |
|  SIDE  |  +---------------------------------------------------+  |
|  BAR   |  |  PAGE HEADER (h-auto, nao sticky)                 |  |
| w-64   |  |  [Titulo "Jobs"] [contador]  [toggle] [Novo Job]  |  |
|        |  +---------------------------------------------------+  |
|        |  |  FILTER BAR (sticky top-14, z-30)                 |  |
|        |  |  [busca][status][cliente][tipo][periodo][limpar]   |  |
|        |  +---------------------------------------------------+  |
|        |  |  FILTER CHIPS (se houver filtro ativo)            |  |
|        |  |  [chip x] [chip x] [chip x]                       |  |
|        |  +---------------------------------------------------+  |
|        |  |  CONTENT AREA                                     |  |
|        |  |  (tabela OU kanban, dependendo do toggle)         |  |
|        |  |                                                   |  |
|        |  +---------------------------------------------------+  |
|        |  |  PAGINATION                                       |  |
|        |  +---------------------------------------------------+  |
+--------+---------------------------------------------------------+
|  (BULK ACTIONS BAR - fixed bottom-0, z-50, so quando selecionado)|
+------------------------------------------------------------------+
```

### 1.3 Dimensoes e Espacamento do Container

```
Container principal:
  max-w-7xl mx-auto
  px-6 (desktop lg+)
  px-4 (mobile < lg)
  pt-6 (padding top apos topbar)
  pb-8 (padding bottom)

Gap entre secoes:
  Page header -> Filter bar:   gap sem separacao visual (filter bar tem bg propria)
  Filter bar -> chips:         mt-2 (8px) - quando chips presentes
  Chips -> tabela/kanban:      mt-3 (12px)
  Tabela -> paginacao:         mt-4 (16px)
```

### 1.4 Filter Bar - Comportamento Sticky

A barra de filtros fica `sticky top-14` (colada abaixo do topbar) para que os filtros permaneçam acessiveis durante o scroll da tabela. Isso e especialmente importante em tabelas longas.

```
z-index stack:
  Topbar:         z-40
  Filter bar:     z-30
  Bulk actions:   z-50 (sobre tudo)
  Modais:         z-100 (shadcn Dialog)
```

---

## 2. Header da Pagina

### 2.1 Layout Desktop (lg+)

```
+------------------------------------------------------------------+
|                                                                  |
|  Jobs                         Mostrando 12 de 48    [==] [KAN]  [+ Novo Job]
|  h1, 24px semi               caption, text-muted   toggle       btn primary
|                                                                  |
+------------------------------------------------------------------+
```

Altura do header: `auto` (sem altura fixa), padding vertical: `py-6` (24px top, 24px bottom antes do filter bar).

### 2.2 Especificacao de Cada Elemento

#### Titulo "Jobs"
```
Elemento:    <h1>
Tipografia:  heading-1 (24px / 1.5rem, font-weight 600)
Cor:         text-foreground (--foreground)
Tracking:    tracking-tight (-0.025em)
```

#### Contador de Resultados
```
Elemento:    <p> ou <span>
Tipografia:  caption (12px / 0.75rem, font-weight 500)
Cor:         text-muted-foreground (--muted-foreground)
Conteudo:    "Mostrando {count} de {total} jobs"
             Ex: "Mostrando 20 de 48 jobs"
             Se filtro zerou: "Nenhum job encontrado"
             Se tudo exibido: "48 jobs"
Posicao:     abaixo do titulo (mt-0.5 / 2px) em mobile,
             ao lado direito do titulo em desktop (flex items-end gap-3)
```

#### Toggle Tabela / Kanban
```
Componente:  shadcn ToggleGroup (ou 2 botoes ghost adjacentes)
Variante:    ghost para inativo, secondary para ativo
Tamanho:     default (h-9 / 36px)
Icones:
  Tabela:    LayoutList (18px)
  Kanban:    KanbanSquare (18px)
Border:      border border-border (1px, rounded-md)
Gap interno: 0 (botoes sem gap, border-r entre eles)

Estado ativo:
  bg:        bg-secondary
  text:      text-foreground
Estado inativo:
  bg:        bg-transparent
  text:      text-muted-foreground

Tooltip: "Vista tabela" / "Vista kanban" (visivel apos 500ms hover)
aria-label em cada botao: "Alternar para vista tabela" / "Alternar para vista kanban"
```

#### Botao "Novo Job"
```
Componente:  shadcn Button variant="default" (primary)
Tamanho:     default (h-9, px-4)
Icone:       Plus (18px), a esquerda do texto
Texto:       "Novo Job"
Cor:         bg-primary text-primary-foreground
             (rose-600 no light / rose-400 no dark)
Hover:       bg-primary/90
Posicao:     canto direito, alinhado ao centro vertical do row
```

### 2.3 Layout Mobile (< lg)

```
+--------------------------------+
|  Jobs                          |
|  caption: 48 jobs              |
|                                |
|  [== Tabela][KAN] [+ Novo Job] |
+--------------------------------+
```

Em mobile, o titulo ocupa linha inteira. O contador fica abaixo do titulo. Toggle e botao ficam em linha abaixo, alinhados `justify-between`.

### 2.4 Codigo de Classes (Referencia)

```html
<!-- Desktop -->
<div class="flex items-end justify-between gap-4 pb-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight text-foreground">Jobs</h1>
    <p class="mt-0.5 text-xs font-medium text-muted-foreground">
      Mostrando 20 de 48 jobs
    </p>
  </div>
  <div class="flex items-center gap-3">
    <!-- ViewToggle -->
    <div class="flex items-center border border-border rounded-md">
      <button class="h-9 px-3 ...">
        <LayoutList class="h-[18px] w-[18px]" />
      </button>
      <div class="w-px h-5 bg-border" />
      <button class="h-9 px-3 ...">
        <KanbanSquare class="h-[18px] w-[18px]" />
      </button>
    </div>
    <!-- Novo Job -->
    <button class="h-9 px-4 bg-primary text-primary-foreground rounded-md ...">
      <Plus class="h-[18px] w-[18px] mr-2" />
      Novo Job
    </button>
  </div>
</div>
```

---

## 3. Barra de Filtros

### 3.1 Layout Desktop (lg+)

```
+------------------------------------------------------------------+
|                                                                  |
|  [  Search...  (icone)]  [Status v]  [Cliente v]  [Tipo v]      |
|                          [Periodo v]  [v Arquivados]  [X Limpar] |
|                                                                  |
+------------------------------------------------------------------+
```

A filter bar tem `bg-background` (mesma cor do fundo da pagina), `border-b border-border`, `sticky top-14`, `py-3` (12px top/bottom).

Em desktop, todos os filtros cabem em uma linha. Se nao couberem (ex: viewport estreita entre lg e xl), quebram para segunda linha naturalmente com `flex-wrap`.

### 3.2 Especificacao de Cada Filtro

#### Campo de Busca Textual
```
Componente:  shadcn Input com icone prefixo
Largura:     w-64 (256px) em desktop, w-full em mobile
Placeholder: "Buscar por titulo, codigo ou cliente..."
Icone:       Search (16px), posicionado dentro do input a esquerda
             padding-left: pl-9 (36px) para o icone nao sobrepor o texto
Comportamento: debounce 400ms, ao digitar refaz a query
Limpar:      icone X aparece quando ha texto (absolute right dentro do input)
             Lucide X (14px), ghost, aria-label="Limpar busca"
Tamanho:     default (h-9 / 36px)
```

#### Multi-select Status
```
Componente:  Popover + Command + Checkbox (shadcn)
Trigger:     botao outline h-9
Texto trigger:
  - Vazio:        "Status"
  - 1 selecionado: nome do status com badge colorido
  - 2+:           "Status (3)" com numero
Icone:       ChevronDown (16px) a direita
Largura:     w-40 (160px) trigger / w-56 (224px) popover

No popover (dropdown):
  - Input busca no topo (filtra os status)
  - Lista de todos os 14 status
  - Cada item: checkbox + dot colorido + nome em pt-BR
  - Scroll se ultrapassar 320px de altura
  - "Selecionar todos" / "Limpar" no rodape do popover

Cor dos dots: JOB_STATUS_COLORS do design system
```

#### Dropdown Cliente
```
Componente:  SearchableSelect (Command + Popover)
Trigger:     botao outline h-9
Texto:       "Cliente" (vazio) / nome do cliente (selecionado)
Largura:     w-40 trigger / w-56 popover
Busca:       campo de busca no topo do popover
Dados:       carregados via useClients() com staleTime 5min
```

#### Dropdown Tipo de Projeto
```
Componente:  shadcn Select (nao searchable - lista pequena)
Trigger:     h-9 outline
Texto:       "Tipo" (vazio) / nome do tipo (selecionado)
Largura:     w-36 (144px)
Opcoes:      todas as PROJECT_TYPE_LABELS (10 tipos)
```

#### Date Range Picker (Periodo de Entrega)
```
Componente:  Popover com 2 shadcn Calendar lado a lado (ou range picker)
Trigger:     botao outline h-9 com icone CalendarDays (16px) a esquerda
Texto:       "Periodo" (vazio)
             "01/03 - 31/03" (com datas selecionadas, formato dd/MM)
             "A partir de 01/03" (so data inicio)
             "Ate 31/03" (so data fim)
Largura:     w-48 trigger / auto popover
Formato:     dd/MM/yyyy pt-BR
Logica:      filtra expected_delivery_date no intervalo [date_from, date_to]
```

#### Switch "Mostrar arquivados"
```
Componente:  shadcn Switch + Label
Layout:      switch a esquerda, label "Arquivados" a direita
Tamanho:     default switch (h-5 / 20px)
Estado off:  bg-muted (cinza)
Estado on:   bg-primary (rose)
Label:       text-sm font-medium text-muted-foreground
             muda para text-foreground quando ativo
```

#### Botao "Limpar filtros"
```
Componente:  shadcn Button variant="ghost"
Visibilidade: so aparece quando QUALQUER filtro esta ativo
Icone:       FilterX (16px) a esquerda
Texto:       "Limpar"
Tamanho:     sm (h-8)
Animacao:    fade-in quando aparece (opacity 0 -> 1, 150ms)
Cor:         text-muted-foreground, hover: text-foreground
```

### 3.3 Layout Tablet (768-1023px)

```
+------------------------------------------+
|                                          |
|  [  Search...       (x)] [+ Filtros v]  |
|                                          |
+------------------------------------------+
```

Em tablet, o campo de busca ocupa a maior parte da largura. Os filtros adicionais ficam atras de um botao "Filtros" que abre um Popover ou Sheet com todos os filtros.

O botao "Filtros" tem badge com a contagem de filtros ativos: `Filtros (2)`.

### 3.4 Layout Mobile (< 768px)

```
+--------------------------------+
|                                |
|  [  Buscar...       (x)]       |
|  [Filtros (2)] [Limpar]        |
|                                |
+--------------------------------+
```

Em mobile, busca em linha completa. Botao "Filtros" abre um **Sheet (bottom sheet)** com todos os filtros em layout vertical de 1 coluna.

O Sheet de filtros em mobile:
- Titulo: "Filtrar Jobs"
- Cada filtro em linha completa (w-full)
- Botao "Aplicar filtros" primary no rodape do sheet (sticky)
- Botao "Limpar tudo" ghost ao lado

### 3.5 Chips de Filtros Ativos

Aparecem abaixo da filter bar quando algum filtro esta ativo. Container: `flex flex-wrap gap-2 mt-2`.

```
+------------------------------------------------------------------+
|  [x Status: Pre-Producao]  [x Cliente: ACME Corp]  [x Tipo: ...]|
+------------------------------------------------------------------+
```

Cada chip:
```
Componente:  Badge customizado (nao shadcn Badge padrao)
Altura:      h-6 (24px)
Padding:     px-2 py-0.5
Font:        12px / caption, font-medium
Border:      border border-border
Radius:      rounded-full
BG:          bg-secondary
Text:        text-secondary-foreground

Estrutura do chip:
  [label-filtro: ] [valor] [x]

Icone X:     w-3 h-3 (12px), ml-1.5, cursor-pointer
             hover: opacity-70
             aria-label: "Remover filtro {valor}"

Chips de Status:
  dot colorido (w-1.5 h-1.5, rounded-full) antes do texto
  Cor do dot: JOB_STATUS_COLORS[status]
```

---

## 4. Tabela de Jobs

### 4.1 Estrutura Geral

```
Componente container:
  bg:        bg-card (surface)
  border:    border border-border (1px)
  radius:    rounded-lg (8px)
  overflow:  overflow-hidden (para os cantos)
  shadow:    shadow-sm (light mode apenas)

Scroll horizontal:
  wrapper:   overflow-x-auto
  min-width: min-w-[900px] (garante scroll em telas menores)
```

### 4.2 Colunas - Especificacao Completa

```
COL  NOME              LARGURA    SORTAVEL  ALINHAMENTO  DESCRICAO
--   checkbox          40px       nao       center       Selecao de linha
1    #                 60px       sim       center       index_number, monoespaco
2    Job               220px      sim       left         job_code + title
3    Cliente           140px      sim       left         client name
4    Agencia           120px      sim       left         agency name ou "-"
5    Status            160px      sim       left         badge com dot
6    Tipo              120px      sim       left         project_type em pt-BR
7    Entrega           100px      sim       left         expected_delivery_date
8    Valor Fechado     120px      sim       right        closed_value em BRL
9    Margem            90px       sim       right        margin_percentage + cor
10   Health            80px       nao       center       barra de progresso
11   Acoes             50px       nao       center       menu 3 pontos
```

### 4.3 Header da Tabela

```
Altura:      h-10 (40px)
BG:          bg-muted/40 (zinc-50 com 40% opacidade, dark: zinc-900/40)
Font:        12px / caption, font-medium
Cor texto:   text-muted-foreground
Border:      border-b border-border

Coluna sortavel:
  Cursor:    pointer
  Hover bg:  bg-muted/60
  Layout:    flex items-center gap-1
  Icone sort (16px):
    - Inativo:        ChevronsUpDown (text-muted-foreground/50)
    - Asc ativo:      ChevronUp (text-foreground)
    - Desc ativo:     ChevronDown (text-foreground)

Checkbox header:
  Seleciona/deseleciona TODOS da pagina atual
  Estado intermediario (indeterminate) quando selecao parcial
  aria-label: "Selecionar todos os jobs da pagina"
```

### 4.4 Linhas do Corpo da Tabela

```
Altura:      h-[52px] (52px - default)
BG padrao:   bg-transparent
Hover:       hover:bg-muted/40
Border:      border-b border-border (exceto ultima linha)
Cursor:      cursor-pointer (linha inteira e clicavel, exceto checkbox e acoes)

Linha selecionada:
  BG:        bg-primary/5 (rose com 5% opacidade)
  Border:    border-b border-border (sem mudanca visual na borda)

Transicao:  transition-colors duration-100
```

### 4.5 Celulas - Especificacao Detalhada

#### Celula Checkbox (40px)
```
Componente:  shadcn Checkbox
Tamanho:     w-4 h-4 (16px)
Alinhamento: items-center justify-center
onClick:     stopPropagation (nao navega para detalhe)
aria-label:  "Selecionar job {title}"
```

#### Celula # - Index Number (60px)
```
Font:        JetBrains Mono, 12px, font-medium
Cor:         text-muted-foreground
Align:       text-center
Conteudo:    numero inteiro (ex: 001, 012, 123)
```

#### Celula Job (220px)
```
Layout: flex flex-col gap-0.5 (2 linhas)

Linha 1 - job_code:
  Componente:  Badge (shadcn, customizado)
  Texto:       job_code (ex: "BBB_001" ou "001")
  Font:        JetBrains Mono, 10px (overline size), font-medium
  BG:          bg-zinc-100 dark:bg-zinc-800
  Text:        text-zinc-700 dark:text-zinc-300
  Padding:     px-1.5 py-0.5
  Radius:      rounded (4px)
  Altura:      h-5 (20px)

Linha 2 - title:
  Font:        14px body-sm, font-medium
  Cor:         text-foreground
  Overflow:    truncate (max 1 linha, ellipsis)
  Hover:       text-primary (rose) - indica que e clicavel
```

A celula inteira e um link para `/jobs/[id]`. O comportamento de hover com `text-primary` na linha do titulo reforça a navegabilidade.

#### Celula Cliente (140px)
```
Font:       14px body-sm
Cor:        text-foreground
Overflow:   truncate
Nulo:       "-" em text-muted-foreground
```

#### Celula Agencia (120px)
```
Identico a Celula Cliente
Nulo:       "-" em text-muted-foreground
```

#### Celula Status (160px)
```
Componente:  StatusBadge (custom)
Layout:      inline-flex items-center gap-1.5
Dot:         w-2 h-2 rounded-full bg-{status-color}
Texto:       JOB_STATUS_LABELS[status], 12px, font-medium
BG badge:    {status-color}/10 (10% opacidade)
Text badge:  {status-color} (cor direta)
Padding:     px-2 py-0.5
Radius:      rounded-full
Altura:      h-[22px] (22px)

Mapeamento de cores (design system):
  briefing_recebido:           violet-500 (#8B5CF6)
  orcamento_elaboracao:        amber-500  (#F59E0B)
  orcamento_enviado:           amber-500  (#F59E0B)
  aguardando_aprovacao:        amber-500  (#F59E0B)
  aprovado_selecao_diretor:    green-500  (#22C55E)
  cronograma_planejamento:     blue-500   (#3B82F6)
  pre_producao:                blue-500   (#3B82F6)
  producao_filmagem:           red-500    (#EF4444)
  pos_producao:                purple-500 (#A855F7)
  aguardando_aprovacao_final:  purple-500 (#A855F7)
  entregue:                    cyan-500   (#06B6D4)
  finalizado:                  emerald-500 (#10B981)
  cancelado:                   gray-500   (#6B7280)
  pausado:                     gray-500   (#6B7280)
```

#### Celula Tipo (120px)
```
Font:        14px body-sm
Cor:         text-foreground
Overflow:    truncate
Conteudo:    PROJECT_TYPE_LABELS[project_type] em pt-BR
```

#### Celula Entrega (100px)
```
Componente:  DateDisplay (custom)
Format:      dd/MM/yyyy (pt-BR)
Cor normal:  text-foreground
Cor atraso:  text-red-500 dark:text-red-400 (quando data < hoje)
Nulo:        "-" em text-muted-foreground

Tooltip:     data completa "dd de MMMM yyyy" ao hover (via shadcn Tooltip)
             Aparece apos 400ms de hover
```

#### Celula Valor Fechado (120px)
```
Componente:  CurrencyDisplay (custom)
Format:      Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
Font:        14px body-sm, font-medium (levemente destacado)
Cor:         text-foreground
Align:       text-right
Nulo:        "-" text-muted-foreground, text-right
```

#### Celula Margem (90px)
```
Componente:  MarginIndicator (custom)
Format:      "{valor}%" (ex: "32%", "-5%")
Font:        14px body-sm, font-medium
Align:       text-right
Cores:
  >= 30%:    text-green-600 dark:text-green-400
  >= 15%:    text-yellow-600 dark:text-yellow-400
  < 15%:     text-red-600 dark:text-red-400
  null:      "-" text-muted-foreground
```

#### Celula Health Score (80px)
```
Componente:  HealthBar (custom, compacto)
Layout:      flex flex-col items-center gap-1

Numero:
  Font:      12px caption, font-medium
  Cor:       baseada na cor da barra

Barra de progresso:
  Largura:   w-12 (48px) fixo, centrado
  Altura:    h-1.5 (6px)
  Radius:    rounded-full
  BG track:  bg-muted/60
  BG fill:   cor baseada no score:
    >= 70:   bg-green-500
    >= 40:   bg-yellow-500
    < 40:    bg-red-500
```

#### Celula Acoes (50px)
```
Componente:  shadcn DropdownMenu
Trigger:     Button variant="ghost" size="icon" (h-8 w-8)
Icone:       MoreHorizontal (16px)
aria-label:  "Acoes para job {title}"
onClick:     stopPropagation (nao navega)

Itens do menu (em pt-BR):
  [Abrir]           -> navega /jobs/{id}
                       icone: ExternalLink (14px)
  [Mudar Status]    -> abre submenu ou dropdown de status
                       icone: RefreshCw (14px)
  ---separador---
  [Arquivar]        -> dialog confirmacao + DELETE /jobs/{id}
                       icone: Archive (14px)
                       cor: text-muted-foreground

Posicao popover:    align="end" (abre para esquerda)
```

### 4.6 ASCII Mockup da Tabela

```
+--------+---+----------------------+----------+----------+------------------+
| [ ] CB | # |  Job                 | Cliente  | Agencia  | Status           |
+--------+---+----------------------+----------+----------+------------------+
| [x]    | 1 | BBB_001              | ACME Corp| -        | o Pre-Producao   |
|        |   | filme da ACME Corp   |          |          |   (badge azul)   |
+--------+---+----------------------+----------+----------+------------------+
| [ ]    | 2 | 001                  | Empresa X| Agencia Y| o Pos-Producao   |
|        |   | Campanha verao 2026  |          |          |   (badge roxo)   |
+--------+---+----------------------+----------+----------+------------------+

(continua com mais colunas para direita via scroll horizontal)

+----------+--------+----------+-------+--------+----+
| Tipo     | Entrega| Valor    | Margem| Health | .. |
+----------+--------+----------+-------+--------+----+
| Filme    |28/02/26| R$45.000 |  32%  |[====]  | .  |
| Publicit.|        |          | verde | 85 pts | .  |
+----------+--------+----------+-------+--------+----+
| Branded  |15/03/26| R$18.000 |  12%  |[==  ]  | .  |
| Content  |        |          |vermelho| 45pts | .  |
+----------+--------+----------+-------+--------+----+
```

### 4.7 Estado Loading - Skeleton

Exibido quando `isLoading && showSkeleton` (delay de 200ms para evitar flash).

```
Numero de linhas skeleton: 8
Altura de cada linha:      52px (igual as linhas reais)

Estrutura do skeleton de linha:
  [ ] [   ] [            ] [         ] [      ] [          ] ...
  checkbox  #  badge+texto   texto      texto     badge

Componente: shadcn Skeleton (animate-pulse)
BG:         bg-muted/50 dark:bg-muted/30
Radius:     rounded-md

Skeleton do header: linha com 11 blocos de altura 20px (os cabecalhos)
```

```
+--------+------+------------------+----------+----------+
| [    ] | [  ] | [====] [=======] | [======] | [=====]  |
+--------+------+------------------+----------+----------+
| [    ] | [  ] | [====] [=======] | [======] | [=====]  |
+--------+------+------------------+----------+----------+
(repetido 8 vezes)
```

### 4.8 Estado Empty State

Exibido quando query retorna 0 resultados.

```
Dois contextos diferentes:

A) Sem nenhum job cadastrado (sem filtros ativos):
   +------------------------------------------+
   |                                          |
   |           [Clapperboard 48px]            |
   |                                          |
   |      Nenhum job cadastrado ainda         |
   |   heading-3 (18px) text-foreground       |
   |                                          |
   |  Comece criando seu primeiro job para    |
   |  gerenciar os projetos da sua produtora  |
   |   body-sm (14px) text-muted-foreground   |
   |           max-w-xs text-center           |
   |                                          |
   |         [+ Criar primeiro job]           |
   |           Button primary lg              |
   |                                          |
   +------------------------------------------+

B) Filtros ativos mas sem resultado:
   +------------------------------------------+
   |                                          |
   |           [SearchX 48px]                 |
   |                                          |
   |     Nenhum job encontrado                |
   |                                          |
   |  Tente ajustar os filtros ou termos      |
   |  de busca.                               |
   |                                          |
   |         [Limpar filtros]                 |
   |           Button outline                 |
   |                                          |
   +------------------------------------------+

Container: py-16 flex flex-col items-center justify-center text-center gap-4
Icone:     text-muted-foreground/60 (bem sutil)
Titulo:    mt-4 (a partir do icone)
Descricao: mt-2, max-w-[300px]
Botao:     mt-6
```

### 4.9 Estado Error

```
+------------------------------------------+
|                                          |
|  [XCircle 48px text-destructive]         |
|                                          |
|  Erro ao carregar jobs                   |
|  heading-3                               |
|                                          |
|  Ocorreu um problema ao buscar a lista   |
|  de jobs. Verifique sua conexao.         |
|  body-sm text-muted-foreground           |
|                                          |
|  [Tentar novamente] Button outline       |
|                                          |
+------------------------------------------+

O botao "Tentar novamente" chama queryClient.refetch()
```

---

## 5. Kanban View

### 5.1 Layout Geral

```
Container externo:
  overflow-x: auto (scroll horizontal)
  pb-4 (espaco para scrollbar)

Container interno (as colunas):
  display: flex
  gap: gap-4 (16px entre colunas)
  align-items: flex-start
  min-width: fit-content (cresce conforme numero de colunas)
  padding: px-0 (sem padding adicional - container externo ja tem px-6)
```

O kanban tem **14 colunas** (uma por status). Em desktop full-width (1280px) com sidebar expandida, cabem aproximadamente 3-4 colunas visiveis ao mesmo tempo. O usuario faz scroll horizontal para ver o restante.

### 5.2 Coluna do Kanban

```
Largura:       w-72 (288px), fixo
Altura min:    min-h-[120px] (para colunas vazias)
BG:            bg-card
Border:        border border-border
Radius:        rounded-lg
Overflow:      overflow-hidden

Header da coluna:
  Altura:      h-10 (40px)
  Padding:     px-3
  Layout:      flex items-center justify-between
  BG:          cor do status com 8% opacidade
               (ex: violet/8 para briefing_recebido)
  Border-b:    1px border-border

  Esquerda:
    Dot:       w-2.5 h-2.5 rounded-full bg-{status-color}
    Nome:      12px overline, font-semibold, uppercase, tracking-wide
               JOB_STATUS_LABELS[status]
               Cor: text-foreground

  Direita:
    Badge contador:
      Componente:  Badge (shadcn)
      Variante:    secondary
      Texto:       numero de jobs na coluna
      Font:        11px, font-medium
      Padding:     px-1.5 py-0.5
      Radius:      rounded-full
      BG:          bg-{status-color}/15
      Text:        text-{status-color}

Corpo da coluna:
  Padding:     p-2 (8px)
  Gap cards:   gap-2 (8px entre cards)
  Display:     flex flex-col

Coluna vazia:
  Height:      min-h-[80px]
  Conteudo:    texto "Nenhum job" centralizado
  Font:        12px, text-muted-foreground/60
  Centraliz.:  flex items-center justify-center h-[80px]
```

### 5.3 Card de Job (Kanban)

```
+------------------------------------+
| BBB_001              [mudar status]|
|                                    |
| Campanha Verao 2026                |
| ACME Corp                          |
|                                    |
| Cal 28/02/26    32% margem verde   |
| [====    ] 65 health               |
|                                    |
| [Av] [Av] +2                       |
+------------------------------------+
```

Especificacao do card:
```
Componente:    bg-card border border-border rounded-md
Padding:       p-3 (12px)
Cursor:        cursor-pointer
Hover:         shadow-md border-border/80
               (levemente mais elevado)
Transicao:     transition-all duration-150
Click:         navega /jobs/{id}

Linha 1 - topo:
  Layout:      flex items-center justify-between
  Esquerda:    job_code (badge mono)
  Direita:     botao de status (icone ChevronDown, ghost xs)

  job_code badge:
    Font:      JetBrains Mono, 10px
    BG:        bg-zinc-100 dark:bg-zinc-800
    Text:      text-zinc-600 dark:text-zinc-300
    Padding:   px-1.5 py-0.5
    Radius:    rounded-sm

  Botao mudar status:
    Componente:  DropdownMenu trigger (ghost, icon-like)
    Icone:       ChevronDown (14px) com cor do status atual
    Tooltip:     "Mudar status"
    onClick:     stopPropagation
    Abre:        dropdown com lista de status (igual ao da tabela)

Linha 2 - titulo:
  mt-2 (8px apos linha 1)
  Font:        14px body-sm, font-medium
  Cor:         text-foreground
  Overflow:    line-clamp-2 (max 2 linhas, ellipsis)
  min-h:       40px (espaco para 2 linhas, evita cards de tamanhos muito diferentes)

Linha 3 - cliente:
  mt-1 (4px)
  Font:        12px caption
  Cor:         text-muted-foreground
  Overflow:    truncate

Separador visual:
  mt-3 border-t border-border/50

Linha 4 - data e margem:
  mt-2 layout flex items-center justify-between

  Data entrega:
    Layout:    flex items-center gap-1
    Icone:     Calendar (12px)
    Font:      11px, text-muted-foreground
    Cor atraso: text-red-500 dark:text-red-400

  Margem:
    Font:      12px, font-medium
    Cor:       verde/amarelo/vermelho (mesmo critério da tabela)

Linha 5 - health:
  mt-1
  Layout:    flex items-center gap-2

  Numero:    "65" 10px, font-medium, cor baseada no score
  Barra:     flex-1, h-1 rounded-full
             bg track: bg-muted/50
             bg fill: verde/amarelo/vermelho

Linha 6 - avatares da equipe:
  mt-2
  AvatarStack: max 3 avatares + "+N"

  Avatar individual:
    Tamanho:   w-6 h-6 (24px)
    Border:    ring-1 ring-background (para sobreposicao)
    Offset:    -ml-1.5 (exceto primeiro)
    BG:        determinado por hash do nome (5-6 cores pre-definidas do zinc/rose/blue)
    Texto:     2 iniciais, 10px, font-medium
    Tooltip:   nome completo

  "+N" badge:
    Tamanho:   w-6 h-6, -ml-1.5
    BG:        bg-zinc-200 dark:bg-zinc-700
    Font:      10px, font-medium
    Text:      "+3"
```

### 5.4 Estado Loading - Kanban

```
Skeleton de colunas: 4-5 colunas visiveis com skeleton de cards

Cada coluna skeleton:
  - Header com bg skeleton (h-10)
  - 3 cards skeleton de altura variada (2 de 80px, 1 de 100px)
  - Cards com pulse animation

```

### 5.5 Scroll Horizontal - Indicadores Visuais

Para indicar que ha mais conteudo no scroll horizontal (kanban):

```
Esquerda/Direita fade:
  Pseudo-elementos (ou divs absolutas)
  Gradiente de bg-background transparente para solido
  Largura: 24px
  Pointer-events: none (nao bloqueia click)
  Visibilidade:
    Fade-left:  visivel quando scrollLeft > 0
    Fade-right: visivel quando nao chegou ao final

Esta e uma melhoria de UX sutil para indicar scrollabilidade.
Implementacao: intersectionObserver nos cards extremos ou listener de scroll.
```

---

## 6. Modal Criar Job

### 6.1 Trigger e Abertura

O botao "Novo Job" no header abre um `shadcn Dialog`. Em mobile (< md), o Dialog e substituido por um `shadcn Sheet` (bottom sheet, slide from bottom).

```
Desktop/Tablet:  Dialog, max-w-lg (512px), centralizado
Mobile:          Sheet, side="bottom", height auto (max ~90vh)
Overlay:         bg-black/50 backdrop-blur-sm
Animacao:        scale-95 to scale-100 + fade-in, 150ms ease-out
```

### 6.2 Layout do Modal

```
+------------------------------------------+
|  Novo Job                      [X fecha] |
|  heading-2 (20px semi)                   |
|  Crie um novo job para comecar.          |
|  body-sm text-muted-foreground           |
+------------------------------------------+
|                                          |
|  Titulo do job *                         |
|  [________________________________]      |
|  Minimo 3 caracteres                     |
|                                          |
|  Cliente *                               |
|  [Buscar cliente...           (v)]       |
|  Selecione ou crie um novo cliente       |
|                                          |
|  Agencia                                 |
|  [Buscar agencia...           (v)]       |
|                                          |
|  Tipo de Projeto *                       |
|  [Selecione o tipo...         (v)]       |
|                                          |
|  Status inicial                          |
|  [Briefing Recebido           (v)]       |
|                                          |
|  Data de entrega estimada                |
|  [dd/mm/aaaa              (cal)]         |
|                                          |
+------------------------------------------+
|          [Cancelar]  [Criar Job  (load)] |
+------------------------------------------+
```

### 6.3 Especificacao de Cada Campo

#### Campo Titulo do Job
```
Componente:  shadcn Input
Tipo:        text
Label:       "Titulo do job" + asterisco vermelho (obrigatorio)
Placeholder: "Ex: Campanha de Lancamento - Produto X"
Altura:      h-9 (36px)
Max chars:   200
Validacao Zod:
  - min(3, "Minimo 3 caracteres")
  - max(200, "Maximo 200 caracteres")
  - required("Titulo e obrigatorio")
Erro:        texto 12px vermelho abaixo, icone AlertCircle (12px) a esquerda
```

#### Campo Cliente
```
Componente:  SearchableSelect (custom - Command + Popover)
Label:       "Cliente" + asterisco vermelho
Placeholder: "Buscar cliente..."
Validacao:   required("Selecione um cliente")

Dropdown:
  - Busca textual nos nomes dos clientes
  - Cada opcao: nome do cliente
  - Opcao especial no fundo: "+ Criar novo cliente"
    -> Abre um mini-modal inline (sobrepoe o modal atual, z-superior)
    -> Mini-modal campos: Nome* + Email + Telefone
    -> Ao criar: fechar mini-modal, selecionar automaticamente o cliente criado

Loading dos clientes:
  - Skeleton de 3 linhas no dropdown enquanto carrega
```

#### Campo Agencia
```
Igual ao Campo Cliente, mas:
  - Label: "Agencia" (sem asterisco - opcional)
  - Placeholder: "Buscar agencia..."
  - Opcao: "+ Criar nova agencia"
  - Validacao: nenhuma (campo opcional)
```

#### Campo Tipo de Projeto
```
Componente:  shadcn Select
Label:       "Tipo de Projeto" + asterisco vermelho
Placeholder: "Selecione o tipo..."
Opcoes:      todas as 10 PROJECT_TYPE_LABELS em pt-BR
Validacao:   required("Selecione o tipo do projeto")
```

#### Campo Status Inicial
```
Componente:  shadcn Select
Label:       "Status inicial"
Default:     "briefing_recebido" (Briefing Recebido) - pre-selecionado
Opcoes:      todos os 14 status com dot colorido em cada opcao
Nota visual: pequeno texto helper "O status pode ser alterado a qualquer momento"
```

#### Campo Data de Entrega Estimada
```
Componente:  DatePickerField (custom - Popover + Calendar)
Label:       "Data de entrega estimada"
Placeholder: "dd/mm/aaaa"
Icone:       CalendarDays (14px) dentro do campo a direita
Formato:     dd/MM/yyyy
Min date:    hoje (nao permite datas passadas na criacao)
Validacao:   nenhuma obrigatoria (campo opcional)
```

### 6.4 Footer do Modal

```
Layout:      flex justify-end gap-2
Border:      border-t border-border pt-4 mt-2

Botao Cancelar:
  Variante:  outline / secondary
  Texto:     "Cancelar"
  Acao:      fecha modal sem salvar, limpa form

Botao Criar Job (primary):
  Variante:  default (primary)
  Texto:     "Criar Job" (idle) / "Criando..." (loading)
  Icone loading: Loader2 (14px, animate-spin) substitui icone Plus quando loading
  Disabled:  true quando loading OU form invalido
  Acao:      submete form, POST /functions/v1/jobs

Estado pos-sucesso:
  1. Fecha modal (onOpenChange(false))
  2. Toast success "Job criado com sucesso" (4s, borda verde)
  3. Navega para /jobs/{newId} (router.push)
  4. React Query invalida jobs.lists()

Estado pos-erro:
  1. Modal permanece aberto
  2. Toast error com mensagem da API (8s, borda vermelha)
  3. Botao retorna ao estado idle
  4. Form permanece preenchido para correcao
```

### 6.5 Validacao Visual

```
Label com erro:
  Cor label: text-destructive (red-600 / red-500)

Input com erro:
  Border:    border-destructive
  Ring:      ring-2 ring-destructive/20

Mensagem de erro:
  mt-1 (4px abaixo do input)
  Font: 12px caption
  Cor: text-destructive
  Layout: flex items-center gap-1
  Icone: AlertCircle (12px)

Timing de validacao:
  Exibe erro: ao perder foco (onBlur) e ao tentar submeter
  Nao exibe:  enquanto esta digitando (nao real-time)
```

---

## 7. Paginacao

### 7.1 Layout

```
+------------------------------------------------------------------+
|                                                                  |
|  Pagina 2 de 12 (234 jobs)        [20 v]  [< 1 2 3 ... 12 >]  |
|  caption text-muted                itens    paginas              |
|                                                                  |
+------------------------------------------------------------------+
```

```
Container:
  mt-4 (16px acima da tabela)
  flex items-center justify-between
  (Em mobile: flex-col gap-3 text-center)

Esquerda: texto informativo
Direita:  seletor de itens + navegacao de paginas
```

### 7.2 Texto Informativo

```
Font:   12px caption
Cor:    text-muted-foreground
Texto:  "Pagina {current} de {total_pages} ({total} jobs)"
        Ex: "Pagina 2 de 12 (234 jobs)"
        Se 1 pagina: "Exibindo todos os {total} jobs"
```

### 7.3 Seletor de Itens por Pagina

```
Componente:  shadcn Select (pequeno)
Label:       acessivel via aria-label="Itens por pagina"
Opcoes:      20, 50, 100
Default:     20
Tamanho:     h-8 (32px) / text-xs
Largura:     w-16 (64px)
Posicao:     a esquerda dos botoes de pagina

Ao mudar: volta para pagina 1, atualiza URL (?page=1&limit=50)
```

### 7.4 Botoes de Pagina

```
Estilo dos botoes:
  Variante:  outline para paginas, secondary para ativa
  Tamanho:   h-8 w-8 (32px square)
  Font:      12px
  Radius:    rounded-md

Layout:
  [<] [1] [2] [3] [...] [12] [>]

  [<] Anterior:
    Icone: ChevronLeft (16px)
    Disabled: na pagina 1
    aria-label: "Pagina anterior"

  [>] Proximo:
    Icone: ChevronRight (16px)
    Disabled: na ultima pagina
    aria-label: "Proxima pagina"

  Pagina ativa:
    BG: bg-primary text-primary-foreground
    Sem hover effect diferente

  Paginas inativas:
    Hover: bg-muted/40

  Ellipsis (...):
    Componente nao-interativo
    Cor: text-muted-foreground

Logica de exibicao das paginas:
  Mostra: pagina atual + 1 antes + 1 depois + primeira + ultima
  Se total <= 7: mostra todas sem ellipsis
  Se total > 7: ellipsis onde necessario

Ao mudar pagina:
  1. Atualiza URL: ?page={n}
  2. React Query refetch com novo page
  3. Scroll suave para o topo da tabela: tabela.scrollIntoView({ behavior: 'smooth' })
```

---

## 8. Bulk Actions Bar

### 8.1 Comportamento de Aparicao

A bulk actions bar aparece quando **1 ou mais** jobs estao selecionados via checkbox. Desaparece quando a selecao e zerada.

```
Posicao:    fixed bottom-0 left-0 right-0 z-50
Deslocamento: em desktop, ajustar para nao sobrepor bottom nav (so existe em mobile)
              Em mobile, a bulk actions bar fica ACIMA do bottom nav:
              bottom: 64px (altura do bottom nav)
              Em desktop: bottom: 0

Animacao entrada: translate-y(100%) -> translate-y(0), 200ms ease-out
Animacao saida:   translate-y(0) -> translate-y(100%), 150ms ease-in
```

### 8.2 Layout da Barra

```
+------------------------------------------------------------------+
|                                                                  |
|  [X]  3 jobs selecionados         [Arquivar]  [Mudar Status v]  |
|  botao fechar  texto               btn danger   btn outline      |
|                                                                  |
+------------------------------------------------------------------+
```

```
Altura:      h-16 (64px)
BG:          bg-zinc-900 dark:bg-zinc-950
             (fundo escuro propositalmente para contrastar com o conteudo acima)
Border-top:  1px border-zinc-700
Padding:     px-6 (alinhado com container do conteudo)

Layout:      flex items-center gap-4

Esquerda:
  Botao fechar [X]:
    Icone: X (16px)
    Variante: ghost
    Cor: text-zinc-400 hover:text-white
    aria-label: "Cancelar selecao"
    onClick: deselecionar tudo

  Contador:
    "{N} job(s) selecionado(s)"
    Font: 14px, font-medium
    Cor: text-white
    Nota: usar plural correto: "1 job selecionado" / "3 jobs selecionados"

Direita (ml-auto):
  Botao Arquivar:
    Variante: destructive (fundo vermelho)
    Tamanho: default h-9
    Icone: Archive (16px)
    Texto: "Arquivar"
    Acao: abre ConfirmDialog antes de executar

  Botao Mudar Status:
    Variante: outline (borda branca em fundo escuro)
    Tamanho: default h-9
    Icone: RefreshCw (16px) + ChevronDown (12px)
    Texto: "Mudar Status"
    Acao: DropdownMenu com os 14 status
          Apos selecao de status: abre ConfirmDialog
```

### 8.3 Dialog de Confirmacao (Bulk Actions)

```
Titulo:  "Arquivar {N} jobs" / "Atualizar status de {N} jobs"
Texto:   "Esta acao nao pode ser desfeita."
         Para status: "Os {N} jobs selecionados serao movidos para '{Status}'."
Botoes:
  Cancelar: secondary/outline
  Confirmar: destructive (para arquivar) / primary (para status)

Pos-confirmacao:
  1. Executar todas as operacoes (chamadas em paralelo ou batch)
  2. Loading: botao confirmar em estado loading
  3. Sucesso: deselecionar tudo + toast + refetch lista
  4. Erro parcial: toast warning "N de M jobs foram atualizados. {erro}"
```

### 8.4 Restricao de Vista

A bulk actions bar (e o checkbox de selecao) so aparece na **vista tabela**. Na vista kanban, nao ha selecao em massa.

---

## 9. Especificacoes Responsive

### 9.1 Desktop (1024px+)

```
Layout:
  - Sidebar fixa w-64 (ou w-16 colapsada)
  - Conteudo ocupa espaco restante
  - max-w-7xl mx-auto px-6

Filter bar:
  - Uma linha horizontal com todos os filtros visiveis
  - sticky top-14

Tabela:
  - Todas as 11 colunas visiveis
  - Scroll horizontal apenas quando viewport e muito estreita

Kanban:
  - Scroll horizontal, 3-4 colunas visiveis por vez

Modal criar job:
  - Dialog centralizado, max-w-lg (512px)
```

### 9.2 Tablet (768px - 1023px)

```
Layout:
  - Sem sidebar (substituta e drawer via hamburger na topbar)
  - Conteudo full-width px-4

Page header:
  - titulo + contador em linha
  - toggle + botao em linha separada (abaixo)

Filter bar:
  - Campo de busca full-width
  - Botao "Filtros (N)" que abre Sheet com filtros

Tabela:
  - overflow-x: auto (scroll horizontal)
  - Colunas com largura fixa, scroll nativo

Kanban:
  - Igual ao desktop (scroll horizontal)

Modal criar job:
  - Dialog centralizado max-w-lg (mesma do desktop)
```

### 9.3 Mobile (< 768px)

```
Layout:
  - Sem sidebar (substituta e bottom nav)
  - Full-width px-4
  - pb-20 (espaco para bottom nav + bulk actions)

Page header:
  - Titulo "Jobs" em linha
  - Contador abaixo do titulo
  - Toggle + Botao "Novo" em linha abaixo, justify-between

Filter bar:
  - Busca full-width em linha
  - Botao "Filtros (N)" em linha abaixo, full-width
  - Filtros em Sheet (bottom sheet, nao inline)

SUBSTITUICAO da tabela por cards:
  A tabela de jobs NAO e exibida em mobile.
  Substituida por lista vertical de cards.

Card de job mobile:
+--------------------------------+
| BBB_001          [o Pre-Prod.] |
| Campanha Verao 2026            |
| ACME Corp                      |
| Entrega: 28/02/26   Margem:32% |
| [=======  ] 65 health          |
+--------------------------------+

  Componente: JobCard (mesmo do kanban, layout levemente diferente)
  Padding:    p-4
  BG:         bg-card
  Border:     border border-border
  Radius:     rounded-lg
  Margin:     mb-2 (gap entre cards)
  Click:      navega /jobs/{id}

  Linha 1: job_code (badge) + status badge (direita)
  Linha 2: titulo (font-medium, line-clamp-2)
  Linha 3: cliente (text-secondary caption)
  Linha 4: data entrega (left) + margem (right)
  Linha 5: health bar (full width)

  Diferenca para o card do kanban:
    - Sem botao "Mudar Status" (so na linha de acoes)
    - Sem avatar stack (economizar espaco)
    - Layout mais vertical e espaco

Checkbox mobile:
  - Sem checkbox na lista de cards (bulk actions nao disponiveis)
  - Confirmado pela spec (US-F3-013): bulk apenas na vista tabela

Paginacao mobile:
  - Botoes de pagina: apenas [<] pagina_atual [>]
  - Texto abaixo: "Pagina X de Y"

Kanban mobile:
  - O kanban e permitido em mobile se o usuario toggle para ele
  - Cards iguais ao desktop-kanban
  - Scroll horizontal nativo

Modal criar job mobile:
  - Sheet (bottom sheet), nao Dialog
  - Desliza de baixo para cima
  - Altura: ~85vh (deixa um pouco do conteudo aparecer atras)
  - Formulario com scroll interno
  - Botoes no rodape: sticky dentro do sheet
```

### 9.4 Resumo das Adaptacoes por Breakpoint

| Elemento          | Mobile (< 768) | Tablet (768-1023) | Desktop (1024+) |
|-------------------|---------------|-------------------|-----------------|
| Sidebar           | Bottom Nav    | Drawer overlay    | Fixa w-64       |
| Tabela            | Cards empilh. | Tabela + scroll H | Tabela completa |
| Filtros           | Sheet         | Botao + Sheet     | Inline completo |
| Filter chips      | Inline        | Inline            | Inline          |
| Modal criar job   | Bottom Sheet  | Dialog center     | Dialog center   |
| Bulk actions      | Nao disponiv. | Disponivel        | Disponivel      |
| Kanban            | Scroll H      | Scroll H          | Scroll H        |
| Paginacao         | Simplificada  | Completa          | Completa        |

---

## 10. Tokens do Design System

### 10.1 Cores Exatas Utilizadas

```css
/* Backgrounds */
--background:        0 0% 100%        /* light: #FFFFFF */
                     240 10% 3.9%     /* dark:  #09090B */
--card:              0 0% 100%        /* light: #FFFFFF */
                     240 6% 10%       /* dark:  #1A1A1F */
--muted:             240 4.8% 95.9%   /* light: #F4F4F5 */
                     240 3.7% 15.9%   /* dark:  #27272A */

/* Textos */
--foreground:        240 10% 3.9%     /* light: #09090B */
                     0 0% 98%         /* dark:  #FAFAFA */
--muted-foreground:  240 3.8% 46.1%   /* light: #71717A */
                     240 5% 64.9%     /* dark:  #A1A1AA */

/* Bordas */
--border:            240 5.9% 90%     /* light: #E4E4E7 */
                     240 3.7% 25%     /* dark:  #3F3F46 */

/* Accent (primary - rose) */
--primary:           347 77% 50%      /* light: #E11D48 (rose-600) */
                     350 89% 60%      /* dark:  #FB7185 (rose-400) */
--primary-foreground: 0 0% 100%       /* white */

/* Destructive (vermelho) */
--destructive:       0 84.2% 60.2%    /* light: #EF4444 */
                     0 62.8% 30.6%    /* dark:  #7F1D1D */
```

### 10.2 Cores de Status (valores absolutos)

```typescript
// Usar diretamente no style/className, nao como CSS var
// pois sao cores funcionais especificas, nao tematicas

const STATUS_COLORS = {
  briefing_recebido:          '#8B5CF6',  // violet-500
  orcamento_elaboracao:       '#F59E0B',  // amber-500
  orcamento_enviado:          '#F59E0B',  // amber-500
  aguardando_aprovacao:       '#F59E0B',  // amber-500
  aprovado_selecao_diretor:   '#22C55E',  // green-500
  cronograma_planejamento:    '#3B82F6',  // blue-500
  pre_producao:               '#3B82F6',  // blue-500
  producao_filmagem:          '#EF4444',  // red-500
  pos_producao:               '#A855F7',  // purple-500
  aguardando_aprovacao_final: '#A855F7',  // purple-500
  entregue:                   '#06B6D4',  // cyan-500
  finalizado:                 '#10B981',  // emerald-500
  cancelado:                  '#6B7280',  // gray-500
  pausado:                    '#6B7280',  // gray-500
};

// Para bg dos badges: usar hex + /10 via style="background: {cor}1A"
// 1A = 10% opacity em hex (0x1A = 26 = ~10% de 255)
```

### 10.3 Espacamentos Aplicados

```
Espacamento utilizado nesta tela (todos multiplos de 4px):

4px  (1)   = gap entre dot e texto em badge de status
8px  (2)   = gap entre chips de filtro, gap entre cards em kanban
12px (3)   = padding interno de cards (kanban), padding filter bar vertical
16px (4)   = padding de cards, gap entre colunas kanban, mt da paginacao
24px (6)   = padding horizontal do container, padding vertical do page header
32px (8)   = espacamento interno de secoes maiores
```

### 10.4 Tipografia Aplicada

```
Titulo da pagina "Jobs":
  24px / 1.5rem, font-weight: 600, tracking: -0.025em
  CSS: text-2xl font-semibold tracking-tight

Subtitulo contador "Mostrando X de Y":
  12px / 0.75rem, font-weight: 500
  CSS: text-xs font-medium text-muted-foreground

Header da tabela (colunas):
  12px / 0.75rem, font-weight: 500
  CSS: text-xs font-medium text-muted-foreground

Conteudo das celulas (nome, cliente, tipo):
  14px / 0.875rem, font-weight: 400 (regular) ou 500 (medium para titulo)
  CSS: text-sm (ou text-sm font-medium para titulo)

job_code badge:
  10px / 0.625rem, font-family: JetBrains Mono, font-weight: 500
  CSS: font-mono text-[10px] font-medium

Status badge texto:
  12px / 0.75rem, font-weight: 500
  CSS: text-xs font-medium

Kanban column header:
  11px / uppercase / tracking: 0.05em / font-weight: 600
  CSS: text-[11px] font-semibold uppercase tracking-wide

Texto body generico:
  14px / 0.875rem, font-weight: 400
  CSS: text-sm
```

### 10.5 Border Radius

```
Cards:           rounded-lg (8px)  -- tabela container, cards kanban
Botoes:          rounded-md (6px)  -- todos os buttons shadcn
Badges:          rounded-full      -- status badges, chips de filtro
job_code badge:  rounded-sm (4px)  -- badge mono do codigo
Inputs:          rounded-md (6px)  -- campos de form
Modal:           rounded-xl (12px) -- Dialog container
Filter bar:      sem radius (sticky, ocupa full width)
```

### 10.6 Sombras

```
Light mode:
  Cards tabela/kanban:  shadow-sm (leve elevacao)
  Cards hover kanban:   shadow-md
  Modal:                shadow-xl
  Bulk actions bar:     shadow-lg acima (box-shadow inset top)

Dark mode:
  Cards:                nenhuma sombra (borders sao suficientes)
  Modal:                border border-border (sem shadow)
```

### 10.7 Transicoes e Animacoes

```
Hover de linhas da tabela:    transition-colors duration-100
Hover de cards kanban:        transition-all duration-150
Botoes:                       transition-colors duration-150
Bulk actions bar entrada:     translate-y + duration-200 ease-out
Bulk actions bar saida:       translate-y + duration-150 ease-in
Chips de filtro aparecendo:   fade-in opacity 0->1 duration-150
Modal abertura:               scale + fade, duration-150 ease-out
Sidebar colapso:              transition-width duration-200 ease
```

---

## 11. Estados Especiais

### 11.1 Resumo de Todos os Estados

| Componente        | Estado Loading        | Estado Empty          | Estado Error          |
|-------------------|-----------------------|-----------------------|-----------------------|
| Tabela de jobs    | 8 skeleton rows 52px  | Empty state com CTA   | ErrorCard + Retry     |
| Kanban view       | Skeleton 4 cols/cards | Colunas vazias text   | ErrorCard + Retry     |
| Dropdown cliente  | 3 skeleton items      | "Nenhum cliente"      | Nenhum (falha silenc.)|
| Dropdown status   | N/A (dados locais)    | N/A                   | N/A                   |
| Modal criar job   | Loader no botao       | N/A (form vazio OK)   | Toast + modal aberto  |

### 11.2 Skeleton - Guia de Implementacao

```typescript
// Pattern padrao: delay de 200ms antes de mostrar skeleton

function useDelayedLoading(isLoading: boolean, delayMs = 200) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), delayMs);
      return () => clearTimeout(timer);
    }
    setShowSkeleton(false);
  }, [isLoading, delayMs]);

  return showSkeleton;
}
```

### 11.3 Feedback de Acoes

```
Criar job (sucesso):
  1. Modal fecha imediatamente
  2. Toast: "Job criado com sucesso" (green, 4s)
  3. Navega para /jobs/{id}
  4. Query da listagem invalidada (quando voltar, dados frescos)

Mudar status via menu acao (linha da tabela):
  1. Otimistic: badge de status na linha muda imediatamente
  2. API call em background
  3. Sucesso: toast silencioso (ou nenhum - a mudanca visual ja e feedback)
  4. Erro: rollback do otimistic + toast error

Arquivar job (menu acao):
  1. Dialog de confirmacao
  2. Apos confirmacao: loading no botao do dialog
  3. Sucesso: toast "Job arquivado" + refetch lista (job some da lista)
  4. Erro: toast error, job permanece

Bulk action arquivar (3 jobs):
  1. Dialog: "Arquivar 3 jobs? Esta acao nao pode ser desfeita."
  2. Loading no botao confirmar
  3. Sucesso: deselecionar + toast "3 jobs arquivados" + refetch
  4. Erro parcial: toast "1 de 3 jobs arquivados. Houve um erro nos demais."
```

---

## 12. Acessibilidade

### 12.1 Semantica HTML

```html
<!-- Page header -->
<header>
  <h1>Jobs</h1>
  <p aria-live="polite">Mostrando 20 de 48 jobs</p>
</header>

<!-- Filter bar -->
<section aria-label="Filtros de busca">
  <form role="search">
    <label for="search-jobs">Buscar jobs</label>
    <input id="search-jobs" type="search" ... />
    <!-- demais filtros -->
  </form>
</section>

<!-- Tabela -->
<main>
  <table aria-label="Lista de jobs" aria-rowcount="48">
    <caption class="sr-only">Tabela de jobs com 48 resultados</caption>
    <thead>
      <tr>
        <th scope="col">
          <input type="checkbox" aria-label="Selecionar todos os jobs da pagina" />
        </th>
        <th scope="col" aria-sort="ascending">
          <button aria-label="Ordenar por numero">
            # <ChevronUp aria-hidden="true" />
          </button>
        </th>
        <!-- demais headers -->
      </tr>
    </thead>
    <tbody>
      <tr aria-selected="false">
        <td><input type="checkbox" aria-label="Selecionar job Campanha Verao" /></td>
        <td>1</td>
        <!-- demais celulas -->
      </tr>
    </tbody>
  </table>
</main>
```

### 12.2 Navegacao por Teclado

```
Tab order na pagina:
  1. Skip to content link (oculto, aparece com focus)
  2. Botao toggle tabela/kanban
  3. Botao "Novo Job"
  4. Campo de busca
  5. Filtro Status (abre com Enter/Space)
  6. Filtro Cliente
  7. Filtro Tipo
  8. Filtro Periodo
  9. Switch Arquivados
  10. Botao Limpar (se visivel)
  11. Chips de filtro (cada X e focavel)
  12. Header da tabela (colunas sortaveis via Enter)
  13. Checkbox de selecao total
  14. Linhas da tabela (Tab entre linhas, Enter abre o job)
  15. Menu de acoes de cada linha (Tab para chegar, Enter para abrir, setas para navegar)
  16. Paginacao (Tab entre botoes)

Teclas especiais:
  Escape:  fecha dropdowns, modais, cancela selecao
  Enter:   abre link da linha, confirma selecao em dropdown
  Space:   toggle checkbox
  Setas:   navega opcoes em dropdowns e selects

Modal:
  Focus trap: Tab nao sai do modal enquanto aberto
  Escape:     fecha modal
  Focus ao abrir: primeiro campo interativo do modal
  Focus ao fechar: botao que abriu o modal
```

### 12.3 ARIA Labels Obrigatorios

```
Botoes de icone (sem texto visivel):
  Toggle tabela:    aria-label="Vista em tabela"
  Toggle kanban:    aria-label="Vista em kanban"
  Botao busca X:    aria-label="Limpar busca"
  Menu acoes linha: aria-label="Acoes para job {title}"
  Fechar modal:     aria-label="Fechar modal"
  Cancelar selecao: aria-label="Cancelar selecao de jobs"
  Chip fechar X:    aria-label="Remover filtro {tipo}: {valor}"
  Pagina anterior:  aria-label="Ir para pagina anterior"
  Pagina proximo:   aria-label="Ir para pagina seguinte"
  Pagina N:         aria-label="Ir para pagina {N}"
  Pagina N (ativa): aria-label="Pagina {N}, pagina atual" aria-current="page"

Regioes live (atualizacoes dinamicas):
  Contador resultados:      aria-live="polite" aria-atomic="true"
  Indicador de status bulk: aria-live="polite"
  Toast notifications:      aria-live="assertive" (erros) / "polite" (sucesso)
```

### 12.4 Contraste de Cores

```
Verificados contra WCAG 2.1 AA (minimo 4.5:1 para texto, 3:1 para UI):

text-foreground sobre bg-background:    ~17:1 (passa)
text-muted-foreground sobre bg:         ~4.6:1 (passa - margem minima)
rose-600 (#E11D48) sobre white:         ~5.8:1 (passa)
rose-400 (#FB7185) sobre #09090B:       ~5.3:1 (passa em dark mode)
status violet-500 (#8B5CF6) sobre bg:   verificar em dark - pode precisar de ajuste
  - Light: #8B5CF6 sobre #FFF: 4.54:1 (passa margem minima)
  - Dark: ajustar para violet-400 (#A78BFA) sobre #09090B: 5.1:1 (passa)
amber-500 status sobre bg:
  - Light: texto amber-500 em bg amber-100: verificar (pode ser baixo)
  - Recomendado: text-amber-700 (#B45309) sobre bg-amber-100 (#FEF3C7): 5.2:1 (passa)
```

---

## Changelog

| Data       | Versao | Descricao                                           |
|------------|--------|-----------------------------------------------------|
| 2026-02-18 | 1.0    | Spec visual completa do Dashboard de Jobs (/jobs)   |
