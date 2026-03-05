# Auditoria de Responsividade Mobile — ELLAHOS
**Data:** 2026-03-04
**Auditor:** UI/UX Designer (Claude Agent)
**Escopo:** Frontend completo — layout, componentes, interacoes, tipografia, performance

---

## Score Geral: 6.2 / 10

| Categoria              | Score | Observacao                                          |
|------------------------|-------|-----------------------------------------------------|
| Layout System          | 8/10  | BottomNav + safe-area corretos, spacer presente     |
| Design System Mobile   | 5/10  | Regras definidas, mas muito pouco aplicado          |
| Tabelas                | 3/10  | CRITICO — tabelas nao se adaptam a mobile           |
| Drawers / Dialogs      | 7/10  | Sheet lateral funciona, mas sem height max mobile   |
| Formularios            | 6/10  | Maioria de 1 coluna, mas JobHeader tem problema     |
| Tabs                   | 6/10  | overflow-x-auto presente, mas touch target pequeno  |
| Tipografia             | 7/10  | Escala razoavel, linha de corpo boa                 |
| Interacoes Touch       | 4/10  | Hover-only states, DnD sem suporte touch real       |
| Performance Mobile     | 5/10  | Sem virtualizacao, sem lazy load de imagens         |
| Acessibilidade         | 7/10  | aria-labels presentes, mas faltam skip links        |

---

## 1. Layout System

### O que esta correto

**BottomNav** (`BottomNav.tsx`)
- `pb-[env(safe-area-inset-bottom)]` aplicado — iPhones com notch tratados.
- `min-w-[44px]` nos itens — cumpre o minimo de 44px de touch target.
- `md:hidden` correto — some em tablet/desktop.
- Area colorida via `areaConfig` com dot e text color — diferenciacao visual boa.

**Dashboard Layout** (`(dashboard)/layout.tsx`)
- `<div className="h-16 md:hidden" />` antes do BottomNav — spacer correto para nao sobrepor conteudo.
- Sheet (Radix) para sidebar em mobile — overlay correto.
- `ml-64 / ml-16` apenas em `isDesktop` — mobile nao tem margin-left errada.
- Ambient tint bar (`h-[2px]`) — micro detalhe bem resolvido.

**Topbar** (`Topbar.tsx`)
- `sticky top-0 z-30` — correto.
- Hamburger com `lg:hidden` — aparece so em mobile/tablet.
- `px-4` mobile, `lg:px-6` desktop — padding correto.

### Issues encontrados

**ISSUE L-01 — ALTO**
O Topbar tem `h-14` (56px) mas o JobHeader tem `sticky top-14 z-20`. Se o usuario rolar em um iPhone com notch, o Topbar + safe-area-inset-top podem ser maiores que 56px. O `top-14` do JobHeader pode ficar errado.

```
Atual: sticky top-14
Correto: sticky top-[calc(3.5rem+env(safe-area-inset-top,0px))]
```

**ISSUE L-02 — MEDIO**
A sidebar Sheet em mobile usa `w-64 p-0` sem `safe-area-inset-left`. Em iPhones com Dynamic Island (iPhone 14 Pro+), a sidebar toca na borda da ilha.

```
Atual: <SheetContent side="left" className="w-64 p-0">
Correto: adicionar pl-[env(safe-area-inset-left,0px)]
```

**ISSUE L-03 — BAIXO**
O AiCopilotTrigger usa `bottom-20 right-4` no mobile. Com o BottomNav em `h-16` (64px), o botao fica em `bottom-20` = 80px. Margem de 16px acima do nav — ok. Porem em iPhones com home indicator o nav ja tem `pb-[env(safe-area-inset-bottom)]`, entao o botao pode estar muito alto. Deveria usar `bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]`.

---

## 2. Design System Mobile

### O que esta definido (docs/design/design-system.md)

O design system tem regras mobile bem definidas na secao 9:
- Tabelas viram cards empilhados em mobile
- Formularios: 1 coluna
- Modais: full-screen (sheet from bottom)
- Filtros: collapsable section
- Touch targets: 44x44px minimo

### Gap entre spec e implementacao

**ISSUE DS-01 — CRITICO**
A regra "tabelas viram cards empilhados em mobile" esta no design system mas **nao foi implementada em nenhuma tabela**. Todas as tabelas usam `overflow-x-auto` como fallback — o usuario precisa fazer scroll horizontal para ver os dados.

