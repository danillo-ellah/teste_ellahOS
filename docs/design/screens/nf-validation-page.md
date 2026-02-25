# Spec Visual: Validacao de NFs (/financial/nf-validation)

**Data:** 2026-02-25
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Fase:** 9.2 - Fluxo de NF: Recebimento
**Design System:** docs/design/design-system.md
**Arquitetura:** docs/architecture/fase-9-automacoes-architecture.md (secao 6.1)
**Spec:** docs/specs/fase-9-automacoes-spec.md

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Layout Geral](#2-layout-geral)
3. [Stats Cards (NfStatsCards)](#3-stats-cards-nfstatscards)
4. [Barra de Filtros](#4-barra-de-filtros)
5. [Tabela de NFs (NfDocumentTable)](#5-tabela-de-nfs-nfdocumenttable)
6. [Modal de Validacao (NfValidationDialog)](#6-modal-de-validacao-nfvalidationdialog)
7. [Modal de Reclassificacao (NfReassignDialog)](#7-modal-de-reclassificacao-nfreassigndialog)
8. [Estados: Loading, Empty, Error](#8-estados-loading-empty-error)
9. [Badges de Status](#9-badges-de-status)
10. [Responsividade](#10-responsividade)
11. [Interacoes e Animacoes](#11-interacoes-e-animacoes)
12. [Acessibilidade](#12-acessibilidade)
13. [Tokens de Referencia Rapida](#13-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

A pagina `/financial/nf-validation` e o hub de trabalho para o setor financeiro processar NFs recebidas por email. O fluxo e semi-automatico: o n8n faz o polling do Gmail, extrai PDFs e cria registros na tabela `nf_documents`. A tela exibe esses registros e permite ao usuario humano confirmar, reclassificar ou rejeitar cada NF.

**Quem usa:** Financeiro, produtor-executivo.
**Quando usa:** Diariamente, ao receber NFs de fornecedores.
**O que precisa entregar:**
- Visao rapida de quantas NFs estao pendentes
- Validar ou rejeitar NFs com minimo de cliques
- Vincular NF ao financial_record correto (custo do job)
- Acesso ao PDF original durante a validacao

**Referencias de UX:** Shotgun/ShotGrid (review de assets), Monday.com (status por linha), Linear (acoes inline em tabela).

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
| w-64   |  | Validacao de NFs       [Atualizar] [? Ajuda]     |  |
|        |  | Financeiro > NFs                                  |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  STATS CARDS (gap-4, grid 4 colunas)                   |
|        |  +----------+ +----------+ +----------+ +----------+  |
|        |  | Pendentes| |Auto-match| |Confirmad.| |Rejeitadas|  |
|        |  | (amber)  | | (blue)   | | (green)  | | (red)    |  |
|        |  +----------+ +----------+ +----------+ +----------+  |
|        |                                                         |
|        |  FILTER BAR (mt-6)                                      |
|        |  +---------------------------------------------------+  |
|        |  | [busca por fornecedor] [status v] [job v] [data]  |  |
|        |  +---------------------------------------------------+  |
|        |  | chips de filtro ativo: [status: pendente x]       |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  TABELA NfDocumentTable                                 |
|        |  +---------------------------------------------------+  |
|        |  | [ ] arquivo  fornecedor  data  valor  job  status |  |
|        |  |---------------------------------------------------|  |
|        |  | [ ] nf-001   Uber        01/02  R$350  038  [●]   |  |
|        |  | [ ] nf-002   99 Taxi     02/02  R$120  038  [●]   |  |
|        |  | [ ] nf-003   Hotel Plaza 03/02  R$800  039  [●]   |  |
|        |  |---------------------------------------------------|  |
|        |  | << 1 2 3 >>  Exibindo 1-20 de 47                  |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
+--------+---------------------------------------------------------+
```

### 2.2 Hierarquia Visual

- **H1 (heading-1, 24px semi):** "Validacao de NFs"
- **Breadcrumb (caption, 12px):** Financeiro > NFs — texto muted, separador "/"
- **Stats Cards:** bloco visualmente destacado, leitura rapida antes da tabela
- **Tabela:** ocupa o restante da viewport com overflow-y auto

### 2.3 Largura do Conteudo

```
Container: max-w-7xl mx-auto px-6 (desktop) | px-4 (mobile)
Stats grid: grid-cols-4 gap-4 (desktop) | grid-cols-2 gap-3 (tablet) | grid-cols-1 gap-3 (mobile)
```

---

## 3. Stats Cards (NfStatsCards)

Quatro cards informativos no topo da pagina. Cada card e um componente Card do shadcn/ui.

### 3.1 Wireframe de um Card

```
+--------------------------------+
|  [icone 20px]    LABEL (12px)  |
|                                |
|  NUMERO (30px bold)            |
|  Descricao (12px muted)        |
+--------------------------------+
```

### 3.2 Especificacao dos 4 Cards

| Card | Icone (Lucide) | Label | Cor | Descricao |
|------|---------------|-------|-----|-----------|
| Pendentes | `Clock` | PENDENTES | amber | "Aguardando validacao" |
| Auto-matched | `Zap` | AUTO-MATCHED | blue | "Match automatico sugerido" |
| Confirmadas | `CheckCircle2` | CONFIRMADAS NO MES | green | "Mes atual" |
| Rejeitadas | `XCircle` | REJEITADAS NO MES | red | "Mes atual" |

### 3.3 Estilo por Variante

```
Card Pendentes (amber):
  border-left: 3px solid amber-500
  icone: text-amber-500 dark:text-amber-400
  numero: text-amber-700 dark:text-amber-300
  bg: bg-white dark:bg-zinc-900
  borda: border-zinc-200 dark:border-zinc-800

Card Auto-matched (blue):
  border-left: 3px solid blue-500
  icone: text-blue-500 dark:text-blue-400
  numero: text-blue-700 dark:text-blue-300

Card Confirmadas (green):
  border-left: 3px solid green-500
  icone: text-green-500 dark:text-green-400
  numero: text-green-700 dark:text-green-300

Card Rejeitadas (red):
  border-left: 3px solid red-500
  icone: text-red-500 dark:text-red-400
  numero: text-red-700 dark:text-red-300
```

### 3.4 Dimensoes

```
Card: p-5 (20px), rounded-lg, shadow-sm (light only)
Label: text-xs font-medium uppercase tracking-wide text-zinc-500
Numero: text-3xl font-bold mt-2
Descricao: text-xs text-zinc-500 mt-1
Icone: w-5 h-5, float right no topo do card
```

### 3.5 Interacao

Cards Pendentes e Auto-matched sao **clicaveis** — clicar aplica o filtro de status correspondente na tabela abaixo (ring + escala leve ao hover).

```
hover: ring-2 ring-offset-2 ring-{cor}-300 cursor-pointer
transition: all 150ms ease-out
```

---

## 4. Barra de Filtros

### 4.1 Layout

```
DESKTOP:
+-----------------------------------------------------------+
| [  buscar fornecedor...  ] [Status v] [Job v] [Periodo v] |
|                                        [Limpar filtros]   |
+-----------------------------------------------------------+

MOBILE (empilhado):
+-------------------------+
| [  buscar fornecedor  ] |
| [Status v] [Job v]      |
| [Periodo v]             |
+-------------------------+
```

### 4.2 Componentes de Filtro

| Elemento | Componente | Comportamento |
|----------|-----------|---------------|
| Busca por fornecedor | `Input` com icone `Search` (16px) a esquerda | debounce 300ms, filtra por fornecedor_nome |
| Filtro Status | `Select` (shadcn) | opcoes: Todos, Pendente, Auto-matched, Confirmado, Rejeitado |
| Filtro Job | `Select` com busca | lista de jobs do tenant |
| Periodo | `Select` | opcoes: Hoje, Esta semana, Este mes, Mes passado, Personalizado |
| Limpar filtros | `Button` variant ghost, icone `FilterX` | visivel apenas se houver filtro ativo |

### 4.3 Filter Chips

Se houver filtros ativos, exibir chips abaixo da barra (mt-2):

```
[status: Pendente  x]  [job: BBB_039  x]
```

```
Chip: badge inline-flex items-center gap-1
  bg: zinc-100 dark:zinc-800
  text: body-sm text-zinc-700 dark:zinc-300
  botao x: ghost icon 14px, hover:text-red-500
  padding: px-2 py-0.5 rounded-full
```

---

## 5. Tabela de NFs (NfDocumentTable)

### 5.1 Colunas

| # | Coluna | Largura | Conteudo |
|---|--------|---------|----------|
| 1 | Checkbox | w-10 | selecao para bulk actions |
| 2 | Arquivo | min-w-[180px] flex-1 | nome do arquivo PDF (truncado) + icone `FileText` |
| 3 | Fornecedor | w-[180px] | nome do fornecedor (texto muted se desconhecido) |
| 4 | Recebido em | w-[120px] | data formatada "DD/MM/AAAA", text-sm |
| 5 | Valor | w-[100px] | R$ formatado, font-mono, alinhado a direita |
| 6 | Job Vinculado | w-[140px] | badge com job code (variant outline) ou "–" se nao vinculado |
| 7 | Status | w-[130px] | StatusBadge (ver secao 9) |
| 8 | Acoes | w-[80px] | botoes inline: Validar + menu `MoreHorizontal` |

### 5.2 Wireframe de Linha

```
+----+------------------+------------+----------+---------+--------+-----------+------+
| [] | nf-uber-01-02.pdf| Uber Brasil | 01/02/26 | R$350,00| [038] | [● amber] | [>] |
+----+------------------+------------+----------+---------+--------+-----------+------+
```

### 5.3 Coluna Arquivo

```
[FileText 16px]  nf-uber-01-02.pdf
                 SHA: a3f2... (caption, muted, hover only)
```

O nome do arquivo e truncado com `truncate max-w-[160px]`. Tooltip com nome completo ao hover.

### 5.4 Coluna Job Vinculado

```
Se vinculado:
  [badge outline] BBB_038
  texto abaixo: "Publicidade" (caption, muted) -- project_type

Se nao vinculado:
  "–" (text-zinc-400)
  tooltip: "Sem job vinculado — valide para associar"
```

### 5.5 Coluna Acoes

```
[Validar]          botao ghost sm, icone CheckSquare
[...]              DropdownMenu:
                     Visualizar PDF
                     Reclassificar
                     Rejeitar
                     Copiar ID
```

O botao "Validar" abre o `NfValidationDialog` (secao 6).
"Rejeitar" abre um `AlertDialog` de confirmacao antes de executar.

### 5.6 Header da Tabela

```
Linha de header:
  bg: zinc-50 dark:zinc-900
  h: 40px
  font: text-xs font-medium text-zinc-500 uppercase tracking-wide
  colunas com sort: exibir icone ChevronsUpDown (neutro) / ChevronUp / ChevronDown
  colunas sortaveis: Recebido em, Valor
```

### 5.7 Linha Hover

```
hover: bg-zinc-50 dark:bg-zinc-800/50
cursor: default (linha nao e clicavel como um todo — apenas botoes)
```

### 5.8 Bulk Actions Bar

Quando um ou mais checkboxes estao selecionados, exibe barra flutuante fixa no bottom:

```
DESKTOP:
+---------------------------------------------------+
|  3 NFs selecionadas      [Confirmar] [Rejeitar]   |
+---------------------------------------------------+

fixed bottom-6 left-1/2 -translate-x-1/2
bg: zinc-900 dark:bg-zinc-100
text: white dark:text-zinc-900
rounded-full px-6 py-3 shadow-xl
```

### 5.9 Paginacao

```
+-----------------------------------------------+
| Exibindo 1-20 de 47  |  << Anterior  Proximo >>|
+-----------------------------------------------+

Componente: shadcn Pagination
Posicao: abaixo da tabela, mt-4
Alinhamento: space-between
Texto: text-sm text-zinc-500
```

---

## 6. Modal de Validacao (NfValidationDialog)

O modal de validacao e o componente central desta tela. Layout **split 50/50** com preview do PDF a esquerda e dados + acoes a direita.

### 6.1 Wireframe (Desktop)

```
+------------------------------------------------------------+
|  Validar NF                                           [X]  |
+--------------------------+---------------------------------+
|                          |  DADOS EXTRAIDOS               |
|  PDF PREVIEW             |                                |
|  (iframe sandbox)        |  Fornecedor  [____________]    |
|                          |  CNPJ        [____________]    |
|  nf-uber-01-02.pdf       |  Numero NF   [____________]    |
|  [Abrir em nova aba]     |  Valor       [____________]    |
|                          |  Data emissao[____________]    |
|                          |  Competencia [____________]    |
|                          |                                |
|                          |  MATCH SUGERIDO                |
|                          |  +----------------------------+|
|                          |  | [Zap 16px] Auto-matched    ||
|                          |  | Uber equipe (Job 038)      ||
|                          |  | R$ 350,00 · 01/02/2026     ||
|                          |  +----------------------------+|
|                          |                                |
|                          |  [Reclassificar]               |
|                          |                                |
+--------------------------+---------------------------------+
|  [Rejeitar]              [Cancelar]  [Confirmar Match]    |
+------------------------------------------------------------+
```

### 6.2 Dimensoes e Layout

```
Dialog: max-w-4xl (896px), h-auto max-h-[90vh]
Overlay: bg-black/50 backdrop-blur-sm

Split layout:
  Esquerda (PDF): w-[50%] bg-zinc-50 dark:bg-zinc-900 rounded-l-xl
  Direita (dados): w-[50%] p-6 overflow-y-auto

Header:
  padding: px-6 py-4
  border-bottom: 1px zinc-200 dark:zinc-800
  titulo: heading-2 (20px semi)
  botao fechar: ghost icon X, 36px

Footer:
  padding: px-6 py-4
  border-top: 1px zinc-200 dark:zinc-800
  layout: justify-between (Rejeitar a esquerda | Cancelar + Confirmar a direita)
```

### 6.3 Painel Esquerdo - PDF Preview

```
Iframe:
  width: 100%
  height: 100% (min-height: 400px)
  sandbox="allow-same-origin allow-scripts"
  border: none
  bg: white (independente do tema)

Toolbar do preview:
  altura: 36px
  bg: zinc-100 dark:zinc-900
  conteudo: nome-do-arquivo (truncado) | [ExternalLink 14px "Abrir em nova aba"]
  font: caption (12px) text-zinc-500

Estado loading do iframe:
  skeleton animado com icone FileText centralizado
  texto "Carregando PDF..."

Estado erro do iframe:
  icone AlertTriangle amber
  texto "Nao foi possivel carregar o PDF"
  botao "Abrir em nova aba" (link direto para Drive)
```

### 6.4 Painel Direito - Dados Extraidos

**Secao: Dados Extraidos**

```
Label: "DADOS EXTRAIDOS" (overline, 11px, uppercase, tracking-wide, text-zinc-400)

Campos editaveis (6 campos, grid 2 colunas):
  - Fornecedor (text input, largura full)
  - CNPJ       (text input, mask ##.###.###/####-##)
  - Numero NF  (text input)
  - Valor      (text input, prefixo "R$", font-mono)
  - Data emissao (date input)
  - Competencia  (month input, MM/AAAA)

Campo com dado extraido por OCR:
  bg: zinc-50 dark:bg-zinc-800
  border: dashed zinc-300 dark:zinc-600
  badge "OCR" (blue, caption) no canto superior direito do campo
  tooltip no badge: "Extraido automaticamente — verifique antes de confirmar"

Campo editado pelo usuario:
  border: solid accent-500
  badge "Editado" (amber, caption)
```

**Secao: Match Sugerido**

```
Label: "MATCH SUGERIDO" (overline)

Card do match:
  padding: p-3
  bg: blue-50 dark:bg-blue-950
  border: 1px blue-200 dark:blue-800
  rounded-md

  Linha 1: [Zap 14px blue-500] "Auto-matched" (text-xs font-medium blue-600 dark:blue-400)
  Linha 2: nome do financial_record (body-sm font-medium)
           badge job code (outline, xs)
  Linha 3: valor (font-mono blue-700 dark:blue-300) · data (text-xs muted)

Card sem match (quando nao houve auto-match):
  bg: zinc-50 dark:zinc-800
  border: 1px dashed zinc-300
  icone: AlertCircle zinc-400
  texto: "Sem match automatico — selecione o lancamento"
  botao: "Buscar lancamento" → abre NfReassignDialog
```

**Botao Reclassificar**

```
Button: variant outline, size sm, icone Search 14px
texto: "Reclassificar para outro lancamento"
mt-3 (abaixo do card de match)
largura: w-full
```

### 6.5 Botoes do Footer

```
Rejeitar:
  variant: destructive
  icone: XCircle 16px
  texto: "Rejeitar NF"
  posicao: lado esquerdo

Cancelar:
  variant: outline
  texto: "Cancelar"

Confirmar Match:
  variant: primary (rose)
  icone: CheckCircle2 16px
  texto: "Confirmar Match"
  disabled: se nao houver match selecionado (fornecedor/valor/data preenchidos)
  loading: Loader2 spin + "Confirmando..."
```

### 6.6 Animacao de Abertura

```
Dialog overlay: fade-in 150ms ease-out
Dialog container: scale-95 -> scale-100 + fade-in 150ms ease-out
```

---

## 7. Modal de Reclassificacao (NfReassignDialog)

Aberto a partir do `NfValidationDialog` quando o usuario quer trocar o `financial_record` vinculado.

### 7.1 Wireframe

```
+----------------------------------------------+
|  Buscar Lancamento                      [X]  |
+----------------------------------------------+
|  [  buscar por descricao, valor, job...  ]   |
|  [Job v] [Fornecedor v]                      |
|                                              |
|  RESULTADOS (lista scrollavel)               |
|  +------------------------------------------+|
|  | [radio] Uber equipe                      ||
|  |         BBB_038 · R$ 350,00 · 01/02/26   ||
|  |         status: sem_nf                   ||
|  |----------------------------------------- ||
|  | [radio] Uber producao                    ||
|  |         BBB_038 · R$ 280,00 · 28/01/26   ||
|  |         status: sem_nf                   ||
|  |----------------------------------------- ||
|  | (mais 3 resultados...)                   ||
|  +------------------------------------------+|
|                                              |
+----------------------------------------------+
|  [Cancelar]                  [Selecionar]    |
+----------------------------------------------+
```

### 7.2 Especificacao

```
Dialog: max-w-lg (512px), h-auto

Campo de busca:
  Input com icone Search a esquerda
  placeholder: "Buscar por descricao, valor ou job..."
  debounce: 300ms
  autofocus ao abrir

Filtros:
  Select Job: lista de jobs do tenant (apenas com financial_records sem NF)
  Select Fornecedor: lista de fornecedores dos financial_records filtrados

Lista de resultados:
  max-h: 320px overflow-y-auto
  skeleton: 3 linhas enquanto carrega

  Item da lista:
    padding: px-3 py-2.5
    hover: bg-zinc-50 dark:bg-zinc-800
    radio button a esquerda
    nome: body-sm font-medium
    meta: caption text-zinc-500 (job code · valor · data)
    badge status NF: (sem_nf = amber, enviado = blue)
    borda entre itens: 1px zinc-100 dark:zinc-800

  Empty state da lista:
    icone Search 32px text-zinc-300
    texto: "Nenhum lancamento encontrado"
    sugestao: "Tente buscar por valor ou descrição diferente"

Botao Selecionar:
  primary (rose), disabled se nao houver item selecionado
  apos selecionar: fecha este dialog, atualiza o match no NfValidationDialog
```

---

## 8. Estados: Loading, Empty, Error

### 8.1 Loading State (Tabela)

```
Stats Cards: skeleton de 4 cards (h-24 each, rounded-lg, animate-pulse)

Tabela header: normal (exibido imediatamente)
Tabela body: 8 linhas skeleton
  cada linha: h-[44px] com 3 blocos skeleton (larguras variadas)
  bg: zinc-200 dark:zinc-800, animate-pulse, rounded-md
```

### 8.2 Empty State (sem NFs)

Condicao: quando nao ha NFs no sistema ainda (primeira execucao ou nenhuma pendente).

```
Container: flex flex-col items-center justify-center py-20

[FileCheck 48px text-zinc-300]
"Nenhuma NF pendente"              heading-3 (18px) mt-4
"Quando fornecedores enviarem NFs  body-sm text-zinc-500 mt-2 text-center max-w-sm
por email, elas apareceram aqui
automaticamente."
```

### 8.3 Empty State (com filtros ativos)

```
[Filter 48px text-zinc-300]
"Nenhuma NF encontrada"            heading-3
"Tente ajustar os filtros         body-sm text-zinc-500
aplicados."
[Limpar filtros]                   Button outline mt-6
```

### 8.4 Error State (falha na requisicao)

```
[AlertTriangle 48px text-red-400]
"Erro ao carregar NFs"             heading-3
"Tente novamente. Se o problema   body-sm text-zinc-500
persistir, contate o suporte."
[Tentar novamente]                 Button primary (rose) mt-6
                                   (re-chama a query)
```

---

## 9. Badges de Status

Seguem o padrao de `Badge com dot` do design system (secao 6.5).

| Status | Cor | Dot | BG (light) | BG (dark) | Texto |
|--------|-----|-----|-----------|-----------|-------|
| `pending_review` | amber | amber-500 | amber-100 | amber-500/10 | amber-700 / amber-400 |
| `auto_matched` | blue | blue-500 | blue-100 | blue-500/10 | blue-700 / blue-400 |
| `confirmed` | green | green-500 | green-100 | green-500/10 | green-700 / green-400 |
| `rejected` | red | red-500 | red-100 | red-500/10 | red-700 / red-400 |

```
Labels exibidos:
  pending_review → "Pendente"
  auto_matched   → "Auto-matched"
  confirmed      → "Confirmado"
  rejected       → "Rejeitado"

Componente: inline-flex items-center gap-1 px-2 py-0.5
  rounded-full text-xs font-medium
  dot: w-1.5 h-1.5 rounded-full
```

---

## 10. Responsividade

### 10.1 Mobile (<768px)

```
LAYOUT MOBILE:

+------------------------+
|  TOPBAR (h-14, fixed)  |
+------------------------+
|  Validacao de NFs      |
|  [Atualizar]           |
+------------------------+
| STATS (grid 2 colunas) |
| [Pend.] [Auto-match]   |
| [Conf.] [Rejeit.]      |
+------------------------+
| [buscar fornecedor   ] |
| [Status v] [Periodo v] |
+------------------------+
|  CARDS EMPILHADOS      |
|  (tabela vira cards)   |
|  +--------------------+|
|  | nf-uber-01-02.pdf  ||
|  | Uber Brasil        ||
|  | R$ 350,00 · 01/02  ||
|  | [● Pendente]       ||
|  | [Validar]          ||
|  +--------------------+|
|  +--------------------+|
|  | nf-99taxi-02-02.pdf||
|  | ...                ||
|  +--------------------+|
+------------------------+
|  BOTTOM NAV (h-16)     |
+------------------------+
```

**Regras mobile:**
- Stats: grid-cols-2 gap-3 (cards menores, h-auto)
- Tabela substituda por lista de cards (NfDocumentCard)
- Cada card: padding p-4, rounded-lg, border, shadow-sm
- Card tem botao "Validar" secundario na base
- Modal NfValidationDialog: bottom sheet (Sheet from bottom), full-width, h-[95vh]
  - Preview PDF ocupa 50% da altura
  - Dados ficam em scroll abaixo do preview
  - Footer fixo no bottom do sheet

### 10.2 Tablet (768px-1023px)

```
- Stats: grid-cols-2 gap-4
- Tabela: scroll horizontal (overflow-x-auto)
- Colunas ocultas: Arquivo (mostrar apenas icone + nome truncado 80px)
- Modal NfValidationDialog: max-w-2xl, layout empilhado (PDF acima, dados abaixo)
```

### 10.3 Desktop (1024px+)

Conforme wireframe principal (secao 2.1). Split 50/50 no modal.

---

## 11. Interacoes e Animacoes

### 11.1 Transicoes de Status

Quando uma NF muda de status (confirmada/rejeitada), a linha da tabela:

```
1. Linha recebe bg temporario de 600ms:
   confirmed: bg-green-50 dark:bg-green-950/30
   rejected: bg-red-50 dark:bg-red-950/30
2. Badge de status faz crossfade para novo status
3. Linha desaparece suavemente (se filtro ativo nao inclui o novo status)
   animate: height 0 + opacity 0, duration 300ms ease-in
```

### 11.2 Filtros

```
Aplicar filtro: tabela faz fade-out/fade-in (opacity, 150ms)
Chips de filtro: slide-in from left (150ms ease-out)
Remover chip: slide-out to left + fade (150ms)
```

### 11.3 Modal

```
Abrir: overlay fade 150ms + dialog scale 0.95->1 150ms ease-out
Fechar: overlay fade-out + dialog scale 1->0.95 100ms ease-in
Transicao entre tabs (dados/preview): nao ha tabs — split layout estatico
```

### 11.4 Bulk Actions Bar

```
Aparecer: slide-up from bottom + fade-in (200ms ease-out)
Desaparecer: slide-down + fade-out (150ms ease-in)
```

---

## 12. Acessibilidade

### 12.1 Navegacao por Teclado

```
Tab: foca sequencialmente em filtros -> linhas da tabela -> paginacao
Na linha da tabela:
  Enter / Space: abre NfValidationDialog para a NF em foco
  Escape: fecha modal
No modal:
  Tab: cicla entre campos editaveis -> botoes
  Enter no campo: move para proximo campo
  Escape: fecha modal
```

### 12.2 ARIA

```
Tabela:
  role="grid" no elemento table
  aria-label="Lista de NFs recebidas"
  aria-sort="descending" na coluna ativa de ordenacao

Modal NfValidationDialog:
  role="dialog"
  aria-modal="true"
  aria-labelledby="nf-validation-title"

Iframe PDF:
  title="Preview do PDF: {nome-do-arquivo}"

Status badge:
  aria-label="Status: Pendente" (nao confiar apenas na cor)

Botao de acao inline:
  aria-label="Validar NF: {nome-do-arquivo}"
```

### 12.3 Contraste

```
Texto primario sobre surface: 16.1:1 (WCAG AAA)
Badge amber (texto amber-700 em bg amber-100 light): 4.6:1 (AA)
Badge blue (texto blue-700 em bg blue-100 light): 4.8:1 (AA)
Dot de status: nao usado isoladamente — sempre acompanhado de texto
```

---

## 13. Tokens de Referencia Rapida

```
CORES
  Surface card:        bg-white dark:bg-zinc-900
  Border card:         border-zinc-200 dark:border-zinc-800
  Table header bg:     bg-zinc-50 dark:bg-zinc-900
  Table row hover:     bg-zinc-50 dark:bg-zinc-800/50
  Accent (CTA):        bg-rose-600 dark:bg-rose-400 text-white
  Accent hover:        bg-rose-700 dark:bg-rose-500

  NF status:
    pending_review:    text-amber-700 bg-amber-100  dark: text-amber-400 bg-amber-500/10
    auto_matched:      text-blue-700  bg-blue-100   dark: text-blue-400  bg-blue-500/10
    confirmed:         text-green-700 bg-green-100  dark: text-green-400 bg-green-500/10
    rejected:          text-red-700   bg-red-100    dark: text-red-400   bg-red-500/10

TIPOGRAFIA
  Page title:          text-2xl font-semibold tracking-tight
  Card number:         text-3xl font-bold
  Card label:          text-xs font-medium uppercase tracking-wide text-zinc-500
  Table header:        text-xs font-medium uppercase tracking-wide text-zinc-500
  Table cell:          text-sm text-zinc-700 dark:text-zinc-300
  Valor monetario:     font-mono text-sm
  Caption / meta:      text-xs text-zinc-500

ESPACAMENTO
  Page padding:        px-6 py-6 (desktop) | px-4 py-4 (mobile)
  Stats grid gap:      gap-4 (desktop) | gap-3 (mobile)
  Section gap:         mt-6 entre stats e filtros, mt-4 entre filtros e tabela
  Card padding:        p-5

COMPONENTES SHADCN/UI USADOS
  Card, CardContent
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle
  Sheet, SheetContent (mobile modal)
  Select, SelectTrigger, SelectContent, SelectItem
  Input
  Button
  Badge
  Checkbox
  DropdownMenu, DropdownMenuContent, DropdownMenuItem
  Tooltip, TooltipContent
  Skeleton
  AlertDialog, AlertDialogContent (confirmacao rejeitar)
  Pagination
```
