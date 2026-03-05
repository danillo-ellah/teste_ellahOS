# UI Design Spec — Cronograma: Visao Calendario Mensal

> Segunda visao do modulo de cronograma. Complementa o Gantt Chart horizontal ja implementado.
> Objetivo: substituir a planilha Google Sheets enviada ao cliente por um calendario digital bonito e exportavel como PDF.
> Design System: docs/design/design-system.md v1.0
> Data: 05/03/2026

---

## CHANGELOG

| Data       | Versao | Descricao                  |
|------------|--------|----------------------------|
| 05/03/2026 | 1.0    | Spec inicial — UI Designer |

---

## 1. Visao Geral e Objetivo

### O que e essa tela

A Visao Calendario e um grid de calendario mensal classico (Dom-Sab x semanas) onde cada celula
exibe as fases ativas naquele dia. E a visualizacao que o **cliente recebe** — precisa ser limpa,
profissional e ter cara de documento, nao de planilha.

A referencia e exatamente a planilha Google Sheets que a Ellah ja envia: um grid de mes com fases
empilhadas por dia, cada uma com emoji + nome. O ELLAHOS precisa superar esse visual.

### O que NAO e essa tela

Nao e um calendario de eventos geral do sistema. E especifico por job, vive dentro da aba
Cronograma do detalhe do job, como segunda visao alem do Gantt.

### Posicao na navegacao

```
Job Detail > aba "Cronograma" > toggle [Calendario | Gantt]
```

O toggle troca a visao sem mudar de rota. O estado da visao ativa persiste no localStorage por job.

---

## 2. Layout Geral — Desktop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [HEADER DO JOB — fixo, fora desta tela]                                    │
│  [TABS: Geral | Equipe | Entregaveis | Financeiro | Cronograma | ...]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  TOOLBAR (h-12, bg-background, border-b)                             │   │
│  │                                                                      │   │
│  │  [Gantt]  [Calendario]         < MAR 2026 >          [+ Fase] [PDF]  │   │
│  │   ghost    secondary (ativo)    titulo centraliz.    outline  primary│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  GRID DO CALENDARIO                                                  │   │
│  │                                                                      │   │
│  │  DOM    SEG    TER    QUA    QUI    SEX    SAB                        │   │
│  │ ──────────────────────────────────────────────                       │   │
│  │  [  ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]  [ 6 ]  [ 7 ]                    │   │
│  │        📋Pre   📋Pre   📅PPM                                          │   │
│  │        Prod.  Prod.                                                  │   │
│  │ ──────────────────────────────────────────────                       │   │
│  │  [ 8 ]  [ 9 ]  [10 ]  [11 ]  [12 ]  [13 ]  [14 ]                    │   │
│  │        🧰Prod  🧰Prod  🎬Grav  🎬Grav                                 │   │
│  │                       Dia 01  Dia 02                                 │   │
│  │ ──────────────────────────────────────────────                       │   │
│  │  [15 ]  [16 ]  [17 ]  [18 ]  [19 ]  [20 ]  [21 ]                    │   │
│  │         ✂️Off   ✂️Off   ✂️Off   ✂️Off   ✂️Off                          │   │
│  │         90"    90"    Red.   Red.   Red.                             │   │
│  │ ──────────────────────────────────────────────                       │   │
│  │  [22 ]  [23 ]  [24 ]  [25 ]  [26 ]  [27 ]  [28 ]                    │   │
│  │         💻On   💻On    📀Cop   📀Cop   ✨Fin                           │   │
│  │         line   line   ias    ias    aliz.                            │   │
│  │ ──────────────────────────────────────────────                       │   │
│  │  [29 ]  [30 ]  [31 ]                                                 │   │
│  │         ✨Fin   ✨Fin                                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  LEGENDA (inline, abaixo do grid)                                    │   │
│  │  [pill cor] Pre-Producao   [pill cor] Producao   [pill cor] Offline  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Toolbar — Especificacao Detalhada

### Layout da Toolbar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌────────────────┐    ┌──────────────────────┐    ┌─────────┐  ┌───────┐  │
│  │ [Cal] [Gantt]  │    │  <  MARCO 2026   >   │    │+ Fase   │  │ PDF   │  │
│  └────────────────┘    └──────────────────────┘    └─────────┘  └───────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Toggle de Visao (esquerda)

Dois botoes adjacentes sem gap, formando um grupo visual:

```
Visao Calendario ativa:
  [📅 Calendario]  — variant="secondary", rounded-l-md rounded-r-none, bg-muted
  [📊 Gantt    ]  — variant="ghost",     rounded-l-none rounded-r-md

Visao Gantt ativa:
  [📅 Calendario]  — variant="ghost",     rounded-l-md rounded-r-none
  [📊 Gantt    ]  — variant="secondary", rounded-l-none rounded-r-md
```

