# UI Spec — Visao Calendario Mensal do Cronograma

> Modulo de Cronograma — nova visao complementar ao Gantt existente.
> Replica a "Aba Calendario" do Google Sheets da Ellah Filmes, mas dentro do ELLAHOS.
> Design System: docs/design/design-system.md
> Componentes existentes: GanttChart.tsx, PhaseList.tsx, PhaseDialog.tsx
> Revisao: 05/03/2026

---

## 1. Contexto e Objetivo

O usuario atual usa duas abas no Google Sheets:
- **"Processo"**: tabela de dados (ja mapeada no PhaseList + GanttChart)
- **"Calendario"**: grid mensal visual para enviar ao cliente

A CalendarView e a representacao direta do "Calendario" do Sheets dentro do ELLAHOS.
O valor principal e **comunicacao com o cliente** — o calendário mostra o cronograma
no formato que ele ja conhece, com emojis, fases empilhadas por dia e visual limpo.

### O que nao e esse componente
- Nao e um editor de fases (isso e o PhaseDialog)
- Nao e um calendario de eventos do sistema (isso seria agenda geral)
- Nao substitui o Gantt — os dois modos coexistem com toggle

---

## 2. Arquitetura de Visoes

O modulo Cronograma passara a ter tres visoes acessiveis por toggle na toolbar:

```
[Gantt] [Calendario] [Lista]
          ^
          nova
```

O toggle usa o mesmo padrao visual ja adotado em outros modulos do EllahOS
(ToggleGroup do shadcn/ui, variante outline).

---

## 3. Wireframe ASCII — Desktop (lg+ / 1024px+)

### 3.1 Toolbar do Cronograma (compartilhada entre visoes)

```
+===========================================================================+
|                                                                           |
|  [CalendarRange]  Cronograma                 [Gantt][Calendario][Lista]  |
|                                                [+ Fase]  [Exportar v]    |
|                                                                           |
+===========================================================================+
```

Notas:
- Toggle de visao: `ToggleGroup` com 3 itens — icones `BarChart2` / `CalendarDays` / `List`
- Labels aparecem ao lado dos icones em desktop, so icones em mobile
- Exportar: dropdown — "Exportar PDF" e, futuramente, "Exportar XLSX"
- Botao "+ Fase" sempre visivel independente da visao ativa

### 3.2 Header do Calendario (navegacao de mes)

```
+===========================================================================+
|                                                                           |
|   [<]   Marco 2026                                          [>]  [Hoje]  |
|                                                                           |
+===========================================================================+
```

Elementos:
- Seta esquerda: `ChevronLeft` (ghost button, 36px)
- Titulo: `heading-2` (20px semi-bold), formato "Marco 2026" em pt-BR
- Seta direita: `ChevronRight` (ghost button, 36px)
- Botao "Hoje": `outline` button pequeno, ativa o mes atual e destaca hoje
- Animacao de troca de mes: `transition-opacity duration-200` + slide sutil horizontal

### 3.3 Grid Mensal — Desktop (7 colunas)

```
+===========================================================================+
|  DOM    SEG    TER    QUA    QUI    SEX    SAB                            |
+=========+======+======+======+======+======+======+
|  [1]    |  [2] |  [3] |  [4] |  [5] |  [6] |  [7] |
|         |      |      |      |      |      |      |
|         |      |      |      |      |      |      |
+---------+------+------+------+------+------+------+
|  [8]    |  [9] | [10] | [11] | [12] | [13] | [14] |
|         | ✂️ Offline    |      | 🎬 Grav.   |      |
|         | 90"           |      |             |      |
+---------+------+------+------+------+------+------+
| [15]    | [16] | [17] | [18] | [19] | [20] | [21] |
| 🎬 Grav.| 🎬 Grav.| ✂️ Offline | ✂️ Offline | ✂️ Offline |      |      |
|          |      | 90"  | 90"  | 90"  |      |      |
+---------+------+------+------+------+------+------+
| [22]    | [23] | [24] | [25] | [26] | [27] | [28] |
|         | ✂️ Offline  | ✂️ Ajustes  | ✂️ Ajustes  | 💻 Online  |      |      |
|         | 90"  | Reduc. 60"  | Reduc. 60"  |      |      |      |
+---------+------+------+------+------+------+------+
| [29]    | [30] | [31] |      |      |      |      |
| 💻 Online|💻 Online|      |      |      |      |      |
|         |      |      |      |      |      |      |
+---------+------+------+------+------+------+------+
```