**ISSUE DS-02 — ALTO**
A regra "modais: full-screen (sheet from bottom) em mobile" esta no design system mas varios dialogs continuam sendo Dialog do Radix centralizado, nao Sheet. Em telas de 375px o dialog fica comprimido com conteudo cortado.

**ISSUE DS-03 — MEDIO**
"Filtros: collapsable section" em mobile — o `JobFilters.tsx` usa popovers e um layout inline que em 375px fica com scroll horizontal na barra de filtros. Nao ha collapsable section mobile.

---

## 3. Tabelas — Analise Detalhada

### JobsTable (`JobsTable.tsx`)

```
Desktop view:
+-------+------------------+------------------+----------+------+---+
| CHECK | JOB              | STATUS           | FINAN    | HLTH | . |
+-------+------------------+------------------+----------+------+---+
| [ ]   | EL-001 • Titulo  | [Producao]       | R$50K    | ████ | ⋮ |
|       | Cliente / Agencia| Filme • 15/03    | 32%      |      |   |
+-------+------------------+------------------+----------+------+---+
```

O container tem `overflow-x-auto` o que tecnicamente "funciona" mas:
- Em 375px, a largura minima da tabela e ~600px (checkbox 40px + JOB 240px + STATUS 192px + FINAN 160px + HLTH 80px + ACOES 48px = 760px)
- O usuario precisa fazer scroll horizontal de ~385px — quase 2x a largura da tela
- Nao ha nenhuma indicacao visual de que existe scroll horizontal

**ISSUE T-01 — CRITICO**
Nenhuma tabela tem adaptacao mobile. Em producao audiovisual, o produtor usa o celular no set. Ver a lista de jobs em mobile e a interacao mais frequente do produto.

**ISSUE T-02 — ALTO**
`CostItemsTable` tem `min-w-[200px]`, `w-[120px]`, `w-[100px]` em colunas sem nenhum breakpoint. Em mobile, o scroll horizontal e inevitavel e torna a tabela inutilizavel.

**ISSUE T-03 — ALTO**
`VendorsTable`, `PeopleTable`, `ClientsTable`, `AgenciesTable`, `TransactionsTable` — todas seguem o mesmo padrao sem adaptacao mobile.

**ISSUE T-04 — MEDIO**
`JobsTable` tem rows com `h-[64px]` fixo. Em mobile a altura fixa nao acomoda o wrap de texto em telas menores, podendo truncar conteudo.

### Como deveria ser em mobile

```
Mobile card view (substituir linhas de tabela):

+------------------------------------------+
| EL-001                         [Producao] |
| Campanha Natura 2026                       |
| Cliente SA / Agencia XYZ                  |
| R$ 50.000                          32%    |
+------------------------------------------+
| EL-002                         [Briefing] |
| Film Institucional Petrobras              |
| ...                                        |
+------------------------------------------+
```

---

## 4. Drawers e Dialogs

### CostItemDrawer (`CostItemDrawer.tsx`)

Usa `Sheet` do shadcn, o que e correto. Mas:

**ISSUE D-01 — ALTO**
`SheetContent` sem classe de altura maxima mobile. O drawer tem ~20+ campos com secoes colapsaveis (fornecedor, dados bancarios, NF, aprovacoes). Em mobile 375px, o conteudo transborda e o `overflow-y-auto` interno pode nao funcionar bem dependendo da versao do iOS (o Safari tem o bug historico do `100vh`).

Correto:
```tsx
<SheetContent
  side="right"
  className="w-full sm:w-[480px] flex flex-col overflow-hidden"
>
  <SheetHeader className="shrink-0" />
  <div className="flex-1 overflow-y-auto">
    {/* conteudo */}
  </div>
  <div className="shrink-0 border-t pt-4">
    {/* footer com botoes */}
  </div>
</SheetContent>
```

**ISSUE D-02 — MEDIO**
O `AiCopilotPanel` usa `SheetContent` sem dimensoes mobile explicitadas. Em 375px ocupa a tela toda, mas a area de input pode ficar escondida atras do teclado virtual do iOS (que empurra o viewport mas nao aciona o resize).

