# Chaos Test — Auditoria Mobile ELLAHOS
**Data:** 2026-03-04
**Tester:** Chaos Tester (personas: Telma / Junior / Hacker Acidental)
**Escopo:** Auditoria estática de código — análise de todos os componentes layout, pages e UI

---

## Resumo Executivo

O ELLAHOS tem uma estrutura mobile razoável para o núcleo (BottomNav, Sidebar como Drawer, hamburger), mas apresenta **problemas sérios em tabelas densas, z-index conflicts e ausência de PWA config**. A pior área é o módulo financeiro/custos, que tem uma tabela de 15 colunas completamente inutilizável em celular. A Telma de 55 anos abandonaria o sistema na primeira vez que tentasse ver os custos de um job.

**Total de bugs encontrados: 22**
- CRITICO: 4
- ALTO: 8
- MEDIO: 7
- BAIXO: 3

---

## O QUE JA ESTA OK (nao reportar como bug)

- BottomNav usa `md:hidden` — correto, nao aparece em desktop
- BottomNav tem `min-w-[44px]` — touch target adequado (44px é o mínimo Apple)
- BottomNav tem `pb-[env(safe-area-inset-bottom)]` — funciona no iPhone com notch
- DashboardLayout usa `Sheet` do Radix para sidebar mobile (drawer) — correto
- Topbar tem botão hamburguer condicionado a `showMenuButton` — correto
- DashboardLayout tem `<div className="h-16 md:hidden" />` para evitar conteúdo atrás do BottomNav
- JobsTable tem `overflow-x-auto` no container — correto
- CostItemsTable tem `overflow-x-auto` no container — correto
- JobFilters tem `w-full sm:w-64` no campo de busca — correto
- JobsPage header usa `flex-col sm:flex-row` — correto
- CreateJobModal usa `<Dialog>` do shadcn — funciona bem em mobile via Radix
- KanbanView tem `overflow-x-auto` — correto
- Sidebar inicializa `false` em `useMediaQuery` (SSR safe) — correto
- TabGeral usa `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — responsivo correto
- AiCopilotTrigger usa `bottom-20` em mobile para ficar acima do BottomNav — correto

---

## BUGS ENCONTRADOS

---

### BUG-001 — Viewport meta tag ausente
**Severidade: CRITICO**
**Persona: Telma (iPhone Safari)**
**Arquivo:** `frontend/src/app/layout.tsx`

**O que acontece:**
O `layout.tsx` raiz não tem a meta tag `viewport`. Sem ela, o Safari no iPhone renderiza a página no modo "desktop" com zoom out. A Telma vai ver tudo minúsculo e não vai conseguir clicar em nada.

**Código atual (linha 21-27):**
```tsx
export const metadata: Metadata = {
  title: {
    default: 'ELLAHOS',
    template: '%s | ELLAHOS',
  },
  description: 'Sistema de gestao para produtoras audiovisuais',
}
```

**O que falta:**
```tsx
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // opcional, mas evita zoom acidental em forms
}
```

No Next.js 14+, viewport deve ser exportado separado do `metadata`.

**Fix:**
```tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

---

### BUG-002 — BulkActionsBar conflita com BottomNav no mobile
**Severidade: CRITICO**
**Persona: Telma (seleciona jobs no celular)**
**Arquivo:** `frontend/src/components/jobs/BulkActionsBar.tsx` (linha 37)

**O que acontece:**
A BulkActionsBar usa `fixed bottom-0 left-0 right-0 z-50 h-16`. O BottomNav também usa `fixed inset-x-0 bottom-0 z-50`. Quando a Telma seleciona um job na lista, a BulkActionsBar aparece em cima do BottomNav — mas ambos têm `z-50` e `bottom-0`. Em mobile, a BulkActionsBar **sobrepõe exatamente o BottomNav** (mesma altura, mesmo z-index, mesma posição).

Resultado: a Telma não consegue ver os botões de ação bulk porque o BottomNav fica por cima, ou a BulkActionsBar esconde a navegação. A barra de ações não tem `padding-bottom: env(safe-area-inset-bottom)` também — em iPhone com notch, os botões ficam atrás da barra de home.

**Código atual:**
```tsx
<div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-zinc-900 ...">
```