Notas de layout:
- Header de dias da semana: `overline` (11px uppercase tracking-wide), texto `text-muted-foreground`
- Domingo e Sabado: colunas com `bg-neutral-50 dark:bg-neutral-900/60` (sutil, nao invasivo)
- Dias de meses anterior/proximo: numero em `text-muted-foreground/40`, sem fases
- Grid: `grid grid-cols-7`, cada celula `min-h-[100px]` desktop

### 3.4 Anatomia de uma Celula

```
+---------------------------+
| [numero do dia]      [*]  |  <- asterisco = tem mais fases (overflow indicator)
|                           |
|  [cor] emoji Label curto  |  <- chip de fase (altura fixa ~20px)
|  [cor] emoji Label curto  |  <- segunda fase do dia
|  [cor] emoji Label curto  |  <- terceira fase
|  + 2 mais...              |  <- overflow badge se > 3 fases
|                           |
+---------------------------+
```

**Numero do dia:**
- Font: `caption` (12px) font-medium
- Cor normal: `text-foreground`
- Cor "hoje": circulo rose-500 preenchido, texto branco (`rounded-full w-6 h-6 bg-rose-500 text-white flex items-center justify-center text-[11px] font-semibold`)
- Cor fim de semana: `text-muted-foreground`
- Cor fora do mes: `text-muted-foreground/40`

**Chip de fase:**
```
[barra-cor] [emoji] [label] [complement?]
```
- Container: `flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] leading-none`
- Background: `{phase_color}18` (hex opacity ~10%)
- Borda esquerda: `border-l-2 border-{phase_color}` (usando inline style)
- Emoji: tamanho natural do texto (11px)
- Label: truncate, max ~16 chars visivel
- Complement (se existir): `text-muted-foreground` italic, separado por espaco
- Hover: `{phase_color}28` (opacity ~16%), cursor pointer
- Click: abre PhaseDialog no modo edicao

**Overflow badge (quando > 3 fases no dia):**
- Texto: `+ N mais` em `caption` `text-muted-foreground`
- Hover: tooltip com lista completa das fases do dia
- Click: abre um popover com todas as fases do dia

---

## 4. Wireframe ASCII — Mobile (< 768px)

No mobile o grid 7 colunas fica impraticavel. A visao e convertida para
**lista vertical de dias**, mostrando apenas os dias que tem fases (dias vazios sao omitidos
ou colapsados com separador de semana).

```
+================================+
|  [<] Marco 2026 [>]    [Hoje]  |
+================================+
|                                |
|  Semana de 9 a 15 de marco     |  <- separador de semana (overline)
|                                |
|  +----------------------------+|
|  | Seg 9  |  ● Hoje           ||  <- badge "Hoje" inline
|  |                            ||
|  |  ✂️ Offline · 90"          ||  <- chip expandido (full width)
|  |  🎬 Gravacao               ||
|  +----------------------------+|
|                                |
|  Qui 12                        |
|  +----------------------------+|
|  |  🎬 Gravacao               ||
|  +----------------------------+|
|                                |
|  Semana de 16 a 22 de marco    |
|                                |
|  Seg 16                        |
|  +----------------------------+|
|  |  🎬 Gravacao               ||
|  |  ✂️ Offline · 90"          ||
|  +----------------------------+|
|                                |
|  ... mais dias com fases ...   |
|                                |
+================================+
```

Notas mobile:
- Dias sem fases sao omitidos completamente
- Separadores de semana em `overline` text-muted
- Chips de fase ocupam a largura toda (sem truncate, mostram complemento)
- Swipe horizontal NAO — toda a interacao e scroll vertical
- Tap no chip abre `Sheet` bottom-up (mesmo comportamento do PhaseDialog isMobile)

---

## 5. Estados do Componente CalendarView

### 5.1 Loading

