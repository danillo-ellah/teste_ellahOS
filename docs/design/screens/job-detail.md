# Spec Visual: Detalhe do Job (/jobs/[id])

**Data:** 2026-02-18
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Sub-fase:** 3.5 (Header + Pipeline + Tabs)
**Design System:** docs/design/design-system.md
**Contexto anterior:** docs/design/screens/jobs-dashboard-v2.md

---

## Indice

1. [Visao Geral da Pagina](#1-visao-geral-da-pagina)
2. [JobHeader (sticky)](#2-jobheader-sticky)
3. [JobStatusPipeline](#3-jobstatuspipeline)
4. [StatusChangeDropdown](#4-statuschangedropdown)
5. [SyncIndicator](#5-syncindicator)
6. [Estrutura de Tabs](#6-estrutura-de-tabs)
7. [Estados: Loading, Error, NotFound](#7-estados-loading-error-notfound)
8. [Responsividade](#8-responsividade)
9. [Animacoes e Transicoes](#9-animacoes-e-transicoes)
10. [Acessibilidade](#10-acessibilidade)
11. [Tokens de Referencia Rapida](#11-tokens-de-referencia-rapida)
12. [Guia de Implementacao](#12-guia-de-implementacao)

---

## 1. Visao Geral da Pagina

### 1.1 Estrutura de Layout

A pagina `/jobs/[id]` ocupa o content area abaixo do topbar (h-14, fixo). O JobHeader e o Pipeline sao **sticky** juntos, formando um bloco que gruda no topo enquanto o usuario scrolla o conteudo das abas.

```
DESKTOP (1280px, sidebar expandida)

+-------------------------------------------------------------+
|  TOPBAR (h-14, fixed top-0, z-50)                          |
+-------------------------------------------------------------+
|  SIDEBAR  |  JOBHEADER (sticky top-14, z-40)               |
|  w-64     |  +-------------------------------------------+  |
|           |  | breadcrumb                                |  |
|           |  | [BBB_001] Titulo do Job        [acoes]    |  |
|           |  | status  prioridade  health  [sync]        |  |
|           |  +-------------------------------------------+  |
|           |  PIPELINE (dentro do sticky block)            |  |
|           |  +-------------------------------------------+  |
|           |  | [///] [///] [>>>] [   ] [   ] [   ] [   ] |  |
|           |  +-------------------------------------------+  |
|           |  TABS (sticky block termina aqui)             |  |
|           |  +-------------------------------------------+  |
|           |  | Geral | Equipe | Entreg. | Fin | Arq | H  |  |
|           |  +-------------------------------------------+  |
|           |  TAB CONTENT (scrolla normalmente)            |  |
|           |  +-------------------------------------------+  |
|           |  |                                           |  |
|           |  |  Conteudo da aba ativa                    |  |
|           |  |  (formularios - sub-fase 3.6)             |  |
|           |  |                                           |  |
|           |  +-------------------------------------------+  |
+-----------+-----------------------------------------------+--+
```

### 1.2 Z-index Stack

```
Topbar:          z-50  (fixed, sempre no topo)
JobHeader block: z-40  (sticky, abaixo do topbar)
Dropdowns:       z-50  (portais que sobem acima do sticky header)
Modals:          z-50  (overlay completo)
```

### 1.3 Altura Total do Bloco Sticky

```
Topbar:          56px  (h-14)
JobHeader:       72px  (variavel, ver secao 2.4)
Pipeline:        44px
Tabs:            44px
─────────────────────
Total sticky:   ~216px (referencia para calcular offset de scroll)
```

---

## 2. JobHeader (sticky)

### 2.1 Layout Desktop - ASCII Detalhado

```
+-------------------------------------------------------------------+
|  < Jobs  /  BBB_001                                               |  <- row 1: breadcrumb (h-7)
+-------------------------------------------------------------------+
|  [BBB_001]  Titulo Editavel do Job              [sync] [status▾] [•••]|  <- row 2: titulo + acoes (h-9)
|             📋 Pre-Producao  🔴 Alta   [■■■■░░] 87                |  <- row 3: badges + health (h-8)
+-------------------------------------------------------------------+
Total height: ~72px (pb-3)
```

### 2.2 Especificacao de Cada Elemento

#### 2.2.1 Container do Header

```
Element:    <header> ou <div role="banner">
Position:   sticky top-14 (top = altura do topbar)
Z-index:    z-40
BG light:   bg-white border-b border-border
BG dark:    bg-zinc-950 border-b border-zinc-800
Padding:    px-6 pt-3 pb-3 (desktop) | px-4 pt-3 pb-3 (mobile)
Shadow:     quando scrollado (JavaScript detecta scroll > 0):
            shadow: 0 1px 3px rgba(0,0,0,0.08) light
                    0 1px 3px rgba(0,0,0,0.3)  dark
            Transicao: shadow duration-200
```

#### 2.2.2 Breadcrumb (Row 1)

```
Layout:     flex items-center gap-1.5
Height:     h-7 (28px)
Font:       text-sm text-muted-foreground

Elementos:
  Link "Jobs":
    text-sm text-muted-foreground hover:text-foreground
    transition-colors duration-100
    Underline: nao (nao e texto longo)

  Separador "/":
    text-muted-foreground/40
    text-sm select-none
    mx-0.5

  JobCodeBadge (reutilizar componente existente):
    font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800
    text-zinc-600 dark:text-zinc-400
    px-1.5 py-0.5 rounded
    border border-zinc-200 dark:border-zinc-700
    Igual ao da tabela - REUSAR, nao reimplementar
```

#### 2.2.3 Titulo Editavel Inline (Row 2, posicao central)

O titulo e o elemento de maior hierarquia visual. Ele tem dois estados:

**Estado Idle (padrao):**

```
Elemento:   <h1> ou <span role="heading" aria-level="1">
Font:       text-xl font-semibold (heading-2 do design system: 20px/600)
Cor:        text-foreground
Max-w:      calc(100% - 200px) (deixa espaco para os botoes)
Overflow:   truncate
Cursor:     cursor-text (sinaliza que e editavel)
Hover:      underline decoration-dotted decoration-muted-foreground/40
            transition-all duration-100

Visual sutil de editavel:
  Nenhum icone Pencil visivel por default (cria ruido visual)
  Apenas o cursor-text e o underline pontilhado no hover
  Ao hover: aparecer icone Pencil (size-3.5, text-muted-foreground/50)
            inline apos o texto, com opacity-0 -> opacity-100 duration-150
```

**Estado Editing:**

```
Elemento:   <input type="text"> substituindo o h1
Width:      mesma largura que o h1 (auto-expand ate max-w)
Min-w:      200px
Font:       text-xl font-semibold (IDENTICO ao idle - sem mudanca visual brusca)
BG:         bg-transparent (sem caixa, integrado ao layout)
Border:     border-b-2 border-accent (rose) APENAS borda inferior
            sem borda lateral ou superior
            Isso cria a sensacao de "linha de edicao" sutil
Border-radius: 0 (sem radius - nao e um input tradicional)
Padding:    px-0 py-0 (sem padding extra, alinhado ao texto anterior)
Ring:       nenhum (nao usar o ring padrao do shadcn)
Outline:    none
Placeholder: titulo atual (pre-preenchido com valor atual)

Comportamento:
  - Click no titulo: seleciona todo o texto (select-all) e muda para editing
  - Enter: salva imediatamente via PATCH (sem debounce)
  - Escape: cancela, restaura valor anterior, volta para idle
  - Blur (foco fora): salva imediatamente via PATCH
  - Validacao: nao pode ser vazio; se vazio ao blur, restaura titulo anterior
                toast.warning('⚠️ O titulo nao pode ser vazio')
```

**ASCII dos dois estados:**

```
ESTADO IDLE:
  [BBB_001]  Campanha de Lancamento Verao 2026 Produto X  ✏  [sync] [Status▾] [•••]
                                                         ^--- icone aparece so no hover

ESTADO EDITING (click no titulo):
  [BBB_001]  Campanha de Lancamento Verao 2026 Produto X_    [sync] [Status▾] [•••]
                                               ^^^^^^^^^^^^^
                                               border-b-2 rose, texto selecionado
```

#### 2.2.4 Status Badge (Row 2, proximo ao menu)

```
Componente: StatusBadge (REUSAR do dashboard - com emojis, secao 14.5 da v2)
Funcao aqui: dupla - mostra status E e o trigger do StatusChangeDropdown

Estilo adicional para o header (diferente do badge da tabela):
  Tamanho: ligeiramente maior - text-xs -> text-sm (13px)
  Padding: px-2.5 py-1 (era px-2 py-0.5)
  Cursor:  cursor-pointer
  Hover:   anel sutil: ring-1 ring-current/30, border com cor mais forte
           transition: ring duration-100
  Arrow:   icone ChevronDown (size-3) apos o texto do badge
           gap-1.5 entre texto e chevron
           Cor do chevron: herda a cor do texto do badge
  Role:    button (para acessibilidade, e um botao que abre dropdown)

Layout no header:
  flex items-center gap-2 (com os outros elementos da row 2)
```

**ASCII do badge com dropdown trigger:**

```
  📋 Pre-Producao ˅           <- badge maior, com chevron, cursor-pointer
  ^^^^^^^^^^^^^^^^^
  click abre StatusChangeDropdown (secao 4)
```

#### 2.2.5 Badge de Prioridade (Row 2, ao lado do status)

```
Variantes:
  alta:   bg-red-100 text-red-700   | dark: bg-red-500/10 text-red-400
  media:  bg-yellow-100 text-yellow-700 | dark: bg-yellow-500/10 text-yellow-400
  baixa:  bg-zinc-100 text-zinc-600 | dark: bg-zinc-800 text-zinc-400

Icone Lucide:
  alta:   ArrowUp   (size-3, shrink-0)
  media:  Minus     (size-3, shrink-0)
  baixa:  ArrowDown (size-3, shrink-0)

Tamanho do badge:
  text-xs font-medium
  px-2 py-0.5
  rounded-full
  inline-flex items-center gap-1

Onde fica:
  Row 2 entre o titulo e o StatusBadge
  Ocultar em mobile (< md) quando header esta no estado compacto
  (ver secao 8)
```

#### 2.2.6 HealthBar Compacta (Row 2, apos prioridade)

```
Componente: HealthBar (REUSAR do dashboard)
  Adaptar para o contexto do header (nao e celula de tabela)

Layout no header:
  flex items-center gap-1.5

Barra:
  w-12 (48px) x h-1.5 (6px) - mais estreita que na tabela
  BG track: bg-muted/50
  Fill: cor por score (verde/amarelo/vermelho)
  radius: rounded-full

Numero:
  text-xs font-semibold
  Cor: por score:
    >= 70: text-green-600 dark:text-green-400
    >= 40: text-yellow-600 dark:text-yellow-400
    < 40:  text-red-600 dark:text-red-400

Tooltip ao hover:
  "Health Score: {score}/100"
  "Baseado em {N} membros na equipe"
  Delay: 400ms (shadcn Tooltip)
```

#### 2.2.7 Botao "Mudar Status" (Row 2, area de acoes)

```
Visibilidade: visivel em desktop (lg+), oculto em mobile
  (mobile: o StatusBadge clicavel substitui)

Variante: outline (secondary action - nao e o CTA principal)
Tamanho:  sm (h-8, px-3, text-sm)
Icone:    RefreshCw (size-3.5) a esquerda
Texto:    "Mudar Status"
Gap:      gap-1.5

Em mobile/tablet: o StatusBadge clicavel ja cumpre essa funcao
                  Este botao some em < lg para nao duplicar
```

#### 2.2.8 Menu 3 Pontos (Row 2, extrema direita)

```
Trigger:
  Botao ghost, size icon (h-8 w-8)
  Icone: MoreHorizontal (size-4) - nao MoreVertical
  aria-label: "Mais acoes"
  Posicao: ultimo elemento na row 2

Dropdown (DropdownMenu shadcn):
  Alinhamento: align="end" (abre para a esquerda)
  Width: w-48

  Itens:
  ┌──────────────────────────────┐
  │ 📋 Arquivar Job               │  <- Archive (size-4) + "Arquivar Job"
  ├──────────────────────────────┤
  │ ↗ Exportar PDF               │  <- ExternalLink + "Exportar PDF" (disabled Fase 3)
  ├──────────────────────────────┤
  │ 🔗 Copiar link               │  <- Link2 + "Copiar link do job"
  └──────────────────────────────┘

Itens do menu - especificacao visual:
  Height: h-9 por item
  Font:   text-sm
  Padding: px-2 py-1.5
  Icon:   size-4, mr-2, text-muted-foreground
  Hover:  bg-accent (zinc-100/800)

  "Arquivar Job":
    Ao clicar: ConfirmDialog (REUSAR componente existente)
    Titulo: "Arquivar este job?"
    Descricao: "O job ficara oculto da listagem principal. Voce pode restaura-lo a qualquer momento."
    Botao confirmar: "Arquivar" (destructive variant)
    Botao cancelar: "Cancelar"

  "Exportar PDF": disabled em Fase 3
    opacity-50, cursor-not-allowed
    tooltip: "Disponivel em breve"

  "Copiar link": copia URL atual para clipboard
    Sucesso: toast.success('✅ Link copiado para a area de transferencia')
```

### 2.3 Layout Desktop - ASCII Final Completo

```
DESKTOP (lg+, 1280px)

+------------------------------------------------------------------------+
| < Jobs  /  [BBB_001]                                                   |  h-7 (breadcrumb)
+------------------------------------------------------------------------+
| [BBB_001]  Campanha Lancamento Verao 2026 ✏  [💾 Salvo] [📋 Pre-Prod ˅] [•••] |  h-9
| (esquerda flex-1)                             (direita, gap-2)          |
+------------------------------------------------------------------------+
|  📋 Pre-Producao [badge]  🔴 Alta [badge]  [■■■░░] 87   [Mudar Status] |  h-8
+------------------------------------------------------------------------+
Total: ~72px (3*24px + paddings)
```

### 2.4 Alturas e Espacamentos Precisos

```
Container:
  padding-top:    pt-3 (12px)
  padding-bottom: pb-3 (12px)
  padding-x:      px-6 (24px desktop) | px-4 (16px mobile)
  border-bottom:  1px solid border

Row 1 (breadcrumb):
  height:   h-7 (28px)
  gap:      gap-1.5 (6px) entre elementos
  margin-bottom: mb-1.5 (6px) ate row 2

Row 2 (titulo + acoes):
  height:   h-9 (36px)
  Layout:   flex items-center justify-between
  Left:     flex items-center gap-2 (code badge + titulo)
  Right:    flex items-center gap-2 (sync + status + menu)
  margin-bottom: mb-1.5 (6px) ate row 3

Row 3 (badges meta):
  height:   h-8 (32px)
  Layout:   flex items-center gap-3
  gap:      gap-3 (12px) entre badge de status, prioridade e health
```

---

## 3. JobStatusPipeline

### 3.1 Status Lineares (12 segmentos)

O pipeline mostra a progressao linear do job. Cancelado e Pausado sao estados laterais - nao entram no fluxo principal.

```
ORDEM CRONOLOGICA (12 status):
  1.  briefing             💡 Briefing Recebido
  2.  orcamento_elaboracao 💰 Elaborando Orcamento
  3.  orcamento_enviado    💰 Orcamento Enviado
  4.  aguardando_aprovacao ⏳ Aguardando Aprovacao
  5.  aprovado             ✅ Aprovado
  6.  pre_producao         📋 Pre-Producao
  7.  producao_filmagem    🎬 Em Filmagem
  8.  pos_producao         ✂️ Pos-Producao
  9.  entrega              🚀 Em Entrega
  10. concluido            🏆 Concluido

  Especiais (NAO entram no pipeline linear):
  cancelado  🚫
  pausado    ⏸️ (se existir)
```

**Por que 10 e nao 12:** os dois status de orcamento (elaborando + enviado) formam um sub-grupo logico, mas ambos entram no pipeline pois o usuario precisa ver onde esta no processo. Cancelado e Pausado sao estados "fora da linha" e nao fazem sentido como passo sequencial.

### 3.2 Container do Pipeline

```
Element:    <nav aria-label="Pipeline de status">
Position:   parte do bloco sticky (sticky top-14, dentro do mesmo elemento pai do header)
Height:     h-11 (44px)
BG light:   bg-white (continua do header)
BG dark:    bg-zinc-950
Padding:    px-6 py-2
Border-bottom: 1px solid border
```

### 3.3 Visual de Cada Segmento

Cada status do pipeline e um segmento com tres estados possiveis:

#### Estado: Passado (filled)

```
Visual: barra preenchida solida + label visivel
BG:     cor do status com 20% opacidade
Border: none (sem borda, fundo ja comunica)
Texto:  emoji + label ABREVIADO (ver tabela de abreviacoes abaixo)
Font:   text-[10px] font-medium
Cor texto: cor do status (full opacity)
Height: h-7 (28px)

Exemplo (pre_producao passado):
  BG:   bg-blue-500/20
  Text: text-blue-600 dark:text-blue-400
  Label: "📋 Pre-Prod"
```

#### Estado: Atual (highlighted)

```
Visual: barra preenchida solida + label + indicador de atual
BG:     cor do status com 100% (mais saturado que passado)
Border: ring-1 ring-current/40 ring-offset-1
Texto:  emoji + label COMPLETO (status atual tem mais espaco)
Font:   text-[10px] font-semibold
Cor texto: branco se fundo e escuro, ou cor escura se fundo e claro
Height: h-7 (28px)
Border-radius: rounded-sm (4px) para o segmento atual se destacar

Regra de cor de texto:
  briefing/orcamentos/aguardando: cor de texto escura (fundo claro)
  aprovado/pre_producao/pos: cor de texto clara (fundo medio/escuro)
  producao/entrega/concluido: branco (fundo vibrante)
  -> Na pratica: usar text-white para todos com BG > 500 de saturacao
     Ajustar individualmente se necessario para contraste WCAG AA

Indicador "atual":
  Ponto pequeno piscando (animate-pulse) abaixo do segmento:
    w-1.5 h-1.5 rounded-full bg-current
    Posicao: absolute bottom-0.5 left-1/2 -translate-x-1/2
    Este ponto e o unico elemento animado no pipeline
```

#### Estado: Futuro (outlined)

```
Visual: barra transparente + borda fina + label opcional (hover only)
BG:     transparent
Border: 1px dashed zinc-300/50 dark:zinc-700/50
Texto:  oculto por default, aparece no hover
Font:   text-[10px] text-muted-foreground/50 (mais apagado)
Height: h-7 (28px)
Cursor: default (nao e clicavel para navegar)

Hover do segmento futuro:
  BG:    bg-muted/30
  Texto: aparece com cor do status em 60% opacidade
  Transicao: opacity duration-150
```

### 3.4 Layout do Pipeline - Connectors

Os segmentos sao separados por setas/conectores minimos:

```
Layout geral:
  flex items-center gap-0 (sem gap - os conectores ficam inline)
  width: 100%

Cada segmento:
  flex-1 (divide espaco igualmente entre os 10 segmentos)
  min-w: 0 (permite comprimir)

Conector entre segmentos:
  Elemento: <ChevronRight size-3 text-muted-foreground/30>
  Shrink-0: sim (nao comprime)
  Espacamento: margin 0 (fica entre os flex-1 itens)

Resultado visual:
  [💡 Brief] > [💰 Orc] > [💰 Env] > [⏳ Agd] > [✅ Apr] > [📋 PRE] > [🎬 FILM] > [✂️ POS] > [🚀 ENT] > [🏆 CONC]
   filled     filled     filled    filled    filled    ATUAL    futuro   futuro    futuro    futuro
```

### 3.5 Tabela de Labels Abreviados

Para caber nos segmentos (cada um tem ~90px em 1280px):

```
Status                  Label Completo              Label Abrev (pipeline)
─────────────────────────────────────────────────────────────────────────
briefing                💡 Briefing Recebido        💡 Brief.
orcamento_elaboracao    💰 Elaborando Orcamento     💰 Elabor.
orcamento_enviado       💰 Orcamento Enviado        💰 Env.
aguardando_aprovacao    ⏳ Aguardando Aprovacao     ⏳ Aguan.
aprovado                ✅ Aprovado                 ✅ Aprov.
pre_producao            📋 Pre-Producao             📋 Pre-Prod
producao_filmagem       🎬 Em Filmagem              🎬 Filmag.
pos_producao            ✂️ Pos-Producao             ✂️ Pos-Prod
entrega                 🚀 Em Entrega               🚀 Entrega
concluido               🏆 Concluido                🏆 Conclui.
```

Labels abreviados sao apenas para o pipeline. O StatusBadge no header usa o label completo.

### 3.6 Estado Especial: Job Cancelado ou Pausado

Quando o job esta cancelado ou pausado, o pipeline comporta-se diferente:

```
Job CANCELADO:
  Pipeline inteiro recebe opacity-40 (apagado)
  Barra extra no topo do pipeline container:
    bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400
    text-xs font-medium px-3 py-1
    "🚫 Este job foi cancelado"
    Se cancellation_reason preenchido: exibe em truncate apos o label
  O pipeline ainda e visivel (mostra onde estava antes de cancelar)

Job sem status valido (dado inconsistente, fallback):
  Pipeline renderiza sem nenhum segmento highlighted
  Toast de warning na pagina: "⚠️ Status do job nao reconhecido"
```

### 3.7 ASCII Mockup do Pipeline Completo

```
DESKTOP - Job em Pre-Producao (status = pre_producao):

px-6
|  [💡 Brief.]>[💰 Elab.]>[💰 Env.]>[⏳ Aguan.]>[✅ Aprov.]>[📋 Pre-Prod]>[🎬 Film.]>[✂️ Pos-P.]>[🚀 Entr.]>[🏆 Conc.]  |
    filled    filled     filled    filled     filled    ATUAL         outlined outlined  outlined  outlined
    blue/20   amber/20   amber/20  amber/20   green/20  blue-500 ring  ---       ---       ---       ---
    text-blue text-amber ...       ...        text-grn  text-white     muted     muted     muted     muted

                                                          ^
                                                     ponto piscando
                                                     (animate-pulse)
```

---

## 4. StatusChangeDropdown

### 4.1 Trigger

O dropdown e acionado pelo StatusBadge no header (secao 2.2.4) OU pelo botao "Mudar Status" (secao 2.2.7). Ambos abrem o mesmo dropdown.

```
Implementacao: shadcn DropdownMenu
Alinhamento:   align="start" (abre para a direita do trigger)
Width:          w-64 (256px)
Max-height:     max-h-[320px] overflow-y-auto (para quando houver scroll)
```

### 4.2 Layout dos Itens

```
+--------------------------------------------+
|  MUDAR STATUS                              |  <- header do dropdown (label overline)
+--------------------------------------------+
|  💡 Briefing Recebido                      |  <- item
|  💰 Elaborando Orcamento                   |
|  💰 Orcamento Enviado                      |
|  ⏳ Aguardando Aprovacao                   |
|  ✅ Aprovado                               |
+--------------------------------------------+
|  📋 Pre-Producao               ✓           |  <- item ATUAL com checkmark
+--------------------------------------------+
|  🎬 Em Filmagem                            |
|  ✂️ Pos-Producao                           |
|  🚀 Em Entrega                             |
|  🏆 Concluido                              |
+--------------------------------------------+
|  ─────────────────────────────             |  <- separador
|  ⏸️ Pausar Job                             |  <- status especiais (se houver)
|  🚫 Cancelar Job                           |
+--------------------------------------------+
```

### 4.3 Especificacao Visual de Cada Item

```
Item padrao:
  Height:     h-9 (36px)
  Layout:     flex items-center gap-2.5 px-3
  Emoji:      text-[13px] leading-none (w-5 text-center)
  Label:      text-sm text-foreground
  Checkmark:  Check size-3.5, ml-auto, text-primary (rose)
              visivel apenas no status atual
  Hover:      bg-accent (zinc-100/zinc-800)
  Transicao:  bg duration-100

Item ATUAL (checkmark visivel):
  Font:       font-medium
  Sem hover diferente (ja tem checkmark que identifica)

Dot colorido (alternativa ao emoji, nao usado aqui):
  DECISAO: usar emoji consistente com StatusBadge (secao 14 da v2)
  Nao adicionar dot - o emoji ja da contexto de cor e semantica

Header do dropdown ("MUDAR STATUS"):
  Font:       text-[10px] font-semibold uppercase tracking-widest
              (overline style do design system)
  Cor:        text-muted-foreground
  Padding:    px-3 py-2
  Nao e um item clicavel

Separador antes dos status especiais:
  <DropdownMenuSeparator /> (1px border-border)
  height: 1px margin: my-1
```

### 4.4 Hover States e Indicacao de Contexto

```
Todos os status sao clicaveis (sem indicacao de "transicao invalida").
Decisao de design: nao indicar transicoes invalidas visualmente.
  Motivo: a API aceita qualquer transicao (nao ha maquina de estados restritiva
  confirmada no backend). Bloquear na UI seria inconsistente se o backend aceitar.
  Se o backend rejeitar, toast de erro explica.

Status atual: cursor-default (nao e clicavel - previne re-selecionar o mesmo)
  Ou: clicavel mas sem efeito (fecha dropdown sem acao)
  DECISAO: cursor-default + nao disparar requisicao se mesmo status
```

### 4.5 Fluxo ao Selecionar um Status

```
1. Usuario clica em item do dropdown
2. Dropdown fecha (ux responsiva imediata)

3. SE novo status == "cancelado":
   -> Abre CancelReasonDialog (REUSAR componente existente)
   -> Dialog bloqueia: o status so muda apos motivo ser preenchido
   -> Se dialog cancelado (Escape ou X): status NAO muda, nada acontece

4. SE novo status == qualquer outro:
   -> Optimistic update IMEDIATO: StatusBadge no header troca para novo status
      Animacao: scale 0.95 -> 1.0 em 150ms ease-out (Framer Motion ou CSS)
   -> POST /functions/v1/jobs-status { action: "update-status", new_status: X }
   -> SE sucesso: toast.info('ℹ️ Status atualizado') duration 3s
   -> SE erro: rollback do optimistic update (volta ao status anterior)
               StatusBadge recebe animacao de "shake" sutil (translateX -2/+2 pixels, 200ms)
               toast.error('❌ Nao foi possivel atualizar o status') duration 8s

5. CancelReasonDialog (para status cancelado):
   Titulo:      "Cancelar este job?"
   Descricao:   "Esta acao nao pode ser desfeita facilmente. Informe o motivo."
   Campo:       textarea obrigatorio, min 10 chars
                label: "Motivo do cancelamento *"
                placeholder: "Ex: Cliente desistiu do projeto, orcamento nao aprovado..."
   Botao:       "Confirmar cancelamento" (destructive)
   Botao:       "Voltar" (secondary)
   Validacao:   botao confirmar disabled se campo vazio ou < 10 chars
```

---

## 5. SyncIndicator

### 5.1 Posicao no Header

```
Posicao: Row 2 do header, entre o titulo e o StatusBadge
  Ficou:   [titulo-editavel] ... [SyncIndicator] [StatusBadge▾] [•••]

Layout:   flex-shrink-0 (nao comprime com o titulo)
          flex items-center gap-1
```

### 5.2 Estados e Visual

O SyncIndicator tem 5 estados. Transicao entre estados: opacity 0->1, duration-200.

#### Estado: Idle (sem alteracoes pendentes)

```
Visual:     invisivel / nao renderizado
            Ou: espaco reservado mas vazio (para nao "pular" o layout)
Elemento:   <div className="w-24 h-5" /> (espaco em branco)
```

#### Estado: Pending (alteracao detectada, aguardando debounce)

```
Visual:
  Circulo:  w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 (laranja)
  Texto:    "Nao salvo"
  Font:     text-xs text-muted-foreground
  Layout:   flex items-center gap-1.5

ASCII:  🟠 Nao salvo
```

#### Estado: Saving (requisicao em andamento)

```
Visual:
  Icone:  Loader2 (size-3.5) animate-spin text-muted-foreground
  Texto:  "Salvando..."
  Font:   text-xs text-muted-foreground

ASCII:  ↻ Salvando...
        (icone girando)
```

#### Estado: Saved (sucesso, desaparece em 3 segundos)

```
Visual:
  Icone:  Check (size-3.5) text-green-500 dark:text-green-400
  Texto:  "Salvo"
  Font:   text-xs text-green-600 dark:text-green-400 font-medium

Comportamento:
  Aparece apos sucesso da API
  Permanece 3 segundos (setTimeout)
  Fade-out: opacity 1->0 em 500ms ease-out
  Apos fade: volta para estado Idle

ASCII:  ✓ Salvo
```

#### Estado: Error (falha na requisicao)

```
Visual:
  Icone:  AlertCircle (size-3.5) text-red-500
  Texto:  "Erro ao salvar"
  Link:   "Tentar novamente" (inline, text-xs text-accent underline)
  Font:   text-xs text-red-500 dark:text-red-400

Layout:   flex items-center gap-1.5

ASCII:  ⚠ Erro ao salvar  Tentar novamente
                           ^^^^^^^^^^^^^^^^
                           link clicavel (disparar retry)

Comportamento:
  Nao desaparece automaticamente
  Fica ate usuario clicar "Tentar novamente" ou fazer nova alteracao
  sessionStorage: salva rascunho com timestamp (US-F3-019)
```

### 5.3 Transicoes entre Estados

```
Implementar com estado local no componente:
  type SyncState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

Transicoes:
  idle -> pending:  quando form.watch() detecta alteracao
  pending -> saving: quando debounce (1.5s) dispara a requisicao
  saving -> saved:  quando API retorna 200
  saving -> error:  quando API retorna erro ou timeout
  saved -> idle:    3 segundos apos 'saved' (setTimeout)
  error -> pending: quando usuario faz nova alteracao apos erro
  error -> saving:  quando usuario clica "Tentar novamente"

Animacao entre estados:
  Usar Framer Motion AnimatePresence para animar entrada/saida
  Cada estado monta/desmonta com:
    initial:  { opacity: 0, x: -4 }
    animate:  { opacity: 1, x: 0 }
    exit:     { opacity: 0, x: 4 }
    transition: { duration: 0.15, ease: 'easeOut' }
```

---

## 6. Estrutura de Tabs

### 6.1 As 6 Abas

```
Ordem:  1. Geral      2. Equipe     3. Entregaveis
        4. Financeiro 5. Arquivos   6. Historico

Implementacao: shadcn Tabs (base)
Rota:          a aba ativa reflete na URL como query param ?tab=geral
               (nao como sub-rota, para nao causar full-page reload)
               Default: ?tab=geral (ou sem param = geral)
```

### 6.2 Design dos Tab Triggers

#### Visual dos Triggers

```
Container de tabs:
  Layout:     flex border-b border-border
  BG:         bg-transparent (transparente, o bg da pagina aparece)
  Padding:    px-6 (alinhado com o padding do header)
  Height:     h-11 (44px)

Tab trigger individual:
  Height:     100% (ocupa h-11)
  Padding:    px-4 (16px horizontal)
  Font:       text-sm
  Cor padrao: text-muted-foreground
  Hover:      text-foreground bg-muted/30 transition-colors duration-100
  Border-bottom: 2px solid transparent (reservado, fica visivel quando ativo)

Tab trigger ATIVO:
  Cor:          text-foreground font-medium
  Border-bottom: 2px solid accent (rose-600 light / rose-400 dark)
  BG:           transparent (o underline ja comunica o estado)

Animacao do underline:
  O border-bottom anima a posicao usando Framer Motion layoutId:
    <motion.div layoutId="tab-indicator" className="...border..." />
  Desliza suavemente entre as abas ao navegar
  duration: 200ms, ease: easeInOut (nao usa spring para UI critica)

Borda separadora:
  O border-b no container de tabs e visivel
  Cria separacao visual clara entre pipeline e conteudo das abas
```

#### Icone + Texto vs Apenas Texto

```
DECISAO: Icone + Texto em todas as abas
Justificativa:
  - 6 abas com labels longos em portugues podem comprimir em telas medias
  - Icones adicionam velocidade de reconhecimento (leitura em milissegundos)
  - Em mobile: mostra apenas icone (ver responsividade)

Icones por aba (Lucide):
  Geral:       FileText      (conteudo geral, informacoes)
  Equipe:      Users         (equipe, pessoas)
  Entregaveis: Package       (entregaveis, items)
  Financeiro:  DollarSign    (financeiro - icone da navegacao)
  Arquivos:    Paperclip     (arquivos anexados - nao FolderOpen, muito pesado)
  Historico:   Clock         (historico, linha do tempo)

Layout dentro do trigger:
  flex items-center gap-1.5
  icon: size-3.5 (14px) - um pouco menor que o padrao de 18px
        (tabs sao compactos, icone menor evita ocupar muito espaco)
  text: text-sm
```

#### Badges de Contador

```
Algumas abas mostram contadores (badges) quando ha itens:

Equipe:        badge com N membros (ex: "3")
Entregaveis:   badge com N entregaveis (ex: "7")
Arquivos:      badge com N arquivos (ex: "2")
Historico:     sem badge (historico e sempre crescente, seria ruido)

Badge de contador:
  Elemento:  span inline ao lado do texto do trigger
  BG:        bg-muted text-muted-foreground (neutro, nao chama atencao excessiva)
  Font:      text-[10px] font-medium tabular-nums
  Size:      min-w-[18px] h-[18px] px-1 rounded-full
  Posicao:   ml-1 (apos o texto)
  Valor 0:   nao renderizar o badge (se 0 membros, sem badge - aba vazia)
  Animacao:  quando o numero muda: brief scale 1->1.2->1 (100ms) para chamar atencao
```

### 6.3 ASCII Mockup das Tabs

```
DESKTOP (todas as labels visiveis):

px-6
| [FileText] Geral  [Users] Equipe [3]  [Package] Entregaveis [7]  [DollarSign] Financeiro  [Paperclip] Arquivos [2]  [Clock] Historico |
|            _____                                                                                                                        |
            ^ underline rose 2px = aba ativa

TABLET (comprime um pouco):

| [≡] Geral  [👥] Equipe 3  [📦] Entregav. 7  [$] Financ.  [📎] Arq. 2  [🕐] Hist. |

MOBILE (apenas icones - ver secao 8):

| [≡]  [👥]  [📦]  [$]  [📎]  [🕐] |
        ^
        ponto indicador da aba ativa
```

### 6.4 Conteudo das Abas (Placeholder - Sub-fase 3.6)

Na sub-fase 3.5, as abas renderizam um placeholder para cada conteudo:

```
Aba Geral (ativa por padrao):
  Conteudo: <div className="p-6 text-muted-foreground text-sm">
              Formulario da aba Geral sera implementado na sub-fase 3.6
            </div>

Todas as outras abas:
  Mesmo placeholder com o nome da aba
  Importante: a ESTRUTURA das tabs precisa funcionar antes dos formularios

Aba ativa default:
  useSearchParams() para ler ?tab= da URL
  Se tab invalido ou ausente: default para "geral"
  Ao trocar aba: pushState para ?tab={nova-aba}
  Sem reload da pagina (client-side navigation com App Router)
```

### 6.5 Tab Content Area

```
Container do conteudo:
  Padding:    p-6 (24px todos os lados)
  Max-width:  sem max-width aqui (o max-w-7xl e no layout pai)
  Overflow:   auto (para conteudo longo nas abas de formulario)
  Min-height: min-h-[400px] (evita pagina "pequena" quando aba tem pouco conteudo)

Transicao entre abas:
  Fade simples: opacity 0->1 em 150ms
  SEM animacao de slide/transform (tabs em dados - nao e app store)
  Implementar com AnimatePresence + motion.div se usar Framer Motion
  Ou com CSS: classe "animate-in fade-in duration-150" (shadcn/tailwind-animate)
```

---

## 7. Estados: Loading, Error, NotFound

### 7.1 Skeleton do Header (Loading)

Exibido durante o fetch inicial (`useJob` com isLoading=true).

**Regra:** mostrar skeleton apenas se loading > 200ms (evitar flash). Implementar com `setTimeout` ou `useDelay` hook.

#### Skeleton Visual

```
SKELETON DO HEADER (72px):

Row 1 (breadcrumb):
+------------------------------------------------------------------+
| [████████] / [████████████]                                      |
|  w-12 h-4   w-20 h-4 (rounded)  (animate-pulse bg-muted)        |
+------------------------------------------------------------------+

Row 2 (titulo + acoes):
+------------------------------------------------------------------+
| [████████████████████████████████████████████]   [████] [████]  |
|  w-64 h-6 (titulo)                               acoes skeleton  |
+------------------------------------------------------------------+

Row 3 (badges):
+------------------------------------------------------------------+
| [█████████████████]  [████████]  [████████████]                  |
|  w-32 h-5 (status)   w-16 h-5   w-28 h-5 (health)               |
+------------------------------------------------------------------+
```

#### Skeleton do Pipeline

```
SKELETON DO PIPELINE (44px):

+------------------------------------------------------------------+
| [████] [████] [████] [████] [████] [████] [████] [████] [████] [████] |
|  cada segmento: w-[10%] h-7 rounded animate-pulse bg-muted       |
+------------------------------------------------------------------+
```

#### Skeleton das Tabs

```
SKELETON DAS TABS (44px):

+------------------------------------------------------------------+
| [████] [████] [████] [████] [████] [████]                        |
|  cada tab: w-20 h-5 rounded animate-pulse bg-muted               |
+------------------------------------------------------------------+
```

#### Skeleton do Conteudo (Tab Geral como exemplo)

```
SKELETON DO CONTEUDO (simplificado):

+------------------------------------------------------------------+
| [█████████████]                                                  |
| [████████████████████████████]                                   |
|                                                                   |
| [████████████]                                                   |
| [███████████████████]                                            |
| [████████████████████████████████]                               |
+------------------------------------------------------------------+

  Linhas alternando tamanho (como texto real)
  5-8 linhas de skeleton
  animate-pulse bg-muted/60 rounded
```

#### Implementacao do Skeleton

```tsx
// Componentes skeleton a criar:
// src/components/job-detail/JobHeaderSkeleton.tsx
// src/components/job-detail/JobPipelineSkeleton.tsx
// src/components/job-detail/JobTabsSkeleton.tsx

// Na pagina:
// src/app/(dashboard)/jobs/[id]/loading.tsx
// Renderizado automaticamente pelo Next.js durante navegacao

// Tambem no componente:
// Se useJob({ id }).isLoading: render skeletons inline
```

### 7.2 Error State

Exibido quando `useJob` retorna erro (network error, API error >= 500).

```
LAYOUT DO ERROR STATE:

+------------------------------------------------------------------+
|  [Topbar normal]                                                  |
+------------------------------------------------------------------+
|  [Sidebar normal]  |                                              |
|                    |    [    Breadcrumb: Jobs / Erro    ]         |
|                    |                                              |
|                    |           ( AlertCircle icon )              |
|                    |           48px text-muted-foreground         |
|                    |                                              |
|                    |    Nao foi possivel carregar este job        |
|                    |    (text-lg font-semibold, mt-4)             |
|                    |                                              |
|                    |    Verifique sua conexao ou tente            |
|                    |    novamente em alguns instantes.            |
|                    |    (text-sm text-muted-foreground mt-2)      |
|                    |                                              |
|                    |    [ RefreshCw  Tentar novamente ]           |
|                    |    (primary button, mt-6)                    |
|                    |    onClick: queryClient.invalidateQueries     |
|                    |                                              |
|                    |    [ ArrowLeft  Voltar para a listagem ]     |
|                    |    (ghost button, mt-2)                      |
|                    |    href: /jobs                               |
|                    |                                              |
+--------------------+----------------------------------------------+

Container: flex flex-col items-center justify-center
           min-h-[400px] py-16
           (centralizado no content area, nao full-screen)
```

### 7.3 Not Found (404)

Exibido quando `useJob` retorna 404 (job nao existe ou nao pertence ao tenant).

**Arquivo:** `src/app/(dashboard)/jobs/[id]/not-found.tsx`

```
LAYOUT DO NOT FOUND:

+------------------------------------------------------------------+
|  [Topbar normal]                                                  |
+------------------------------------------------------------------+
|  [Sidebar]  |                                                     |
|             |              🎬                                     |
|             |          (text-6xl, mt-16)                         |
|             |                                                     |
|             |       Job nao encontrado                           |
|             |     (text-xl font-semibold mt-4)                   |
|             |                                                     |
|             |  O job que voce esta procurando nao existe          |
|             |  ou voce nao tem permissao para acessa-lo.         |
|             |  (text-sm text-muted-foreground mt-2 max-w-sm)     |
|             |                                                     |
|             |  [ ArrowLeft  Voltar para Jobs ]                   |
|             |  (primary button, mt-6, href=/jobs)                |
|             |                                                     |
+-------------+-----------------------------------------------------+

Emoji 🎬 = claquete (reservado para contextos de "job" - consistente com empty state da listagem)
Container: flex flex-col items-center justify-center text-center
           min-h-[500px] py-16
```

### 7.4 Permissao Negada (403)

```
Visual identico ao Not Found, mas com:
  Emoji:    🔒 (cadeado)
  Titulo:   "Acesso nao autorizado"
  Descricao: "Voce nao tem permissao para visualizar este job.
               Solicite acesso ao administrador da produtora."
  Botao:    Igual ao 404 (voltar para /jobs)
```

---

## 8. Responsividade

### 8.1 Desktop (1280px+)

```
JobHeader:
  Layout descrito nas secoes anteriores (completo)
  Titulo: max-w de ~640px (flex-1 mas limitado)
  Todos os badges visiveis

Pipeline:
  10 segmentos com labels abreviados, todos visiveis
  Sem scroll

Tabs:
  Icone + texto + badge contador
  Todos os 6 triggers visiveis
```

### 8.2 Laptop (1024px - 1279px)

```
JobHeader:
  Titulo: max-w menor (~480px) para caber com os botoes
  Botao "Mudar Status": se nao couber, colapsa para icone-only (RefreshCw sem texto)
  Badges (prioridade + health): permanecem visiveis

Pipeline:
  10 segmentos ligeiramente menores
  Labels: mais curtos se necessario (fallback para emoji-only em segmentos passados)

Tabs:
  Tabs com texto podem comprimir: labels encurtados
  "Entregaveis" -> "Entregav." se necessario
```

### 8.3 Tablet (768px - 1023px)

```
JobHeader:
  Row 2: titulo em font-base (nao heading-2)
  Badge de prioridade: oculto (hidden md:flex)
  Botao "Mudar Status": oculto (o StatusBadge clicavel substitui)
  Menu 3 pontos: visivel

Pipeline:
  Labels: apenas emoji (sem texto nos segmentos)
  Segmento atual: label completo visivel (minimo necessario para entender o estado)
  Segmentos passados/futuros: apenas emoji

Tabs:
  Icone + texto curto
  "Financeiro" -> "Financ."
  Badge contadores: visiveis
```

### 8.4 Mobile (< 768px)

```
JobHeader:
  Row 1 (breadcrumb): comprimido
    "Jobs" + "/" + JobCodeBadge apenas (sem o titulo completo no breadcrumb)
    Breadcrumb pode ser oculto (espaco critico no mobile)

  Row 2 (titulo):
    Titulo em font-base font-semibold (menor que desktop)
    Apenas: titulo + menu 3 pontos
    StatusBadge e acoes se movem para row 3

  Row 3 (expandida no mobile):
    StatusBadge clicavel (ocupa mais espaco)
    Health (somente numero, sem barra)
    SyncIndicator (apenas icone, sem texto)

  Header total: ~80px (ligeiramente mais alto que desktop)

Pipeline:
  OCULTO no mobile (breakpoint < md: hidden)
  Motivo: pipeline com 10 segmentos em tela de 375px seria ilegivel
  Substituicao: StatusBadge no header ja comunica o estado atual
  O pipeline sera visivel a partir de md (768px)

Tabs:
  Apenas icones (sem texto)
  6 icones distribuidos igualmente
  Aba ativa: icone com cor do accent (rose)
             ponto abaixo do icone (como bottom navigation do design system)
  Scroll horizontal das tabs: overflow-x-auto com snap (se o icone maior nao couber)
    - Na pratica 6 icones de 44px = 264px, cabe em qualquer celular moderno
    - Nao precisa de scroll em mobile
```

### 8.5 Tabela Resumo de Visibilidade

```
Elemento                  Mobile(<768) Tablet(768-1023) Desktop(1024+)
────────────────────────────────────────────────────────────────────────
Breadcrumb completo       Sim (curto)  Sim              Sim
Titulo editavel           Sim (menor)  Sim              Sim (heading)
Badge status (clicavel)   Sim          Sim              Sim
Badge prioridade          Oculto       Oculto           Visivel
HealthBar compacta        Numero only  Barra+numero     Barra+numero
Botao "Mudar Status"      Oculto       Oculto           Visivel
SyncIndicator             Icone only   Icone+texto      Icone+texto
Menu 3 pontos             Visivel      Visivel          Visivel
Pipeline                  OCULTO       Visivel          Visivel
Tab labels (texto)        Ocultos      Texto curto      Texto completo
Tab badges (contador)     Visiveis     Visiveis         Visiveis
```

---

## 9. Animacoes e Transicoes

### 9.1 Principios Aplicados

- Maximo 300ms por animacao (design system sec. 8.2)
- ease-out para entradas, ease-in para saidas
- `prefers-reduced-motion`: todas as animacoes abaixo devem ser desativadas
- Nunca blocking (animacao nao impede interacao)

### 9.2 Inventario de Animacoes

```
ELEMENTO              TRIGGER          ANIMACAO                  DURACAO  EASING
─────────────────────────────────────────────────────────────────────────────────
StatusBadge           status muda      scale 0.95->1.0           150ms    ease-out
StatusBadge (erro)    rollback         translateX ±2px (shake)   200ms    ease-in-out
Titulo editing        click no titulo  border-b aparece          100ms    ease-out
SyncIndicator         mudanca estado   opacity+translateX slide  150ms    ease-out
Tab underline         troca de aba     layoutId (slide)          200ms    ease-in-out
Tab content           troca de aba     opacity 0->1 (fade)       150ms    ease-out
Pipeline segmento     pagina carrega   opacity 0->1 stagger      200ms+   ease-out
  (entrada inicial)                    cada segmento +20ms delay
Pipeline ponto atual  sempre           animate-pulse (opacity)   2000ms   ease-in-out
Dropdown              abrir/fechar     fade-in + scale-95->1     150ms    ease-out
Modal (confirm)       abrir/fechar     fade + scale (shadcn)     150ms    ease-out
Header shadow         scroll > 0       box-shadow opacity        200ms    ease-out
```

### 9.3 Pipeline Stagger (Animacao de Entrada)

```tsx
// Ao carregar a pagina, os segmentos do pipeline entram em sequencia:
// Cada segmento tem delay = indice * 20ms

// Implementar com Framer Motion:
variants={{
  hidden: { opacity: 0, y: 4 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.02, duration: 0.2, ease: 'easeOut' }
  })
}}

// O efeito: pipeline "desenha" da esquerda para a direita em ~400ms total
// Sutil e elegante, comunica a progressao
```

### 9.4 prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Desativar todas as animacoes */
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

No Tailwind: usar `motion-safe:animate-pulse` para o ponto piscante do pipeline.

---

## 10. Acessibilidade

### 10.1 Estrutura Semantica HTML

```html
<!-- Hierarquia da pagina -->
<main>
  <!-- JobHeader -->
  <div role="banner" aria-label="Informacoes do job">
    <!-- Breadcrumb -->
    <nav aria-label="Trilha de navegacao">
      <ol>
        <li><a href="/jobs">Jobs</a></li>
        <li aria-current="page">[job_code]</li>
      </ol>
    </nav>

    <!-- Titulo editavel -->
    <!-- IDLE: -->
    <h1
      role="heading"
      aria-level="1"
      tabIndex={0}
      aria-label="Titulo do job: {titulo}. Clique para editar."
    >
      {titulo}
    </h1>
    <!-- EDITING: -->
    <input
      type="text"
      aria-label="Editar titulo do job"
      aria-describedby="title-help"
    />
    <span id="title-help" className="sr-only">
      Pressione Enter para salvar ou Escape para cancelar
    </span>
  </div>

  <!-- Pipeline -->
  <nav aria-label="Pipeline de status do job">
    <ol role="list">
      <!-- Para cada status: -->
      <li
        aria-current={isCurrent ? "step" : undefined}
        aria-label="{label} - {estado: concluido/atual/pendente}"
      >
        ...
      </li>
    </ol>
  </nav>

  <!-- Tabs -->
  <div role="tablist" aria-label="Secoes do job">
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls="tab-panel-{id}"
      id="tab-{id}"
    >
      {icone} {label} {badge}
    </button>
  </div>
  <div
    role="tabpanel"
    id="tab-panel-{id}"
    aria-labelledby="tab-{id}"
    tabIndex={0}
  >
    {conteudo}
  </div>
</main>
```

### 10.2 Navegacao por Teclado

```
Tab:       navega entre elementos interativos na ordem do DOM
           (breadcrumb link -> titulo -> status badge -> menu -> tabs -> conteudo)
Enter:     no titulo (idle): entra em modo editing
           no StatusBadge: abre dropdown
           no item do dropdown: seleciona status
Escape:    no titulo (editing): cancela edicao, volta idle
           no dropdown: fecha dropdown, foco volta para o trigger
           no dialog: fecha dialog sem acao
Setas:     no dropdown (DropdownMenu shadcn): ArrowUp/Down navega entre itens
           nas tabs (Tabs shadcn): ArrowLeft/Right navega entre triggers
Space:     no StatusBadge (trigger): abre/fecha dropdown
```

### 10.3 Focus Management

```
Ao abrir StatusChangeDropdown:
  Foco: mover para o primeiro item do dropdown (shadcn faz isso automaticamente)

Ao fechar StatusChangeDropdown (Escape):
  Foco: retornar ao trigger (StatusBadge ou botao Mudar Status)

Ao entrar em modo editing do titulo:
  Foco: mover para o input (focus() + select() automatico)

Ao sair de editing (Enter/blur):
  Foco: retornar para o elemento h1

Ao abrir CancelReasonDialog:
  Foco: mover para o textarea (primeiro campo interativo)

Ao fechar dialog:
  Foco: retornar para o trigger do dropdown
```

### 10.4 Anuncios aria-live

```
Anuncios a fazer via aria-live="polite":

1. Status alterado:
   Texto: "Status do job alterado para {novo_status}"
   Elemento: <div aria-live="polite" className="sr-only" id="status-announcer">

2. Titulo salvo:
   Texto: "Titulo do job salvo com sucesso"

3. SyncIndicator saved:
   Texto: "Alteracoes salvas"

4. SyncIndicator error:
   Texto: "Erro ao salvar alteracoes. Link: tentar novamente."
```

### 10.5 Contraste

```
Verificacoes criticas:

Text sobre status badge:
  Em Filmagem (red-500 bg): texto branco = ok (contraste > 4.5:1)
  Briefing (violet-500/10 bg): texto violet-700 sobre violet-100 = ok

Pipeline segmento atual:
  blue-500 bg + text-white = 3.02:1 (abaixo de 4.5:1 para texto normal!)
  CORRECAO: usar blue-700 como bg do segmento atual OU texto em white com
            font-weight: bold/semibold (bold em 14px+ pode passar em AA)
  ALTERNATIVA: contornar com ring outline escuro ao redor do segmento atual
               ring-1 ring-inset ring-black/20 sobre o bg colorido

SyncIndicator - estado error:
  text-red-500 sobre bg-white (light): contraste 3.6:1
  CORRECAO: usar text-red-600 = 4.8:1 (ok)
  Dark: text-red-400 sobre bg-zinc-950: contraste ~4.3:1 (borda do AA)
  CORRECAO: usar text-red-300 = 5.2:1 (ok)

Health score - numero:
  text-green-600 sobre bg-white: 5.5:1 (ok)
  text-yellow-600 sobre bg-white: 3.1:1 (ABAIXO!)
  CORRECAO: text-yellow-700 = 4.2:1 (melhor, perto do AA)
            Ou em dark: text-yellow-400 = 4.5:1 (exatamente AA)
```

---

## 11. Tokens de Referencia Rapida

### 11.1 Cores Especificas da Tela

Todas do design system. Listadas aqui por conveniencia:

```
JobHeader background:
  light: bg-white
  dark:  bg-zinc-950 (#09090B)

Header border:
  light: border-zinc-200 (border-border)
  dark:  border-zinc-800

JobCodeBadge:
  bg light: bg-zinc-100
  bg dark:  bg-zinc-800
  text light: text-zinc-600
  text dark:  text-zinc-400
  border light: border-zinc-200
  border dark:  border-zinc-700
  font: font-mono

Pipeline segment - FILLED (passado):
  BG:   {status-color}/15 (ex: blue-500/15)
  Text: {status-color} com sufixo de variante (ex: blue-600 light, blue-400 dark)

Pipeline segment - ATUAL:
  BG:   {status-color}-700 (versao escura para contraste com texto branco)
  Text: white
  Ring: ring-1 ring-{status-color}-900/20 ring-offset-1

Pipeline segment - FUTURO:
  BG:   transparent
  Border: 1px dashed zinc-300 light / zinc-700 dark
  Text: oculto (muted 50% no hover)

SyncIndicator - pending:
  dot: bg-amber-400 (light) / bg-amber-500 (dark)
  text: text-muted-foreground

SyncIndicator - saved:
  icon: text-green-500
  text: text-green-600 (light) / text-green-400 (dark)

SyncIndicator - error:
  icon: text-red-600 (light) / text-red-400 (dark)
  text: idem
  link: text-accent (rose-600 light / rose-400 dark)

Tab underline (ativo):
  border-rose-600 (light) / border-rose-400 (dark)
  = var(--primary) do CSS variable

Tab text (ativo):
  text-foreground font-medium

Tab text (inativo):
  text-muted-foreground
```

### 11.2 Espacamentos

```
Header container padding:  px-6 pt-3 pb-3 (desktop) | px-4 (mobile)
Header row gaps:           mb-1.5 entre rows
Pipeline padding:          px-6 py-2
Tabs padding:              px-6 (triggers alinhados com header)
Tab content padding:       p-6
Gap entre badges (row 3):  gap-3 (12px)
Gap inline badges:         gap-1.5 (6px) entre icone e texto
```

### 11.3 Tipografia

```
Breadcrumb:          text-sm (14px) text-muted-foreground
Titulo idle:         text-xl font-semibold (20px/600)
Titulo editing:      text-xl font-semibold (IDENTICO ao idle)
Status badge:        text-sm (13px) - maior que na tabela
Priority badge:      text-xs (12px) font-medium
Health numero:       text-xs (12px) font-semibold
Pipeline labels:     text-[10px] (10px) font-medium (abreviado)
Pipeline ativo:      text-[10px] font-semibold
Tab trigger:         text-sm (14px)
Tab ativo:           text-sm font-medium
Tab contador badge:  text-[10px] font-medium
SyncIndicator:       text-xs (12px)
```

---

## 12. Guia de Implementacao

### 12.1 Arquivos a Criar

```
src/
  app/
    (dashboard)/
      jobs/
        [id]/
          page.tsx          <- Orquestra JobHeader + Pipeline + Tabs
          loading.tsx       <- Skeleton completo (auto pelo Next.js)
          not-found.tsx     <- 404 page
          error.tsx         <- Error boundary com retry

  components/
    job-detail/
      JobHeader.tsx         <- Header completo (breadcrumb + titulo + badges + acoes)
      JobStatusPipeline.tsx <- Pipeline de 10 segmentos
      StatusChangeDropdown.tsx <- Dropdown de mudanca de status
      SyncIndicator.tsx     <- Indicador de auto-save (5 estados)
      JobHeaderSkeleton.tsx <- Skeleton especifico do header
      JobPipelineSkeleton.tsx <- Skeleton do pipeline
      JobDetailTabs.tsx     <- Container das 6 abas (triggers + conteudo)

  hooks/
    useJob.ts               <- React Query: GET /jobs?action=get-by-id&id=X
    useJobStatus.ts         <- Mutation: POST /jobs-status com optimistic update

  lib/
    constants.ts            <- Adicionar: STATUS_ORDER, STATUS_PIPELINE_LABELS
```

### 12.2 Componentes Reutilizados (nao reimplementar)

```
StatusBadge          <- src/components/jobs/StatusBadge.tsx
JobCodeBadge         <- src/components/jobs/JobCodeBadge.tsx
HealthBar            <- src/components/jobs/HealthBar.tsx
MarginBadge          <- src/components/jobs/MarginBadge.tsx
CancelReasonDialog   <- ja existe (per especificacao)
ConfirmDialog        <- ja existe (per especificacao)
```

### 12.3 Constantes a Adicionar em lib/constants.ts

```typescript
// Ordem do pipeline (excluindo cancelado e pausado)
export const STATUS_PIPELINE_ORDER = [
  'briefing',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'entrega',
  'concluido',
] as const

// Labels abreviados para o pipeline (caber em ~90px)
export const STATUS_PIPELINE_LABELS: Record<string, string> = {
  briefing:             '💡 Brief.',
  orcamento_elaboracao: '💰 Elabor.',
  orcamento_enviado:    '💰 Env.',
  aguardando_aprovacao: '⏳ Aguan.',
  aprovado:             '✅ Aprov.',
  pre_producao:         '📋 Pre-Prod',
  producao_filmagem:    '🎬 Filmag.',
  pos_producao:         '✂️ Pos-Prod',
  entrega:              '🚀 Entrega',
  concluido:            '🏆 Conclui.',
}

// Tabs do detalhe
export const JOB_DETAIL_TABS = [
  { id: 'geral',        label: 'Geral',        icon: 'FileText',   shortLabel: 'Geral'   },
  { id: 'equipe',       label: 'Equipe',        icon: 'Users',      shortLabel: 'Equipe'  },
  { id: 'entregaveis',  label: 'Entregaveis',   icon: 'Package',    shortLabel: 'Entregav.' },
  { id: 'financeiro',   label: 'Financeiro',    icon: 'DollarSign', shortLabel: 'Financ.' },
  { id: 'arquivos',     label: 'Arquivos',      icon: 'Paperclip',  shortLabel: 'Arq.'    },
  { id: 'historico',    label: 'Historico',     icon: 'Clock',      shortLabel: 'Hist.'   },
] as const

// Tabs que mostram badge de contador
export const TABS_WITH_COUNT = ['equipe', 'entregaveis', 'arquivos'] as const
```

### 12.4 Ordem de Implementacao Recomendada

```
1. Constantes (STATUS_PIPELINE_ORDER, STATUS_PIPELINE_LABELS, JOB_DETAIL_TABS)
   -> Arquivo: src/lib/constants.ts

2. Hook useJob.ts
   -> React Query, GET /functions/v1/jobs?action=get-by-id&id={id}
   -> Retorna: job | null, isLoading, error

3. Hook useJobStatus.ts
   -> useMutation para POST /functions/v1/jobs-status
   -> Inclui optimistic update e rollback

4. JobHeader.tsx (sem titulo editavel ainda - apenas display)
   -> Breadcrumb + JobCodeBadge + titulo (h1 static) + badges + menu 3 pontos

5. SyncIndicator.tsx
   -> Componente autonomo com os 5 estados
   -> Animacoes com Framer Motion AnimatePresence

6. Titulo editavel (adicionar ao JobHeader.tsx)
   -> Estado idle <-> editing
   -> Integrar com hook de update do titulo (PATCH /jobs)

7. StatusChangeDropdown.tsx
   -> DropdownMenu com 14 status
   -> Integrar com useJobStatus (optimistic update)
   -> CancelReasonDialog para status cancelado

8. JobStatusPipeline.tsx
   -> 10 segmentos, 3 estados visuais
   -> Stagger animation na entrada
   -> Ponto piscante no segmento atual

9. JobDetailTabs.tsx
   -> 6 tabs com icone + texto + badge
   -> URL sync (?tab=geral)
   -> Placeholders de conteudo

10. Paginas de estado (loading.tsx, not-found.tsx, error.tsx)
    -> Skeletons especificos
    -> Error com retry
    -> 404 com emoji 🎬

11. page.tsx: orquestra tudo
    -> Suspense boundaries
    -> Passa dados para os componentes
```

### 12.5 Decisoes Tecnicas Importantes

```
STICKY HEADER IMPLEMENTATION:
  O bloco sticky (header + pipeline + tabs) deve ser um unico elemento
  com sticky top-14 (56px = altura do topbar).
  Se separados em tres elementos sticky, pode haver comportamento inconsistente.
  Usar: <div className="sticky top-14 z-40 bg-background">
          <JobHeader ... />
          <JobStatusPipeline ... />
          <JobDetailTabs ... /> (apenas os triggers)
        </div>
  O conteudo das tabs fica FORA do sticky block.

OPTIMISTIC UPDATE NO STATUS:
  1. Salvar currentStatus antes da requisicao
  2. queryClient.setQueryData(['job', id], (old) => ({...old, status: newStatus}))
  3. Se erro: queryClient.setQueryData(['job', id], (old) => ({...old, status: currentStatus}))
  Nao usar onMutate/onError do useMutation diretamente para nao conflitar
  com o SyncIndicator (que monitora o estado de loading separadamente).

URL SYNC DAS TABS:
  useSearchParams() para ler
  router.push(?tab=X) para atualizar
  NÃO usar router.replace() (substitui historico - usuario perde o "voltar")
  usar router.push() COM { scroll: false } para nao rolar ao topo

TITULO EDITAVEL - AUTO-FOCUS + SELECT-ALL:
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])
```

---

## Changelog

| Data       | Versao | Descricao                                                    |
|------------|--------|--------------------------------------------------------------|
| 2026-02-18 | 1.0    | Spec inicial - Sub-fase 3.5: Header, Pipeline, Tabs, Estados |