- Altura: h-8 (32px)
- Font: text-sm
- Icones: CalendarDays (Lucide) para Calendario, GanttChartSquare para Gantt
- Borda compartilhada entre os botoes: borda do grupo externo 1px border-border, rounded-md

### Navegacao de mes (centro)

```
  [ < ]   MARCO 2026   [ > ]
 ghost   heading-3 font-semibold  ghost
  w-8                              w-8
```

- O titulo do mes: `format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()`
- Setas: ChevronLeft e ChevronRight, tamanho 18px, ghost variant icon-only
- A seta esquerda (<) vai para o mes anterior
- A seta direita (>) vai para o mes seguinte
- Tooltip nas setas: "Mes anterior" / "Proximo mes"
- Se o mes nao tem nenhuma fase, as setas ainda funcionam (navega normalmente)

### Acoes (direita)

```
[+ Nova Fase]   [Exportar PDF]
  outline sm      primary sm
```

- "+ Nova Fase": abre o PhaseDialog existente (mesmo comportamento do Gantt)
- "Exportar PDF": aciona geracao do PDF do calendario (NOVO — ver secao 9)
- Icones: Plus para nova fase, Download para PDF
- Em mobile: somente icones (sem texto), aria-label obrigatorio

---

## 4. Grid do Calendario — Especificacao Detalhada

### Header dos dias da semana

```
DOM    SEG    TER    QUA    QUI    SEX    SAB
```

- 7 colunas de igual largura: `grid-cols-7`
- Altura do header: h-8 (32px)
- Fonte: `text-[11px] font-semibold uppercase tracking-wide text-muted-foreground`
- Texto centralizado em cada coluna
- DOM e SAB: `text-muted-foreground/60` (mais apagado — indicacao visual de FDS)
- Border-bottom: `border-b border-border`
- Background: `bg-neutral-50 dark:bg-neutral-900`

### Celula de dia

Cada celula representa um dia do mes. O grid tem 5-6 semanas conforme o mes.