```
+===========================================================================+
|  [<]  Carregando...                                       [>]  [Hoje]    |
+===========================================================================+
|  DOM  SEG  TER  QUA  QUI  SEX  SAB                                       |
+======+=====+=====+=====+=====+=====+=====+
|  [   skeleton h-4 w-4 rounded  ]         |  <- linha de numero
|  [   skeleton h-5 rounded-md   ]         |  <- linha de fase
|  [   skeleton h-5 rounded-md   ]         |
+=========================================+
```

Usar `Skeleton` do shadcn/ui. Repetir o pattern de skeleton para 5 semanas x 7 dias.
Cada celula: numero skeleton (w-5 h-5 rounded-full) + 1-2 barras skeleton (h-4 rounded).

### 5.2 Empty (sem fases cadastradas)

```
+===========================================================================+
|  [<]  Marco 2026                                          [>]  [Hoje]    |
+===========================================================================+
|  DOM  SEG  TER  QUA  QUI  SEX  SAB                                       |
+=========================================================================+
|                                                                           |
|       [CalendarRange icon 40px text-muted]                               |
|                                                                           |
|       Nenhuma fase neste mes                                              |
|       Adicione fases ao cronograma para visualizar                        |
|       no calendario.                                                      |
|                                                                           |
|       [+ Adicionar Fase]   (primary button)                              |
|                                                                           |
+=========================================================================+
```

- Grid de dias e renderizado normalmente (com numeros), so fases estao vazias
- Empty state aparece sobreposto ao centro do grid como overlay sutil

### 5.3 Erro

```
|  [AlertTriangle amber-500]                                                |
|  Nao foi possivel carregar o cronograma.    [Tentar novamente]            |
```

### 5.4 Populated (padrao)

Grid com fases renderizadas conforme wireframes acima.

### 5.5 Hover em chip de fase

- Background do chip sobe de `color/10` para `color/20`
- Cursor pointer
- Tooltip aparece apos 300ms:

```
+---------------------------+
|  ✂️ Offline               |
|  ─────────────────────    |
|  90"                      |
|  15 mar - 25 mar 2026     |
|  9 dias uteis             |
|  ● Em andamento           |
+---------------------------+
```

Tooltip: mesmo estilo do GanttTooltip existente (`bg-neutral-900 text-white rounded-lg p-3 shadow-xl text-xs`).

### 5.6 Dia selecionado (click no numero do dia)

- Borda do dia: `ring-2 ring-rose-400/50 rounded-md`
- Popover lista todas as fases do dia, mesmo aquelas truncadas pelo overflow
- Popover fecha ao clicar fora (Radix Popover padrao)

### 5.7 Fases que cruzam fim de semana

Se `skip_weekends = true` a fase ainda aparece no chip do dia de inicio/fim,
mas os dias de sabado e domingo nao exibem o chip (fase "pausa" no FDS).
Um indicador sutil no chip do dia anterior: pequeno icone `PauseCircle` 10px text-muted.

---

## 6. Especificacao de Cores e Tokens

### 6.1 Celulas do Grid

```
ESTADO                    LIGHT MODE                   DARK MODE
──────────────────────────────────────────────────────────────────
Dia normal                bg-white / bg-card            bg-card (zinc-900/neutral-850)
Dia fim de semana         bg-neutral-50                 bg-neutral-900/60
Dia hoje                  bg-rose-500/5                 bg-rose-500/8
Dia fora do mes           bg-neutral-50/50 opacity-60   bg-neutral-900/30 opacity-50
Dia hover                 bg-neutral-50                 bg-neutral-800/50
Dia selecionado           ring-2 ring-rose-400/40       ring-2 ring-rose-400/30
```

### 6.2 Chips de Fase

```
ESTADO          BG                  BORDER-LEFT         TEXT
──────────────────────────────────────────────────────────────
Normal          {color}18           2px {color}         {color} para emoji, foreground para label
Hover           {color}28           2px {color}         mesmo
Fase atual      {color}28           3px {color}         mesmo + ring-1 ring-{color}/30
Fase concluida  {color}10           1px {color}/50      text-muted (opacidade reduzida)
```

### 6.3 Header de Dias da Semana