**ISSUE D-03 — BAIXO**
`OpportunityDetailDialog` usa `Dialog` (modal centralizado) com tamanho `max-w-2xl`. Em 375px, ocupa praticamente toda a tela mas nao e full-screen nativo. Deveria ser Sheet em mobile.

### JobHeader (sticky)

**ISSUE D-04 — ALTO**
`JobHeader` em mobile tem um bloco `flex items-start justify-between gap-4` com:
- Lado esquerdo: JobCodeBadge + titulo + StatusChangeDropdown + PriorityBadge + SyncIndicator (flex-wrap)
- Lado direito: Drive button + ApprovalPdfButton + MoreHorizontal button

Em 375px, o lado direito tem 3 botoes (aprox 36px cada + gap = ~120px). O titulo fica com `max-w-[200px]` truncado no breadcrumb. O wrapping dos badges na linha principal pode empurrar o header para 4+ linhas, consumindo quase 40% da viewport.

---

## 5. Formularios

### JobFilters

**ISSUE F-01 — ALTO**
`JobFilters.tsx` renderiza uma barra horizontal com:
- Input de busca
- Popover de status (multi-select)
- Select de tipo
- Popover de cliente
- Daterange picker
- Button "Limpar"

Em 375px, esses elementos ficam lado a lado em um `flex` sem wrap adequado. Ha `overflow-x-auto` implicito, mas a barra de filtros nao e colapsavel.

Pattern correto para mobile:
```
[Buscar...           ] [Filtros (3) ▾]
```
Um unico botao "Filtros" com badge de contagem abre um Sheet bottom com todos os filtros.

**ISSUE F-02 — MEDIO**
`CreateJobModal` — nao foi auditado diretamente, mas se usa Dialog padrao (nao Sheet), sera problemático em mobile pelos mesmos motivos de D-02.

### Formularios de detalhe (TabGeral, etc.)

Nao auditados em detalhe, mas o padrao do codebase usa classes `grid grid-cols-2` e `sm:grid-cols-3` sem breakpoint mobile explicito para varios campos. Dependendo se o `grid-cols-2` comeca no mobile, campos como CPF + RG lado a lado em 375px ficam com 175px cada — limite aceitavel mas apertado para inputs com mascaras.

---

## 6. Tabs (JobDetailTabs)

### Nivel 1: Group selector

```tsx
<div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
  <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap">
```

- `overflow-x-auto` presente — ok.
- `whitespace-nowrap` — ok.
- `py-1.5` = 6px padding vertical. Altura efetiva aprox 28px. **Abaixo do minimo de 44px de touch target.**
- Grupos: Info, Producao, Gestao, Registro — 4 botoes de ~80px cada = ~320px total. Em 375px cabe sem scroll, mas apertado.

**ISSUE TAB-01 — ALTO**
Touch targets dos group selectors: altura ~28px, abaixo de 44px minimo WCAG 2.1 AA.

### Nivel 2: Tab triggers

```tsx
<TabsTrigger className="relative rounded-none border-b-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm whitespace-nowrap">
```

- `py-2.5` = 10px. Altura efetiva ~36px (10px + 16px linha + 10px). Ainda abaixo de 44px.
- `overflow-x-auto` no `TabsList` — permite scroll horizontal.
- `sm:px-4` — em mobile usa px-3 (12px). Comprimido mas funcional.
- Icone + texto + badge — em 375px com 5-6 tabs, o scroll e necessario.

**ISSUE TAB-02 — MEDIO**
Nao ha indicador visual (fade/sombra) de que as tabs continuam alem da tela em mobile.

**ISSUE TAB-03 — BAIXO**
`JobStatusPipeline` tem `hidden md:flex` — nao aparece em mobile. A informacao de progresso do pipeline some completamente em mobile. Deveria ter uma versao mobile alternativa (badge de texto, por exemplo).

---

## 7. Kanban CRM (CrmKanban)

### Drag and Drop

**ISSUE K-01 — CRITICO**
O kanban usa `@dnd-kit/core` com `PointerSensor` e `activationConstraint: { distance: 5 }`. O `PointerSensor` funciona com touch events (`pointerdown` > `pointermove`), entao tecnicamente o DnD funciona em mobile. Porem:

1. **Sem TouchSensor configurado explicitamente.** O dnd-kit recomenda combinar `PointerSensor` + `TouchSensor` para melhor performance em iOS Safari, que tem comportamento de scroll nativo que pode interferir.
2. **`DragOverlay` com `w-72`** — em 375px o card arrastado ocupa 72/375 = 19% da largura, ok.
3. **Colunas com `w-72 shrink-0`** — em mobile o kanban exige scroll horizontal. Nao ha alternativa de visualizacao mobile (ex: accordion por coluna ou lista filtrada).

**ISSUE K-02 — ALTO**
O container do kanban usa `flex gap-4 overflow-x-auto pb-4`. Com 5 colunas ativas de 288px (w-72) + gaps, a largura total e ~1460px. Em mobile, o usuario precisa scrollar ~1085px para ver todas as colunas. Sem indicadores de posicao (dots de paginacao, etc.).

**ISSUE K-03 — ALTO**
`max-h-[calc(100vh-320px)]` para overflow interno das colunas. Em mobile com viewport de 667px (iPhone SE), 320px de deducao deixa apenas 347px de altura para os cards — funcional, mas apertado.

---

## 8. Tipografia Mobile

### Positivos
- Body: 14px (`text-sm`) nas celulas de tabela — no limite aceitavel.
- Titulos de pagina: `text-2xl font-semibold` — bom.
- Meta info: `text-xs` (12px) em algumas areas secundarias — aceitavel.
- Inter com line-height adequado.

### Issues

**ISSUE TIP-01 — MEDIO**
`text-[10px]` usado em varios lugares:
- Label do BottomNav: `text-[10px]`
- Badges de contagem nas tabs: `text-[10px]`
- Badge de NF pending na sidebar: `text-[10px]`

10px esta abaixo do minimo de 11px recomendado pelo design system (overline = 11px) e muito abaixo de 12px (WCAG guideline informal para mobile). Em telas de baixa densidade (Android mid-range), 10px pode ser ilegivel.

**ISSUE TIP-02 — BAIXO**
`text-[11px]` em varios contexts de caption:
- Subtitulo da sidebar (overline de area)
- Badges de valor no kanban
- `font-medium` presente, o que ajuda a legibilidade

Aceitavel mas no limite.

**ISSUE TIP-03 — MEDIO**
O titulo editavel no `JobHeader` usa `text-xl font-semibold` (20px). Quando `isEditing`, o `<input>` tem `min-w-[200px]`. Em 375px com o breadcrumb e badges ao lado, o input pode ter menos de 200px disponivel e o layout quebra.

---

## 9. Interacoes Touch

### Hover States

**ISSUE INT-01 — ALTO**
`JobsTable` usa `hover:bg-muted/40` em rows, `hover:text-primary` no titulo, `group-hover:opacity-100` no ChevronRight do kanban. Em dispositivos touch, hover nao existe — o estado hoverd ativa brevemente ao toque e fica "preso" visualmente em alguns navegadores iOS.

Solucao: adicionar `@media (hover: none)` para remover efeitos hover em touch devices, ou usar `active:` em lugar de `hover:` para indicar selecionabilidade.

**ISSUE INT-02 — ALTO**
`CrmKanban KanbanColumn` usa `hover:border-primary/40 hover:shadow-md` no card. Em mobile, o feedback de "clicavel" some. Nenhum `active:` state substituto.

**ISSUE INT-03 — MEDIO**
`SidebarNavLink` usa `hover:bg-accent hover:text-foreground`. Em mobile, a sidebar abre como Sheet e os items nao tem estado ativo visivel ao toque.

### Touch Targets

**ISSUE INT-04 — ALTO**
`JobActionsMenu` trigger: `Button variant="ghost" size="icon"` — height 36px (h-9). Abaixo de 44px recomendado.

**ISSUE INT-05 — MEDIO**
`SidebarNavLink` tem `h-9` (36px) de altura. Abaixo de 44px. Na sidebar Sheet mobile, o usuario vai errar o item frequentemente.

**ISSUE INT-06 — MEDIO**
Checkboxes em `JobsTable` e `CostItemsTable` — o `Checkbox` do shadcn tem 16x16px de icone mas area de clique e `w-4 h-4`. Em mobile, o touch target efetivo e provavelmente ~20px. Muito pequeno para uso no set de filmagem.

### Storyboard DnD

Nao auditado em detalhe, mas o mesmo problema do `PointerSensor` sem `TouchSensor` deve se aplicar.

---

## 10. Performance Mobile