```
┌─────────────────────────────────────────┐
│  28                                     │ ← numero do dia (topo-direito)
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ ✂️ Offline                       │   │ ← pill de fase
│  │    Reducao 60"                   │   │ ← complemento (italico, menor)
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ 💻 Online                        │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │ +2 mais...                       │   │ ← overflow badge (se > 3 fases)
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Altura das celulas:**
- Desktop (lg+): altura minima `min-h-[120px]`, sem maximo (expande com conteudo)
- Tablet (md): `min-h-[96px]`
- Mobile: `min-h-[64px]` (modo compacto com so emojis)

**Numero do dia:**
- Posicao: topo-direito, `p-1.5`
- Fonte: `text-sm font-medium`
- Cor padrao: `text-foreground`
- Hoje: `w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold`
- Dias do mes anterior/seguinte (se o grid tiver dias de outros meses para completar a semana): `text-muted-foreground/40`

**Background das celulas:**
- Dia normal: `bg-background`
- FDS (Dom e Sab): `bg-neutral-50 dark:bg-neutral-900/60`
- Hoje: sem background diferente na celula inteira — apenas o numero e destacado com o circle rose
- Dias de outros meses: `bg-neutral-50/50 dark:bg-neutral-900/30` com conteudo oculto (sem fases)
- Hover (celula clicavel para adicionar fase): `hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer`

**Bordas:**
- Border-right e border-bottom em todas as celulas: `border-border/60`
- A borda da celula de hoje: `ring-inset ring-1 ring-rose-500/40` (ring interno, nao ocupando espaco extra)

### Pill de fase dentro da celula

```
┌──────────────────────────────────────────────────────┐
│  ✂️  Offline                                         │
│     Reducao 60"                              (italic)│
└──────────────────────────────────────────────────────┘
```

- Container: `rounded-md px-1.5 py-0.5 mb-0.5 cursor-pointer`
- Background: `phase_color` com 15% de opacidade — `${phase_color}26` (hex com alpha)
- Border-left: `2px solid ${phase_color}`
- Hover: border-left sobe para 3px, background sobe para 25% opacidade, `transition-all duration-100`

**Linha principal (emoji + nome):**
- `text-[11px] font-medium leading-tight`
- Cor do texto: `${phase_color}` com `dark:brightness-110` para garantir legibilidade
- Truncate se o texto for longo: `truncate`

**Linha do complemento:**
- Visivel somente em desktop (lg+) e se o dia tiver altura suficiente
- `text-[10px] italic text-muted-foreground leading-tight truncate mt-0.5`
- Em tablet: oculto (`hidden md:block`)
- Em mobile: oculto sempre

**Apenas emoji (modo mobile):**
- Em mobile (<640px): mostra somente o emoji com tooltip no hover
- `text-base leading-none` dentro de um quadrado de 24x24px
- Tooltip (popover no touch): nome da fase + complemento

### Overflow de fases (mais de N fases num dia)

Limites de fases visiveis por celula:
- Desktop: 3 fases + badge "+N mais" se houver mais
- Tablet: 2 fases + badge
- Mobile: apenas emojis empilhados (sem badge de overflow, todos visiveis como emoji)

Badge de overflow:
```
+ 2 mais
```
- `text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted cursor-pointer`
- Click: abre um popover listando todas as fases do dia
- Hover: `hover:bg-muted/80`

### Popover de dia (overflow e mobile)

Abre ao clicar no badge "+N mais" ou em um emoji no mobile:

```
┌─────────────────────────────────────────┐
│  Sexta-feira, 14 de marco               │ ← titulo
│  ─────────────────────────────────────  │
│  ✂️ Offline                             │
│     Reducao 60"                         │
│  ─────────────────────────────────────  │
│  💻 Online                              │
│  ─────────────────────────────────────  │
│  📀 Copias                              │
│     Master + Residual                   │
└─────────────────────────────────────────┘
```

- shadcn/ui Popover, `max-w-[220px]`
- Cada item: clicavel, abre o PhaseDialog de edicao
- Fecha ao clicar fora ou pressionar Escape

---

## 5. Legenda

Abaixo do grid, uma linha de legenda mostrando as fases com suas cores:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Fases:  [▐ Pre-Producao]  [▐ Producao]  [▐ Offline]  [▐ Online]  +3 mais  │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Container: `flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border`
- Label "Fases:": `text-xs text-muted-foreground font-medium mr-1`
- Cada pill: `inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5`
  - Background: `${phase_color}15` (15% opacidade)
  - Texto: `${phase_color}` para dark, ligeiramente mais escuro para light
  - Indicador esquerdo: `w-2 h-2 rounded-full` com `background-color: ${phase_color}`
- Mostrar somente as fases que aparecem no mes atual (nao todas do job)
- "+ N mais" ao final se houver mais de 5 fases distintas no mes
- Click em cada pill: NADA (somente decorativo/informativo na legenda)

---

## 6. Estados da Tela

### Loading

```
┌──────────────────────────────────────────────┐
│  Toolbar: skeleton de 3 blocos               │
│  Grid: skeleton 5 linhas x 7 colunas         │
│  Cada celula: retangulo animado              │
└──────────────────────────────────────────────┘
```

- Usar `animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded`
- Celulas do grid: `h-[120px]` fixo durante loading
- Numero do dia: skeleton circulo 24px
- 2-3 pills skeleton por celula (alturas variadas para parecer real)

### Empty State — Nenhuma fase neste mes

```
┌──────────────────────────────────────────────┐
│                                              │
│  Grid vazio aparece normalmente (com nums)   │
│                                              │
│  Centro do grid:                             │
│    [CalendarDays icon 40px muted]            │
│    Nenhuma fase em marco                     │
│    Adicione fases para ver o cronograma      │
│    [+ Nova Fase]                             │
│                                              │
└──────────────────────────────────────────────┘
```

- Grid continua renderizando com os numeros dos dias (evita layout shift)
- O empty state flutua sobre o grid em posicao absoluta centralizada
- Background do empty state: `bg-background/80 backdrop-blur-sm rounded-lg p-8`

### Empty State — Job sem nenhuma fase cadastrada

- Igual ao acima, mas o texto e "Este job ainda nao tem fases no cronograma"
- Mostrar botao "Criar cronograma padrao" (bulk create)

### Erro de carregamento

- Substituir o grid por card de erro com botao "Tentar novamente"
- Icone AlertTriangle, texto explicativo, botao `onClick={refetch}`

---

## 7. Interacoes

### Click em fase (pill)

- Abre o `PhaseDialog` existente em modo edicao
- Passar a fase clicada como prop
- Ao salvar: invalida a query, grid re-renderiza

### Click em celula vazia

- Abre `PhaseDialog` em modo criacao
- Pre-preencher `start_date` e `end_date` com a data da celula clicada
- Usuario pode ajustar as datas no dialog

### Click em celula FDS

- Se a fase tem `skip_weekends: true`, as celulas de FDS com essa fase mostram o pill normalmente (a fase continua no grid como placeholder visual)
- Na logica: dias FDS sao incluidos na contagem do calendario se a fase os abrange, mas com estilo diferente
- FDS com fase ativa: pill com `opacity-50` + indicador visual `italic` no nome

**Decisao de design:** exibir fases em FDS no calendario mas com opacidade reduzida quando `skip_weekends = true`. Isso mantem a continuidade visual sem confundir o usuario (ver Pergunta P-1 na secao 12).

### Navegacao de mes (teclado)

- `ArrowLeft` / `ArrowRight`: navega entre meses quando o foco esta na toolbar
- `Home`: volta para o mes atual (mes que contem "hoje")
- Todos os controles focaveis via Tab

### Hover em pill

- Tooltip sutil (shadcn Tooltip): nome completo + complemento + datas (dd/MM ate dd/MM)
- Delay: 400ms (evitar tooltip agressivo)
- Conteudo:
  ```
  ✂️ Offline
  Reducao 60"
  10/mar — 20/mar (9 dias uteis)
  [Status: Em andamento]
  ```

### Drag and drop (FUTURO, nao implementar agora)

- Notar no codigo mas nao implementar: arrastar uma fase de um dia para outro para reposicionar
- Deixar comentario no componente: `// TODO: drag-to-reschedule (fase 2 do calendario)`