```
DOM    SEG    TER    QUA    QUI    SEX    SAB
text-muted-foreground uppercase overline (11px tracking-wide)
DOM e SAB: text-muted-foreground/60 (mais apagado — FDS)
```

### 6.4 Bordas do Grid

```
Celula border: border border-border
Celula corner radius: rounded-none (grid sem gaps, bordas colapsam como tabela)
Container border-radius: rounded-lg (so no container externo)
```

---

## 7. Especificacao de Tipografia

```
ELEMENTO                    TAILWIND                    PX
────────────────────────────────────────────────────────
Header mes (titulo)         text-xl font-semibold       20px
Dia da semana (header)      text-[11px] uppercase       11px
                            tracking-wide font-semibold
                            text-muted-foreground
Numero do dia (normal)      text-xs font-medium         12px
Numero do dia (hoje)        text-[11px] font-semibold   11px (dentro do circulo)
Emoji da fase no chip       text-[11px]                 11px
Label da fase no chip       text-[11px] font-medium     11px truncate
Complement da fase no chip  text-[10px] italic          10px
                            text-muted-foreground
Overflow badge "+ N mais"   text-[10px]                 10px
                            text-muted-foreground
Semana separator (mobile)   text-[10px] uppercase       10px
                            tracking-wider
                            text-muted-foreground
```

---

## 8. Espacamento (4-point grid)

```
Container do calendario:    p-0 (sem padding, grid ocupa tudo)
Container externo:          rounded-lg border border-border overflow-hidden
Header de navegacao:        px-4 py-3 (16px/12px) flex items-center justify-between
Header de dias da semana:   h-8 (32px) flex items-center justify-center
                            border-b border-border bg-muted/30
Celula do dia (desktop):    min-h-[100px] p-2 gap-1 flex flex-col
                            border-r border-b border-border last:border-r-0
Chip de fase:               px-1.5 py-0.5 gap-1 rounded-md
Gap entre chips:            gap-0.5 (2px)
Numero do dia:              mb-1 (4px abaixo do numero)
```

---

## 9. Comportamento de Overflow (muitas fases num dia)

### Regra de exibicao por breakpoint:

```
BREAKPOINT      CHIPS VISIVEIS    COMPORTAMENTO RESTANTES
──────────────────────────────────────────────────────────
lg+ (desktop)   max 3             badge "+ N mais" clicavel
md (tablet)     max 2             badge "+ N mais" clicavel
< sm (mobile)   lista vertical    todos mostrados (sem overflow)
```

### Popover de overflow (click em "+ N mais"):

```
+-------------------------+
|  15 de marco             |  <- titulo
|  ─────────────────────   |
|  ✂️ Offline · 90"        |  <- todos os chips do dia, full width
|  🎬 Gravacao             |
|  💻 Online               |
|  📅 PPM · 10:30          |
|                           |
|  [Editar Cronograma]     |  <- link para abrir PhaseDialog
+-------------------------+
```

- Componente: `Popover` + `PopoverContent` do shadcn/ui
- Max-height: 300px com overflow-y-auto se muitas fases
- Cada item clicavel: abre PhaseDialog daquela fase

---

## 10. Interacoes e Animacoes

### 10.1 Navegacao entre meses

```
Trigger: click em [<] ou [>]
Animacao: fade + translate sutil
  - Sair: opacity-0 translateX(-8px) em 120ms ease-in
  - Entrar: opacity-0 translateX(8px) -> opacity-1 translateX(0) em 180ms ease-out
  - Total: ~300ms (dentro do limite do design system)
Lib sugerida: Framer Motion (ja na stack) com AnimatePresence
  key={`${ano}-${mes}`} na grid para trigger correto
```

### 10.2 Click em chip de fase

```
Trigger: click no chip
Acao: onPhaseClick(phase) — mesmo callback do GanttChart
Resultado: abre PhaseDialog no modo edicao
  - Desktop: Dialog max-w-lg (comportamento atual)
  - Mobile: Sheet side="bottom" (comportamento atual)
```

### 10.3 Click no numero do dia