**ISSUE PERF-01 — ALTO**
Nenhuma tabela usa virtualizacao (`react-virtual` ou `@tanstack/react-virtual`). `JobsTable` exibe ate 20 jobs por pagina (20 rows de 64px = 1280px de conteudo). Aceitavel. Mas `KanbanView` carrega `per_page: 200` para preencher o kanban — 200 cards no DOM simultaneamente. Em mobile com 1-2GB de RAM, isso pode causar jank.

**ISSUE PERF-02 — MEDIO**
O `AiCopilotPanel` usa `Sheet` que monta/desmonta. Ao abrir, carrega conversas + historico. Sem skeleton adequado no painel lateral. O `ScrollArea` interno pode ter problemas de performance em listas longas de mensagens no iOS Safari.

**ISSUE PERF-03 — MEDIO**
`CostItemDrawer` e carregado lazy via import? Nao foi verificado no entry point, mas o drawer tem 58KB de codigo — grande para lazy load opcional. Se for importado diretamente, adiciona ao bundle da pagina de custos mesmo quando nao aberto.

**ISSUE PERF-04 — BAIXO**
`Topbar.tsx` usa `dynamic()` para `NotificationBell` e `UserMenu` com `ssr: false` — correto para evitar hydration mismatch. O `AiCopilotTrigger` tambem poderia ser dynamic mas esta importado diretamente no layout.

**ISSUE PERF-05 — BAIXO**
Nenhuma imagem de usuario (avatares) usa `next/image` com `sizes` adequado para mobile. Os avatares aparecem em varios componentes como `<div>` com iniciais — boa pratica, evita imagens desnecessarias.

---

## Resumo de Issues por Severidade

### CRITICO (impede uso funcional em mobile)

| ID      | Componente              | Descricao                                                        |
|---------|-------------------------|------------------------------------------------------------------|
| T-01    | Todas as tabelas        | Nenhuma adaptacao mobile — scroll horizontal de 2x a tela       |
| DS-01   | Design System           | Regra "tabelas viram cards" definida mas nao implementada       |
| K-01    | CrmKanban               | TouchSensor nao configurado, DnD pode falhar em iOS Safari      |

### ALTO (prejudica significativamente a experiencia)

| ID      | Componente              | Descricao                                                        |
|---------|-------------------------|------------------------------------------------------------------|
| L-01    | JobHeader               | `sticky top-14` sem considerar safe-area-inset-top              |
| DS-02   | Dialogs gerais          | Modais nao sao Sheet em mobile                                   |
| DS-03   | JobFilters              | Barra de filtros nao colapsavel em mobile                       |
| T-02    | CostItemsTable          | Colunas com width fixo, scroll obrigatorio                      |
| T-03    | VendorsTable etc        | Mesmo problema em todas as tabelas secundarias                  |
| D-01    | CostItemDrawer          | Sheet sem estrutura flex correta — footer pode sobrepor conteudo |
| D-04    | JobHeader               | Header pode ocupar 40%+ da viewport em mobile                   |
| F-01    | JobFilters              | Barra horizontal nao responsiva em 375px                        |
| TAB-01  | JobDetailTabs           | Touch target dos group selectors: ~28px, abaixo de 44px         |
| INT-01  | JobsTable               | Hover states sem fallback touch                                  |
| INT-02  | CrmKanban cards         | Hover states sem `active:` substituto                           |
| INT-04  | JobActionsMenu          | Trigger: 36px, abaixo de 44px                                   |
| K-02    | CrmKanban               | 1460px de conteudo sem indicadores de posicao                   |
| K-03    | CrmKanban               | `max-h-[calc(100vh-320px)]` apertado em iPhone SE               |
| PERF-01 | KanbanView              | 200 cards no DOM sem virtualizacao                              |
| TIP-01  | BottomNav, badges       | `text-[10px]` abaixo do minimo recomendado                      |
| TIP-03  | JobHeader               | Input de edicao pode quebrar layout em 375px                    |

### MEDIO (incomodo, nao bloqueia)