---

## 8. Responsividade

### Desktop (lg+, 1024px+)

Layout completo conforme spec acima. Celulas com `min-h-[120px]`, pills com texto completo e complemento visivel.

### Tablet (md, 768-1023px)

```
┌─────────────────────────────────────────────────────┐
│  Toolbar: toggle + navegacao (row)                  │
│           acoes ficam em dropdown "..." (MoreHoriz) │
│                                                     │
│  Grid: celulas min-h-[96px]                         │
│  Pills: sem complemento, texto truncado em 14 chars │
│  Max 2 pills visiveis + badge overflow              │
│  Header dias: "D S T Q Q S S" (inicial apenas)      │
└─────────────────────────────────────────────────────┘
```

### Mobile (< 768px)

```
┌───────────────────────────────┐
│  Toolbar compacta (2 linhas): │
│  Linha 1: toggle visao + PDF  │
│  Linha 2: < MARCO 2026 >      │
│                               │
│  Grid modo compacto:          │
│  DOM SEG TER QUA QUI SEX SAB  │
│  ─────────────────────────── │
│  [  ] [2 ] [3 ] [4 ] [5 ] ...│
│        ✂️   ✂️   📅            │
│        💻                     │
│  ─────────────────────────── │
│  (so emojis, sem texto)       │
│  (tap abre popover com lista) │
│                               │
│  Celulas: min-h-[64px]        │
└───────────────────────────────┘
```

**Mobile — detalhe do conteudo das celulas:**
- Apenas emojis empilhados verticalmente, tamanho `text-sm`
- Spacing entre emojis: `gap-0.5`
- Touch target de cada emoji: `min-w-[28px] min-h-[28px]` (area de toque segura)
- Tap em qualquer emoji ou na celula: abre popover listando todas as fases do dia
- Numero do dia: `text-xs font-medium` no canto superior direito

**Consideracao acessibilidade mobile:**
- Celulas FDS: background mais escuro igual ao desktop
- Hoje: border-bottom `border-b-2 border-rose-500` (mais visivel que o circulo em tela pequena)

---

## 9. Export PDF — Calendario Mensal

O PDF do calendario e um documento separado do PDF do Gantt atual. Formato A4 Landscape (deitado).
Exporta TODOS os meses do projeto que tenham fases, uma pagina por mes, em ordem crescente.
Meses totalmente vazios sao pulados.

### Layout do PDF

```
┌──────────────────────────────────────────────────────────────┐
│  [LOGO PRODUTORA]    CRONOGRAMA DE PRODUCAO    [LOGO CLIENTE]│  h-22mm
│                   NOME DO JOB                                │
│  ────────────── [faixa brand_color 2.5mm] ───────────────── │
│  Projeto: X | Codigo: EF-001 | Cliente: Y | Emitido: data   │
│ ┌────────────────────────────────────────────────────────┐   │
│ │  MARCO 2026                                            │   │
│ │  DOM   SEG   TER   QUA   QUI   SEX   SAB              │   │
│ │ ─────────────────────────────────────────────────     │   │
│ │       [1  ]  [2  ]  [3  ]  [4  ]  [5  ]  [6  ]       │   │
│ │              * ✂️ Offline - Reducao 60"                │   │
│ │              * 💻 Online                               │   │
│ │ ─────────────────────────────────────────────────     │   │
│ │  ...                                                   │   │
│ └────────────────────────────────────────────────────────┘   │
│  Fases: [pill] Pre-Producao  [pill] Offline  [pill] Online   │
│  ──────────────────────────────────────────────────────────  │
│  Gerado por ELLAHOS • ellahos.com.br          05 mar 2026    │
└──────────────────────────────────────────────────────────────┘
```

### Especificacoes do PDF

**Formato e orientacao:**
- A4 Landscape (297mm x 210mm) — colunas mais largas, cabe mais texto por fase
- Se o mes tiver 6 semanas, reduzir o font-size das celulas em 1pt
- Multi-pagina: uma pagina por mes com atividade, meses vazios sao pulados

**Header (identico ao PDF Gantt atual):**
- Reutilizar a logica do `CronogramaPdf.ts` para header, faixa brand_color e sub-header de metadados

**Corpo — o grid do calendario:**