```
Trigger: click no numero
Acao: abre Popover com todas as fases do dia
  (mesmo popover de overflow, mas sempre, nao so quando ha overflow)
  Se dia sem fases: popover mostra "Sem fases neste dia" + link "+ Adicionar Fase"
```

### 10.4 Hover no chip (desktop only)

```
Trigger: mouseenter com delay 300ms (evitar flicker ao mover mouse)
Componente: Tooltip (Radix, mesmo do GanttTooltip)
Conteudo: nome completo + complement + datas + dias + status
Posicao: above (preferred), fallback below
```

### 10.5 Scrolling mobile

```
Comportamento: scroll vertical nativo (sem virtualizing — numero de dias e limitado)
Pull-to-refresh: NAO (nao e feed dinamico)
```

---

## 11. Componentes a Criar

### 11.1 `CalendarView.tsx`

**Responsabilidade:** Componente orquestrador. Gerencia estado do mes selecionado,
calculo de dias do grid, distribuicao de fases por dia, e renderizacao do grid.

```typescript
interface CalendarViewProps {
  phases: JobPhase[]
  onPhaseClick?: (phase: JobPhase) => void
}
```

**Logica interna:**
- `selectedMonth: Date` — estado local, inicializa no mes da primeira fase ativa
  (ou mes atual se nao ha fases)
- `calendarDays: CalendarDay[]` — memoizado, calculado a partir de `selectedMonth`
- `phasesByDay: Map<string, JobPhase[]>` — memoizado, fases agrupadas por YYYY-MM-DD

```typescript
interface CalendarDay {
  date: Date
  dateStr: string        // YYYY-MM-DD para lookup no Map
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  phases: JobPhase[]     // fases que incluem este dia
}
```

**Algoritmo de distribuicao de fases por dia:**

Para cada JobPhase com `start_date` e `end_date`:
1. Iterar por todos os dias entre start_date e end_date
2. Para cada dia: se `skip_weekends = true` e o dia for sabado/domingo, pular
3. Adicionar a fase no array do dia no Map

### 11.2 `CalendarHeader.tsx`

**Responsabilidade:** Navegacao de mes (setas + titulo + botao Hoje).

```typescript
interface CalendarHeaderProps {
  currentMonth: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onGoToToday: () => void
}
```

### 11.3 `CalendarGrid.tsx`

**Responsabilidade:** Renderiza o grid 7 colunas com header de dias da semana.

```typescript
interface CalendarGridProps {
  days: CalendarDay[]
  onPhaseClick?: (phase: JobPhase) => void
  onDayClick?: (day: CalendarDay) => void
}
```

### 11.4 `CalendarCell.tsx`

**Responsabilidade:** Uma celula do grid (um dia). Gerencia exibicao dos chips
e logica de overflow.

```typescript
interface CalendarCellProps {
  day: CalendarDay
  onPhaseClick?: (phase: JobPhase) => void
  maxVisible?: number  // default: 3 desktop, 2 tablet
}
```

### 11.5 `PhaseChip.tsx`

**Responsabilidade:** Chip de fase dentro da celula do calendario.
Componente pequeno e performatico — renderizado muitas vezes.

```typescript
interface PhaseChipProps {
  phase: JobPhase
  onClick?: (phase: JobPhase) => void
  showComplement?: boolean  // default true
}
```

**Renderizacao:**
```tsx
<button
  className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px]
             leading-none cursor-pointer transition-colors duration-150"
  style={{
    backgroundColor: `${phase.phase_color}18`,
    borderLeft: `2px solid ${phase.phase_color}`,
  }}
  onClick={() => onClick?.(phase)}
>
  <span>{phase.phase_emoji}</span>
  <span className="font-medium truncate" style={{ color: phase.phase_color }}>
    {phase.phase_label}
  </span>
  {showComplement && phase.complement && (
    <span className="text-[10px] text-muted-foreground italic truncate">
      {phase.complement}
    </span>
  )}
</button>
```

### 11.6 `CalendarDayOverflowPopover.tsx`

**Responsabilidade:** Popover que lista todas as fases de um dia
(tanto ao clicar no numero quanto no badge "+ N mais").

```typescript
interface CalendarDayOverflowPopoverProps {
  day: CalendarDay
  onPhaseClick?: (phase: JobPhase) => void
  children: React.ReactNode  // trigger (numero do dia ou badge)
}
```