| ID      | Componente              | Descricao                                                        |
|---------|-------------------------|------------------------------------------------------------------|
| L-02    | Sidebar Sheet           | Sem safe-area-inset-left                                        |
| T-04    | JobsTable               | `h-[64px]` fixo pode truncar conteudo em wrap                   |
| D-02    | AiCopilotPanel          | Input pode ficar atras do teclado virtual iOS                   |
| D-03    | OpportunityDetailDialog | Dialog centralizado ao inves de Sheet em mobile                  |
| F-02    | CreateJobModal          | Provavelmente Dialog ao inves de Sheet                          |
| TAB-02  | JobDetailTabs           | Sem indicador de scroll horizontal nas tabs                     |
| TAB-03  | JobStatusPipeline       | `hidden md:flex` — info de pipeline inexistente em mobile       |
| INT-03  | Sidebar Sheet           | Hover states no items da sidebar Sheet                          |
| INT-05  | SidebarNavLink          | `h-9` (36px) no menu mobile Sheet                               |
| INT-06  | Checkboxes de tabelas   | Touch target ~20px                                              |
| TIP-02  | Captions                | `text-[11px]` no limite                                         |
| PERF-02 | AiCopilotPanel          | Sem skeleton adequado na abertura                               |
| PERF-03 | CostItemDrawer          | 58KB sem lazy load verificado                                   |

### BAIXO (polish)

| ID      | Componente              | Descricao                                                        |
|---------|-------------------------|------------------------------------------------------------------|
| L-03    | AiCopilotTrigger        | `bottom-20` sem considerar safe-area dinamico                   |
| PERF-04 | Layout                  | AiCopilotTrigger poderia ser dynamic import                     |
| PERF-05 | Geral                   | next/image com sizes para avatares futuros                      |

---

## Recomendacoes Prioritarias

### Prioridade 1 — Tabelas Mobile (Issues T-01, T-02, T-03, DS-01)

Este e o maior problema. Implementar o padrao "card view" para mobile em `JobsTable`.

**Padrao recomendado:**

```tsx
// JobsTable.tsx — adicionar wrapper condicional
export function JobsTable({ jobs, ... }) {
  return (
    <>
      {/* Mobile: card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} ... />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-lg border overflow-x-auto">
        <Table>...</Table>
      </div>
    </>
  )
}
```

**Wireframe ASCII — JobCard mobile:**

```
+------------------------------------------+
| [EL-001]  [Producao]          [32%]  [⋮] |
| Campanha de Verao Natura 2026              |
| Natura SA  /  Agencia XYZ                 |
| R$ 50.000,00          Entrega: 15/03/26   |
+------------------------------------------+
```

Altura estimada: ~80px por card. Touch target da linha inteira para navegar: 100% da largura.

---

### Prioridade 2 — Filtros Mobile Colapsaveis (Issues F-01, DS-03)

```
Mobile:
+------------------------------------------+
| [Buscar job, cliente...     ] [Filtros 2] |
+------------------------------------------+

Ao tocar em "Filtros 2":
Sheet abre de baixo com:
- Status (checkboxes)
- Tipo de projeto (select)
- Cliente (combobox)
- Datas
- [Limpar] [Aplicar]
```

**Implementacao:**

```tsx
// Mobile: botao colapsavel
<div className="flex gap-2 md:hidden">
  <Input placeholder="Buscar..." className="flex-1" />
  <Button variant="outline" size="sm" onClick={() => setFilterSheetOpen(true)}>
    <Filter className="size-4 mr-2" />
    Filtros
    {activeFilterCount > 0 && (
      <Badge className="ml-1 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>
    )}
  </Button>
</div>

{/* Desktop: inline */}
<div className="hidden md:flex items-center gap-2">
  {/* barra de filtros atual */}
</div>

{/* Sheet de filtros mobile */}
<Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
  <SheetContent side="bottom" className="h-auto max-h-[80vh]">
    <SheetHeader>
      <SheetTitle>Filtros</SheetTitle>
    </SheetHeader>
    {/* todos os filtros em stack vertical */}
  </SheetContent>
</Sheet>
```

---

### Prioridade 3 — Touch Targets (Issues INT-04, INT-05, INT-06, TAB-01)

Aplicar padding adicional em mobile para atingir 44px:

```tsx
// Exemplo: SidebarNavLink no Sheet mobile
className="h-9 md:h-9 h-11 items-center gap-3 rounded-md px-3"

// TabsTrigger — group selectors
className="... py-1.5 md:py-1.5 py-3 ..."

// Checkboxes em tabelas — wrapper com area de toque maior
<div className="flex items-center justify-center w-11 h-11 md:w-4 md:h-4">
  <Checkbox ... />
</div>
```