Celulas do grid no PDF:
- 7 colunas de largura igual: `(CONTENT_W - GANTT_LABEL_W) / 7` mas sem label col — `CONTENT_W / 7`
- Altura por linha: `(espaco disponivel) / numero_de_semanas`
- Header de dias: "DOM SEG TER QUA QUI SEX SAB" — 8pt bold

Conteudo de cada celula:
- Numero do dia: `8pt bold`, topo-direito, `NEUTRAL_600`
- Hoje: circulo rose ao redor do numero (igual ao digital)
- FDS: background `NEUTRAL_100`
- Cada fase: texto em formato `"* emoji Nome - Complemento"` (exatamente como no Google Sheets original)
  - `7pt normal`, cor da fase
  - Se complemento: ` - complemento` na mesma linha ou linha abaixo em 6pt italic
  - Maximo de caracteres por linha: calcular por largura da coluna
  - Se muitas fases: reduzir font para 6pt

**Legenda no PDF:**
- Abaixo do grid, antes do footer
- Formato: `[quadrado 4x4mm cor]  Nome da fase   ` — 3 por linha, 7pt

**Nome do arquivo:**
- `calendario-{job_code}.pdf` (ex: `calendario-ef001.pdf`) — contem todos os meses do projeto

---

## 10. Dark Mode