### 11.7 `CalendarMobileList.tsx`

**Responsabilidade:** Visao alternativa para mobile — lista de dias com fases,
agrupados por semana.

```typescript
interface CalendarMobileListProps {
  days: CalendarDay[]
  onPhaseClick?: (phase: JobPhase) => void
}
```

---

## 12. Integracao com Componentes Existentes

### 12.1 Toggle de visao no header do Cronograma

O componente pai (pagina do cronograma) precisa receber uma prop `view` e renderizar
`GanttChart` ou `CalendarView` conforme o estado:

```typescript
type CronogramaView = 'gantt' | 'calendar' | 'list'

// No componente pai:
const [view, setView] = useState<CronogramaView>('gantt')

// Toggle UI:
<ToggleGroup
  type="single"
  value={view}
  onValueChange={(v) => v && setView(v as CronogramaView)}
  variant="outline"
  size="sm"
>
  <ToggleGroupItem value="gantt" aria-label="Visao Gantt">
    <BarChart2 className="size-4" />
    <span className="hidden sm:inline ml-1.5">Gantt</span>
  </ToggleGroupItem>
  <ToggleGroupItem value="calendar" aria-label="Visao Calendario">
    <CalendarDays className="size-4" />
    <span className="hidden sm:inline ml-1.5">Calendario</span>
  </ToggleGroupItem>
  <ToggleGroupItem value="list" aria-label="Visao Lista">
    <List className="size-4" />
    <span className="hidden sm:inline ml-1.5">Lista</span>
  </ToggleGroupItem>
</ToggleGroup>
```

### 12.2 PhaseDialog (reusar sem modificar)

`onPhaseClick` do CalendarView repassa o `JobPhase` para o handler ja existente
na pagina pai que abre o `PhaseDialog`. Nenhuma modificacao necessaria no dialogo.

### 12.3 Export PDF

O botao "Exportar PDF" no toolbar continua exportando o **Gantt**, nao o calendario.
Futuramente pode ser adicionada a opcao "Exportar Calendario" no dropdown.
Na spec atual, esta fora do escopo.

---

## 13. Visao Export-Ready (apresentacao ao cliente)

O calendario deve ter visual clean suficiente para uma captura de tela ser enviada ao cliente
sem precisar do PDF. Para isso:

- Grid com bordas sutis (`border-border` sem sombras pesadas)
- Chips de fase com identidade visual clara (cor por fase)
- Header do mes legivel (fonte grande, bold)
- Dias de hoje destacados mas nao berrantes
- Sem botoes/controles invasivos dentro do grid
- Suporte a dark mode (cliente pode receber screenshot em dark ou light)

---

## 14. Responsividade Detalhada

### Desktop (lg+ / 1024px+)

```
Grid: grid-cols-7
Celula: min-h-[100px]
Chips visiveis: max 3
Toggle visao: icone + label
Header navegacao: completo
```

### Tablet (md / 768-1023px)

```
Grid: grid-cols-7 (mantido, celulas menores)
Celula: min-h-[80px]
Chips visiveis: max 2
Label nos chips: truncado em 12 chars
Toggle visao: so icones
Header navegacao: botao [Hoje] some (economiza espaco)
```

### Mobile (< 768px)

```
Grid: NENHUM — renderiza CalendarMobileList
Chip: full-width, complement sempre visivel
Header: simplificado (seta + mes + seta em linha, Hoje abaixo)
Toggle visao: so icones, tamanho menor
```

---

## 15. Acessibilidade

```
CalendarView container:
  role="region"
  aria-label="Calendario mensal do cronograma"

Header de navegacao:
  Botao anterior: aria-label="Mes anterior"
  Botao proximo:  aria-label="Proximo mes"
  Botao hoje:     aria-label="Ir para o mes atual"
  Titulo do mes:  aria-live="polite" (anuncia troca de mes para screen readers)

Grid:
  role="grid"
  aria-label="Calendario de marco de 2026" (dinamico)

Header de dias da semana:
  role="row"
  Cada celula: role="columnheader" aria-label="Domingo" etc.

Celula do dia:
  role="gridcell"
  aria-label="15 de marco, 3 fases" (dinamico)
  aria-current="date" no dia de hoje

Chip de fase:
  role="button"
  aria-label="{emoji} {label}: {start_date} ate {end_date}"
  tabIndex=0
  onKeyDown: Enter/Space dispara click

Overflow badge:
  role="button"
  aria-label="Ver todas as {N} fases de {data}"
  tabIndex=0
```