---

### Prioridade 4 — JobHeader Mobile Compacto (Issue D-04)

O header do job detalhe em mobile deve ser mais compacto:

**Wireframe ASCII — JobHeader mobile (375px):**

```
+------------------------------------------+
| < Jobs   EL-001                          |
| Campanha de Verao Natura 2026 2026  [⋮]   |
| [Producao ▾]  [Alta]  Salvo               |
| Natura SA  •  Ag. XYZ  •  Entrega 15/03  |
+------------------------------------------+
```

- Breadcrumb + botao More na mesma linha
- Titulo na segunda linha (truncate com ellipsis, toque para editar)
- Status + priority na terceira linha
- Metadata na quarta linha (se houver)
- Drive button e Approval PDF movidos para o menu More

---

### Prioridade 5 — Kanban Mobile (Issues K-01, K-02, DS-02)

Para o CRM Kanban em mobile, duas alternativas:

**Alternativa A (mais simples): Lista por stage ativo**

```
Mobile:
+------------------------------------------+
| Pipeline  [Consulta ▾]        [+ Novo]   |
+------------------------------------------+
| [card 1]                                  |
| [card 2]                                  |
| [card 3]                                  |
+------------------------------------------+
| [Consulta 3] [Em Analise 2] [Enviado 5]  |
|  (chips clicaveis para mudar de coluna)  |
+------------------------------------------+
```

**Alternativa B (scroll horizontal melhorado):**

Manter o scroll horizontal mas adicionar:
- Indicador de posicao (dots ou barra de progresso)
- `snap-x snap-mandatory` no container
- `snap-start` em cada coluna para snap ao dedo
- Cada coluna ocupa `w-[85vw]` ao inves de `w-72` em mobile

```tsx
// Kanban mobile com snap
<div className="flex gap-4 overflow-x-auto pb-4 md:overflow-x-auto
                snap-x snap-mandatory md:snap-none">
  {stages.map(stage => (
    <div key={stage}
      className="w-[85vw] md:w-72 shrink-0 snap-start ...">
      ...
    </div>
  ))}
</div>
```

A Alternativa B e de implementacao muito mais rapida e preserva a experiencia visual.

---

### Prioridade 6 — CostItemDrawer estrutura flex (Issue D-01)

```tsx
// CostItemDrawer.tsx — estrutura correta para mobile
<SheetContent
  side="right"
  className="flex w-full flex-col p-0 sm:w-[520px]"
>
  <SheetHeader className="shrink-0 border-b px-6 py-4">
    <SheetTitle>...</SheetTitle>
  </SheetHeader>

  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
    {/* todo o conteudo do form */}
  </div>

  <div className="shrink-0 border-t bg-background px-6 py-4">
    {/* botoes de acao */}
  </div>
</SheetContent>
```

---

## Wireframes Propostos

### 1. Jobs List — Mobile (375px)

```
+-------------------------------------------+
| TOPBAR: [☰] Jobs                  [🔔][☀️][👤] |
|░░░░░░░░░░░░░░░░░ tint bar ░░░░░░░░░░░░░░░░|
+-------------------------------------------+
| Jobs                     20 de 47         |
| [Buscar...         ] [Filtros 2▾][+ Novo] |
+-------------------------------------------+
|                                           |
| +---------------------------------------+ |
| | EL-001            [● Producao]    [⋮] | |
| | Campanha Verao Natura 2026             | |
| | Natura SA / Agencia XYZ               | |
| | R$ 50.000           ████ 32%          | |
| +---------------------------------------+ |
|                                           |
| +---------------------------------------+ |
| | EL-002            [● Briefing]    [⋮] | |
| | Film Inst. Petrobras                   | |
| | Petrobras                             | |
| | —                                     | |
| +---------------------------------------+ |
|                                           |
| [< 1 2 3 ... 5 >]                         |
|                                           |
|                                           |
| [  ELLA  ]  ← FAB                         |
+-------------------------------------------+
| [⊞ Inicio][🎬 Jobs][🎯 CRM][👥 Equipe][$] |
+-------------------------------------------+
```

---

### 2. Job Detail — Mobile (375px)

