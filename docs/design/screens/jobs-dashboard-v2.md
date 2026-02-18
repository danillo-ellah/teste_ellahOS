# Spec Visual v2: Dashboard de Jobs (/jobs)

**Data:** 2026-02-18
**Versao:** 2.0
**Autor:** UI/UX Designer - ELLAHOS
**Substitui:** docs/design/screens/jobs-dashboard.md (v1.0)
**Design System:** docs/design/design-system.md
**Contexto:** Redesign baseado em feedback do usuario - scroll horizontal excessivo, falta de "charme eficiente"

---

## Indice

1. [Diagnostico do Problema](#1-diagnostico-do-problema)
2. [Alternativas Analisadas](#2-alternativas-analisadas)
3. [Solucao Escolhida](#3-solucao-escolhida)
4. [Layout Geral (sem mudancas)](#4-layout-geral)
5. [Header da Pagina (sem mudancas)](#5-header-da-pagina)
6. [Barra de Filtros (sem mudancas)](#6-barra-de-filtros)
7. [Tabela de Jobs - Redesign](#7-tabela-de-jobs-redesign)
8. [Novos Componentes Inline](#8-novos-componentes-inline)
9. [Kanban View (sem mudancas)](#9-kanban-view)
10. [Responsividade](#10-responsividade)
11. [Tokens e Animacoes](#11-tokens-e-animacoes)
12. [Acessibilidade](#12-acessibilidade)
13. [Guia de Implementacao](#13-guia-de-implementacao)

---

## 1. Diagnostico do Problema

### 1.1 Causa Raiz do Scroll Horizontal

A tabela v1 tem largura minima de ~1244px:

```
Col         Largura    Acumulado
------      -------    ---------
checkbox     40px        40px
#            56px        96px
Job         200px       296px
Cliente     140px       436px
Agencia     120px       556px
Status      160px       716px
Tipo        120px       836px
Entrega      96px       932px
Valor       112px      1044px
Margem       80px      1124px
Health       80px      1204px
Acoes        40px      1244px
```

Com sidebar expandida (256px) + padding horizontal (48px), o espaco disponivel em um monitor de 1440px e **~1136px**. A tabela precisa de 1244px. Resultado: scroll obrigatorio de ~108px so para ver Health e parte da Margem.

As colunas mais importantes para uma decisao rapida (Health, Margem, Valor) estao justamente nas ultimas posicoes - as mais escondidas.

### 1.2 Problema de Hierarquia

O design atual trata todas as colunas com peso igual. Mas o usuario tem necessidades diferentes:
- **Identidade** (qual job e): Job + Cliente sao criticos
- **Estado atual** (como esta): Status + Health sao criticos
- **Performance financeira** (se vale): Valor + Margem sao criticos
- **Contexto** (outros dados): Agencia, Tipo, Entrega sao secundarios

Na v1, "Agencia" e "Tipo" ocupam 240px juntas e ficam na frente de Health, Valor e Margem.

### 1.3 O "Charme" que Falta

Comparando com Linear, Frame.io e Monday.com:
- **Linear**: informacao condensada em uma celula rica (titulo + subtitulo + badges inline)
- **Monday.com**: colunas de status sao visuais (progress bars, chips coloridos) nao so texto
- **Frame.io**: hierarquia de cor e tamanho deixa claro o que e mais importante

A v1 e correta mas "flat" - tudo tem o mesmo peso visual, mesma cor, mesmo tamanho.

---

## 2. Alternativas Analisadas

### Alternativa A: Tabela Compacta com Colunas Fixas (Sticky)

**Conceito:** Manter a tabela atual mas fixar as primeiras colunas (Job + Cliente) e deixar as outras rolaveis horizontalmente. Adicionar sticky para a coluna de acoes.

```
+--------+------+----------------------+----------+  scroll -->
| [ ] CB |  #   |  Job                 | Cliente  | (fixas)
+--------+------+----------------------+----------+
         +----------+------------------+-------+--------+----+
         | Agencia  | Status           | Valor | Margem | .. |
         +----------+------------------+-------+--------+----+
```

**Pros:**
- Mudanca minima no codigo existente
- Identidade sempre visivel durante scroll

**Contras:**
- NAO resolve o problema raiz: usuario ainda precisa scrollar para informacoes criticas
- Adiciona complexidade tecnica (sticky columns com bordas no Tailwind e verbose)
- A experiencia ainda e de "tabela que transborda"
- Nao melhora o charme visual

**Veredicto: Descartada.** Emplastro, nao solucao.

### Alternativa B: Card Grid Responsivo (estilo Monday Board)

**Conceito:** Substituir a tabela por um grid de cards compactos, 2-3 colunas em desktop.

```
+--------------------+ +--------------------+ +--------------------+
| BBB_001            | | 002                | | BRD_003            |
| Campanha Verao     | | Institucional X    | | Documentary Z      |
| ACME Corp          | | Empresa Y          | | Canal TV           |
|                    | |                    | |                    |
| o Pre-Prod [=====] | | o Pos-Prod [===  ] | | o Entrega [======] |
| R$45k  32% verde   | | R$18k  12% vermelho| | R$90k  41% amarelo |
+--------------------+ +--------------------+ +--------------------+
```

**Pros:**
- Totalmente sem scroll horizontal
- Muito visual e "com charme"
- Facil de escanear em diagonal

**Contras:**
- Reduz densidade de informacao por viewport (ve menos jobs de uma vez)
- Nao e bom para comparacao rapida entre jobs (tableas sao melhores para isso)
- Sem sorting por coluna (uma das features mais usadas em dashboards)
- Usuarios que conhecem a v1 precisam re-aprender
- Perdemos a familiaridade com Monday.com/Linear que tem tabela como default

**Veredicto: Descartada para default.** Pode ser uma terceira vista (alem de tabela e kanban) no futuro.

### Alternativa C: Tabela Hibrida com Celulas Condensadas (ESCOLHIDA)

**Conceito:** Refatorar a tabela para usar celulas multi-dimensionais - condensar informacoes relacionadas em uma unica coluna. Eliminar colunas de baixo valor, enriquecer visualmente as que ficam.

**Principio:** "Uma linha da tabela = um Job lido em 3 fixacoes oculares, sem scroll"

```
[ ] | Job + Cliente         | Status      | Financeiro        | H | ...
    | BBB_001               | o Pre-Prod  | R$45k  [===]  32% |85 |
    | Campanha Verao        | 28/02 Tipo  | Valor  Margem bar |   |
    | ACME / Agencia Y      |             |                   |   |
```

**Pros:**
- Toda informacao critica visivel sem scroll em 1280px+
- Celulas ricas sao mais "escaneavel" que colunas planas
- Padroes reconheciveis do Linear (titulo + meta abaixo) e Notion (dados condensados)
- Melhora dramaticamente o "charme" - mais densidade sem clutter
- Sem regressao para usuarios existentes (e uma tabela, so mais densa)

**Contras:**
- Altura das linhas aumenta de 52px para 64px (linhas duplas em algumas celulas)
- Sorting precisa de adaptacao para celulas compostas
- Requer refatoracao dos componentes de celula

**Veredicto: ESCOLHIDA.**

---

## 3. Solucao Escolhida

### 3.1 Principio Central

**"Tabela de linhas duplas"**: cada linha tem uma linha primaria (dados de identidade e estado) e uma linha secundaria (metadados contextuais). As celulas mais importantes ficam na linha primaria, dados de suporte na secundaria.

Inspiracao direta: como o **Linear** exibe issues - titulo em destaque na linha 1, assignee + labels + data na linha 2, tudo na mesma celula.

### 3.2 Nova Estrutura de Colunas

De 11 colunas para 5 colunas:

```
ANTES (11 colunas + checkbox + acoes = 13 totais, ~1244px)
checkbox | # | Job | Cliente | Agencia | Status | Tipo | Entrega | Valor | Margem | Health | Acoes

DEPOIS (5 colunas + checkbox + acoes = 7 totais, ~900px max)
checkbox | Job + Cliente + Agencia | Status + Tipo + Entrega | Financeiro (Valor + Margem) | Health | Acoes
```

### 3.3 Tabela de Larguras Nova

```
Col                      Largura    Acumulado    Notas
------                   -------    ---------    -----
checkbox                  40px        40px       fixo
Job (titulo+cliente+ag)  280px       320px       flex-1 em telas grandes
Status (status+tipo+dt)  200px       520px       fixo
Financeiro (val+margin)  160px       680px       fixo, text-right
Health (score visual)     80px       760px       fixo, centrado
Acoes                     48px       808px       fixo
```

Total maximo: **808px**. Com sidebar (256px) + padding (48px) = 304px de overhead. Funciona em **1112px** de viewport (laptop 13", sem scroll). Em desktops comuns (1440px+) sobra espaco para respirar.

---

## 4. Layout Geral

Sem alteracoes em relacao a v1. O layout de pagina (topbar, sidebar, bottom nav) permanece identico. Ver secao 1 da v1 para referencia.

---

## 5. Header da Pagina

Sem alteracoes em relacao a v1. Ver secao 2 da v1 para referencia.

---

## 6. Barra de Filtros

Sem alteracoes em relacao a v1. Ver secao 3 da v1 para referencia.

O campo de busca, filtros de status/cliente/tipo/periodo e chips de filtro ativos permanecem identicos.

---

## 7. Tabela de Jobs - Redesign

### 7.1 Estrutura Visual Geral

```
DESKTOP (1280px, sidebar expandida)
+--+--+-------------------------------+-----------------------+-------------------+------+--+
|  |  | JOB + CLIENTE                 | STATUS                | FINANCEIRO        | HLTH | . |
+--+--+-------------------------------+-----------------------+-------------------+------+--+
|  |  | BBB_001  •  Campanha Verao    | o Pre-Producao        | R$ 45.000   [===] |  85  | . |
|[] |1 | ACME Corp  /  Agencia Y      | Filme Pub  28/02 !    |           32% v   |      | . |
+--+--+-------------------------------+-----------------------+-------------------+------+--+
|  |  | 002  •  Institutional Video   | o Pos-Producao        | R$ 18.000   [=  ] |  42  | . |
|[] |2 | Empresa X                    | Branded Content  15/3 |           12% x   |      | . |
+--+--+-------------------------------+-----------------------+-------------------+------+--+
|  |  | BRD_003  •  Doc. Serie Z      | o Entrega             | R$ 90.000  [====] |  91  | . |
|[] |3 | Canal TV  /  Agencia Global  | Documentario  01/04   |           41% !   |      | . |
+--+--+-------------------------------+-----------------------+-------------------+------+--+
```

Onde:
- `o` = dot colorido do status
- `!` = icone de alerta (data atrasada)
- `v` = up-arrow (margem boa, verde)
- `x` = down-arrow (margem ruim, vermelho)
- `!` = dash (margem media, amarelo)
- `[===]` = barra de health score inline

### 7.2 Container da Tabela

```
Componente container:
  bg:        bg-card (surface)
  border:    border border-border (1px)
  radius:    rounded-lg (8px)
  overflow:  overflow-hidden
  shadow:    shadow-sm (light mode apenas)

Scroll horizontal:
  wrapper:   overflow-x-auto
  min-width: min-w-[640px] (muito menor que antes)
             Nao e esperado scroll em desktops normais
```

### 7.3 Header da Tabela

```
Altura:      h-10 (40px) - sem alteracao
BG:          bg-muted/40
Font:        text-xs font-medium text-muted-foreground
Border:      border-b border-border

Colunas do header:
  [  ]  | #  | JOB                  | STATUS         | FINANCEIRO   | HLTH | .
  40px  | 56 | flex-1 (min 240px)   | w-48 (192px)   | w-40 (160px) | w-20 | 48

Labels de header:
  JOB:        uppercase tracking-wide (overline style, 11px)
  STATUS:     uppercase tracking-wide
  FINANCEIRO: uppercase tracking-wide, text-right
  HLTH:       uppercase tracking-wide, text-center, abbrev. de "HEALTH"
              tooltip: "Health Score"
```

### 7.4 Linhas da Tabela - Especificacao

```
Altura:      h-[64px] (64px - era 52px, aumenta para 2 linhas de texto)
BG padrao:   bg-transparent
Hover:       hover:bg-muted/40
Border:      border-b border-border
Cursor:      cursor-pointer
Transicao:   transition-colors duration-100

Linha selecionada:
  BG:        bg-primary/5
  Borda-L:   border-l-2 border-primary (indicador visual da selecao)
              NAO tinha isso na v1 - e o "charme" novo

Padding vertical de celulas: py-2.5 (10px) - da mais respiro que os 8px anteriores
```

### 7.5 Celula: Checkbox + Index

Sem alteracoes em relacao a v1.

```
Checkbox:    w-10 px-3, Checkbox shadcn 16px
Index:       w-14 text-center, font-mono text-xs text-muted-foreground
```

### 7.6 Celula: Job + Cliente + Agencia (NOVA)

Esta e a mudanca principal. Uma celula que antes eram 3 colunas separadas.

```
Largura:     flex-1 min-w-[240px] max-w-[340px] (ou flex-1 sem max em telas grandes)
Padding:     px-3 py-2.5
Layout:      flex flex-col gap-0.5 justify-center
```

**Linha 1 (primaria) - Codigo + Titulo:**

```
Layout:      flex items-center gap-2
Altura:      ~20px

job_code badge:
  Identico a v1: font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800

Separador:   span com "•" (bullet), text-muted-foreground/40, text-xs
             Alternativa: barra "/" mas o bullet e mais leve visualmente

Titulo:
  Font:      text-sm font-medium
  Cor:       text-foreground
  Overflow:  truncate
  Max-w:     calculo automatico (flex truncate)
  Hover:     group-hover:text-primary (via group na TableRow)
```

**Linha 2 (secundaria) - Cliente + Agencia:**

```
Layout:      flex items-center gap-1.5 flex-wrap
Altura:      ~16px

Cliente:
  Font:      text-xs text-muted-foreground
  Overflow:  truncate
  Max-w:     dinamico
  Icone:     sem icone (texto e suficiente)

Separador (se tiver agencia):
  "/"  text-muted-foreground/30 text-xs (mais sutil que o ponto)

Agencia:
  Font:      text-xs text-muted-foreground/70 (mais apagada que o cliente)
  Overflow:  truncate
  Nota:      se nao tiver agencia, linha 2 so mostra o cliente
             se nao tiver cliente nem agencia, linha 2 nao renderiza
```

**ASCII detalhado da celula:**

```
+-----------------------------------------------+
|  [BBB_001]  •  Campanha de Lancamento Prod X   |  <- linha 1 (font-medium)
|  ACME Corp  /  Agencia Y                       |  <- linha 2 (text-xs muted)
+-----------------------------------------------+

+-----------------------------------------------+
|  [002]  •  Institutional Video Empresa X       |  <- titulo pode ser longo
|  Empresa X                                     |  <- sem agencia, so cliente
+-----------------------------------------------+

+-----------------------------------------------+
|  [DOC_003]  •  Docum. em 4K - Nordeste         |
|  Canal TV Globosat  /  Produtora XYZ            |
+-----------------------------------------------+
```

### 7.7 Celula: Status + Tipo + Entrega (NOVA)

Tres colunas antigas condensadas em uma.

```
Largura:     w-48 (192px) - sem flex
Padding:     px-3 py-2.5
Layout:      flex flex-col gap-1 justify-center
```

**Linha 1 (primaria) - Status badge:**

```
Componente:  StatusBadge (identico ao v1)
Largura:     fit-content (nao ocupa a linha toda)
```

**Linha 2 (secundaria) - Tipo + Entrega:**

```
Layout:      flex items-center gap-2

Tipo:
  Font:      text-xs text-muted-foreground
  Overflow:  truncate
  Max-w:     ~80px (vai competir com a data)
  Exemplo:   "Filme Pub." (pode abreviar se muito longo)

Separador:   "·" (middot) text-muted-foreground/30

Data de entrega:
  Font:      text-xs
  Cor normal: text-muted-foreground
  Cor atraso: text-red-500 dark:text-red-400 + font-medium
  Nulo:       nao renderiza (so mostra o tipo)

Icone alerta (se atrasado):
  AlertCircle ou Clock Lucide, size-3 (12px)
  Cor: text-red-500
  Posicao: ao lado da data, inline
  Tooltip: "Entrega atrasada: venceu em {data}"
```

**ASCII:**

```
+----------------------------+
|  o Pre-Producao            |  <- status badge colorido
|  Filme Pub.  ·  28/02 [!]  |  <- tipo + data (! vermelho se atrasado)
+----------------------------+

+----------------------------+
|  o Pos-Producao            |
|  Branded Content  ·  15/03 |
+----------------------------+

+----------------------------+
|  o Briefing Recebido       |
|  Documentario              |  <- sem data de entrega definida
+----------------------------+
```

### 7.8 Celula: Financeiro - Valor + Margem (NOVA)

A celula mais "nova" em termos de visual. Antes eram duas colunas planas de texto. Agora e uma celula rica com indicadores visuais.

```
Largura:     w-40 (160px)
Padding:     px-3 py-2.5
Layout:      flex flex-col gap-1 justify-center items-end (alinhado a direita)
```

**Linha 1 (primaria) - Valor:**

```
Font:        text-sm font-medium
Cor:         text-foreground
Align:       text-right
Formato:     R$ 45.000 (sem centavos se valor for inteiro, com se tiver)
             Usar Intl.NumberFormat pt-BR currency BRL
Nulo:        "-" text-muted-foreground
```

**Linha 2 (secundaria) - Margem + Indicador Visual:**

```
Layout:      flex items-center gap-1.5 justify-end

MarginBadge (componente novo - substitui MarginIndicator):
  Ver secao 8.1 para especificacao completa

Mini health bar inline:
  REMOVIDA da propria coluna (fica na coluna Health separada)
```

**ASCII:**

```
+---------------------+
|          R$ 45.000  |  <- valor alinhado direita, font-medium
|  32% [===verde===]  |  <- porcentagem + badge visual
+---------------------+

+---------------------+
|          R$ 18.000  |
|  12% [=vermelho=]   |
+---------------------+

+---------------------+
|                  -  |  <- sem valor (nao orcado)
|                  -  |
+---------------------+
```

### 7.9 Celula: Health Score (REVISADA)

Sem mudanca estrutural, mas com melhorias visuais.

```
Largura:     w-20 (80px)
Padding:     px-2 py-2.5
Layout:      flex flex-col items-center gap-1 justify-center
```

**Numero (mantido):**

```
Font:        text-sm font-semibold (era text-xs, aumentar para melhor leitura)
Cor:         baseada no score (verde/amarelo/vermelho)
```

**Barra de progresso (melhorada):**

```
Largura:     w-10 (40px) - era w-12
Altura:      h-2 (8px) - era h-1.5 (6px), mais visivel
Radius:      rounded-full
BG track:    bg-muted/50
BG fill:     cor gradiente baseada no score

NOVO: barra tem um "glow" sutil no dark mode
  via box-shadow: 0 0 4px {cor}/40 no elemento fill
  (implementado com inline style no dark mode)
```

**Tooltip (NOVO):**

```
Tooltip shadcn ao hover na celula:
  Conteudo: "Health Score: {score}/100"
  Sub-texto: "Baseado em {N} membros na equipe"
  Delay:    400ms
```

### 7.10 ASCII Mockup Completo da Tabela Nova

```
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | JOB                              | STATUS                | FINANCEIRO        | HLTH | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [BBB_001] • Campanha Verao 2026  | • Pre-Producao        |        R$ 45.000  |  85  |   |
|[x]|1 | ACME Corp / Agencia Digital Y   | Filme Pub.  · 28/02!  |  32% [verde====]  | [==] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [002] • Institutional Video Z    | • Pos-Producao        |        R$ 18.000  |  42  |   |
|[ ]|2 | Empresa X                       | Branded Cont · 15/03  |  12% [verm=====]  | [= ] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [DOC_003] • Documentario Nordeste| • Entrega             |        R$ 90.000  |  91  |   |
|[ ]|3 | Canal TV Globosat               | Documentario · 01/04  |  41% [amar====]   | [==] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [004] • Evento Corporativo Anual | • Briefing Recebido   |                 - |   -  |   |
|[ ]|4 | Startup ABC / Nenhuma agencia   | Evento                |                 - |      | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
```

Nota: a linha selecionada (primeiro job) tem `border-l-2 border-primary` e `bg-primary/5`.

### 7.11 Indicadores de "Charme" (micro-detalhes)

Estes elementos transformam a tabela de "funcional" para "elegante":

**a) Borda esquerda de selecao:**

Quando uma linha esta selecionada, ela ganha `border-l-2 border-primary` (rose). Este e um padrao do Linear e do Notion - muito mais visual que o bg sutil.

**b) Hover com destaque no titulo:**

A TableRow tem `group`. O titulo do job tem `group-hover:text-primary transition-colors duration-100`. O usuario ve exatamente o que e clicavel.

**c) Margem com seta indicativa:**

Ver secao 8.1. A porcentagem de margem ganha um micro-icone de tendencia (TrendingUp / TrendingDown / Minus) que e lido em milissegundos.

**d) Data atrasada com urgencia:**

Quando `expected_delivery_date < hoje` e o job nao esta finalizado/entregue/cancelado, a data vira `text-red-500 font-medium` E ganha um `Clock` icon de 12px. O usuario ve urgencia imediatamente.

**e) Barra de health com "pulso" sutil:**

No dark mode, a barra de health score dos jobs em estado `producao_filmagem` (o status mais urgente) recebe um `animate-pulse` muito sutil (opacity 80-100%). Indica que esses jobs estao "ao vivo". Implementado via CSS class condicional.

**f) Job sem dados financeiros:**

Quando `closed_value` e null, a celula financeira exibe apenas um trace centralizado. Mas quando o job esta em status `orcamento_elaboracao` ou `aguardando_aprovacao`, aparece um texto auxiliar util:

```
+---------------------+
|             Em orç. |  <- text-xs text-amber-500, italic
|                   - |
+---------------------+
```

Isso substitui o "-" sem contexto por informacao util.

**g) Status com animacao de entrada:**

Quando o status de um job muda via optimistic update, o StatusBadge recebe uma animacao de `scale-95 to scale-100` de 150ms. Indica a mudanca sem ser agressivo.

---

## 8. Novos Componentes Inline

### 8.1 MarginBadge (substitui MarginIndicator)

Este e o componente mais novo e o que mais contribui para o "charme".

```typescript
// Props
interface MarginBadgeProps {
  value: number | null
  className?: string
}
```

**Visual:**

```
MARGEM >= 30% (boa):
  +----------------+
  | ^ 32%          |
  +----------------+
  Icone: TrendingUp (12px) text-green-500
  Texto: "32%" text-green-600 dark:text-green-400 font-medium text-xs
  BG:    bg-green-500/8 (muito sutil, quase invisivel)
  Radius: rounded-sm px-1.5 py-0.5

MARGEM 15-29% (media):
  +----------------+
  | - 22%          |
  +----------------+
  Icone: Minus (12px) text-yellow-500
  Texto: "22%" text-yellow-600 dark:text-yellow-400 font-medium text-xs
  BG:    bg-yellow-500/8

MARGEM < 15% (ruim):
  +----------------+
  | v 8%           |
  +----------------+
  Icone: TrendingDown (12px) text-red-500
  Texto: "8%" text-red-600 dark:text-red-400 font-medium text-xs
  BG:    bg-red-500/8

MARGEM NULL:
  "-" text-muted-foreground, sem bg
```

**Layout dentro da celula Financeiro (linha 2):**

```
+---------------------+
|          R$ 45.000  |
|     [^ 32% sutil]   |  <- MarginBadge, alinhado a direita
+---------------------+
```

**Especificacao tecnica:**

```tsx
// Classes para cada estado
const marginConfig = {
  good:    { icon: TrendingUp,   text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/8'  },
  medium:  { icon: Minus,        text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/8' },
  bad:     { icon: TrendingDown, text: 'text-red-600 dark:text-red-400',   bg: 'bg-red-500/8'   },
}

// Render
<span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs font-medium', config.bg)}>
  <Icon className={cn('size-3 shrink-0', config.text)} />
  <span className={config.text}>{Math.round(value)}%</span>
</span>
```

**Tooltip ao hover:**

```
Conteudo: "Margem: {valor}%"
Contexto: "Saudavel (>30%)" / "Atencao (15-29%)" / "Critica (<15%)"
Delay:    400ms
```

### 8.2 JobRowCell - Celula de Job Refatorada

O componente `JobCodeBadge` continua identico. Mas a celula de job ganha um novo wrapper:

```tsx
// Na tabela, a estrutura interna da celula de "Job" vira:

<TableCell className="px-3 py-2.5">
  <div className="flex flex-col gap-0.5 min-w-0">
    {/* Linha 1: codigo + titulo */}
    <div className="flex items-center gap-2 min-w-0">
      <JobCodeBadge code={job.job_code} />
      <span className="text-muted-foreground/40 text-xs select-none">•</span>
      <span className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-100">
        {job.title}
      </span>
    </div>
    {/* Linha 2: cliente / agencia */}
    {(job.clients || job.agencies) && (
      <div className="flex items-center gap-1.5 min-w-0">
        {job.clients && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            {job.clients.name}
          </span>
        )}
        {job.clients && job.agencies && (
          <span className="text-xs text-muted-foreground/30 select-none">/</span>
        )}
        {job.agencies && (
          <span className="text-xs text-muted-foreground/60 truncate max-w-[100px]">
            {job.agencies.name}
          </span>
        )}
      </div>
    )}
  </div>
</TableCell>
```

### 8.3 StatusCell - Celula de Status Refatorada

```tsx
// Estrutura interna da celula de Status + Tipo + Entrega

<TableCell className="px-3 py-2.5 w-48">
  <div className="flex flex-col gap-1 min-w-0">
    {/* Linha 1: badge de status */}
    <StatusBadge status={job.status} />

    {/* Linha 2: tipo + data */}
    <div className="flex items-center gap-1.5 min-w-0">
      {job.job_type && (
        <span className="text-xs text-muted-foreground truncate">
          {PROJECT_TYPE_SHORT_LABELS[job.job_type]}
          {/* SHORT_LABELS: versao abreviada do tipo para caber na celula */}
        </span>
      )}
      {job.job_type && job.expected_delivery_date && (
        <span className="text-muted-foreground/30 text-xs select-none">·</span>
      )}
      {job.expected_delivery_date && (
        <span className={cn(
          'text-xs flex items-center gap-0.5 shrink-0',
          overdue && activeStatus ? 'text-red-500 font-medium' : 'text-muted-foreground'
        )}>
          {overdue && activeStatus && <Clock className="size-3 shrink-0" />}
          {formatDate(job.expected_delivery_date)}
        </span>
      )}
    </div>
  </div>
</TableCell>
```

### 8.4 FinancialCell - Celula Financeira Nova

```tsx
// Estrutura interna da celula Financeiro

<TableCell className="px-3 py-2.5 w-40 text-right">
  <div className="flex flex-col gap-1 items-end min-w-0">
    {/* Linha 1: valor */}
    <span className={cn(
      'text-sm font-medium tabular-nums',
      job.closed_value ? 'text-foreground' : 'text-muted-foreground/50'
    )}>
      {job.closed_value
        ? formatCurrency(job.closed_value)
        : isOrcamentoStatus(job.status)
          ? <span className="text-xs text-amber-500 italic">Em orç.</span>
          : '-'
      }
    </span>
    {/* Linha 2: margem badge */}
    <MarginBadge value={job.margin_percentage} />
  </div>
</TableCell>
```

### 8.5 PROJECT_TYPE_SHORT_LABELS (nova constante)

Para caber na linha secundaria da coluna Status, os tipos precisam de versoes curtas:

```typescript
// Adicionar a lib/constants.ts
export const PROJECT_TYPE_SHORT_LABELS: Record<string, string> = {
  filme_publicitario:     'Filme Pub.',
  branded_content:        'Branded',
  video_institucional:    'Institucional',
  documentario:           'Documentario',
  serie:                  'Serie',
  clipe_musical:          'Clipe',
  evento:                 'Evento',
  social_media:           'Social',
  live:                   'Live',
  outro:                  'Outro',
}
```

---

## 9. Kanban View

Sem alteracoes em relacao a v1. Os cards do kanban ja sao ricos o suficiente. Ver secao 5 da v1 para referencia completa.

**Unica adicao:** o `MarginBadge` (secao 8.1) substitui o `MarginIndicator` no card do kanban tambem, para consistencia visual entre as duas vistas.

---

## 10. Responsividade

### 10.1 Desktop (1280px+)

```
Tabela completa, todas as 5 colunas visiveis sem scroll.
Largura da tabela: ~808px, o que deixa folga confortavel.

Header: altura h-10, todas as labels visiveis
Linhas: altura h-[64px] (cresceu de 52px)
```

### 10.2 Laptop (1024px - 1279px)

```
Sidebar colapsada para w-16 = mais espaco para o conteudo.
A tabela ainda cabe: 808px em ~960px de espaco disponivel.

Se a sidebar estiver expandida (256px) em 1024px:
  Espaco: 1024 - 256 - 48 = 720px
  Tabela: 808px -> scroll horizontal minimo (~88px)
  Solucao: a coluna "Job" que tem flex-1 comprime para ~200px minimo
  Resultado: ainda legivel, sem perda de informacao critica
```

### 10.3 Tablet (768px - 1023px)

```
Sidebar vira drawer (overlay).
Espaco disponivel: ~720-975px.

Adaptacoes:
  - Coluna Agencia REMOVIDA da linha 2 da celula Job (economia de espaco)
  - Tipo REMOVIDO da linha 2 da celula Status (so mostra data)
  - Tabela com overflow-x: auto mas scroll minimo esperado
```

### 10.4 Mobile (< 768px)

```
Sem alteracoes: a tabela ja era substituida por cards em mobile na v1.
Os cards continuam identicos, com o MarginBadge novo no lugar do MarginIndicator.
```

### 10.5 Resumo de Adaptacoes

| Elemento              | Mobile (<768) | Tablet (768-1023) | Desktop (1024+) |
|-----------------------|---------------|-------------------|-----------------|
| Tabela                | Cards         | Tabela compacta   | Tabela completa |
| Agencia no Job cell   | Card (sim)    | Removida          | Sim             |
| Tipo no Status cell   | Card (sim)    | Removido          | Sim             |
| Altura de linha       | N/A (cards)   | 56px              | 64px            |
| MarginBadge           | Sim           | Sim               | Sim             |
| Health glow (dark)    | Sim           | Sim               | Sim             |

---

## 11. Tokens e Animacoes

### 11.1 Cores Novas (adicoes ao design system)

Nenhuma cor nova e adicionada. Todas as cores usadas ja existem no design system.

Os fundos dos `MarginBadge` usam opacidades sobre cores existentes:
- `bg-green-500/8` = green-500 com 8% de opacidade
- `bg-yellow-500/8` = yellow-500 com 8% de opacidade
- `bg-red-500/8` = red-500 com 8% de opacidade

### 11.2 Espacamentos Usados

```
Padding de celula:      px-3 py-2.5 (12px horizontal, 10px vertical)
Gap linha 1/linha 2:    gap-0.5 (2px) - celula Job
                        gap-1 (4px) - celulas Status e Financeiro
Gap interno linha 1:    gap-2 (8px) entre badge e titulo
Gap interno linha 2:    gap-1.5 (6px) entre cliente e agencia
Altura de linha:        h-[64px] (fixo para consistencia visual)
```

### 11.3 Tipografia Nova

```
Titulo do job (linha 1, celula Job):
  text-sm font-medium - identico a v1

Cliente/Agencia (linha 2):
  text-xs text-muted-foreground - NOVO (era text-sm)

Tipo/Data (linha 2, celula Status):
  text-xs text-muted-foreground - NOVO

Valor (linha 1, celula Financeiro):
  text-sm font-medium tabular-nums - NOVO (tabular-nums para alinhamento de digitos)

MarginBadge:
  text-xs font-medium - NOVO componente

Health Score numero:
  text-sm font-semibold - era text-xs, aumentado para melhor leitura
```

### 11.4 Animacoes e Transicoes

```
Hover em titulo do job:
  group-hover:text-primary transition-colors duration-100

Selecao de linha (border-l):
  Sem animacao (instantaneo com o checkbox - expectativa do usuario)

Status change otimistico (StatusBadge):
  scale-95 -> scale-100, duration-150 ease-out
  Implementar com Framer Motion motion.span ou CSS keyframe

Health bar fill (dark mode + producao):
  animate-pulse com opacity 80-100%, duration-2000ms
  Apenas para jobs em status producao_filmagem
  Implementar: className condicional "animate-pulse" no fill div

MarginBadge entrada (quando valor muda):
  Sem animacao de entrada (seria confuso na lista)
```

---

## 12. Acessibilidade

### 12.1 Mudancas em Relacao a v1

A estrutura semantica HTML permanece identica. As mudancas afetam apenas o conteudo das celulas.

**Celula Job (nova estrutura):**

```html
<td>
  <!-- aria-label para screen readers, ja que a celula e densa -->
  <div aria-label="{job_code} - {title}, cliente: {client_name}">
    ...
  </div>
</td>
```

**Celula Status (nova estrutura):**

```html
<td>
  <div aria-label="Status: {status_label}, tipo: {type}, entrega: {date}">
    ...
  </div>
</td>
```

**Celula Financeiro (nova estrutura):**

```html
<td>
  <div aria-label="Valor fechado: {currency}, margem: {percent}%">
    ...
  </div>
</td>
```

### 12.2 Icones como Informacao

Os icones de tendencia no `MarginBadge` (TrendingUp/Down/Minus) e o `Clock` na data atrasada sao decorativos quando acompanhados de texto. Usar `aria-hidden="true"` neles. A informacao e comunicada pelo texto adjacente.

**Excecao**: o `Clock` de data atrasada pode ter um tooltip que adiciona contexto:

```html
<Tooltip content="Entrega atrasada">
  <Clock aria-label="Atrasado" className="size-3 text-red-500" />
</Tooltip>
```

### 12.3 Contraste

Os backgrounds de 8% de opacidade no `MarginBadge` sao decorativos e nao carregam informacao por si so. O contraste da informacao real (texto colorido) ja foi verificado na v1 e permanece identico.

A borda de selecao `border-l-2 border-primary` (rose-600 no light, rose-400 no dark) atinge facilmente 3:1 contra o background, cumprindo o requisito WCAG para elementos nao-textuais.

---

## 13. Guia de Implementacao

### 13.1 Arquivos a Modificar

```
MODIFICAR:
  frontend/src/components/jobs/JobsTable.tsx
    - Reduzir COLUMNS para 5 (remover Cliente, Agencia, Tipo separados)
    - Refatorar cada celula para a estrutura de 2 linhas
    - Adicionar "group" na TableRow para o hover do titulo

  frontend/src/components/jobs/MarginIndicator.tsx
    - Transformar em MarginBadge (ou criar novo arquivo)
    - Nova interface visual com icone + badge sutil

  frontend/src/components/jobs/HealthBar.tsx
    - Aumentar numero de h-2 para h-2 (ja esta certo)
    - Aumentar fonte do numero para text-sm font-semibold
    - Adicionar animate-pulse condicional para status producao_filmagem

  frontend/src/lib/constants.ts
    - Adicionar PROJECT_TYPE_SHORT_LABELS

NENHUMA ALTERACAO:
  StatusBadge.tsx, JobCodeBadge.tsx, KanbanView.tsx
  JobFilters.tsx, JobsPagination.tsx, BulkActionsBar.tsx
  page.tsx (jobs/page.tsx nao precisa de alteracao)
```

### 13.2 Ordem de Implementacao Recomendada

```
1. Adicionar PROJECT_TYPE_SHORT_LABELS em constants.ts
2. Criar/refatorar MarginBadge.tsx (era MarginIndicator.tsx)
3. Atualizar HealthBar.tsx (ajuste de fonte + animacao condicional)
4. Refatorar JobsTable.tsx (celulas condensadas)
   4a. Atualizar COLUMNS array
   4b. Refatorar celula Job (adicionar linha 2 com cliente/agencia)
   4c. Refatorar celula Status (adicionar linha 2 com tipo/data)
   4d. Criar celula Financeiro (valor + MarginBadge)
   4e. Adicionar group na TableRow + hover no titulo
   4f. Adicionar border-l-2 em linhas selecionadas
5. Atualizar KanbanView.tsx para usar MarginBadge (consistencia)
6. Teste visual nos breakpoints: 1024, 1280, 1440, 1920
7. Teste de acessibilidade: navegacao por teclado, screen reader
```

### 13.3 Notas para o Desenvolvedor

**Sobre `tabular-nums`:**

```
O valor monetario deve usar a fonte em modo tabular (digitos de largura igual).
Adicionar `tabular-nums` no className da span de valor.
Isso garante que R$ 1.000 e R$ 100.000 ficam alinhados verticalmente na coluna.
```

**Sobre a altura das linhas:**

```
A altura fixa h-[64px] e importante. Sem ela, linhas com e sem agencia/tipo
terao alturas diferentes, criando uma tabela visualmente irregular.
Use min-h-[64px] se quiser seguranca contra overflow, mas h-[64px] com
overflow: hidden nas celulas e mais robusto.
```

**Sobre o `group` na TableRow:**

```tsx
// CORRETO: adicionar group na TableRow para ativar group-hover no titulo
<TableRow className={cn('group h-[64px] ...', ...)}>

// CORRETO: o titulo usa group-hover
<span className="text-sm font-medium truncate group-hover:text-primary ...">
  {job.title}
</span>

// ATENCAO: o cn() de shadcn TableRow adiciona classes internamente.
// Verifique se 'group' nao conflita com as classes do TableRow base.
// Se conflitar, use um wrapper div dentro de TableRow.
```

**Sobre o `border-l-2` de selecao:**

```tsx
// A borda esquerda de selecao precisa do overflow-hidden no container da tabela
// para nao vazar. O container ja tem rounded-lg overflow-hidden (v1), entao ok.

// Na linha selecionada:
className={cn(
  'group h-[64px] ...',
  isSelected && 'bg-primary/5 border-l-2 border-l-primary',
  // Nota: border-l-2 adiciona 2px de width a tabela. Nao e problema
  // porque a tabela tem overflow-hidden e a celula de checkbox absorve.
)}
```

**Sobre o `isOrcamentoStatus` helper:**

```typescript
// Criar helper pequeno para verificar se o job esta em fase de orcamento
function isOrcamentoStatus(status: JobStatus): boolean {
  return ['orcamento_elaboracao', 'orcamento_enviado', 'aguardando_aprovacao'].includes(status)
}
```

---

## 14. Emoji Guide

### 14.1 Filosofia de Uso

O objetivo dos emojis no ELLAHOS nao e decorar - e comunicar mais rapido.

A referencia e o Monday.com nos status: um emoji ao lado do label torna o status reconhecivel antes do cerebro processar o texto. No set de filmagem, com o celular na mao e o sol no rosto, isso importa.

A referencia negativa e um Slack mal configurado cheio de emojis em todo lugar: vira ruido. O Linear nao usa nenhum e funciona, mas e uma ferramenta de engenharia. O ELLAHOS serve uma produtora - o universo audiovisual tem personalidade, e tudo bem expressar isso com parcimonia.

**Regra de ouro: se retirar o emoji a informacao continua legivel e completa, o emoji e decoracao. So fica se adicionar velocidade de leitura ou personalidade contextual.**

---

### 14.2 Decisao por Area

A tabela abaixo documenta cada area candidata e a decisao tomada:

| Area                  | Decisao    | Justificativa                                                                 |
|-----------------------|------------|-------------------------------------------------------------------------------|
| Status dos jobs       | APROVADO   | Emoji + cor = dupla leitura; util em telas pequenas e ambientes externos      |
| Tipo de projeto       | DESCARTADO | Aparece em text-xs muted numa linha secundaria; emoji poluiria, nao ajudaria  |
| Health score          | DESCARTADO | Numero ja tem cor semantica (verde/amarelo/vermelho); emoji seria redundante   |
| Empty states          | APROVADO   | Espaco vazio = low risk; emoji age como page icon (estilo Notion), tem charme |
| Margem financeira     | DESCARTADO | MarginBadge ja tem icone Lucide (TrendingUp/Down/Minus); duplicar seria ruido |
| Cards do Kanban       | DESCARTADO | Cards sao densos; emoji competiria com dado; nao ha ganho de leitura          |
| Toasts/notificacoes   | APROVADO   | Contexto efemero (aparece e some); emoji da personalidade sem permanencia     |

**Resultado: 3 pontos de uso aprovados.** Menos e mais.

---

### 14.3 Tabela de Emojis Aprovados

#### Grupo 1 - Status dos Jobs

| Emoji | Status               | Label exibido             | Onde usar                       | Onde NAO usar                          |
|-------|----------------------|---------------------------|---------------------------------|----------------------------------------|
| 💡    | briefing             | Briefing Recebido         | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 💰    | orcamento_elaboracao | Elaborando Orcamento      | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 💰    | orcamento_enviado    | Orcamento Enviado         | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| ⏳    | aguardando_aprovacao | Aguardando Aprovacao      | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| ✅    | aprovado             | Aprovado                  | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 📋    | pre_producao         | Pre-Producao              | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 🎬    | producao_filmagem    | Em Filmagem               | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| ✂️    | pos_producao         | Pos-Producao              | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 🚀    | entrega              | Em Entrega                | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 🏆    | concluido            | Concluido                 | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |
| 🚫    | cancelado            | Cancelado                 | StatusBadge, filtro de status   | Headers de tabela, botoes de acao      |

Racional das escolhas:
- `💡` briefing - ideia, inicio de tudo. Universal, positivo.
- `💰` orcamento - dinheiro, negociacao. Direto ao ponto, sem ambiguidade.
- `⏳` aguardando - ampulheta, espera. Mais neutro que um relogio (que sugere urgencia).
- `✅` aprovado - check verde. O mais universal possivel para "go".
- `📋` pre-producao - clipboard, planejamento. Evoca listas e organizacao.
- `🎬` filmagem - claquete. O emoji mais icônico do universo audiovisual. Reservado para o momento de maximo impacto.
- `✂️` pos-producao - tesoura de edicao. Editores reconhecem imediatamente.
- `🚀` entrega - lancamento. Transmite que o trabalho esta "saindo".
- `🏆` concluido - trofeu. Celebra sem ser infantil.
- `🚫` cancelado - proibido. Semantico e definitivo.

**Nota de compatibilidade:** Todos os emojis acima sao do Unicode 6.0-13.0, amplamente suportados em Windows 10+, macOS 10.15+, Android 8+ e iOS 13+. Evitamos emojis de face (que renderizam de forma mais diferente entre plataformas) e emojis de tecnologia mais novos (Unicode 14+).

#### Grupo 2 - Empty States

| Emoji | Contexto                           | Titulo sugerido                       |
|-------|------------------------------------|---------------------------------------|
| 🎬    | Nenhum job encontrado (lista vazia)| Nenhum job por aqui ainda             |
| 🔍    | Busca sem resultados               | Nenhum resultado para esta busca      |
| 🗂️   | Filtro ativo sem resultados        | Nenhum job com estes filtros          |
| 📭    | Nenhuma notificacao                | Tudo em dia por aqui                  |

O emoji no empty state aparece em tamanho grande (text-5xl ou text-6xl, ~48-64px) acima do titulo. E o tratamento estilo Notion: um simbolo expressivo que define o contexto antes de o usuario ler qualquer palavra.

#### Grupo 3 - Toasts / Notificacoes

| Emoji | Tipo    | Exemplo de mensagem completa                     |
|-------|---------|--------------------------------------------------|
| ✅    | success | "Job criado com sucesso"                         |
| ❌    | error   | "Nao foi possivel salvar as alteracoes"          |
| ⚠️   | warning | "Este job tem entregas atrasadas"                |
| ℹ️   | info    | "Status atualizado para Pos-Producao"            |

O emoji vai NO TITULO do toast, antes do texto, com um espaco: `"✅ Job criado com sucesso"`. Nao vai no corpo (description) do toast.

---

### 14.4 Onde os Emojis NAO aparecem

Lista definitiva de areas livres de emoji:

```
PROIBIDO:
  - Headers de colunas da tabela (JOB, STATUS, FINANCEIRO, HLTH)
  - Botoes de acao (Novo Job, Exportar, Filtrar, Editar, Deletar)
  - Labels de campo em formularios
  - Tooltips de dados (o dado e o emoji - nao precise de outro emoji)
  - Titulos de pagina (h1 da pagina de /jobs)
  - Sidebar de navegacao (ja tem icones Lucide - nao misturar)
  - Celulas de tabela fora do StatusBadge
  - Badges de tipo de projeto
  - MarginBadge (ja tem icone Lucide)
  - Notificacoes de sistema (erros criticos, alertas de RLS)
```

---

### 14.5 Especificacao do StatusBadge com Emoji

O `StatusBadge` atual exibe: `[dot colorido] Label do status`

Com o emoji guide, passa a exibir: `[emoji] Label do status`

O dot colorido e SUBSTITUIDO pelo emoji. Nao e dot + emoji (isso seria redundante e largo demais para a celula de 192px).

```
ANTES:
  • Pre-Producao          (dot violet + texto)

DEPOIS:
  📋 Pre-Producao         (emoji + texto)
  🎬 Em Filmagem          (emoji + texto)
  ✅ Aprovado             (emoji + texto)
```

**Especificacao tecnica do StatusBadge com emoji:**

```tsx
// Substituir o dot span por um emoji span
// O emoji age como icone - nao precisa de aria-hidden porque e semantico

const STATUS_EMOJI: Record<JobStatus, string> = {
  briefing:             '💡',
  orcamento_elaboracao: '💰',
  orcamento_enviado:    '💰',
  aguardando_aprovacao: '⏳',
  aprovado:             '✅',
  pre_producao:         '📋',
  producao_filmagem:    '🎬',
  pos_producao:         '✂️',
  entrega:              '🚀',
  concluido:            '🏆',
  cancelado:            '🚫',
}

// No JSX do StatusBadge:
<span className={cn(
  'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
  statusConfig[status].bg,
  statusConfig[status].text
)}>
  <span
    className="text-[11px] leading-none select-none"
    role="img"
    aria-label={STATUS_EMOJI_ARIA[status]}   // ex: "claquete - em filmagem"
  >
    {STATUS_EMOJI[status]}
  </span>
  {STATUS_LABELS[status]}
</span>
```

O emoji tem `font-size: 11px` (text-[11px]) para nao dominar o badge. O tamanho do badge e determinado pelo texto (12px), e o emoji fica levemente menor para nao parecer grande demais.

**Sobre acessibilidade:** o emoji tem `role="img"` e `aria-label` descritivo. O texto do status ja comunica o conteudo, entao o aria-label do emoji e complementar. Screen readers vao ler "claquete - em filmagem, Em Filmagem" - legivel e sem redundancia excessiva.

---

### 14.6 Especificacao dos Empty States com Emoji

O `EmptyState` padrao (secao 6.9 do design system) usa um icone Lucide de 48px. Com o emoji guide, o icone Lucide e SUBSTITUIDO pelo emoji nas telas de jobs.

```
ANTES (design system padrao):
  [Lucide icon, 48px, text-muted]
  Nenhum job por aqui ainda
  Crie o primeiro job da sua produtora.
  [+ Novo Job]

DEPOIS (com emoji guide aplicado):
  🎬
  Nenhum job por aqui ainda
  Crie o primeiro job da sua produtora.
  [+ Novo Job]
```

**Especificacao tecnica:**

```tsx
// O emoji no empty state usa text-5xl (48px) ou text-6xl (64px)
// Dependendo do espaco disponivel

// Lista vazia (sem jobs cadastrados):
<div className="flex flex-col items-center justify-center py-16">
  <span className="text-5xl select-none" role="img" aria-label="claquete">
    🎬
  </span>
  <h3 className="text-lg font-semibold mt-4">
    Nenhum job por aqui ainda
  </h3>
  <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
    Crie o primeiro job da sua produtora para comecar a organizar sua producao.
  </p>
  <Button className="mt-6">
    <Plus className="size-4 mr-2" />
    Novo Job
  </Button>
</div>

// Busca sem resultados:
<div className="flex flex-col items-center justify-center py-16">
  <span className="text-5xl select-none" role="img" aria-label="lupa">
    🔍
  </span>
  <h3 className="text-lg font-semibold mt-4">
    Nenhum resultado para "{query}"
  </h3>
  <p className="text-sm text-muted-foreground mt-2 max-w-md text-center">
    Tente buscar por outro titulo, codigo ou nome de cliente.
  </p>
</div>
```

---

### 14.7 Especificacao dos Toasts com Emoji

O Sonner (shadcn) aceita strings diretamente no `toast()`. O emoji vai concatenado ao titulo.

```typescript
// Exemplos de uso em toda a aplicacao:

// Sucesso
toast.success('✅ Job criado com sucesso', {
  description: `${jobCode} foi adicionado ao seu dashboard.`,
})

// Erro
toast.error('❌ Nao foi possivel salvar', {
  description: 'Verifique sua conexao e tente novamente.',
})

// Warning
toast.warning('⚠️ Entregas atrasadas', {
  description: `${jobCode} tem ${N} entregas vencidas.`,
})

// Info
toast.info('ℹ️ Status atualizado', {
  description: `${jobCode} movido para Pos-Producao.`,
})
```

O emoji SEMPRE aparece no inicio do titulo (`title`), nunca na `description`. A description permanece limpa e factual.

---

### 14.8 Mockup ASCII Atualizado - Tabela com StatusBadge Novo

Antes (v2 original, com dot):

```
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | JOB                              | STATUS                | FINANCEIRO        | HLTH | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [BBB_001] • Campanha Verao 2026  | • Pre-Producao        |        R$ 45.000  |  85  |   |
|[x]|1 | ACME Corp / Agencia Digital Y   | Filme Pub.  · 28/02!  |  32% [verde====]  | [==] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
```

Depois (com emoji guide aplicado):

```
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | JOB                              | STATUS                | FINANCEIRO        | HLTH | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [BBB_001] • Campanha Verao 2026  | 📋 Pre-Producao       |        R$ 45.000  |  85  |   |
|[x]|1 | ACME Corp / Agencia Digital Y   | Filme Pub.  · 28/02!  |  32% [verde====]  | [==] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [002] • Institutional Video Z    | ✂️ Pos-Producao       |        R$ 18.000  |  42  |   |
|[ ]|2 | Empresa X                       | Branded Cont · 15/03  |  12% [verm=====]  | [= ] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [DOC_003] • Documentario Nordeste| 🎬 Em Filmagem        |        R$ 90.000  |  91  |   |
|[ ]|3 | Canal TV Globosat               | Documentario · 01/04  |  41% [amar====]   | [==] | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
|  |  | [004] • Evento Corporativo Anual | ⏳ Aguardando Aprova. |                 - |   -  |   |
|[ ]|4 | Startup ABC / Nenhuma agencia   | Evento                |                 - |      | . |
+--+--+----------------------------------+-----------------------+-------------------+------+--+
```

A diferenca e sutil mas impactante: o emoji `🎬` no status de filmagem chama atencao imediatamente. O `✂️` de pos-producao e reconhecido antes do texto ser lido. O `📋` de pre-producao transmite "planejamento em andamento". Isso e leitura em milissegundos, antes do processamento textual.

---

### 14.9 Regras de Consistencia

```
REGRAS OBRIGATORIAS:
1. Um status = um emoji SEMPRE. Nunca variar o emoji de um mesmo status.
2. Emoji de status em TODA ocorrencia do StatusBadge (tabela, kanban, detalhe do job, filtros).
3. Nao usar o mesmo emoji em dois status diferentes.
4. O emoji 🎬 (claquete) e reservado EXCLUSIVAMENTE para producao_filmagem e empty state.
   Nao usar em mais nenhum lugar - e o emoji mais forte da identidade audiovisual.

REGRAS DE TAMANHO:
5. Em badges (StatusBadge): emoji em text-[11px] - menor que o texto do badge (12px)
6. Em empty states: emoji em text-5xl (48px) - protagonista da tela
7. Em toasts: emoji no inicio do titulo, sem ajuste de tamanho (herda o tamanho do titulo)

REGRAS DE FALLBACK:
8. Se o emoji nao renderizar (ex: ambiente muito antigo), o StatusBadge
   deve degranar graciosamente para o dot colorido (usar CSS @supports
   ou feature detection em JavaScript se necessario).
   Na pratica, o suporte e amplo o suficiente para nao preocupar.

REGRAS DE ACESSIBILIDADE:
9. Todo emoji tem role="img" e aria-label em portugues.
10. Em contextos onde o texto adjacente ja comunica o significado
    (ex: StatusBadge com label), o aria-label do emoji e descritivo
    mas nao redundante: "claquete" ao inves de "em filmagem" (o texto ja diz isso).
```

---

### 14.10 Impacto em Outros Componentes

| Componente            | Mudanca necessaria                                   |
|-----------------------|------------------------------------------------------|
| StatusBadge.tsx       | Substituir dot por emoji (secao 14.5)                |
| JobsTable.tsx         | Nenhuma (herda do StatusBadge)                       |
| KanbanView.tsx        | Nenhuma (herda do StatusBadge)                       |
| JobDetail header      | Nenhuma (herda do StatusBadge)                       |
| JobFilters.tsx        | Atualizar chips de filtro de status para usar emojis |
| EmptyState.tsx        | Aceitar prop `emoji?: string` opcional               |
| Toast calls           | Adicionar emoji ao titulo em toda chamada de toast   |
| STATUS_EMOJI constant | Criar em src/constants/jobs.ts                       |

A mudanca de maior alcance e o `StatusBadge.tsx`. Como e um componente atomico usado em toda a aplicacao, atualizar ele propaga o emoji para todos os contextos de status automaticamente - sem necessidade de alterar cada pagina que usa o componente.

---

## Changelog

| Data       | Versao | Descricao                                                       |
|------------|--------|-----------------------------------------------------------------|
| 2026-02-18 | 2.0    | Redesign completo - tabela condensada, sem scroll, mais charme  |
| 2026-02-18 | 2.1    | Secao 14: Emoji Guide - uso estrategico em status, empty states e toasts |