---

## 16. Dark Mode

```
ELEMENTO                    LIGHT                          DARK
──────────────────────────────────────────────────────────────────────────
Background container        bg-white / bg-card             bg-zinc-950 / bg-card
Header navegacao bg          bg-background                  bg-background
Grid header dias sem.       bg-muted/30                    bg-muted/20
Celula normal               bg-white                       bg-zinc-900 (neutral-900)
Celula fim de semana        bg-neutral-50                  bg-neutral-900/60
Celula hoje                 bg-rose-500/5                  bg-rose-500/8
Celula fora do mes          bg-neutral-50/50               bg-neutral-900/20
Border do grid              border-neutral-200             border-neutral-800
Numero do dia (hoje)        bg-rose-500 text-white         bg-rose-500 text-white (igual)
Chip de fase                {color}18                      {color}20 (levemente mais opaco)
Chip borda esquerda         {color}                        {color} (igual, cor forte)
Tooltip                     bg-neutral-900 text-white      bg-neutral-900 text-white (igual)
```

---

## 17. Logica de Calculo de Dias com Fases

```typescript
// Util a adicionar em cronograma-utils.ts

/**
 * Retorna um Set de strings YYYY-MM-DD com todos os dias em que
 * a fase esta ativa (respeitando skip_weekends).
 */
export function getActiveDaysForPhase(phase: JobPhase): Set<string> {
  const days = new Set<string>()
  if (!phase.start_date || !phase.end_date) return days

  const start = parseISO(phase.start_date)
  const end = parseISO(phase.end_date)
  let current = start

  while (current <= end) {
    const dow = current.getDay() // 0 = dom, 6 = sab
    const isWeekend = dow === 0 || dow === 6
    if (!phase.skip_weekends || !isWeekend) {
      days.add(format(current, 'yyyy-MM-dd'))
    }
    current = addDays(current, 1)
  }
  return days
}

/**
 * Agrupa fases por dia para o calendario.
 * Retorna um Map<string, JobPhase[]> onde key = YYYY-MM-DD.
 */
export function groupPhasesByDay(phases: JobPhase[]): Map<string, JobPhase[]> {
  const map = new Map<string, JobPhase[]>()
  const datedPhases = phases.filter((p) => p.start_date && p.end_date)

  for (const phase of datedPhases) {
    const activeDays = getActiveDaysForPhase(phase)
    for (const day of activeDays) {
      const existing = map.get(day) ?? []
      existing.push(phase)
      map.set(day, existing)
    }
  }
  return map
}

/**
 * Gera os dias do grid mensal incluindo dias dos meses adjacentes
 * para completar as semanas (sempre 42 slots = 6 semanas x 7 dias).
 */
export function getCalendarGridDays(
  year: number,
  month: number,  // 0-indexed
  phasesByDay: Map<string, JobPhase[]>,
): CalendarDay[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Comecar no domingo anterior ao primeiro dia
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 0 })
  // Terminar no sabado apos o ultimo dia (sempre 42 slots)
  const gridEnd = addDays(gridStart, 41)

  const days: CalendarDay[] = []
  let current = gridStart

  while (current <= gridEnd) {
    const dateStr = format(current, 'yyyy-MM-dd')
    days.push({
      date: current,
      dateStr,
      isCurrentMonth: current.getMonth() === month,
      isToday: isToday(current),
      isWeekend: current.getDay() === 0 || current.getDay() === 6,
      phases: phasesByDay.get(dateStr) ?? [],
    })
    current = addDays(current, 1)
  }
  return days
}
```

---

## 18. Estrutura de Arquivos