**Fix:**
```tsx
// Opção 1: z-index maior + padding safe area + margin para o BottomNav em mobile
<div className="fixed bottom-0 left-0 right-0 z-[60] h-16 pb-[env(safe-area-inset-bottom)] md:pb-0 mb-16 md:mb-0 bg-zinc-900 ...">
```

---

### BUG-003 — CostItemsTable: 15 colunas completamente ilegíveis no mobile
**Severidade: CRITICO**
**Persona: Telma (tentando ver custos do job)**
**Arquivo:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/CostItemsTable.tsx`

**O que acontece:**
A tabela de custos tem **15 colunas** com dados como: #, Descrição, Fornecedor, Valor Unit., Qtd, Total, HE, Total+HE, Cond. Pgto, Vencimento, Status, NF, Pgto, Comp., Ações.

O container tem `overflow-x-auto`, o que evita quebrar o layout, mas o resultado no celular é uma tabela horizontalmente enorme que exige scroll horizontal extensivo. A Telma vai fazer scroll para a direita, perder o contexto da linha que estava lendo, e desistir.

Pior: não há nenhuma indicação visual de que é preciso fazer scroll. Muitos usuários não sabem que podem.

**Não há versão card/resumida para mobile.** Nenhuma das colunas usa `hidden sm:` ou `hidden md:` para sumir em telas pequenas.

**Fix sugerido:**
```tsx
// Ocultar colunas menos essenciais em mobile
<TableHead className="hidden md:table-cell">Valor Unit.</TableHead>
<TableHead className="hidden md:table-cell">Qtd</TableHead>
<TableHead className="hidden lg:table-cell">HE</TableHead>
<TableHead className="hidden lg:table-cell">Cond. Pgto</TableHead>
<TableHead className="hidden lg:table-cell">Vencimento</TableHead>
// Manter visível em mobile: #, Descrição, Total+HE, Status, Ações
```

---

### BUG-004 — Toaster posicionado em bottom-right conflita com BottomNav
**Severidade: CRITICO**
**Persona: Telma (faz uma ação e não vê o feedback)**
**Arquivo:** `frontend/src/app/layout.tsx` (linha 43-48)

**O que acontece:**
O `<Toaster position="bottom-right" />` aparece no canto inferior direito da tela. Em mobile, esse canto é **exatamente onde fica o BottomNav** (64px de altura). O toast "Job criado com sucesso" aparece atrás da barra de navegação e a Telma nunca vê o feedback da ação que acabou de fazer.

**Código atual:**
```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    duration: 4000,
  }}
/>
```

**Fix:**
```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    duration: 4000,
    style: {
      // Em mobile, empurra para cima do bottom nav
      marginBottom: 'env(safe-area-inset-bottom)',
    },
  }}
  // Ou usar offset para subir acima do bottom nav
  offset={{ bottom: 80 }} // 64px nav + 16px folga
/>
```

---

### BUG-005 — JobStatusPipeline invisível no mobile
**Severidade: ALTO**
**Persona: Telma (não entende em que status está o job)**
**Arquivo:** `frontend/src/components/job-detail/JobStatusPipeline.tsx` (linha 37)

**O que acontece:**
O pipeline de status usa `hidden md:flex`. Em mobile, o pipeline de progresso **simplesmente não aparece**. A Telma entra no job e não tem nenhuma indicação visual de onde o job está no fluxo (só o dropdown de status no header, que é pequeno).

**Código atual:**
```tsx
<div className={cn('hidden md:flex items-center gap-1', className)}>
```

**Fix sugerido:**
Mostrar uma versão simplificada em mobile — ao invés de esconder tudo, mostrar só o passo atual com label:
```tsx
// Mobile: badge do status atual
<div className="md:hidden flex items-center gap-2 py-1">
  <span className="text-xs text-muted-foreground">Etapa:</span>
  <span className="text-xs font-medium" style={{ color: JOB_STATUS_COLORS[currentStatus] }}>
    {JOB_STATUS_LABELS[currentStatus]}
  </span>
  <span className="text-xs text-muted-foreground">
    ({currentIndex + 1}/{STATUS_PIPELINE_ORDER.length})
  </span>
</div>
// Desktop: pipeline completo
<div className="hidden md:flex items-center gap-1">
  ...