Toda a tela deve funcionar em dark mode nativo (priority #1 do design system).

### Mapeamento de cores

| Elemento                | Light Mode                          | Dark Mode                               |
|-------------------------|-------------------------------------|-----------------------------------------|
| Background da pagina    | `#FFFFFF`                           | `#09090B`                               |
| Background do grid      | `#FFFFFF`                           | `#1F1F23`                               |
| Celula FDS              | `#FAFAFA`                           | `#18181B`                               |
| Celula hoje (borda)     | `ring-rose-500/40`                  | `ring-rose-400/50`                      |
| Numero hoje (circulo)   | `bg-rose-500 text-white`            | `bg-rose-400 text-white`                |
| Pill de fase (bg)       | `${phase_color}22` (13% opac)       | `${phase_color}33` (20% opac)           |
| Pill de fase (texto)    | `${phase_color}` (direto)           | `${phase_color}` com `filter: brightness(1.2)` |
| Bordas do grid          | `#E4E4E7` (zinc-200)                | `#3F3F46` (zinc-700)                    |
| Header dos dias         | `#FAFAFA`                           | `#18181B`                               |
| Texto dia               | `#09090B`                           | `#FAFAFA`                               |
| Texto dia outros meses  | `#A1A1AA` (zinc-400)                | `#52525B` (zinc-600)                    |
| Overflow badge          | `#F4F4F5 text-zinc-600`             | `#27272A text-zinc-400`                 |

**Nota sobre contraste dos pills:**
A cor da fase (`phase_color`) e sempre uma cor saturada da paleta (amber, violet, blue, etc.).
Em dark mode, usar a cor direta sobre fundo escuro garante bom contraste (ratio > 4.5:1 para todas
as cores da `PHASE_COLOR_PALETTE`). Verificar: amber (#F59E0B) sobre `#27272A` = 7.8:1. OK.

---

## 11. Componentes Necessarios

### Novos componentes

```
frontend/src/components/cronograma/
  CalendarView.tsx          — componente principal, substitui GanttChart na view calendario
  CalendarCell.tsx          — celula individual do grid (extrai por clareza)
  CalendarPhasePill.tsx     — pill de fase dentro da celula
  CalendarDayPopover.tsx    — popover com lista de fases do dia (overflow + mobile)
  CalendarMonthGrid.tsx     — grid completo com logica de datas
```

### Modificacoes em componentes existentes

```
CronogramaPdf.ts            — adicionar funcao generateCalendarioPdf() (nova, nao substitui a atual)
```

### Hooks — sem novos hooks necessarios

O hook `useJobPhases` ja fornece todos os dados. A logica de qual fase cai em qual dia e computada
dentro do `CalendarMonthGrid` usando as utilidades de `cronograma-utils.ts`.

### Nova funcao utilitaria (cronograma-utils.ts)

```typescript
// Retorna as fases ativas em um dia especifico
function getPhasesForDay(phases: JobPhase[], day: Date): JobPhase[]

// Retorna todos os dias do mes em formato de grade (incluindo dias de outros meses para completar semanas)
function getCalendarGrid(year: number, month: number): Date[][]
// Retorna: Array de semanas, cada semana e array de 7 Days
```

### Props dos componentes

**CalendarView:**
```typescript
interface CalendarViewProps {
  phases: JobPhase[]
  onPhaseClick: (phase: JobPhase) => void
  onAddPhase?: (date?: string) => void  // date: YYYY-MM-DD pre-selecionado
  isLoading?: boolean
}
```

**CalendarMonthGrid:**
```typescript
interface CalendarMonthGridProps {
  phases: JobPhase[]
  currentMonth: Date                    // primeiro dia do mes exibido
  onPhaseClick: (phase: JobPhase) => void
  onDayClick?: (date: Date) => void     // click em celula vazia
}
```

**CalendarCell:**
```typescript
interface CalendarCellProps {
  date: Date
  phases: JobPhase[]                    // ja filtradas para esse dia
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  onPhaseClick: (phase: JobPhase) => void
  onClick?: (date: Date) => void        // click na celula vazia
}
```

**CalendarPhasePill:**
```typescript
interface CalendarPhasePillProps {
  phase: JobPhase
  isWeekend: boolean                    // se FDS + skip_weekends -> opacity-50
  showComplement?: boolean              // false em tablet/mobile
  onClick: (phase: JobPhase) => void
}
```

---

## 12. Logica de Distribuicao de Fases por Dia

### Como determinar quais fases aparecem em um dia

Uma fase aparece em um dia se:
```
phase.start_date <= day <= phase.end_date
```

Isso inclui todos os dias do range, incluindo FDS. Se a fase tem `skip_weekends = true` e o dia e
FDS, o pill ainda aparece porem com `opacity-50 italic`.

**Ordenacao das fases dentro de uma celula:**
1. Por `sort_order` crescente (mesma ordem da PhaseList)
2. Fases com status `in_progress` primeiro dentro de cada sort_order

### Geracao do grid de calendario

O grid inclui dias de meses adjacentes para completar as semanas:

```
Marco 2026:
  1 de marco = domingo → comeca na coluna DOM, sem dias do mes anterior
  31 de marco = terca-feira → completar com 3 dias de abril (qua, qui, sex, sab)

Grid resultante (5 semanas x 7 dias):
  DOM SEG TER QUA QUI SEX SAB
   1   2   3   4   5   6   7
   8   9  10  11  12  13  14
  15  16  17  18  19  20  21
  22  23  24  25  26  27  28
  29  30  31 [1] [2] [3] [4]  ← [1][2][3][4] de abril, estilo apagado
```

Os dias de outros meses: sem fases, estilo apagado, NAO clicaveis para adicionar fase.

---

## 13. Animacoes e Transicoes

Seguir os principios do design system: sutis, nunca blocking, max 300ms.

| Interacao               | Animacao                                           | Duracao |
|-------------------------|----------------------------------------------------|---------|
| Troca de mes (<>)       | Fade out + slide da direcao correta + fade in      | 200ms   |
| Toggle Gantt/Calendario | Crossfade (opacity 0→1)                            | 150ms   |
| Hover em pill           | Border-left 2→3px + bg opacity up                 | 100ms   |
| Abrir popover do dia    | Scale 0.95→1 + fade in (shadcn padrao)             | 150ms   |
| Loading → conteudo      | Fade in do grid                                    | 200ms   |

**Animacao de troca de mes:**

Ao clicar em "<" (mes anterior): o grid desliza para a direita (conteudo novo entra pela esquerda)
Ao clicar em ">" (proximo mes): o grid desliza para a esquerda (conteudo novo entra pela direita)

Implementacao sugerida com Framer Motion:
```
variants={{
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
  }),
}}
transition={{ duration: 0.2, ease: 'easeOut' }}
```

**Respeitar `prefers-reduced-motion`:**
Se o usuario tiver `prefers-reduced-motion: reduce`, substituir todas as animacoes por crossfade
simples (opacity only, 100ms).

---

## 14. Acessibilidade

### Navegacao por teclado

- **Tab**: percorre toolbar, grid, celulas, pills, legenda
- **Enter / Space**: ativa o elemento focado (pill → abre dialog, seta → navega mes)
- **Escape**: fecha popover de dia, fecha dialog de edicao
- **Arrow keys**: dentro do grid de calendario, navega entre dias (implementar `onKeyDown`)
- **Home**: vai para hoje (mes atual)

### ARIA attributes

```html
<!-- Grid -->
<div role="grid" aria-label="Calendario de marco de 2026">

  <!-- Header row -->
  <div role="row">
    <div role="columnheader" aria-label="Domingo">DOM</div>
    ...
  </div>

  <!-- Week rows -->
  <div role="row">
    <!-- Celula de dia -->
    <div
      role="gridcell"
      aria-label="2 de marco, segunda-feira, 3 fases"
      aria-selected="false"
      tabIndex={0}
    >
      <!-- Pills de fase -->
      <button
        aria-label="✂️ Offline - Reducao 60" - 10 a 20 de marco"
        onClick={...}
      >
```

### Anuncio de mudancas dinamicas

- Troca de mes: `aria-live="polite"` no titulo "MARCO 2026" — anuncia o novo mes ao trocar
- Abertura de dialog: focus automatico no primeiro campo do form
- Toast de sucesso ao salvar: anunciado pelo Sonner (ja tem aria-live)

### Contraste

Todos os pills usam cores da `PHASE_COLOR_PALETTE`. Verificacao de contraste minimo (4.5:1) para
texto escuro sobre background claro das pills:
- Amber #F59E0B sobre #FFF7E6 (amber-50): ratio 2.4:1 — FALHA
- Solucao: usar o texto com a cor da fase (nao sobre fundo claro) mas sobre o fundo neutro da celula
- O texto da pill usa `${phase_color}` sobre `bg-background` (nao sobre o pill background)
- Verificado: amber #F59E0B sobre `#FFFFFF` = 2.4:1 — ainda falha
- **Solucao definitiva**: usar versao mais escura da cor para o texto no light mode

**Regra de contraste dos pills — light mode:**
- Se `phase_color` for uma cor clara (luminosidade > 0.4): usar `phase_color_dark` = cor 700 do Tailwind equivalente
- Simplificado: criar um helper `getPhaseTextColor(phase_color, isDark)` que:
  - Dark mode: retorna a cor direta (toda a paleta tem bom contraste sobre fundo escuro)
  - Light mode: escurece a cor em 30% (pode usar `darken` do polished, ou calcular manualmente)

Esta e uma nota para o dev implementar. O designer aprova a abordagem de escurecer no light mode.

---

## 15. Decisoes de Design com Justificativas

### D1 — Toggle como botoes, nao como tabs

Escolhido botoes tipo "button group" (secundario/ghost) em vez de Tabs do shadcn/ui.

**Justificativa:** Tabs do shadcn tem semantica de paneis (`tabpanel` + `tablist`) que implica
mudanca de secao da pagina. O toggle entre Calendario/Gantt e apenas uma mudanca de visualizacao
do mesmo conjunto de dados. Botoes group sao semanticamente corretos e visualmente mais compactos.
Referencia: exatamente como Monday.com e Linear fazem o toggle de visao.

### D2 — Celulas expandem com conteudo, sem scroll interno

Em vez de celulas de altura fixa com overflow scroll, as celulas crescem verticalmente.

**Justificativa:** Em dias com muitas fases, scroll invisivel dentro de uma celula e antipatico
(usuario nao descobre). Limitar visualmente com badge "+N mais" e mais honesto. No PDF, a logica
e diferente (ver D5).

### D3 — FDS com opacidade 50% quando skip_weekends=true

Fases com `skip_weekends=true` ainda aparecem nos dias FDS no calendario, porem com `opacity-50`.

**Justificativa:** A Ellah usa o calendario para comunicacao com o cliente. Se uma fase vai de
segunda a sexta, o cliente precisa enxergar o "buraco" nos FDS para entender que esses dias nao
contam. Remover completamente a fase nos FDS causaria confusao visual (parece que a fase parou e
voltou). O visual apagado comunica "existe mas nao conta".

### D4 — Emojis OBRIGATORIOS, mesmo em mobile

No mobile, o modo e "somente emoji" (sem texto). O emoji e suficiente para o profissional
reconhecer a fase — e identidade visual consolidada.

**Justificativa:** A Ellah Filmes usa emojis ha anos nos Sheets. A equipe inteira reconhece
✂️ como Offline, 🎬 como Gravacao, etc. Remover os emojis em mobile seria um downgrade de UX.

### D5 — PDF formato A4 Landscape (deitado)

O PDF do Calendario e A4 Landscape (deitado), igual ao que a Ellah ja usa nos Sheets.

**Justificativa:** A Ellah sempre envia cronogramas deitados — colunas mais largas cabem mais
texto por fase. A4 Landscape da 297mm de largura para o grid (~38mm por coluna), suficiente
para 3-4 fases por celula com complemento. Tambem otimizado pra celular (scroll horizontal natural).

### D6 — Mes navegavel independente da data das fases

O usuario pode navegar para qualquer mes, mesmo que nao tenha fases naquele periodo.

**Justificativa:** O usuario pode querer verificar "o que temos planejado para agosto?" mesmo sem
fases la ainda. O estado de "mes sem fases" tem seu proprio empty state (ver secao 6).

### D7 — Click em celula vazia abre criacao de fase com data pre-preenchida

**Justificativa:** UX de calendario e universal — o usuario espera que clicar em um dia crie algo
naquele dia. Pre-preencher a data reduz atrito. O usuario ainda pode mudar a data no dialog.

---

## 16. Mockup Textual — Celula Densa (Desktop)

Exemplo de celula para o dia 14/03 (sexta-feira) com 4 fases:

```
┌─────────────────────────────────────────────┐
│                                          14  │  ← numero topo-direito, text-sm font-medium
│  ┌─────────────────────────────────────┐    │
│  │▐ 🎬 Gravacao                        │    │  ← borda-left 2px #EF4444 (red)
│  │  Diaria 02                         │    │  ← complemento italic 10px muted
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │▐ 🎥 Aprovacao de Diretor            │    │  ← borda-left 2px #A855F7 (purple)
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │▐ 🗂️ Logagem                        │    │  ← borda-left 2px #06B6D4 (cyan)
│  └─────────────────────────────────────┘    │
│  ┌─────────────────────────────────────┐    │
│  │  + 1 mais...                        │    │  ← overflow badge, text-xs muted
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

Celula do mesmo dia em mobile:
```
┌─────────┐
│      14 │
│  🎬     │
│  🎥     │
│  🗂️     │
│  +1     │
└─────────┘
```

---

## 17. Mockup Textual — Semana Completa (Desktop)

```
  DOM         SEG              TER              QUA              QUI             SEX              SAB
┌───────────┬────────────────┬────────────────┬────────────────┬───────────────┬────────────────┬───────────┐
│           │   9            │  10            │  11            │  12           │  13            │  14       │
│           │                │                │                │               │                │           │
│           │ ▐ 🧰 Producao  │ ▐ 🧰 Producao  │ ▐ 🎬 Gravacao  │ ▐ 🎬 Gravacao │                │           │
│           │   Setup        │   Setup        │   Diaria 01   │   Diaria 02   │                │           │
│           │                │                │                │               │                │           │
│           │                │                │                │               │                │           │
└───────────┴────────────────┴────────────────┴────────────────┴───────────────┴────────────────┴───────────┘
 ^^^^^^^^^^^ FDS: bg-neutral-50/dark:bg-neutral-900                              ^^^ vazio, sexta-feira
```

---

## 18. Perguntas para o Danillo

As decisoes abaixo precisam de confirmacao antes da implementacao.

### P-1 — FDS em fases com skip_weekends: mostrar ou ocultar?
**DECIDIDO: Opcao A** — Mostrar com opacity 50%. O cliente ve que a fase existe mas esta "pausada" no FDS.

### P-2 — Orientacao do PDF do Calendario
**DECIDIDO: A4 Landscape (deitado)** — Igual ao que a Ellah ja usa nos Sheets enviados ao cliente.
Otimizado tanto pra documento quanto pra visualizacao no celular.

### P-3 — Mes inicial ao abrir o Calendario
**DECIDIDO: Mes atual (hoje)** — Mas com navegacao livre pra qualquer mes (setas < >).
O usuario quer ver "onde estamos agora" por padrao, mas ter total liberdade pra navegar.

### P-4 — Click em celula vazia no FDS
**DECIDIDO: Opcao B** — Sim, abre dialog de criacao com aviso visual de que e um FDS.

### P-5 — Legenda: mostrar fases de todo o job ou so do mes?
**DECIDIDO: Opcao A** — So as fases do mes atual. Legenda limpa e contextual.

### P-6 — Export PDF: mes unico ou multiplos meses?
**DECIDIDO: Todos os meses com atividade, em ordem crescente.**
Uma pagina por mes. Meses totalmente vazios sao pulados (nao gera pagina vazia).
O cliente recebe o projeto INTEIRO no PDF.

---

## 19. Relacao com os Componentes Existentes

| Componente existente     | Relacao com o Calendario                               |
|--------------------------|--------------------------------------------------------|
| `GanttChart.tsx`         | Irmaos — ambos mostrados via toggle, nunca juntos      |
| `PhaseList.tsx`          | Sem relacao direta — editor de fases, nao visualizacao |
| `PhaseDialog.tsx`        | Reutilizado sem modificacao — abre ao clicar em fase   |
| `CronogramaPdf.ts`       | Nova funcao `generateCalendarioPdf()` adicionada       |
| `useJobPhases.ts`        | Reutilizado sem modificacao — unica fonte de dados     |
| `cronograma-utils.ts`    | Adicionar `getPhasesForDay()` e `getCalendarGrid()`    |

---

## 20. Contexto de Uso — Onde Este Componente Vive

A pagina do cronograma provavelmente esta em:
`/jobs/[id]/cronograma` ou integrada como tab em `/jobs/[id]`.

O componente raiz que controla o toggle Gantt/Calendario deve:
1. Manter `activeView: 'calendar' | 'gantt'` em estado local
2. Persistir em `localStorage` com chave `cronograma-view-${jobId}`
3. Renderizar condicionalmente `<GanttChart>` ou `<CalendarView>`
4. Passar `phases`, `onPhaseClick` e `onAddPhase` para ambos
5. Conter a toolbar com o toggle e a navegacao de mes apenas quando `activeView === 'calendar'`

A toolbar do Gantt (se houver) permanece como estava. O header da pagina com "+ Nova Fase" e
"Exportar PDF (Gantt)" provavelmente ja existe — o botao "Exportar PDF Calendario" e um botao
adicional que aparece somente na view de calendario.