```
src/
  components/
    cronograma/
      GanttChart.tsx             (existente — nao modificar)
      PhaseList.tsx              (existente — nao modificar)
      PhaseDialog.tsx            (existente — nao modificar)
      CronogramaPdf.ts           (existente — nao modificar)
      CalendarView.tsx           (NOVO — orquestrador)
      CalendarHeader.tsx         (NOVO — navegacao de mes)
      CalendarGrid.tsx           (NOVO — grid 7 colunas desktop)
      CalendarCell.tsx           (NOVO — celula de um dia)
      PhaseChip.tsx              (NOVO — chip de fase no calendario)
      CalendarDayPopover.tsx     (NOVO — popover overflow + click no numero)
      CalendarMobileList.tsx     (NOVO — visao lista para mobile)

  lib/
    cronograma-utils.ts         (MODIFICAR — adicionar utils de calendario)
```

### Arquivos que NAO devem ser modificados:
- `GanttChart.tsx` — componente estavel, ja em producao
- `PhaseList.tsx` — idem
- `PhaseDialog.tsx` — idem
- `CronogramaPdf.ts` — idem
- `types/cronograma.ts` — idem (CalendarDay pode ser definido localmente em CalendarView)

---

## 19. Exemplos Visuais de Referencia

### 19.1 Referencia direta: Google Sheets Ellah Filmes (Aba Calendario)

A grid atual no Sheets mostra:
```
✂️ Offline - 90"
✂️ Ajustes Offline - 90"
```
Cada fase em linha separada, com emoji + nome + complement.
O ELLAHOS deve replicar esse padrao no chip.

### 19.2 Referencia de produto: Google Calendar

- Grid 7 colunas clean
- Hoje com circulo colorido no numero
- Eventos pequenos com cor de fundo
- "More" para overflow

### 19.3 Referencia de produto: Linear (calendarios de milestone)

- Dark mode com borders sutis
- Chips minimais com apenas cor e texto
- Navegacao de mes com animacao suave

### 19.4 Referencia de produto: Notion Calendar

- Grid equilibrado entre espaco e informacao
- Hierarquia clara entre numero do dia e eventos

---

## 20. Notas para Implementacao

1. **Performance:** `phasesByDay` deve ser calculado com `useMemo` pois envolve iteracao
   potencialmente longa (40+ fases x 30+ dias = ~1200 operacoes). Dependencias: `[phases]`.

2. **Animacao de troca de mes:** usar `AnimatePresence` do Framer Motion com `mode="wait"`.
   A key deve ser `${year}-${month}` para trigger correto.

3. **Chips coloridos:** Nao usar classes Tailwind dinamicas como `bg-rose-500/10` —
   o Tailwind purge nao funciona com strings interpoladas. Usar `style` inline para cores
   derivadas de `phase.phase_color` (hex do banco).

4. **Celulas fora do mes:** renderizar normalmente (sem fases), apenas com opacity reduzida
   no numero. Nao cortar o grid em 4 ou 5 semanas — sempre 6 semanas (42 dias) para
   estabilidade visual (o grid nao "pula" de altura entre meses).

5. **Mes inicial:** CalendarView inicializa no mes da primeira fase com status `in_progress`.
   Fallback: mes da primeira fase futura. Fallback final: mes atual.

6. **Feriados/Recessos:** Fases com `phase_label` contendo "Recesso", "Feriado" ou com
   `phase_emoji` de `🎭` ou `🏖️` recebem tratamento especial:
   - Background da celula: `bg-amber-50/50 dark:bg-amber-900/10` (sutilmente amarelado)
   - Sem borda esquerda no chip — chip recebe fundo diagonal (padrao "hachura" nao e
     viavel em CSS puro; usar background alternado levemente diferente)
   - Label em `text-amber-700 dark:text-amber-400`
   - Isso e um hint visual, nao um sistema de feriados com banco de dados

7. **Scroll para hoje:** quando CalendarView monta, se `hoje` esta no mes exibido,
   nao e necessario scroll (grid e fixo). Se o usuario navegar para outro mes e voltar
   com [Hoje], o grid ja esta posicionado.

8. **Export do calendario como imagem:** fora do escopo desta spec. Se necessario no futuro,
   usar `html-to-image` na div do CalendarGrid (mesmo approach do PDF).