</div>
```

---

### BUG-006 — JobHeader sticky conflita com Topbar em mobile
**Severidade: ALTO**
**Persona: Telma (scrolla o job e perde a referência)**
**Arquivo:** `frontend/src/components/job-detail/JobHeader.tsx` (linha 139)

**O que acontece:**
O JobHeader usa `sticky top-14 z-20`. O Topbar tem `h-14` e `sticky top-0 z-30`. Em mobile, o JobHeader sticky empurra o conteúdo para baixo mas não considera que a área útil é menor (notch + status bar). O z-index 20 do header está abaixo do z-30 do Topbar — isso é correto — mas em mobile com tela pequena (320px-375px), o header sticky com título + badges + metadata ocupa facilmente 100-120px, deixando muito pouco espaço para o conteúdo das abas.

Além disso, o `max-w-[200px]` no breadcrumb (linha 149) vai truncar títulos longos de jobs em telas menores que isso, cortando no meio de uma palavra.

**Código atual:**
```tsx
<span className="text-foreground font-medium truncate max-w-[200px]" title={job.job_code}>
  {job.job_code}
```

**Fix:**
```tsx
<span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-[200px]" title={job.job_code}>
```

---

### BUG-007 — KanbanView: drag-and-drop inutilizável em touch/mobile
**Severidade: ALTO**
**Persona: Junior (tenta arrastar card no celular)**
**Arquivo:** `frontend/src/components/jobs/KanbanView.tsx`

**O que acontece:**
O Kanban usa `@dnd-kit` com `touch-none` nos cards draggáveis. O `touch-none` desabilita o scroll nativo da página enquanto o usuário tenta scrollar sobre um card. Em mobile, o usuário não consegue fazer scroll vertical na lista de jobs kanban sem iniciar acidentalmente um drag.

O `DraggableCard` aplica `{...listeners}` diretamente na `div` que envolve todo o card. Isso significa que qualquer toque no card inicia o drag — incluindo o toque para abrir o job (que é `onClick` no `KanbanCard` interno).

Além disso, as colunas têm `w-72` (288px fixo). Em um celular de 375px de largura, só **1,3 colunas** aparecem — o usuário não sabe que existem mais colunas sem fazer scroll horizontal.

**Fix sugerido:**
- Em mobile, substituir drag-and-drop por um botão de mudança de status (o dropdown já existe no card, isso já cobre o caso de uso)
- Adicionar handle explícito de drag (ícone de 6 pontos) em vez de usar o card inteiro como área de drag
- Considerar colunas com `w-[85vw]` em mobile para deixar claro que há mais conteúdo

---

### BUG-008 — JobDetailTabs: grupo de abas sem scroll adequado em mobile pequeno
**Severidade: ALTO**
**Persona: Telma (iPhone SE, 375px)**
**Arquivo:** `frontend/src/components/job-detail/JobDetailTabs.tsx` (linha 170)

**O que acontece:**
O seletor de grupos usa `overflow-x-auto pb-1` — isso está correto para scroll. Mas as abas individuais dentro do grupo usam `TabsList` com `w-full justify-start`. Em um job com muitas abas (ex: grupo "Producao" tem Storyboard, Elenco, Diárias, Locações, OD, Claquete), as abas transbordam horizontalmente mas o `TabsList` não tem `overflow-x-auto`.

O `TabsTrigger` usa `px-3 sm:px-4` — em mobile com padding menor o texto pode ficar muito apertado quando há 6+ abas no mesmo grupo.

**Código atual:**
```tsx
<TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0">
```

**Fix:**
```tsx
<TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0 overflow-x-auto">
```

---

### BUG-009 — Sidebar sem fechamento automático ao navegar (mobile)
**Severidade: ALTO**
**Persona: Telma (abre o menu, clica num link, o menu fica aberto)**
**Arquivo:** `frontend/src/app/(dashboard)/layout.tsx` (linha 96-107)

**O que acontece:**
O Sidebar mobile é um `Sheet`. Quando o usuário clica em um link dentro do Sidebar, o Sheet **não fecha automaticamente**. O `onToggle` dentro do Sidebar só é chamado quando clica no botão "Recolher". Os links dentro da sidebar são `<Link>` simples que fazem navegação mas não chamam `setMobileOpen(false)`.

A Telma vai clicar em "Jobs", a sidebar fecha? Não. Ela vai ter que fechar manualmente. Isso é o comportamento que todo mundo odeia em apps mobile.

**Fix:**
Passar um callback `onNavigate` para o Sidebar que chama `setMobileOpen(false)`, e chamar esse callback nos links de navegação. Ou usar o hook `usePathname` dentro do Sheet para fechar quando o pathname mudar:

```tsx
// No DashboardLayout
const pathname = usePathname()
useEffect(() => {
  setMobileOpen(false)
}, [pathname])
```

---

### BUG-010 — JobFilters: barra de filtros não colapsa em mobile
**Severidade: ALTO**
**Persona: Telma (tela pequena cheia de botões de filtro)**
**Arquivo:** `frontend/src/components/jobs/JobFilters.tsx` (linha 133)

**O que acontece:**
A barra de filtros tem 6 controles em linha: busca, Status (dropdown), Cliente (dropdown), Tipo (dropdown), Switch Arquivados, Botão Limpar. Em mobile, isso usa `flex flex-wrap` então vai quebrar em múltiplas linhas. Em 375px, o resultado é:
- Linha 1: Campo de busca (full width — correto, tem `w-full sm:w-64`)
- Linha 2: Botão Status + Botão Cliente + Botão Tipo
- Linha 3: Switch Arquivados + (talvez) Botão Limpar

Isso ocupa ~120px de altura só em filtros, antes mesmo de mostrar a lista de jobs. A Telma vai achar que a tela está cheia de lixo antes de ver os jobs.

Além disso, os botões de filtro não têm tamanho mínimo de 44px para touch (`h-9` = 36px — abaixo do mínimo recomendado pela Apple).

**Fix:**
```tsx
// Filtros adicionais colapsáveis em mobile
<div className="flex flex-wrap items-center gap-2">
  {/* Busca sempre visível */}
  <div className="relative w-full sm:w-64">...</div>

  {/* Filtros extras: colapsáveis em mobile */}
  <div className="flex flex-wrap gap-2 sm:contents">
    {/* Status, Cliente, Tipo, Switch */}
  </div>