```
+-------------------------------------------+
| TOPBAR: [☰] Jobs / EL-001       [🔔][⋮]   |
|░░░░░░░░░░░░░░░░░ tint bar ░░░░░░░░░░░░░░░░|
+-------------------------------------------+
| EL-001                              [⋮]   |
| Campanha de Verao Natura 2026              |
| [● Producao ▾]  [Alta]  • Salvo           |
| Natura SA • 15/03/26                      |
+-------------------------------------------+
| [Info] [Producao] [Gestao] [Registro]     |  ← group selectors (h-11 touch)
| [Geral] [Equipe] [Entregaveis]       →    |  ← tabs (overflow scroll)
+-------------------------------------------+
|                                           |
| CONTEUDO DA ABA                           |
|                                           |
|                                           |
|                                           |
| [  ELLA  ]  ← FAB (bottom-[5rem+safe])    |
+-------------------------------------------+
| [⊞ Inicio][🎬 Jobs][🎯 CRM][👥 Equipe][$] |
| ░░░░ safe area ░░░░░░░░░░░░░░░░░░░░░░░░░ |
+-------------------------------------------+
```

---

### 3. CRM Kanban — Mobile com snap scroll

```
+-------------------------------------------+
| Pipeline           [Lista▾]   [+ Novo]    |
| [Consulta] [Em Analise] [Orc.Enviado] →   |  ← chips clicaveis
+-------------------------------------------+
| COLUNA: Consulta (3)  R$120K    [+]       |
|                                            |
| +---------------------------------------+ |
| | Proposta Petrobras                    | |
| | Petrobras S.A.                        | |
| | R$ 80K                   Quente •     | |
| | 📅 retorno: em 2d                     | |
| +---------------------------------------+ |
|                                            |
| +---------------------------------------+ |
| | Film Corporativo Embraer              | |
| | Embraer                               | |
| | R$ 40K                   Morno •      | |
| +---------------------------------------+ |
|                                            |
| • • ○ ○ ○  ← indicadores de coluna       |
+-------------------------------------------+
| [⊞][🎬][🎯][👥][$]                        |
+-------------------------------------------+
```

---

## Checklist de Implementacao

### Sprint A — Critico (1-2 dias dev)
- [ ] T-01: `JobsTable` — adicionar `JobCardMobile` com `md:hidden / hidden md:block` split
- [ ] K-01: `CrmKanban` — adicionar `TouchSensor` ao lado do `PointerSensor`
- [ ] K-02: Kanban container — adicionar `snap-x snap-mandatory` + `w-[85vw]` em mobile

### Sprint B — Alto UX (2-3 dias dev)
- [ ] F-01: `JobFilters` — criar variante mobile colapsavel com Sheet bottom
- [ ] D-01: `CostItemDrawer` — refatorar SheetContent para flex column com footer fixo
- [ ] D-04: `JobHeader` — simplificar para mobile (mover Drive/ApprovalPDF para More menu)
- [ ] INT-04/05: Aumentar touch targets para 44px (h-11) nos itens criticos
- [ ] TAB-01: Group selectors — `py-1.5` para `py-3` (38px→44px)
- [ ] L-01: JobHeader sticky — corrigir `top-14` com safe-area-inset-top

### Sprint C — Polimento (1 dia dev)
- [ ] T-03: Demais tabelas (VendorsTable, PeopleTable, ClientsTable) — card view mobile
- [ ] L-02: Sidebar Sheet — adicionar safe-area-inset-left
- [ ] L-03: AiCopilotTrigger — corrigir posicao bottom com safe-area dinamico
- [ ] TAB-03: `JobStatusPipeline` — variante mobile (badge de texto)
- [ ] INT-06: Checkboxes — wrapper de 44x44px em mobile
- [ ] TIP-01: Avaliar aumentar `text-[10px]` para `text-[11px]` no BottomNav label

---

## Referencias

- Design System: `docs/design/design-system.md` — Secao 9 (Responsividade) e Secao 9.2 (Touch Targets)
- WCAG 2.1 Success Criterion 2.5.5 — Target Size (Level AA): minimo 44x44px
- Apple HIG — Minimum Tappable Area: 44pt x 44pt
- Material Design — Touch targets: 48dp x 48dp
- dnd-kit docs — TouchSensor: https://docs.dndkit.com/api-documentation/sensors/touch
- CSS `env(safe-area-inset-*)` — iOS viewport API
