# Spec Visual: Pedido de NF (/financial/nf-request)

**Data:** 2026-02-25
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Fase:** 9.3 - Envio de Pedido de NF
**Design System:** docs/design/design-system.md
**Arquitetura:** docs/architecture/fase-9-automacoes-architecture.md (secao 6.2)
**Spec:** docs/specs/fase-9-automacoes-spec.md

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Layout Geral](#2-layout-geral)
3. [Painel Esquerdo - FinancialRecordPicker](#3-painel-esquerdo---financialrecordpicker)
4. [Toolbar Flutuante de Selecao](#4-toolbar-flutuante-de-selecao)
5. [Painel Direito - NfEmailPreview](#5-painel-direito---nfemailpreview)
6. [Modal de Confirmacao (NfRequestConfirmDialog)](#6-modal-de-confirmacao-nfrequestconfirmdialog)
7. [Estados: Loading, Empty, Success, Error](#7-estados-loading-empty-success-error)
8. [Agrupamento por Fornecedor](#8-agrupamento-por-fornecedor)
9. [Responsividade](#9-responsividade)
10. [Interacoes e Animacoes](#10-interacoes-e-animacoes)
11. [Acessibilidade](#11-acessibilidade)
12. [Tokens de Referencia Rapida](#12-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

A pagina `/financial/nf-request` permite que o setor financeiro selecione despesas registradas (sem NF) e solicite a nota fiscal correspondente via email automatico. O fluxo e iniciado pelo usuario (pull), diferente do fluxo de recebimento (push automatico via Gmail polling).

**Quem usa:** Financeiro, produtor-executivo.
**Quando usa:** Apos registrar custos de terceiros (diarias, aluguel, servicos), para pedir a NF para o fornecedor.
**O que precisa entregar:**
- Selecao rapida de multiplas despesas por fornecedor
- Preview real do email antes de enviar
- Confirmacao clara antes de disparar

**Referencias de UX:** Linear (split view clean), Monday.com (bulk select com toolbar), Notion (preview ao lado do formulario).

---

## 2. Layout Geral

### 2.1 Desktop (1280px+)

Layout split 60/40: picker a esquerda (lista de lancamentos), preview do email a direita.

```
+------------------------------------------------------------------+
|  TOPBAR (h-14, fixed top-0, z-50)                                |
+--------+---------------------------------------------------------+
|        |                                                         |
| SIDE   |  PAGE HEADER                                            |
| BAR    |  +---------------------------------------------------+  |
| w-64   |  | Pedir NF                [? Como funciona]         |  |
|        |  | Financeiro > NFs > Pedir NF                       |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  SPLIT LAYOUT (gap-6, h-[calc(100vh-160px)])           |
|        |  +---------------------------+---------------------+   |
|        |  |  PAINEL ESQUERDO (60%)   |  PAINEL DIREITO (40%)|   |
|        |  |                          |                      |   |
|        |  |  FinancialRecordPicker   |  NfEmailPreview      |   |
|        |  |                          |                      |   |
|        |  |  [busca] [job] [fornec.] |  Para: [email]       |   |
|        |  |  ----------------------- |  Assunto: [_______]  |   |
|        |  |  [ ] descricao  job  val |                      |   |
|        |  |  [ ] ...                 |  [iframe preview]    |   |
|        |  |  [ ] ...                 |                      |   |
|        |  |                          |  [Mensagem custom]   |   |
|        |  |  (paginacao)             |                      |   |
|        |  +---------------------------+---------------------+   |
|        |                                                         |
|        |  TOOLBAR FLUTUANTE (quando ha selecao)                  |
|        |  +---------------------------------------------------+  |
|        |  |  5 itens selecionados  R$ 2.350,00  [Pedir NF]   |  |
|        |  +---------------------------------------------------+  |
+--------+---------------------------------------------------------+
```

### 2.2 Hierarquia Visual

```
H1: "Pedir NF" — heading-1 (24px semi)
Breadcrumb: Financeiro > NFs > Pedir NF — caption muted
Instrucao: body-sm text-zinc-500 abaixo do titulo
  "Selecione os lancamentos e envie um pedido de NF para o fornecedor."
```

### 2.3 Separador dos Paineis

```
Divisor vertical: border-r 1px zinc-200 dark:zinc-800
Resize: nao suportado (layout fixo 60/40)
```

---

## 3. Painel Esquerdo - FinancialRecordPicker

### 3.1 Estrutura

```
PAINEL ESQUERDO
+-------------------------------------------+
|  FILTROS                                   |
|  [  buscar descricao/fornecedor  ] [clear] |
|  [Job v] [Fornecedor v] [Tipo v]           |
|-------------------------------------------|
|  CHIPS DE FILTRO (se ativos)               |
|  [job: BBB_038 x] [fornec: Uber x]         |
|-------------------------------------------|
|  SELECT ALL / DESELECT ALL                 |
|  [checkbox] Selecionar todos (47 itens)    |
|  |  GRUPOS POR FORNECEDOR                  |
|  |  +-------------------------------------+|
|  |  | FORNECEDOR: UBER BRASIL (3 itens)   ||
|  |  | [checkbox] Selecionar todos Uber    ||
|  |  |  [ ] Uber equipe    038  R$ 350,00  ||
|  |  |  [ ] Uber set day 1 038  R$ 120,00  ||
|  |  |  [ ] Uber cliente   039  R$ 95,00   ||
|  |  +-------------------------------------+|
|  |  +-------------------------------------+|
|  |  | FORNECEDOR: 99 TAXI (2 itens)       ||
|  |  | [checkbox] Selecionar todos 99 Taxi ||
|  |  |  [ ] 99 producao    038  R$ 200,00  ||
|  |  |  [ ] 99 reuniao     039  R$ 45,00   ||
|  |  +-------------------------------------+|
|-------------------------------------------|
|  paginacao (se >20 itens)                  |
+-------------------------------------------+
```

### 3.2 Filtros do Picker

| Elemento | Componente | Comportamento |
|----------|-----------|---------------|
| Busca | `Input` com icone `Search` 16px | debounce 300ms, busca em descricao + fornecedor |
| Job | `Select` | lista de jobs com financial_records sem NF |
| Fornecedor | `Select` com busca interna | lista de fornecedores dos registros filtrados |
| Tipo | `Select` | opcoes: Todos, Servicos, Diarias, Aluguel, Outros |
| Limpar | `Button` ghost xs, icone `FilterX` | visivel apenas com filtros ativos |

### 3.3 Agrupamento por Fornecedor (Header de Grupo)

```
Header de grupo:
  bg: zinc-50 dark:bg-zinc-800/60
  padding: px-3 py-2
  h: 36px
  border-top: 1px zinc-200 dark:zinc-700 (exceto primeiro grupo)

  Conteudo:
    [checkbox indeterminado/checked]  nome do fornecedor (uppercase, 12px tracking-wide)
    badge (xs, outline): "3 itens"
    valor total do grupo: R$ 565,00 (font-mono, text-sm, text-zinc-600, ml-auto)
```

### 3.4 Linha do Financial Record

```
Linha:
  h: 44px
  padding: px-3 py-2
  hover: bg-zinc-50 dark:bg-zinc-800/50
  selecionado: bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-400

  Layout da linha:
    [checkbox 16px]  [descricao (flex-1, truncate)]  [job badge]  [valor]  [badge status NF]

  Descricao: text-sm text-zinc-800 dark:text-zinc-200 (truncate com tooltip)
  Job badge: inline xs outline — codigo do job (ex: "038")
  Valor: text-sm font-mono text-right text-zinc-700 dark:text-zinc-300  w-[80px]
  Status NF: badge xs (sem_nf = "Sem NF" amber, enviado = "Enviado" blue)
```

### 3.5 Regra de Selecao Multi-fornecedor

Quando o usuario seleciona itens de **fornecedores diferentes**, o sistema exibe um alerta na toolbar (ver secao 4) e o botao "Pedir NF" fica em estado de aviso (nao desabilitado — mas mostra confirmacao diferente).

```
Logica:
  - 1 fornecedor selecionado: 1 email, botao normal
  - N fornecedores: N emails (1 por fornecedor), botao mostra "Enviar X emails"
  - Nenhum item: botao desabilitado
```

---

## 4. Toolbar Flutuante de Selecao

Aparece no bottom da tela quando 1 ou mais itens estao selecionados.

### 4.1 Wireframe — 1 fornecedor

```
+-------------------------------------------------------+
|  5 itens selecionados · Uber Brasil · R$ 2.350,00    |
|                                      [Pedir NF]       |
+-------------------------------------------------------+
```

### 4.2 Wireframe — multiplos fornecedores

```
+-------------------------------------------------------+
|  8 itens · 3 fornecedores · R$ 4.120,00              |
|  [AlertTriangle] 3 emails serao enviados              |
|                          [Cancelar] [Enviar 3 emails] |
+-------------------------------------------------------+
```

### 4.3 Estilo

```
Posicao: fixed bottom-6 left-[calc(50%+128px)] (compensar sidebar 256px) -translate-x-1/2
  (em tablet/mobile: fixed bottom-[72px] left-4 right-4 — acima do bottom nav)
bg: zinc-900 dark:bg-zinc-100
text: zinc-50 dark:bg-zinc-900
rounded-xl px-5 py-3 shadow-2xl
border: 1px zinc-700 dark:zinc-300

Layout: flex items-center justify-between gap-6
min-w: 400px (desktop) | auto (mobile, full width)

Informacoes:
  Contador itens: text-sm font-medium
  Fornecedor (1): text-sm text-zinc-400 dark:text-zinc-500
  Valor total: text-sm font-mono font-semibold
  Multi-fornecedor warning: [AlertTriangle 14px amber] texto xs amber-300 dark:amber-600

Botoes na toolbar:
  Cancelar: ghost sm (texto zinc-400, hover zinc-200)
  Pedir NF / Enviar X emails: primary sm (rose bg)
    loading state: Loader2 spin + "Enviando..."
```

---

## 5. Painel Direito - NfEmailPreview

### 5.1 Estrutura

```
PAINEL DIREITO
+--------------------------------------+
|  CABECALHO DO PREVIEW                |
|  Para:    fornecedor@empresa.com     |
|  Assunto: [Pedido de NF - Uber ___] |
|                                      |
|  PREVIEW HTML (iframe sandbox)       |
|  +----------------------------------+|
|  |  [logo Ellah Filmes]             ||
|  |  Prezados,                       ||
|  |  Segue relacao de servicos...    ||
|  |                                  ||
|  |  [tabela: desc | valor | data]   ||
|  |                                  ||
|  |  Total: R$ 2.350,00             ||
|  |                                  ||
|  |  Atenciosamente,                 ||
|  |  [nome do responsavel]           ||
|  +----------------------------------+|
|                                      |
|  MENSAGEM CUSTOM (expansivel)        |
|  [  adicionar mensagem opcional... ] |
+--------------------------------------+
```

### 5.2 Cabecalho do Preview

```
Secao: padding px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b zinc-200 dark:zinc-700

Linha "Para:":
  label: text-xs font-medium text-zinc-500 w-[60px]
  valor: text-sm text-zinc-800 dark:text-zinc-200 (email do fornecedor)
  botao editar: ghost xs, icone Pencil 12px (ao hover da linha)

Linha "Assunto:":
  label: text-xs font-medium text-zinc-500 w-[60px]
  input: Input variant ghost (sem borda visivel, borda aparece no focus)
  placeholder: "Pedido de NF - {nome_fornecedor}"
  text-sm

Linha "CC:" (opcional, expansivel):
  [+ Adicionar CC]  ghost xs text-zinc-400
```

### 5.3 Iframe de Preview HTML

```
Iframe:
  width: 100%
  flex-1 (ocupa espaco disponivel)
  min-height: 300px
  sandbox="allow-same-origin"
  border: 1px solid zinc-200 dark:zinc-700
  bg: white (independente do tema — email e sempre claro)
  border-radius: rounded-md

Conteudo do iframe:
  gerado via template HTML (Edge Function retorna HTML string)
  atualiza automaticamente quando selecao de itens muda (debounce 500ms)

Estado: sem itens selecionados:
  iframe substituido por placeholder:
  bg: zinc-50 dark:zinc-800 rounded-md
  [Mail 40px text-zinc-300 centralizado]
  texto: "Selecione lancamentos para ver o preview do email"
  text-sm text-zinc-400 text-center
```

### 5.4 Campo Mensagem Custom

```
Secao: padding px-4 py-3 border-t zinc-200 dark:zinc-700

Label: text-xs font-medium text-zinc-500 "MENSAGEM ADICIONAL (OPCIONAL)"

Textarea:
  placeholder: "Adicione uma mensagem personalizada ao email..."
  rows: 3 (auto-resize, max 6)
  font: text-sm
  resize: none
  borda: zinc-200 dark:zinc-700, focus ring rose

Counter de caracteres: text-xs text-zinc-400 text-right mt-1 "0 / 500"
```

### 5.5 Estado de Carregamento do Preview

```
Enquanto aguarda resposta da Edge Function (preview gerado server-side):
  iframe area: skeleton animado
  no centro: [Loader2 animate-spin 20px text-rose-400]
  texto: text-xs text-zinc-400 "Gerando preview..."
```

---

## 6. Modal de Confirmacao (NfRequestConfirmDialog)

Abre ao clicar "Pedir NF" na toolbar flutuante. Ultima chance de revisar antes de enviar.

### 6.1 Wireframe — 1 fornecedor

```
+------------------------------------------+
|  Confirmar Pedido de NF            [X]   |
+------------------------------------------+
|  Voce esta prestes a enviar um email     |
|  de solicitacao de NF.                   |
|                                          |
|  +--------------------------------------+|
|  |  Para:    fornecedor@uber.com        ||
|  |  Itens:   5 lancamentos              ||
|  |  Total:   R$ 2.350,00               ||
|  |  Fornec.: Uber Brasil                ||
|  +--------------------------------------+|
|                                          |
|  ITENS INCLUIDOS                         |
|  · Uber equipe        R$ 350,00         |
|  · Uber set day 1     R$ 120,00         |
|  · Uber cliente       R$ 95,00          |
|  · ... (2 mais)       R$ 1.785,00       |
|                                          |
+------------------------------------------+
|  [Cancelar]         [Confirmar e Enviar] |
+------------------------------------------+
```

### 6.2 Wireframe — multiplos fornecedores

```
+------------------------------------------+
|  Confirmar Envio de 3 Emails       [X]   |
+------------------------------------------+
|  Serao enviados 3 emails, um para cada   |
|  fornecedor com seus respectivos itens.  |
|                                          |
|  EMAIL 1: Uber Brasil (5 itens)          |
|  Para: contato@uber.com.br              |
|  Total: R$ 2.350,00                     |
|  ·····                                   |
|                                          |
|  EMAIL 2: 99 Taxi (2 itens)             |
|  Para: nfe@99app.com                    |
|  Total: R$ 245,00                       |
|  ·····                                   |
|                                          |
|  EMAIL 3: Hotel Plaza (1 item)          |
|  Para: financeiro@hotel.com             |
|  Total: R$ 1.200,00                     |
|  ·····                                   |
|                                          |
+------------------------------------------+
|  [Cancelar]      [Enviar 3 emails]       |
+------------------------------------------+
```

### 6.3 Estilo do Dialog

```
Dialog: max-w-md (448px)
Overlay: bg-black/50 backdrop-blur-sm
Animacao: scale + fade 150ms ease-out

Card de resumo (1 fornecedor):
  bg: zinc-50 dark:bg-zinc-800
  border: 1px zinc-200 dark:zinc-700
  rounded-md p-4
  grid 2 colunas: label (text-xs text-zinc-500) | valor (text-sm font-medium)
  gap-y: 2 (8px entre linhas)

Lista de itens:
  max-h: 120px overflow-y-auto (scroll se muitos itens)
  item: text-sm text-zinc-700 dark:text-zinc-300
  valor: font-mono text-right

Separador entre emails (multi-fornecedor):
  border-t zinc-200 dark:zinc-700 mt-4 pt-4

Botao confirmar:
  primary (rose) — texto "Confirmar e Enviar" / "Enviar {N} emails"
  loading: Loader2 spin + "Enviando..."
  disabled durante loading
  largura: w-auto (auto, nao full)
```

---

## 7. Estados: Loading, Empty, Success, Error

### 7.1 Loading State (carregamento inicial da lista)

```
Painel esquerdo:
  Filtros: exibidos normalmente
  Lista: 8 linhas skeleton (h-11 each)
    cada linha: 3 blocos (larguras: flex-1, 60px, 80px), animate-pulse zinc-200/zinc-800

Painel direito:
  Cabecalho: skeleton 2 linhas
  Iframe area: skeleton rounded-md
```

### 7.2 Empty State (sem financial_records sem NF)

```
Painel esquerdo vazio:
  Container: flex-col items-center justify-center py-16

  [Receipt 48px text-zinc-300]
  "Todos em dia!"                    heading-3 mt-4
  "Nao ha lancamentos aguardando    body-sm text-zinc-500 mt-2 text-center
  nota fiscal."
  [Ver Lancamentos]                  Button outline mt-6
                                     (link para /financial)
```

### 7.3 Empty State (com filtros, sem resultados)

```
[SearchX 48px text-zinc-300]
"Nenhum lancamento encontrado"     heading-3
"Tente ajustar os filtros."        body-sm text-zinc-500
[Limpar filtros]                   Button outline mt-6
```

### 7.4 Success State (apos envio)

```
Fluxo:
  1. Modal de confirmacao: botao muda para loading + "Enviando..."
  2. Request bem-sucedido:
     a. Modal fecha (200ms ease-in)
     b. Toast Sonner: success "Pedido enviado para Uber Brasil" (4s)
        (se multi: "3 pedidos de NF enviados com sucesso")
     c. Itens enviados recebem badge "Enviado" (blue) e ficam desmarcados
     d. Toolbar flutuante desaparece (slide-down 200ms)
     e. Refresh da lista (recarrega financial_records)
```

### 7.5 Error State (falha no envio)

```
Modal de confirmacao permanece aberto com:
  Banner de erro (inline, acima dos botoes):
    bg: red-50 dark:red-950/30
    border: 1px red-200 dark:red-800
    rounded-md px-4 py-3
    [XCircle 16px red-500] "Falha ao enviar. Tente novamente."
    texto-xs: mensagem tecnica do erro

  Botao confirmar volta ao estado normal (nao loading)
  Botao cancelar permanece disponivel
```

---

## 8. Agrupamento por Fornecedor

### 8.1 Logica de Agrupamento

Os `financial_records` sao agrupados por `supplier_name` (ou `supplier_cnpj` como chave secundaria). Registros sem fornecedor vao para grupo "Sem fornecedor".

### 8.2 Ordenacao dos Grupos

```
1. Grupos com maior valor total primeiro
2. Dentro do grupo: lancamentos mais recentes primeiro
```

### 8.3 Checkbox Indeterminado

Quando apenas alguns itens do grupo estao selecionados:

```
Checkbox do header do grupo:
  estado: indeterminate (traco no meio)
  aria-checked: "mixed"
  ao clicar: seleciona TODOS os itens do grupo
  se todos ja selecionados: desmarca todos
```

### 8.4 Badge de Contagem no Header do Grupo

```
[nome do fornecedor]          [badge: N itens]     R$ valor total
UBER BRASIL                   [3 itens]            R$ 565,00
```

---

## 9. Responsividade

### 9.1 Mobile (<768px)

No mobile, o split layout nao cabe. O fluxo vira **duas telas sequenciais**:

```
TELA 1 - PICKER (full screen):
+------------------------+
|  Pedir NF    [Preview] |
|  Financeiro > NFs      |
+------------------------+
| [busca] [filtros]      |
+------------------------+
| UBER BRASIL (3 itens)  |
|  [ ] Uber equipe R$350 |
|  [ ] Uber set1   R$120 |
|  [ ] Uber cliente R$95 |
+------------------------+
| 99 TAXI (2 itens)      |
|  [ ] 99 prod     R$200 |
|  [ ] 99 reuniao  R$45  |
+------------------------+

TOOLBAR BOTTOM (quando ha selecao):
+------------------------+
|  5 itens · R$ 2.350   |
|             [Pedir NF] |
+------------------------+
```

```
TELA 2 - PREVIEW (sheet/modal bottom):
Abre ao clicar em "Preview" no header OU ao clicar "Pedir NF":

Sheet from bottom, h-[85vh]
  Handle: barra cinza centralizada 36px wide, h-1
  Cabecalho: Para / Assunto
  iframe preview: h-[300px]
  Mensagem custom: textarea
  [Confirmar e Enviar]: botao primario full-width no bottom
```

**Regras mobile:**
- Botao "Preview" no header (right side) abre o sheet de preview
- Nao ha split — picker ocupa tela inteira
- Sheet do preview tem handle para fechar (swipe down)
- Toolbar flutuante fica acima do bottom nav (bottom-[76px])

### 9.2 Tablet (768px-1023px)

```
Split layout: 55/45 (ligeiramente mais espaco para o picker)
Picker: scroll horizontal nos filtros se necessario
Preview: iframe com min-height 250px
Modal de confirmacao: max-w-sm (384px)
```

### 9.3 Desktop (1024px+)

Conforme wireframe principal (secao 2.1). Split 60/40.

---

## 10. Interacoes e Animacoes

### 10.1 Selecao de Itens

```
Clicar checkbox:
  bg da linha: fade zinc->rose-50 (100ms)
  toolbar: slide-up from bottom se era 0 itens (200ms ease-out)
  total na toolbar: contador anima (crossfade numerico)

Desmarcar checkbox:
  bg da linha: fade rose-50->zinc (100ms)
  se chegar a 0 itens: toolbar slide-down (150ms ease-in)
```

### 10.2 Atualizacao do Preview

```
Quando selecao muda:
  1. Iframe area recebe skeleton overlay (fade-in 100ms)
  2. Request debounce 500ms
  3. Novo HTML carregado no iframe
  4. Skeleton fade-out (100ms)

Animacao: nao usar transicoes dentro do iframe (HTML gerado pelo servidor)
```

### 10.3 Agrupamento Colapsavel (opcional, P2)

```
Header do grupo: ao clicar no nome do fornecedor (nao no checkbox):
  toggle: colapsa/expande a lista de itens do grupo
  icone: ChevronDown / ChevronUp (transicao rotate 200ms)
  animacao: height 0 <-> auto com overflow hidden (200ms ease-out)
```

---

## 11. Acessibilidade

### 11.1 Navegacao por Teclado

```
Tab: filtros -> checkbox "selecionar todos" -> grupos -> linhas
Na linha:
  Space: toggle checkbox
  Enter: abre preview do lancamento (se hover revela botao "ver")
Na toolbar:
  Tab: foca no botao "Pedir NF"
  Enter / Space: abre modal de confirmacao
No modal:
  Escape: fecha
  Tab: cicla entre botoes
  Enter no botao "Confirmar": submete
```

### 11.2 ARIA

```
Lista principal:
  role="list" (nao e tabela — e lista agrupada)
  aria-label="Lancamentos sem nota fiscal"

Header de grupo (fornecedor):
  role="group"
  aria-labelledby="{id-do-header}"

Checkbox do grupo:
  aria-label="Selecionar todos os itens de {nome_fornecedor}"
  aria-checked="true" | "false" | "mixed"

Checkbox da linha:
  aria-label="Selecionar: {descricao} - R$ {valor}"

Toolbar flutuante:
  role="status"
  aria-live="polite"
  aria-label="{N} itens selecionados, total R$ {valor}"

Modal de confirmacao:
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-nf-title"

Iframe de preview:
  title="Preview do email para {fornecedor}"
```

### 11.3 Contraste

```
Texto de linha selecionada (rose-50 bg, zinc-800 text): 12.1:1 (AAA)
Badge "Sem NF" (amber-700 em amber-100): 4.6:1 (AA)
Badge "Enviado" (blue-700 em blue-100): 4.8:1 (AA)
Texto do toolbar (zinc-50 em zinc-900): 19.7:1 (AAA)
```

---

## 12. Tokens de Referencia Rapida

```
CORES
  Surface painel:       bg-white dark:bg-zinc-950
  Divisor:              border-zinc-200 dark:border-zinc-800
  Header grupo:         bg-zinc-50 dark:bg-zinc-800/60
  Linha selecionada:    bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-400
  Linha hover:          bg-zinc-50 dark:bg-zinc-800/50
  Toolbar bg:           bg-zinc-900 dark:bg-zinc-100
  Toolbar text:         text-zinc-50 dark:text-zinc-900
  Preview frame:        bg-white (sempre, email e claro)

  Status NF badges:
    sem_nf:  text-amber-700 bg-amber-100  dark: text-amber-400 bg-amber-500/10
    enviado: text-blue-700  bg-blue-100   dark: text-blue-400  bg-blue-500/10

TIPOGRAFIA
  Page title:           text-2xl font-semibold tracking-tight
  Group header label:   text-xs font-medium uppercase tracking-wide
  Group total:          text-sm font-mono
  Row description:      text-sm text-zinc-800 dark:text-zinc-200
  Row value:            text-sm font-mono text-right
  Caption:              text-xs text-zinc-500
  Toolbar counter:      text-sm font-medium
  Toolbar total:        text-sm font-mono font-semibold

ESPACAMENTO
  Page padding:         px-0 (split usa full-height sem padding lateral na area de split)
  Page header:          px-6 py-4
  Picker padding:       px-4 (filtros) / px-0 (lista — grupos tocam as bordas)
  Preview padding:      px-4 py-4
  Row padding:          px-3 py-2
  Group header:         px-3 py-2
  Toolbar padding:      px-5 py-3

COMPONENTES SHADCN/UI USADOS
  Card, CardContent (stats area se necessario)
  Table -> substituido por lista customizada (agrupamento)
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle
  Sheet, SheetContent (mobile preview)
  Select, SelectTrigger, SelectContent, SelectItem
  Input, Textarea
  Button
  Badge
  Checkbox
  Tooltip, TooltipContent
  Skeleton
  Separator
  ScrollArea (lista agrupada)
```