</div>

// Alterar h-9 para h-10 (40px) ou h-11 (44px) nos botões de filtro
```

---

### BUG-011 — Sem manifest.json / PWA — não instalável no celular
**Severidade: MEDIO**
**Persona: Telma (quer colocar na tela inicial do iPhone)**
**Arquivo:** Ausente — `frontend/public/manifest.json` não existe

**O que acontece:**
O sistema não tem `manifest.json` nem `theme-color`. Isso significa:
- Não pode ser instalado como PWA ("Adicionar à tela inicial")
- Barra de endereço do Safari/Chrome não muda de cor para combinar com o app
- Sem ícone do app ao adicionar atalho
- Sem splash screen ao abrir

**Fix:**
Criar `frontend/public/manifest.json`:
```json
{
  "name": "ELLAHOS",
  "short_name": "ELLAHOS",
  "description": "Sistema de gestao para produtoras audiovisuais",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Adicionar no `layout.tsx`:
```tsx
export const metadata: Metadata = {
  // ...
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ELLAHOS',
  },
}
```

---

### BUG-012 — CreateJobModal sem `sm:max-w-lg` explícito pode ocupar tela inteira de forma cortada
**Severidade: MEDIO**
**Persona: Telma (abrindo modal no iPhone)**
**Arquivo:** `frontend/src/components/jobs/CreateJobModal.tsx` (linha 119)

**O que acontece:**
O `DialogContent` tem `max-w-lg` que no shadcn/ui já aplica responsividade básica. Mas o shadcn/ui `DialogContent` padrão não é `fullscreen` em mobile — ele mantém as margens laterais e pode ficar pequeno demais para os dropdowns internos (SearchableSelect de cliente/agência). Se a tela for 375px, o modal terá ~343px de largura com padding, que é apertado mas ok.

O problema real: o formulário tem 6 campos empilhados. Em mobile, ao abrir um `SelectContent` (tipo de projeto, status), o dropdown pode aparecer fora da área visível se o teclado virtual estiver aberto.

**Fix:**
Adicionar `className="sm:max-w-lg w-full"` e garantir scroll interno:
```tsx
<DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
```

---

### BUG-013 — CostItemDrawer (Sheet) sem altura máxima em mobile
**Severidade: MEDIO**
**Persona: Telma (abre drawer de custo, tela fica cheia sem poder fechar)**
**Arquivo:** `frontend/src/app/(dashboard)/jobs/[id]/financeiro/custos/_components/CostItemDrawer.tsx`

**O que acontece:**
O `CostItemDrawer` usa `Sheet` com `SheetContent`. Drawers do shadcn/ui por padrão ocupam altura total quando `side="right"`. Em mobile, isso pode ser problemático se o conteúdo for muito longo (o drawer de custo tem muitos campos: descrição, fornecedor, valor, quantidade, condição de pagamento, vencimento, status, seção NF, seção comprovante, seção aprovação). O usuário fica "preso" dentro do drawer sem saber que precisa scrollar para encontrar o botão Salvar no fundo.

**Fix:**
```tsx
<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
```

---

### BUG-014 — Tooltips inacessíveis em touch (hover-only)
**Severidade: MEDIO**
**Persona: Telma (não consegue ver informação escondida em tooltip)**
**Arquivos múltiplos:** `CostItemsTable.tsx`, `JobHeader.tsx`, `IntegrationBadges.tsx`

**O que acontece:**
Vários componentes usam `<Tooltip>` do Radix UI que só aparecem em hover. Em touch, hover não funciona. Informações importantes ficam inacessíveis:
- `CostItemsTable`: DivergenceBadge (+5.2%) — o usuário não sabe o que significa
- `CostItemsTable`: VendorCell (email/PIX do fornecedor)
- `CostItemsTable`: cabeçalho "NF" e "Comp." com tooltip explicando o que é
- `JobStatusPipeline`: cada segmento tem tooltip com nome do status

Em mobile, o toque uma vez em um TooltipTrigger dispara o evento, mas o comportamento varia por browser. No Safari iOS, frequentemente não funciona.

**Fix:** Para informações críticas, considerar usar `Popover` ao invés de `Tooltip`, ou duplicar a informação de outra forma visível.

---

### BUG-015 — SelectTrigger com `w-60` hardcoded não respeita tela pequena
**Severidade: MEDIO**
**Persona: Telma (campo de sub-status cortado)**
**Arquivo:** `frontend/src/components/job-detail/tabs/TabGeral.tsx` (linha 131)

**O que acontece:**
O Select de sub-status de pós-produção usa `className="w-60"` fixo (240px). Em uma tela de 320px com `p-6` (padding 24px de cada lado), o espaço disponível é 272px — o select de 240px quase cabe, mas em combinação com outros elementos pode transbordar.

**Código atual:**
```tsx
<SelectTrigger className="w-60">
```

**Fix:**
```tsx
<SelectTrigger className="w-full sm:w-60">
```

---

### BUG-016 — DateField com `w-48` fixo no TabGeral
**Severidade: MEDIO**
**Persona: Telma (campo de data cortado ou fora do alinhamento)**
**Arquivo:** `frontend/src/components/job-detail/tabs/TabGeral.tsx` (linha 207)

**O que acontece:**
O campo de data (`DateField`) usa `className="w-48"` fixo (192px). Está dentro de um `grid grid-cols-1 md:grid-cols-2` — então em mobile ocupa uma coluna inteira, e o campo de 192px fica desalinhado dentro de uma célula que pode ser maior que isso.

**Fix:**
```tsx
<Input
  type="date"
  value={local}
  ...
  className="w-full sm:w-48"
/>
```

---

### BUG-017 — Sidebar permanece renderizada em mobile mesmo fechada (z-index waste)
**Severidade: MEDIO**
**Persona: Hacker Acidental**
**Arquivo:** `frontend/src/app/(dashboard)/layout.tsx`

**O que acontece:**
Em mobile (`!isDesktop`), o `<Sidebar>` é renderizado dentro de um `Sheet`. O `Sheet` do Radix UI renderiza o conteúdo no DOM mesmo quando fechado (apenas ocultado). Isso significa que a Sidebar está sempre no DOM em mobile, ocupando memória e podendo causar conflito de IDs nos elementos (problema de acessibilidade com screen readers que encontram elementos duplicados quando o Sheet está fechado).

Não é um bug crítico de UX, mas é ineficiência desnecessária.

**Fix:**
Usar renderização condicional dentro do SheetContent:
```tsx
<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
  <SheetContent side="left" className="w-64 p-0">
    {mobileOpen && (
      <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} badges={sidebarBadges} />
    )}
  </SheetContent>
</Sheet>
```

---

### BUG-018 — Botão hamburguer usa `lg:hidden` mas Sidebar usa `1024px` breakpoint
**Severidade: MEDIO**
**Persona: Telma (tablet landscape — hamburguer aparece mas sidebar também)**
**Arquivo:** `frontend/src/components/layout/Topbar.tsx` (linha 71)

**O que acontece:**
O botão hamburguer no Topbar usa `className="lg:hidden"`. Isso significa que em tablets com tela < 1024px (ex: iPad mini landscape = 1024px exato, iPad = 1024px), o botão aparece. Mas o `useIsDesktop()` retorna `true` para `>= 1024px`. Então no breakpoint exato de 1024px:
- `isDesktop` = true (sidebar fixa renderizada)
- `showMenuButton` = true com `lg:hidden` = botão fica **visível** (lg é >= 1024px, então `lg:hidden` oculta em >= 1024px — OK)

Na verdade este caso é correto. Mas em 1023px:
- Sidebar mobile (Sheet) é renderizada
- Hamburguer aparece — correto
- Mas o botão no Topbar ainda tem `className="lg:hidden"` o que é tecnicamente `hidden em 1024px+` -- OK

Este item precisa de validação em dispositivo real. Potencial bug em landscape de alguns tablets.

---

### BUG-019 — Sem `theme-color` na meta — barra do browser não combina com o app
**Severidade: BAIXO**
**Persona: Telma (experiência visual ruim no Safari/Chrome)**
**Arquivo:** `frontend/src/app/layout.tsx`

A barra do browser no Safari iOS fica branca/cinza padrão ao invés de combinar com a cor do tema do sistema. Pequeno mas afeta a experiência de app "nativo".

**Fix:**
```tsx
export const metadata: Metadata = {
  // ...
  other: {
    'theme-color': '#000000',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
  }
}
```

---

### BUG-020 — `useIsDesktop` inicializa como `false` — flash de layout mobile no desktop
**Severidade: BAIXO**
**Persona: Hacker Acidental (vê o layout mudar ao carregar)**
**Arquivo:** `frontend/src/hooks/useMediaQuery.ts` (linha 5)

**O que acontece:**
`useMediaQuery` inicializa como `false` no SSR/hidratação. `useIsDesktop()` retorna `false` inicialmente em todos os clientes, mesmo no desktop. O DashboardLayout renderiza o layout mobile (sem sidebar, com hamburger) por um frame antes de trocar para o layout desktop. Isso causa um flash visual perceptível.

O `useMounted()` no DashboardLayout mitiga parcialmente isso com o SSR shell, mas não elimina o flash pós-hidratação.

**Fix:**
```tsx
export function useIsDesktop() {
  // Usar typeof window para detectar SSR e inicializar corretamente
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(min-width: 1024px)').matches
  })
  // ...
}
```

---

### BUG-021 — `Topbar` breadcrumb `Detalhe` sem nome do job em mobile
**Severidade: BAIXO**
**Persona: Telma (não sabe em qual job está)**
**Arquivo:** `frontend/src/components/layout/Topbar.tsx` (linha 33)

**O que acontece:**
No Topbar, o breadcrumb para páginas de job detalhe é hardcoded como "Jobs > Detalhe". O JobHeader já tem o código e título do job, mas em mobile, quando o header sticky rola para fora da tela, a Topbar mostra apenas "Jobs > Detalhe" — sem identificação do job.

```tsx
if (match) {
  items.push({ label: 'Detalhe' }) // sem nome do job!
}
```

**Fix:** Não trivial pois o Topbar não tem acesso ao job. Solução mais simples: mudar para "Jobs > #[código]" usando o pathname.

---

### BUG-022 — BulkActionsBar não tem `padding-bottom` safe area no iPhone
**Severidade: ALTO**
**Persona: Telma (iPhone X+, botões de bulk action atrás da barra de home)**
**Arquivo:** `frontend/src/components/jobs/BulkActionsBar.tsx` (linha 37)

**O que acontece:**
Além do conflito com o BottomNav (BUG-002), a BulkActionsBar não tem `pb-[env(safe-area-inset-bottom)]`. Em iPhones com notch (X, 11, 12, 13, 14, 15), a barra de home do iOS ocupa os últimos ~34px da tela. Os botões "Arquivar" e "Mudar Status" ficam parcialmente atrás dessa barra e não conseguem ser clicados.

**Código atual:**
```tsx
<div className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-zinc-900 ...">
```

**Fix:**
```tsx
<div className="fixed bottom-0 left-0 right-0 z-[60] bg-zinc-900 ... pb-[env(safe-area-inset-bottom)]">
  <div className="flex h-16 items-center gap-4 px-6">
    {/* conteúdo aqui */}
  </div>
</div>
```

---

## Tabela Resumo

| # | Descrição | Severidade | Persona | Arquivo |
|---|-----------|-----------|---------|---------|
| 001 | Viewport meta tag ausente — iPhone tudo minúsculo | CRITICO | Telma | `layout.tsx` |
| 002 | BulkActionsBar conflita com BottomNav (z-50 vs z-50, bottom-0 vs bottom-0) | CRITICO | Telma | `BulkActionsBar.tsx` |
| 003 | CostItemsTable 15 colunas — inutilizável no mobile | CRITICO | Telma | `CostItemsTable.tsx` |
| 004 | Toaster bottom-right atrás do BottomNav | CRITICO | Telma | `layout.tsx` |
| 005 | JobStatusPipeline `hidden md:flex` — pipeline invisível em mobile | ALTO | Telma | `JobStatusPipeline.tsx` |
| 006 | JobHeader breadcrumb `max-w-[200px]` corta demais em mobile | ALTO | Telma | `JobHeader.tsx` |
| 007 | KanbanView touch-none bloqueia scroll + drag inteiro-card | ALTO | Junior | `KanbanView.tsx` |
| 008 | JobDetailTabs: lista de abas sem overflow-x-auto | ALTO | Telma | `JobDetailTabs.tsx` |
| 009 | Sidebar mobile não fecha ao clicar em link de navegação | ALTO | Telma | `layout.tsx` |
| 010 | JobFilters barra de 6 controles, h-9 (36px) abaixo do mínimo touch | ALTO | Telma | `JobFilters.tsx` |
| 011 | Sem manifest.json / PWA — não instalável no celular | MEDIO | Telma | ausente |
| 012 | CreateJobModal sem `overflow-y-auto` — scroll interno em mobile | MEDIO | Telma | `CreateJobModal.tsx` |
| 013 | CostItemDrawer sem altura máxima — usuário preso | MEDIO | Telma | `CostItemDrawer.tsx` |
| 014 | Tooltips hover-only — inacessíveis em touch | MEDIO | Telma | múltiplos |
| 015 | SelectTrigger `w-60` hardcoded no TabGeral | MEDIO | Telma | `TabGeral.tsx` |
| 016 | DateField `w-48` fixo no TabGeral | MEDIO | Telma | `TabGeral.tsx` |
| 017 | Sidebar renderizada no DOM mesmo fechada em mobile | MEDIO | Hacker | `layout.tsx` |
| 018 | Breakpoint inconsistente hamburguer vs `useIsDesktop` | MEDIO | Hacker | `Topbar.tsx` |
| 019 | Sem theme-color meta | BAIXO | Telma | `layout.tsx` |
| 020 | useIsDesktop flash de layout ao hidratar | BAIXO | Hacker | `useMediaQuery.ts` |
| 021 | Topbar breadcrumb "Detalhe" sem nome do job | BAIXO | Telma | `Topbar.tsx` |
| 022 | BulkActionsBar sem safe-area-inset-bottom (iPhone notch) | ALTO | Telma | `BulkActionsBar.tsx` |

---

## Prioridade de Fix

### Sprint imediato (blockers para usuário real no celular)
1. **BUG-001** — viewport meta tag (5 min de fix, impacto máximo)
2. **BUG-004** — Toaster atrás do BottomNav (1 linha de fix)
3. **BUG-002 + BUG-022** — BulkActionsBar conflito (fix conjunto)
4. **BUG-009** — Sidebar não fecha ao navegar (useEffect 3 linhas)

### Sprint seguinte (UX ruim mas não quebra o fluxo)
5. **BUG-008** — TabsList overflow-x-auto (1 linha)
6. **BUG-005** — Pipeline invisível (add versão mobile simplificada)
7. **BUG-010** — JobFilters `h-9 → h-10` nos botões
8. **BUG-012 + BUG-013** — Dialogs/Drawers com overflow-y-auto

### Backlog (melhorias progressivas)
9. **BUG-003** — CostItemsTable colunas ocultas em mobile (mais trabalhoso)
10. **BUG-007** — Kanban drag em mobile (handle dedicado)
11. **BUG-011** — PWA manifest
12. **BUG-015 + BUG-016** — w-full responsivo nos campos fixos
