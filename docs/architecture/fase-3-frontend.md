# Arquitetura: Fase 3 - Frontend (Modulo Jobs)

**Data:** 2026-02-18
**Status:** Proposto
**Autor:** Tech Lead - ELLAHOS
**Spec de referencia:** docs/specs/fase-3-frontend.md
**Design System:** docs/design/design-system.md
**Backend de referencia:** docs/architecture/jobs-module.md, ADR-001

---

## 1. Decisoes Arquiteturais

### 1.1 Stack Confirmada

| Camada | Tecnologia | Versao | Justificativa |
|--------|-----------|--------|---------------|
| Framework | Next.js | 14.2+ (App Router) | SSR/SSG, layouts aninhados, middleware nativo |
| Linguagem | TypeScript | 5.x strict | Seguranca de tipos, alinhado com backend |
| Estilo | Tailwind CSS | 3.4+ | Design system com CSS vars, dark mode nativo |
| Componentes | shadcn/ui | latest | Componentes acessiveis, customizaveis, nao e dependencia NPM |
| Data Fetching | TanStack Query | v5 | Cache, dedup, optimistic updates, devtools |
| Forms | React Hook Form + Zod | RHF v7, Zod v3 | Validacao tipada, performance, resolver integrado |
| Auth | @supabase/ssr | latest | Cookies httpOnly, middleware SSR, token refresh |
| API Client | @supabase/supabase-js | v2 | Injeta Bearer token auto, tipagem gerada |
| Tema | next-themes | latest | Dark mode sem FOUC, SSR-safe |
| Toast | Sonner | latest | Padrao do shadcn/ui, posicao configuravel |
| Icones | Lucide React | latest | Padrao do shadcn/ui, tree-shakeable |
| Datas | date-fns | v3 | Leve, imutavel, locale pt-BR |
| Moeda | Intl.NumberFormat | nativo | Sem dependencia extra para formatacao BRL |

### 1.2 Estrutura de Pastas

```
frontend/
  src/
    app/
      (auth)/
        login/
          page.tsx
        forgot-password/
          page.tsx
        reset-password/
          page.tsx
        layout.tsx                   # Layout auth: centralizado, sem sidebar
      (dashboard)/
        jobs/
          page.tsx                   # Listagem (tabela + kanban)
          [id]/
            page.tsx                 # Detalhe do job (header + abas)
        layout.tsx                   # Layout dashboard: sidebar + topbar
      layout.tsx                     # Root layout: providers, fonts, theme
      globals.css                    # CSS vars do design system
      not-found.tsx                  # 404 global
      error.tsx                      # Error boundary global
      loading.tsx                    # Loading global (fallback)
    components/
      ui/                            # shadcn/ui (gerados pelo CLI)
        button.tsx
        input.tsx
        dialog.tsx
        dropdown-menu.tsx
        select.tsx
        badge.tsx
        table.tsx
        skeleton.tsx
        tabs.tsx
        toast.tsx (sonner)
        popover.tsx
        calendar.tsx
        command.tsx                   # Searchable select base
        checkbox.tsx
        textarea.tsx
        label.tsx
        separator.tsx
        sheet.tsx                     # Mobile modals (bottom sheet)
        switch.tsx
        avatar.tsx
        tooltip.tsx
        progress.tsx
        scroll-area.tsx
        form.tsx                     # RHF integration
      layout/
        Sidebar.tsx                  # Sidebar desktop (collapsable)
        Topbar.tsx                   # Barra superior
        BottomNav.tsx                # Bottom nav mobile
        Breadcrumb.tsx               # Breadcrumb dinamic
        UserMenu.tsx                 # Dropdown do avatar
        ThemeToggle.tsx              # Sun/Moon toggle
      jobs/
        JobsTable.tsx                # Tabela de listagem
        JobsKanban.tsx               # Vista kanban
        JobCard.tsx                  # Card de job (kanban + mobile)
        JobFilters.tsx               # Barra de filtros
        JobFilterChips.tsx           # Chips ativos abaixo dos filtros
        JobPagination.tsx            # Paginacao
        CreateJobModal.tsx           # Modal de criacao rapida
        BulkActionsBar.tsx           # Barra de acoes em lote
        ViewToggle.tsx               # Toggle tabela/kanban
      job-detail/
        JobHeader.tsx                # Header sticky com status e acoes
        JobStatusPipeline.tsx        # Barra de progresso do pipeline
        StatusChangeDropdown.tsx     # Dropdown para mudar status
        SyncIndicator.tsx            # Indicador Salvo/Salvando/Erro
        TabGeneral.tsx               # Aba Geral (formulario)
        TabTeam.tsx                  # Aba Equipe
        TabDeliverables.tsx          # Aba Entregaveis
        TabFinancial.tsx             # Aba Financeiro
        TabFiles.tsx                 # Aba Arquivos
        TabHistory.tsx               # Aba Historico
        AddTeamMemberModal.tsx       # Modal adicionar membro
        AddDeliverableModal.tsx      # Modal adicionar entregavel
        AddShootingDateModal.tsx     # Modal adicionar diaria
        CancelJobDialog.tsx          # Dialog de cancelamento com motivo
      shared/
        StatusBadge.tsx              # Badge de status com cor/dot
        PriorityBadge.tsx            # Badge de prioridade
        HealthBar.tsx                # Barra de health score
        MarginIndicator.tsx          # Indicador de margem com cor
        AvatarStack.tsx              # Stack de avatares da equipe
        DateDisplay.tsx              # Data formatada pt-BR com alerta de atraso
        CurrencyDisplay.tsx          # Valor formatado BRL
        EmptyState.tsx               # Empty state generico (icone + msg + CTA)
        SearchableSelect.tsx         # Dropdown searchable (wraps Command)
        DatePickerField.tsx          # Date picker com mascara dd/mm/yyyy
        CurrencyInput.tsx            # Input numerico com mascara BRL
        ConfirmDialog.tsx            # Dialog de confirmacao generico
        ErrorCard.tsx                # Card de erro com botao Tentar novamente
    hooks/
      useJobs.ts                     # React Query: listagem, create, bulk
      useJob.ts                      # React Query: get-by-id, update (auto-save)
      useJobStatus.ts                # React Query: mudar status, approve
      useJobTeam.ts                  # React Query: CRUD equipe
      useJobDeliverables.ts          # React Query: CRUD entregaveis
      useJobShootingDates.ts         # React Query: CRUD diarias
      useJobHistory.ts               # React Query: listar historico
      useAutoSave.ts                 # Debounce + PATCH + indicador de sync
      useClients.ts                  # Listar clientes para dropdowns
      useAgencies.ts                 # Listar agencias para dropdowns
      usePeople.ts                   # Listar pessoas para dropdowns
      useContacts.ts                 # Listar contatos filtrados
      useAuth.ts                     # Auth: login, logout, sessao, user
      useMediaQuery.ts               # Breakpoint detection
      useLocalStorage.ts             # useState persistido em localStorage
      useDebouncedCallback.ts        # Debounce generico
    lib/
      supabase/
        client.ts                    # createBrowserClient (client-side)
        server.ts                    # createServerClient (server components)
        middleware.ts                # Logica de refresh de sessao
      api.ts                         # Wrapper para chamar Edge Functions
      format.ts                      # Formatacao: moeda, data, porcentagem
      validators.ts                  # Schemas Zod (reutilizados em forms)
      constants.ts                   # Labels pt-BR, cores de status, ENUMs
      query-keys.ts                  # Fabrica de query keys hierarquicas
      utils.ts                       # cn(), helpers genericos
    types/
      database.ts                    # Types gerados pelo Supabase CLI
      jobs.ts                        # Types do modulo Jobs (API responses)
      auth.ts                        # Types de autenticacao
    middleware.ts                     # Next.js middleware (auth guard)
  public/
    logo-full.svg                    # Logo ELLAHOS completo
    logo-icon.svg                    # Logo ELLAHOS icone (sidebar colapsada)
  .env.local.example                 # Template de variaveis
  next.config.mjs
  tailwind.config.ts
  tsconfig.json
  components.json                    # Config do shadcn/ui
```

### 1.3 Estrategia de Data Fetching

**Principio: Server State via TanStack Query, nunca global state para dados da API.**

```
                    +-------------------+
                    |   Edge Functions  |
                    | (Supabase hosted) |
                    +-------------------+
                            ^
                            | HTTPS (Bearer token via cookie)
                            |
                    +-------------------+
                    | supabase.functions|
                    | .invoke()         |
                    +-------------------+
                            ^
                            |
                    +-------------------+
                    |  lib/api.ts       |
                    | (wrapper tipado)  |
                    +-------------------+
                            ^
                            |
                    +-------------------+
                    | hooks/useJobs.ts  |
                    | (TanStack Query)  |
                    +-------------------+
                            ^
                            |
                    +-------------------+
                    | Componentes React |
                    +-------------------+
```

**Configuracao padrao do QueryClient:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000,        // 10s - dados considerados fresh
      gcTime: 5 * 60 * 1000,       // 5min - garbage collection
      retry: 1,                     // 1 retry em erro de rede
      refetchOnWindowFocus: true,   // Refetch ao voltar para a aba
      refetchOnReconnect: true,     // Refetch ao reconectar internet
    },
    mutations: {
      retry: 0,                     // Sem retry em mutations
    },
  },
});
```

**Query Keys hierarquicas (query-keys.ts):**

```typescript
export const jobKeys = {
  all:        ['jobs'] as const,
  lists:      () => [...jobKeys.all, 'list'] as const,
  list:       (filters: JobFilters) => [...jobKeys.lists(), filters] as const,
  details:    () => [...jobKeys.all, 'detail'] as const,
  detail:     (id: string) => [...jobKeys.details(), id] as const,
  team:       (jobId: string) => [...jobKeys.detail(jobId), 'team'] as const,
  deliverables: (jobId: string) => [...jobKeys.detail(jobId), 'deliverables'] as const,
  shootingDates: (jobId: string) => [...jobKeys.detail(jobId), 'shooting-dates'] as const,
  history:    (jobId: string, filters?: HistoryFilters) =>
                [...jobKeys.detail(jobId), 'history', filters] as const,
};

export const clientKeys = {
  all:  ['clients'] as const,
  list: (search?: string) => [...clientKeys.all, 'list', search] as const,
};

export const agencyKeys = {
  all:  ['agencies'] as const,
  list: (search?: string) => [...agencyKeys.all, 'list', search] as const,
};

export const peopleKeys = {
  all:  ['people'] as const,
  list: (search?: string) => [...peopleKeys.all, 'list', search] as const,
};
```

### 1.4 Gerenciamento de Estado

| Tipo de Estado | Solucao | Exemplos |
|---------------|---------|----------|
| Server state (dados API) | TanStack Query | Jobs, equipe, entregaveis, historico |
| Form state | React Hook Form | Campos da aba Geral, Financeiro |
| UI state local | useState / useReducer | Modal aberto, tab ativa, sidebar colapsada |
| Preferencias usuario | localStorage (hook) | Dark mode, vista tabela/kanban, sidebar colapsada |
| Rascunho form | sessionStorage | Fallback quando auto-save falha por rede |
| Filtros/ordenacao | URL search params | Status, cliente, pagina, ordenacao |
| Auth/sessao | Supabase SSR (cookies) | Token, user, tenant_id |

**Decisao: NENHUM global state manager (Redux, Zustand, Jotai).**

Justificativa: Com TanStack Query para server state, React Hook Form para forms, e URL params para filtros, nao sobra estado complexo o suficiente para justificar uma lib de global state. O estado UI local (modais, tabs) e naturalmente colocado no componente que o usa via useState.

### 1.5 Estrategia de Autenticacao

```
Fluxo de Auth:

1. Usuario acessa /jobs (rota protegida)
2. middleware.ts intercepta TODA request para /(dashboard)/*
3. Middleware chama supabase.auth.getSession()
4. Sem sessao valida -> redirect para /login?returnUrl=/jobs
5. Com sessao valida -> refresha token se proximo de expirar -> next()
6. Pagina carrega com sessao disponivel via createBrowserClient()
7. Supabase JS injeta Bearer token em toda chamada para Edge Functions
8. Edge Functions extraem tenant_id do JWT (app_metadata.tenant_id)
```

**middleware.ts (Next.js):**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Rotas protegidas
  if (!user && request.nextUrl.pathname.startsWith('/jobs')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirecionar / para /jobs se logado
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/jobs', request.url));
  }

  // Redirecionar /login para /jobs se ja logado
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/jobs', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/login', '/forgot-password', '/reset-password', '/jobs/:path*'],
};
```

**Token refresh:** O @supabase/ssr gerencia refresh automatico via cookies httpOnly. O middleware intercepta toda request e atualiza o cookie se o token estiver proximo de expirar. Nao precisamos de logica manual de refresh.

**tenant_id:** NUNCA enviado manualmente pelo frontend. Sempre extraido do JWT pela Edge Function. O frontend nao precisa nem ter acesso a esse valor. Se necessario para exibicao (nome do tenant), consulta via profile do usuario.

### 1.6 Estrategia de Tipos

**Camada 1: Types gerados do banco (database.ts)**

Gerados via `npx supabase gen types typescript --project-id etvapcxesaxhsvzgaane > src/types/database.ts`. Esses tipos refletem as colunas REAIS do banco (com nomes reais, nao da spec).

**Camada 2: Types da API (jobs.ts)**

Tipos manuais que refletem o contrato da API (nomes da spec, apos traducao pelo column-map.ts). Esses sao os tipos usados pelos componentes.

```typescript
// src/types/jobs.ts

// IMPORTANTE: Esses tipos refletem a API (nomes da spec),
// NAO as colunas do banco. A Edge Function faz a traducao.

export interface Job {
  id: string;
  index_number: number;
  job_code: string;              // API retorna "job_code" (banco: "code")
  title: string;
  client_id: string;
  agency_id: string | null;
  brand: string | null;
  job_type: ProjectType;          // API retorna "job_type" (banco: "project_type")
  // ... demais campos conforme JobRow traduzido
  status: JobStatus;
  sub_status: PosSubStatus | null; // API retorna "sub_status" (banco: "pos_sub_status")
  priority: PriorityLevel;
  health_score: number;
  margin_percentage: number | null;
  // Relacionamentos expandidos na listagem
  clients?: { id: string; name: string };
}

export interface JobTeamMember {
  id: string;
  job_id: string;
  person_id: string;
  role: TeamRole;
  fee: number | null;             // API retorna "fee" (banco: "rate")
  hiring_status: HiringStatus;
  is_lead_producer: boolean;      // API retorna "is_lead_producer" (banco: "is_responsible_producer")
  notes: string | null;
  // Expandidos
  people?: { id: string; full_name: string; email: string | null };
}

// Enums reutilizados nos forms e constantes
export type JobStatus = typeof JOB_STATUSES[number];
export type ProjectType = typeof PROJECT_TYPES[number];
export type PriorityLevel = typeof PRIORITY_LEVELS[number];
// ... demais enums

// Payloads de criacao/update (o que o frontend envia)
export interface CreateJobPayload {
  title: string;
  client_id: string;
  agency_id?: string;
  job_type: ProjectType;
  status?: JobStatus;
  expected_delivery_date?: string;
}

export interface UpdateJobPayload {
  [key: string]: unknown;
  // Campos atualizaveis (exceto imutaveis: id, tenant_id, code, etc.)
}

// Resposta padrao da API
export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  warnings?: Array<{ code: string; message: string }>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

**Decisao: NAO usar os types gerados diretamente nos componentes.** Os tipos gerados servem como referencia e para validacao manual. Os componentes usam os tipos da API (camada 2) porque refletem o contrato publico e estavel da API.

---

## 2. Componentes de Frontend

### 2.1 Componentes shadcn/ui (ja prontos, instalar via CLI)

Componentes que usamos do shadcn/ui sem modificacao significativa (apenas theming via CSS vars):

| Componente | Uso no ELLAHOS |
|-----------|----------------|
| Button | Todos os botoes (primary, secondary, ghost, destructive) |
| Input | Campos de texto simples |
| Textarea | Briefing, notas, observacoes |
| Label | Labels de formulario |
| Select | Dropdowns de ENUMs (tipo projeto, prioridade, etc.) |
| Checkbox | Selecao na tabela, filtros |
| Switch | Toggle "Mostrar arquivados" |
| Dialog | Modais (criar job, adicionar membro, confirmacoes) |
| Sheet | Modais mobile (bottom sheet) |
| DropdownMenu | Menu do usuario, menu de acoes (3 pontos) |
| Tabs | Abas do detalhe do job |
| Table | Tabela de listagem de jobs |
| Badge | Status, prioridade, job_code |
| Avatar | Foto/iniciais do usuario e equipe |
| Tooltip | Tooltips na sidebar colapsada e datas |
| Popover | Base para date picker e searchable selects |
| Calendar | Date picker (datas do job) |
| Command | Base para searchable select (clientes, agencias) |
| Skeleton | Loading states |
| Progress | Health score bar |
| Separator | Divisores visuais |
| ScrollArea | Scroll do kanban, listas longas |
| Form | Integracao RHF com shadcn |
| Sonner | Toasts (sucesso, erro, warning) |

### 2.2 Componentes Custom por Dominio

#### Layout (src/components/layout/)

| Componente | Props | Responsabilidade |
|-----------|-------|-----------------|
| `Sidebar` | `collapsed: boolean, onToggle: () => void` | Sidebar fixa desktop com navegacao, logo, toggle de colapso. Itens desabilitados para fases futuras. Estado de colapso via localStorage. |
| `Topbar` | - | Barra superior sticky. Hamburger (mobile), breadcrumb, busca, theme toggle, user menu. |
| `BottomNav` | - | Navegacao inferior mobile (< md). Max 5 itens com touch target 44px. |
| `Breadcrumb` | `items: Array<{label, href?}>` | Breadcrumb dinamico baseado na rota. |
| `UserMenu` | - | Dropdown com nome, email, logout. Usa avatar com iniciais. |
| `ThemeToggle` | - | Toggle Sun/Moon. Usa next-themes. Persiste em localStorage. |

#### Jobs Dashboard (src/components/jobs/)

| Componente | Props | Responsabilidade |
|-----------|-------|-----------------|
| `JobsTable` | `jobs: Job[], onSort, sortBy, sortOrder, selectedIds, onSelect` | Tabela completa com colunas conforme spec. Linhas clicaveis. Checkbox de selecao. Header com sorting. Skeleton de 8 linhas durante loading. |
| `JobsKanban` | `jobs: Job[]` | Vista kanban: 14 colunas por status, scroll horizontal. Cards clicaveis. Botao de mudar status no card (dropdown, sem drag). |
| `JobCard` | `job: Job` | Card de job para kanban e mobile. job_code, titulo, cliente, data entrega, margem, health, avatar stack. |
| `JobFilters` | `filters: JobFilters, onChange` | Barra de filtros: busca com debounce 400ms, multi-select status, dropdown cliente, dropdown tipo, date range, toggle arquivados. Filtros refletidos na URL. |
| `JobFilterChips` | `filters: JobFilters, onRemove` | Chips dos filtros ativos com X para remover. |
| `JobPagination` | `meta: PaginationMeta, onPageChange, onPerPageChange` | Paginacao: anterior/proximo, paginas numeradas, seletor 20/50/100, texto "Pagina X de Y". |
| `CreateJobModal` | `open, onOpenChange` | Modal de criacao rapida: titulo, cliente (searchable + inline create), agencia, tipo, status, data entrega. Validacao Zod. |
| `BulkActionsBar` | `selectedCount, onArchive, onChangeStatus, onClear` | Barra fixa no rodape: "N jobs selecionados" + acoes. Dialog de confirmacao antes de executar. |
| `ViewToggle` | `view: 'table' | 'kanban', onChange` | Toggle com icones LayoutList/KanbanSquare. Persiste em localStorage. |

#### Job Detail (src/components/job-detail/)

| Componente | Props | Responsabilidade |
|-----------|-------|-----------------|
| `JobHeader` | `job: Job` | Header sticky abaixo do topbar. Breadcrumb, code badge, titulo editavel inline, status badge, priority badge, health bar, botao mudar status, menu 3 pontos. |
| `JobStatusPipeline` | `currentStatus: JobStatus` | Barra horizontal segmentada. Status anteriores filled, atual highlighted, futuros outlined. Cancelado/Pausado fora do pipeline. |
| `StatusChangeDropdown` | `currentStatus, onStatusChange` | Dropdown com 14 status em pt-BR, dot colorido, checkmark no atual. Dialog de motivo se cancelado. |
| `SyncIndicator` | `state: 'idle' | 'pending' | 'saving' | 'saved' | 'error', onRetry` | Indicador visual: ponto laranja (pending), spinner (saving), check verde (saved), X vermelho (error + retry). |
| `TabGeneral` | `job: Job, form: UseFormReturn` | Formulario com secoes: Identificacao, Classificacao, Datas, Briefing, Links Drive. Layout 2 colunas desktop, 1 mobile. Auto-save via hook. |
| `TabTeam` | `jobId: string` | Lista de membros + subsecao diarias. Botao adicionar. Modal para CRUD. Destaque do produtor responsavel. Warnings de conflito. |
| `TabDeliverables` | `jobId: string` | Barra de progresso + lista + botao adicionar. Status inline editavel. Modal para CRUD. |
| `TabFinancial` | `job: Job, form: UseFormReturn` | Cards de metricas no topo + formulario editavel + secao aprovacao. Campos calculados em tempo real. Auto-save. |
| `TabFiles` | `jobId: string` | Links Drive no topo + lista por categoria + dropzone upload + modal link externo. Upload via Supabase Storage. |
| `TabHistory` | `jobId: string` | Timeline vertical + filtros por tipo + campo comentario + "Carregar mais". |
| `AddTeamMemberModal` | `jobId, open, onOpenChange, editMember?` | Modal: pessoa (searchable + inline create), funcao, cache, status. Warnings de conflito da API. |
| `AddDeliverableModal` | `jobId, open, onOpenChange, editDeliverable?` | Modal: descricao, formato, resolucao, duracao, links. |
| `AddShootingDateModal` | `jobId, open, onOpenChange, editDate?` | Modal: data, descricao, locacao, horarios. |
| `CancelJobDialog` | `open, onOpenChange, onConfirm` | Dialog com textarea obrigatoria para motivo de cancelamento. |

#### Shared (src/components/shared/)

| Componente | Props | Responsabilidade |
|-----------|-------|-----------------|
| `StatusBadge` | `status: JobStatus, size?: 'sm' | 'default'` | Badge com dot colorido + label em pt-BR. Cores do design system. |
| `PriorityBadge` | `priority: PriorityLevel` | Badge: alta (vermelho), media (amarelo), baixa (cinza). |
| `HealthBar` | `score: number, showLabel?: boolean` | Barra horizontal 0-100pts. Cor: verde >=70, amarelo >=40, vermelho <40. |
| `MarginIndicator` | `percentage: number | null` | Porcentagem com cor: verde >=30%, amarelo >=15%, vermelho <15%. |
| `AvatarStack` | `members: Array<{name, avatar_url?}>, max?: number` | Circulos sobrepostos com iniciais. "+N" se ultrapassar max. |
| `DateDisplay` | `date: string | null, showOverdue?: boolean` | Data formatada dd/mm/yyyy pt-BR. Texto vermelho se overdue e showOverdue=true. |
| `CurrencyDisplay` | `value: number | null` | Valor formatado como R$ 45.000,00. Usa Intl.NumberFormat. |
| `EmptyState` | `icon: LucideIcon, title, description?, action?: {label, onClick}` | Icone 48px + titulo + descricao + botao CTA. |
| `SearchableSelect` | `options, value, onChange, placeholder, onCreateNew?` | Dropdown com busca baseado em Command. Opcao "Criar novo" inline. |
| `DatePickerField` | `value, onChange, label, error?` | Date picker com Popover + Calendar. Formato dd/mm/yyyy. |
| `CurrencyInput` | `value, onChange, label, error?` | Input numerico com mascara BRL (R$ X.XXX,XX). |
| `ConfirmDialog` | `open, onOpenChange, title, description, onConfirm, variant?` | Dialog generico de confirmacao (default/destructive). |
| `ErrorCard` | `message, onRetry` | Card de erro com icone XCircle + mensagem + botao "Tentar novamente". |

---

## 3. Rotas / Pages

### 3.1 Mapa de Rotas (App Router)

```
ROTA                         COMPONENTE               TIPO           LAYOUT
/                            redirect -> /jobs         middleware     -
/login                       (auth)/login/page.tsx     Client         (auth)/layout.tsx
/forgot-password             (auth)/forgot/page.tsx    Client         (auth)/layout.tsx
/reset-password              (auth)/reset/page.tsx     Client         (auth)/layout.tsx
/jobs                        (dashboard)/jobs/page     Client*        (dashboard)/layout.tsx
/jobs/[id]                   (dashboard)/jobs/[id]     Client*        (dashboard)/layout.tsx
```

*Nota: Todas as paginas do dashboard sao Client Components porque dependem de interatividade pesada (forms, filtros, mutations, real-time state). Usamos `"use client"` no topo de cada page.tsx.

**Decisao: Nao usar Server Components para paginas de dados neste momento.**

Justificativa: As Edge Functions do Supabase exigem o Bearer token do usuario para funcionar (RLS). Em Server Components, precisariamos de createServerClient com cookies, mas a complexidade de manter SSR + CSR para os mesmos dados (filtros, paginacao, auto-save) nao justifica o beneficio nesta fase. O TanStack Query com staleTime de 10s ja oferece cache eficiente client-side.

Fase futura: Quando implementarmos SEO em paginas publicas (ex: portal do cliente), revisitaremos SSR.

### 3.2 Layouts Compartilhados

**Root Layout (src/app/layout.tsx)**
- `<html>` com classe `suppressHydrationWarning` (next-themes)
- Font Inter via `next/font/google`
- Font JetBrains Mono via `next/font/google` (monospaced)
- `<ThemeProvider>` (next-themes) com attribute="class"
- `<QueryClientProvider>` (TanStack Query)
- `<Toaster>` (Sonner)
- Metadata global (title, description, favicon)

**Auth Layout (src/app/(auth)/layout.tsx)**
- Pagina centralizada: flex items-center justify-center min-h-screen
- Logo ELLAHOS no topo
- Fundo neutro (bg-background)
- Sem sidebar, sem topbar

**Dashboard Layout (src/app/(dashboard)/layout.tsx)**
- Sidebar (desktop lg+) com estado colapsado persistido
- Topbar sticky top-0
- BottomNav (mobile < md)
- Area de conteudo: ml-64 (ou ml-16 colapsada), mt-14, max-w-7xl mx-auto
- Responsividade: sem sidebar em mobile, drawer em tablet

### 3.3 Loading e Error States

**Loading (por rota):**

Cada rota terciaria pode ter seu `loading.tsx` com skeleton especifico. Na pratica, usamos Suspense boundaries no componente pai e skeletons controlados pelo isLoading do TanStack Query (com delay de 200ms para evitar flash).

```typescript
// Pattern de loading com delay
function JobsPage() {
  const { data, isLoading } = useJobs(filters);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowSkeleton(true), 200);
      return () => clearTimeout(timer);
    }
    setShowSkeleton(false);
  }, [isLoading]);

  if (showSkeleton) return <JobsTableSkeleton />;
  // ...
}
```

**Error (por rota):**

```
src/app/(dashboard)/jobs/error.tsx         -> Erro generico na listagem
src/app/(dashboard)/jobs/[id]/error.tsx    -> Erro no detalhe (404, 403, 500)
src/app/(dashboard)/jobs/[id]/not-found.tsx -> Job nao encontrado
```

O error.tsx usa o componente ErrorCard com botao "Tentar novamente" (que chama reset()).

---

## 4. Integracao com Backend

### 4.1 Wrapper de API (lib/api.ts)

Todas as chamadas para Edge Functions passam por um wrapper tipado que:
1. Usa supabase.functions.invoke() (injeta Bearer token automaticamente)
2. Trata erros de forma padronizada
3. Retorna tipos genericos

```typescript
// src/lib/api.ts
import { createBrowserClient } from './supabase/client';
import type { ApiResponse, ApiError } from '@/types/jobs';

const supabase = createBrowserClient();

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// GET com query params
export async function apiGet<T>(
  functionName: string,
  params?: Record<string, string>,
  path?: string,
): Promise<ApiResponse<T>> {
  const queryString = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const fullPath = path ? `/${path}` : '';

  const { data, error } = await supabase.functions.invoke(
    `${functionName}${fullPath}${queryString}`,
    { method: 'GET' },
  );

  if (error) {
    throw new ApiRequestError(
      'NETWORK_ERROR',
      error.message || 'Erro de conexao',
      0,
    );
  }

  if (data?.error) {
    throw new ApiRequestError(
      data.error.code,
      data.error.message,
      data.error.status || 400,
      data.error.details,
    );
  }

  return data as ApiResponse<T>;
}

// POST/PATCH/DELETE com body
export async function apiMutate<T>(
  functionName: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
  path?: string,
): Promise<ApiResponse<T>> {
  const fullPath = path ? `/${path}` : '';

  const { data, error } = await supabase.functions.invoke(
    `${functionName}${fullPath}`,
    {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (error) {
    throw new ApiRequestError(
      'NETWORK_ERROR',
      error.message || 'Erro de conexao',
      0,
    );
  }

  if (data?.error) {
    throw new ApiRequestError(
      data.error.code,
      data.error.message,
      data.error.status || 400,
      data.error.details,
    );
  }

  return data as ApiResponse<T>;
}
```

**NOTA IMPORTANTE sobre supabase.functions.invoke():**

O Supabase JS client tem uma particularidade: `functions.invoke()` nao suporta nativamente path segments como `/jobs/[id]`. A URL e montada como `https://[project].supabase.co/functions/v1/[function-name]`. Para passar path params e query params, usamos as convencoes ja implementadas nas Edge Functions:

- **GET list:** `supabase.functions.invoke('jobs', { method: 'GET' })` + query params na URL
- **GET by id:** `supabase.functions.invoke('jobs/' + id, { method: 'GET' })`
- **POST create:** `supabase.functions.invoke('jobs', { method: 'POST', body })`
- **PATCH update:** `supabase.functions.invoke('jobs/' + id, { method: 'PATCH', body })`
- **DELETE:** `supabase.functions.invoke('jobs/' + id, { method: 'DELETE' })`

Se `functions.invoke()` nao suportar o path suffix, usaremos `fetch()` direto com a URL base do Supabase e token manualmente:

```typescript
// Fallback se invoke() nao aceitar path
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function apiFetch<T>(path: string, options: RequestInit): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new ApiRequestError(data.error.code, data.error.message, res.status);
  return data;
}
```

### 4.2 Mapeamento de Endpoints

| Acao Frontend | Metodo HTTP | Edge Function | Path | Query Params / Body |
|--------------|------------|--------------|------|---------------------|
| Listar jobs | GET | `jobs` | - | `page, per_page, sort_by, sort_order, status, client_id, agency_id, job_type, search, is_archived, date_from, date_to` |
| Obter job por ID | GET | `jobs` | `/{id}` | - |
| Criar job | POST | `jobs` | - | `{ title, client_id, job_type, agency_id?, status?, expected_delivery_date? }` |
| Atualizar job | PATCH | `jobs` | `/{id}` | `{ [campo]: valor }` (campos parciais) |
| Arquivar job (soft) | DELETE | `jobs` | `/{id}` | - |
| Mudar status | PATCH | `jobs-status` | `/{id}` | `{ new_status, cancellation_reason? }` |
| Aprovar job | POST | `jobs-status` | `/{id}/approve` | `{ approval_type, approved_by_name? }` |
| Listar equipe | GET | `jobs-team` | - | `?job_id={id}` |
| Adicionar membro | POST | `jobs-team` | - | `{ job_id, person_id, role, fee?, hiring_status? }` |
| Atualizar membro | PATCH | `jobs-team` | `/{member_id}` | `{ role?, fee?, hiring_status?, is_lead_producer? }` |
| Remover membro | DELETE | `jobs-team` | `/{member_id}` | - |
| Listar entregaveis | GET | `jobs-deliverables` | - | `?job_id={id}` |
| Adicionar entregavel | POST | `jobs-deliverables` | - | `{ job_id, description, format?, ... }` |
| Atualizar entregavel | PATCH | `jobs-deliverables` | `/{id}` | `{ description?, status?, ... }` |
| Remover entregavel | DELETE | `jobs-deliverables` | `/{id}` | - |
| Listar diarias | GET | `jobs-shooting-dates` | - | `?job_id={id}` |
| Adicionar diaria | POST | `jobs-shooting-dates` | - | `{ job_id, shooting_date, location?, ... }` |
| Atualizar diaria | PATCH | `jobs-shooting-dates` | `/{id}` | `{ shooting_date?, location?, ... }` |
| Remover diaria | DELETE | `jobs-shooting-dates` | `/{id}` | - |
| Listar historico | GET | `jobs-history` | - | `?job_id={id}&page=1&per_page=20&event_type=status_change` |
| Adicionar comentario | POST | `jobs-history` | - | `{ job_id, event_type: 'comment', description }` |

### 4.3 Tratamento de Erros

```typescript
// Em cada hook de React Query:
export function useJobs(filters: JobFilters) {
  return useQuery({
    queryKey: jobKeys.list(filters),
    queryFn: () => apiGet<Job[]>('jobs', filtersToParams(filters)),
    // Erros sao capturados pelo Error Boundary ou tratados inline
  });
}

// Nos componentes que fazem mutations:
const createJob = useMutation({
  mutationFn: (payload: CreateJobPayload) =>
    apiMutate<Job>('jobs', 'POST', payload),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    toast.success('Job criado com sucesso');
    router.push(`/jobs/${data.data.id}`);
  },
  onError: (err: ApiRequestError) => {
    toast.error(err.message);
  },
});
```

**Tabela de tratamento por tipo de erro:**

| Codigo HTTP | Codigo Erro | Acao no Frontend |
|------------|------------|-----------------|
| 401 | UNAUTHORIZED | Redirecionar para /login (sessao expirou) |
| 403 | FORBIDDEN | Toast erro + ErrorCard "Sem permissao" |
| 404 | NOT_FOUND | Pagina not-found ou toast se em modal |
| 400 | VALIDATION_ERROR | Toast com mensagem + highlight do campo invalido |
| 409 | CONFLICT | Toast warning "Conflito detectado, recarregando..." + refetch |
| 422 | BUSINESS_RULE_ERROR | Toast warning com mensagem descritiva |
| 500 | INTERNAL_ERROR | Toast erro "Erro interno" + botao "Tentar novamente" |
| 0 | NETWORK_ERROR | Toast erro "Sem conexao" + retry automatico |

**Handler global de 401:**

```typescript
// No QueryClient defaultOptions:
queryCache: new QueryCache({
  onError: (error) => {
    if (error instanceof ApiRequestError && error.status === 401) {
      // Sessao expirou - redirecionar para login
      window.location.href = '/login?session_expired=true';
    }
  },
}),
```

### 4.4 Cache Strategy com React Query

| Recurso | staleTime | gcTime | Refetch on Focus | Invalidacao |
|---------|----------|--------|-----------------|-------------|
| Lista de jobs | 10s | 5min | Sim | Apos create, delete, status change |
| Detalhe do job | 10s | 10min | Sim | Apos update (auto-save) |
| Equipe do job | 30s | 5min | Sim | Apos add/update/remove membro |
| Entregaveis | 30s | 5min | Sim | Apos add/update/remove entregavel |
| Diarias | 30s | 5min | Sim | Apos add/update/remove diaria |
| Historico | 60s | 5min | Nao | Apos qualquer mutation no job |
| Clientes (dropdown) | 5min | 30min | Nao | Apos criar novo cliente inline |
| Agencias (dropdown) | 5min | 30min | Nao | Apos criar nova agencia inline |
| Pessoas (dropdown) | 5min | 30min | Nao | Apos criar nova pessoa inline |

**Optimistic Updates:**

Usamos optimistic update nos seguintes cenarios:

1. **Mudar status do job:** Badge de status muda imediatamente, rollback se API falhar
2. **Atualizar status de entregavel:** Dropdown muda imediatamente
3. **Auto-save de campos:** Valor no form e a fonte de verdade, nao revertemos o campo (o usuario veria o texto "pulando"). Em vez disso, mostramos o indicador de erro.

```typescript
// Exemplo: optimistic update de status
const statusMutation = useMutation({
  mutationFn: ({ jobId, newStatus }) =>
    apiMutate('jobs-status', 'PATCH', { new_status: newStatus }, jobId),
  onMutate: async ({ jobId, newStatus }) => {
    await queryClient.cancelQueries({ queryKey: jobKeys.detail(jobId) });
    const previous = queryClient.getQueryData(jobKeys.detail(jobId));
    queryClient.setQueryData(jobKeys.detail(jobId), (old) => ({
      ...old,
      data: { ...old.data, status: newStatus },
    }));
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(jobKeys.detail(vars.jobId), context.previous);
    toast.error('Erro ao atualizar status');
  },
  onSettled: (data, err, vars) => {
    queryClient.invalidateQueries({ queryKey: jobKeys.detail(vars.jobId) });
    queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
  },
});
```

---

## 5. Plano de Implementacao

### Sub-fase 3.1: Setup do Projeto + Auth

**Objetivo:** Projeto Next.js rodando com auth funcional e deploy na Vercel.

**Arquivos a criar:**

```
frontend/
  package.json
  next.config.mjs
  tsconfig.json
  tailwind.config.ts
  postcss.config.mjs
  components.json                    # shadcn/ui config
  .env.local.example
  .env.local                         # (gitignored)
  .eslintrc.json
  .prettierrc
  .gitignore
  src/
    app/
      layout.tsx                     # Root layout com providers
      globals.css                    # CSS vars do design system
      not-found.tsx
      (auth)/
        layout.tsx
        login/page.tsx
        forgot-password/page.tsx
        reset-password/page.tsx
    lib/
      supabase/
        client.ts
        server.ts
        middleware.ts
      utils.ts                       # cn()
    hooks/
      useAuth.ts
    types/
      database.ts                    # Gerado via supabase gen types
      auth.ts
    middleware.ts                     # Next.js auth guard
    components/
      ui/
        button.tsx                   # shadcn
        input.tsx                    # shadcn
        label.tsx                    # shadcn
        form.tsx                     # shadcn + RHF
```

**Dependencias a instalar:**

```
# Core
next react react-dom typescript @types/react @types/node

# Supabase
@supabase/supabase-js @supabase/ssr

# Data
@tanstack/react-query @tanstack/react-query-devtools

# Forms
react-hook-form @hookform/resolvers zod

# UI
tailwindcss postcss autoprefixer
class-variance-authority clsx tailwind-merge
lucide-react
next-themes
sonner

# Dev
eslint eslint-config-next prettier
```

**Dependencias da sub-fase anterior:** Nenhuma (primeira sub-fase).

**Criterio de done:**
- [x] `npm run build` sem erros
- [x] `npm run dev` abre na porta 3000
- [x] Pagina /login renderiza com formulario funcional
- [x] Login com email/senha via Supabase Auth funciona
- [x] Apos login, redireciona para /jobs (que mostra pagina vazia por ora)
- [x] Middleware protege /jobs (redireciona para /login se nao autenticado)
- [x] Logout funciona (via botao placeholder no /jobs)
- [x] Forgot password e reset password funcionam
- [x] Dark mode funciona (CSS vars do design system aplicadas)
- [x] Types do Supabase gerados em types/database.ts
- [x] Deploy na Vercel funcional (mesmo que com pagina basica)

---

### Sub-fase 3.2: Layout (Sidebar + Topbar + Navigation)

**Objetivo:** Layout completo do dashboard com navegacao funcional.

**Arquivos a criar/modificar:**

```
src/
  app/
    (dashboard)/
      layout.tsx                     # Dashboard layout
      jobs/
        page.tsx                     # Placeholder
  components/
    layout/
      Sidebar.tsx
      Topbar.tsx
      BottomNav.tsx
      Breadcrumb.tsx
      UserMenu.tsx
      ThemeToggle.tsx
    ui/
      avatar.tsx                     # shadcn
      dropdown-menu.tsx              # shadcn
      tooltip.tsx                    # shadcn
      separator.tsx                  # shadcn
      sheet.tsx                      # shadcn (drawer mobile)
  hooks/
    useLocalStorage.ts
    useMediaQuery.ts
```

**Dependencias da sub-fase anterior:** 3.1 (auth funcional, layout raiz, dark mode).

**Criterio de done:**
- [x] Sidebar visivel em desktop (lg+) com navegacao
- [x] Sidebar colapsa/expande com animacao, estado persistido
- [x] Sidebar colapsada mostra apenas icones com tooltip
- [x] Topbar com breadcrumb, dark mode toggle, user menu
- [x] User menu mostra nome/email e botao Sair funcional
- [x] Bottom nav aparece em mobile (< md)
- [x] Sidebar escondida em mobile
- [x] Tablet: sidebar como drawer overlay via hamburger
- [x] Itens desabilitados aparecem com opacity-40 e nao navegam
- [x] Item "Jobs" ativo com barra accent na esquerda
- [x] Layout responsivo testado em 3 breakpoints (mobile, tablet, desktop)

---

### Sub-fase 3.3: Dashboard de Jobs (Tabela)

**Objetivo:** Listagem de jobs em tabela funcional com filtros, paginacao e criacao.

**Arquivos a criar/modificar:**

```
src/
  app/
    (dashboard)/
      jobs/
        page.tsx                     # Pagina de listagem (reescrever)
        loading.tsx                  # Skeleton da listagem
        error.tsx                    # Error boundary
  components/
    jobs/
      JobsTable.tsx
      JobFilters.tsx
      JobFilterChips.tsx
      JobPagination.tsx
      CreateJobModal.tsx
      ViewToggle.tsx
    shared/
      StatusBadge.tsx
      PriorityBadge.tsx
      HealthBar.tsx
      MarginIndicator.tsx
      DateDisplay.tsx
      CurrencyDisplay.tsx
      EmptyState.tsx
      SearchableSelect.tsx
      DatePickerField.tsx
      ConfirmDialog.tsx
    ui/
      table.tsx                      # shadcn
      badge.tsx                      # shadcn
      dialog.tsx                     # shadcn
      command.tsx                    # shadcn
      popover.tsx                    # shadcn
      calendar.tsx                   # shadcn
      select.tsx                     # shadcn
      checkbox.tsx                   # shadcn
      switch.tsx                     # shadcn
      skeleton.tsx                   # shadcn
      progress.tsx                   # shadcn
      scroll-area.tsx                # shadcn
  hooks/
    useJobs.ts
    useClients.ts
    useAgencies.ts
    useDebouncedCallback.ts
  lib/
    api.ts
    format.ts
    constants.ts                     # Labels pt-BR, cores, ENUMs
    query-keys.ts
    validators.ts                    # Zod schemas
  types/
    jobs.ts
```

**Dependencias da sub-fase anterior:** 3.2 (layout completo).

**Criterio de done:**
- [x] Tabela de jobs renderiza com dados reais da API
- [x] Colunas conforme spec: #, Job, Cliente, Agencia, Status, Tipo, Entrega, Valor, Margem, Health, Acoes
- [x] Sorting por qualquer coluna (clique no header), estado na URL
- [x] Linhas clicaveis (navega para /jobs/[id])
- [x] Filtros funcionais: busca, status, cliente, tipo, date range, arquivados
- [x] Filtros refletidos na URL como query params
- [x] Chips de filtro ativo com X para remover
- [x] Paginacao funcional: 20/50/100 por pagina, pagina na URL
- [x] Contador "Mostrando X de Y jobs"
- [x] Modal de criacao de job: titulo, cliente, tipo, status, data entrega
- [x] Apos criar job: navega para /jobs/[id]
- [x] Dropdown de cliente com busca (SearchableSelect)
- [x] Skeleton de 8 linhas durante loading (delay 200ms)
- [x] Empty state quando nao ha jobs
- [x] Scroll horizontal quando colunas ultrapassam largura

---

### Sub-fase 3.4: Dashboard de Jobs (Kanban + Filtros Avancados)

**Objetivo:** Vista kanban e refinamentos na listagem.

**Arquivos a criar/modificar:**

```
src/
  components/
    jobs/
      JobsKanban.tsx
      JobCard.tsx
      BulkActionsBar.tsx
    shared/
      AvatarStack.tsx
```

**Dependencias da sub-fase anterior:** 3.3 (tabela funcional, dados fluindo).

**Criterio de done:**
- [x] Toggle tabela/kanban funcional, preferencia persistida
- [x] Kanban renderiza 14 colunas (1 por status) com scroll horizontal
- [x] Cards com: code, titulo, cliente, data entrega, margem, health, avatar stack
- [x] Cards clicaveis (navega para /jobs/[id])
- [x] Botao de mudar status no card (dropdown inline, sem drag)
- [x] Contagem de jobs no header de cada coluna
- [x] Colunas vazias visiveis com h minima
- [x] Skeleton de cards durante loading
- [x] Bulk actions: checkbox, selecionar todos, barra fixa, arquivar, mudar status
- [x] Dialog de confirmacao antes de bulk action
- [x] Mobile: tabela substituida por lista de cards empilhados

---

### Sub-fase 3.5: Detalhe do Job (Header + Abas)

**Objetivo:** Pagina de detalhe com header sticky, pipeline e estrutura de abas.

**Arquivos a criar/modificar:**

```
src/
  app/
    (dashboard)/
      jobs/
        [id]/
          page.tsx
          loading.tsx
          not-found.tsx
          error.tsx
  components/
    job-detail/
      JobHeader.tsx
      JobStatusPipeline.tsx
      StatusChangeDropdown.tsx
      SyncIndicator.tsx
      CancelJobDialog.tsx
    ui/
      tabs.tsx                       # shadcn
  hooks/
    useJob.ts
    useJobStatus.ts
  lib/
    constants.ts                     # Adicionar STATUS_ORDER para pipeline
```

**Dependencias da sub-fase anterior:** 3.3 (navegacao para /jobs/[id] funciona, tipos definidos).

**Criterio de done:**
- [x] Pagina /jobs/[id] renderiza com dados reais
- [x] Header sticky com: breadcrumb, code badge, titulo, status badge, priority badge, health bar
- [x] Titulo editavel inline (click -> input, blur/Enter salva)
- [x] Pipeline de status segmentado: anteriores filled, atual highlighted, futuros outlined
- [x] Dropdown de mudar status funcional (14 status, optimistic update)
- [x] Dialog de cancelamento com motivo obrigatorio
- [x] SyncIndicator no header (idle/pending/saving/saved/error)
- [x] Tabs renderizam (Geral, Equipe, Entregaveis, Financeiro, Arquivos, Historico)
- [x] Primeira aba (Geral) ativa por padrao
- [x] 404: pagina "Job nao encontrado" com link para /jobs
- [x] Skeleton completo do header durante loading
- [x] Menu 3 pontos com "Arquivar Job" funcional

---

### Sub-fase 3.6: Detalhe do Job (Formularios das Abas)

**Objetivo:** Todas as abas do detalhe funcional com auto-save.

**Arquivos a criar/modificar:**

```
src/
  components/
    job-detail/
      TabGeneral.tsx
      TabTeam.tsx
      TabDeliverables.tsx
      TabFinancial.tsx
      TabFiles.tsx
      TabHistory.tsx
      AddTeamMemberModal.tsx
      AddDeliverableModal.tsx
      AddShootingDateModal.tsx
    shared/
      CurrencyInput.tsx
      ErrorCard.tsx
  hooks/
    useAutoSave.ts
    useJobTeam.ts
    useJobDeliverables.ts
    useJobShootingDates.ts
    useJobHistory.ts
    usePeople.ts
    useContacts.ts
```

**Dependencias da sub-fase anterior:** 3.5 (header + abas renderizam, useJob funciona).

**Prioridade interna das abas:**

1. **TabGeneral** (Must Have) - Formulario principal com auto-save
2. **TabFinancial** (Should Have) - Cards de metricas + formulario
3. **TabTeam** (Should Have) - Lista + modais CRUD
4. **TabDeliverables** (Should Have) - Lista + modais CRUD
5. **TabHistory** (Should Have) - Timeline + comentarios
6. **TabFiles** (Could Have) - Upload + links

**Criterio de done:**
- [x] **Aba Geral:** Formulario com todas as secoes (Identificacao, Classificacao, Datas, Briefing, Links Drive)
- [x] Auto-save funcional: debounce 1.5s, PATCH parcial, indicador de sync
- [x] Validacao inline onBlur, nao ao digitar
- [x] Layout 2 colunas desktop, 1 coluna mobile
- [x] Rascunho em sessionStorage quando auto-save falha
- [x] **Aba Financeiro:** Cards de metricas, formulario, campos calculados em real-time
- [x] **Aba Equipe:** Lista de membros, botao adicionar, modal CRUD, warnings de conflito
- [x] Produtor responsavel destacado com icone Star
- [x] Subsecao diarias de filmagem com mini calendario
- [x] **Aba Entregaveis:** Barra de progresso, lista, modal CRUD, status inline editavel
- [x] **Aba Historico:** Timeline vertical, filtros, campo de comentario, "Carregar mais"
- [x] **Aba Arquivos:** Links Drive, lista por categoria, dropzone upload, modal link externo

---

### Sub-fase 3.7: Polish (Dark Mode, Responsividade, Loading States, Acessibilidade)

**Objetivo:** Qualidade de producao. Nenhuma feature nova, apenas refinamento.

**Arquivos a modificar:** Todos os componentes existentes.

**Dependencias da sub-fase anterior:** 3.6 (todas as telas funcionais).

**Checklist de done:**
- [x] **Dark mode**: todos os componentes testados em dark, sem cor "quebrada"
- [x] **Dark mode**: sem FOUC (flash of unstyled content) - next-themes script no head
- [x] **Mobile**: tabela vira cards empilhados em < md
- [x] **Mobile**: modais viram sheets (bottom sheet)
- [x] **Mobile**: formularios em 1 coluna
- [x] **Mobile**: touch targets >= 44px
- [x] **Mobile**: bottom nav funcional com item ativo
- [x] **Tablet**: sidebar como drawer overlay
- [x] **Loading**: skeleton especifico por contexto (tabela, cards, form, timeline)
- [x] **Loading**: delay de 200ms antes de mostrar skeleton
- [x] **Error**: ErrorCard com "Tentar novamente" em toda pagina/secao
- [x] **Empty states**: icone + mensagem + CTA em cada aba/lista
- [x] **Toasts**: sucesso (4s verde), erro (8s vermelho), warning (6s amarelo)
- [x] **Acessibilidade**: focus-visible em todos os interativos
- [x] **Acessibilidade**: aria-label em todos os botoes de icone
- [x] **Acessibilidade**: label + htmlFor em todos os inputs
- [x] **Acessibilidade**: navegacao por teclado (Tab, Enter, Escape, setas)
- [x] **Acessibilidade**: aria-live para mudancas dinamicas (sync, toasts)
- [x] **Performance**: Core Web Vitals (LCP < 2.5s, CLS < 0.1)
- [x] **Performance**: next build sem warnings criticos
- [x] Seed data: script Python para popular 10-20 jobs, 5 clientes, 3 agencias, 10 pessoas

---

## 6. Riscos e Mitigacoes

### R1: supabase.functions.invoke() nao suporta path params

**Risco:** O Supabase JS client pode nao suportar nativamente `invoke('jobs/uuid-aqui')`. A documentacao oficial nao e clara sobre path segments apos o nome da funcao.

**Probabilidade:** Media.

**Impacto:** Alto - afeta TODAS as chamadas GET by ID, PATCH e DELETE.

**Mitigacao:** Ja documentado na secao 4.1 - fallback para `fetch()` direto com `${SUPABASE_URL}/functions/v1/jobs/${id}` e injecao manual do Bearer token. Testar na sub-fase 3.1 antes de prosseguir. Se necessario, ajustar lib/api.ts para usar fetch.

### R2: Cold start das Edge Functions afeta UX percebida

**Risco:** Edge Functions do Supabase tem cold start de 200-500ms. Na primeira requisicao apos periodo de inatividade, o usuario pode perceber delay.

**Probabilidade:** Alta.

**Impacto:** Medio - afeta LCP na primeira carga.

**Mitigacao:**
- staleTime de 10s no React Query garante que navegacoes subsequentes usem cache
- Skeleton com delay de 200ms evita flash para respostas rapidas
- Prefetch no hover do link (router.prefetch) para pagina de detalhe
- Fase futura: considerar warmup endpoint periodico via n8n

### R3: Auto-save gera muitas requisicoes PATCH

**Risco:** Com debounce de 1.5s, um formulario de ~75 campos pode gerar muitos PATCHes se o usuario editar campo por campo.

**Probabilidade:** Media.

**Impacto:** Baixo a medio - overhead de rede e logs de historico.

**Mitigacao:**
- Debounce de 1.5s agrupa todas as mudancas em 1 PATCH (React Hook Form watch detecta todos os dirty fields)
- PATCH envia apenas campos alterados (diff), nao o job inteiro
- Backend trata PATCH idempotente (se valor nao mudou, nao grava em historico)
- Monitorar volume de requests em producao; se excessivo, aumentar debounce para 3s

### R4: Mapa de nomes spec vs banco causa confusao no frontend

**Risco:** O frontend usa nomes da API (spec), mas se um dev olhar o banco direto, vera nomes diferentes (ex: `fee` na API vs `rate` no banco).

**Probabilidade:** Baixa (equipe pequena, documentacao clara).

**Impacto:** Medio - bugs sutis de campo errado.

**Mitigacao:**
- Documentar claramente em src/types/jobs.ts com comentarios `// API: "fee" -> banco: "rate"`
- O frontend NUNCA acessa o banco direto (sempre via Edge Functions)
- O column-map.ts na Edge Function e a unica camada de traducao
- Manter tabela de mapeamento atualizada no MEMORY.md

### R5: Criacao inline de cliente/agencia/pessoa nos modais

**Risco:** Os modais de criacao de job e adicao de membro precisam de opcao "Criar novo" inline. Isso requer mini-CRUDs de entidades que nao tem Edge Functions proprias ainda (apenas tabelas com RLS).

**Probabilidade:** Alta - e um requisito da spec (PO-002, PO-004).

**Impacto:** Alto - sem isso, e impossivel criar jobs se nao houver clientes cadastrados.

**Mitigacao:**
- Usar Supabase JS client direto (`supabase.from('clients').insert(...)`) para criar clientes/agencias/pessoas inline. O RLS garante isolamento por tenant. Nao precisa de Edge Function para CRUD simples sem regras de negocio.
- Criar um mini-modal (2-3 campos: nome, email, telefone) dentro do SearchableSelect quando usuario clica "Criar novo"
- Invalidar query de clientes/agencias/pessoas apos criar

### R6: Falta de seed data para testes

**Risco:** Frontend sem dados e impossivel de testar visualmente (tabela vazia, kanban vazio, detalhe com campos null).

**Probabilidade:** Alta.

**Impacto:** Alto - atrasa QA de toda a Fase 3.

**Mitigacao:**
- Criar script de seed na sub-fase 3.7 (mas comecar antes se necessario)
- Script Python que usa Supabase client para inserir: 1 tenant, 5 clientes, 3 agencias, 10 pessoas, 20 jobs em diversos status, membros de equipe, entregaveis, diarias, historico
- O script deve ser idempotente (pode rodar 2x sem duplicar dados)

### R7: Sessao expira durante auto-save

**Risco:** Se o usuario ficar com a aba aberta por muito tempo sem interagir, o token pode expirar e o proximo auto-save falha com 401.

**Probabilidade:** Media.

**Impacto:** Medio - perda de dados nao salvos.

**Mitigacao:**
- @supabase/ssr faz refresh automatico no middleware. Mas para chamadas client-side, precisamos que o supabase client tambem refreshe.
- Configurar `supabase.auth.onAuthStateChange()` para atualizar o token automaticamente
- Se auto-save falha com 401: salvar rascunho em sessionStorage + mostrar indicador "Erro ao salvar - sessao expirada" + botao "Relogar"
- Handler global no QueryCache que trata 401 (documentado na secao 4.3)

---

## Apendice A: Constantes e Labels (pt-BR)

```typescript
// src/lib/constants.ts

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  briefing_recebido: 'Briefing Recebido',
  orcamento_elaboracao: 'Orcamento em Elaboracao',
  orcamento_enviado: 'Orcamento Enviado',
  aguardando_aprovacao: 'Aguardando Aprovacao Cliente',
  aprovado_selecao_diretor: 'Aprovado - Selecao de Diretor',
  cronograma_planejamento: 'Cronograma/Planejamento',
  pre_producao: 'Pre-Producao em Andamento',
  producao_filmagem: 'Producao/Filmagem',
  pos_producao: 'Pos-Producao',
  aguardando_aprovacao_final: 'Aguardando Aprovacao Final',
  entregue: 'Entregue',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  pausado: 'Pausado',
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  briefing_recebido: '#8B5CF6',       // violet
  orcamento_elaboracao: '#F59E0B',    // amber
  orcamento_enviado: '#F59E0B',       // amber
  aguardando_aprovacao: '#F59E0B',    // amber
  aprovado_selecao_diretor: '#22C55E', // green
  cronograma_planejamento: '#3B82F6', // blue
  pre_producao: '#3B82F6',            // blue
  producao_filmagem: '#EF4444',       // red
  pos_producao: '#A855F7',            // purple
  aguardando_aprovacao_final: '#A855F7', // purple
  entregue: '#06B6D4',               // cyan
  finalizado: '#10B981',             // emerald
  cancelado: '#6B7280',             // gray
  pausado: '#6B7280',               // gray
};

// Ordem linear do pipeline (sem cancelado e pausado)
export const STATUS_PIPELINE_ORDER: JobStatus[] = [
  'briefing_recebido',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado_selecao_diretor',
  'cronograma_planejamento',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
  'finalizado',
];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  filme_publicitario: 'Filme Publicitario',
  branded_content: 'Branded Content',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Conteudo Digital',
  evento_livestream: 'Evento/Livestream',
  institucional: 'Institucional',
  motion_graphics: 'Motion Graphics',
  fotografia: 'Fotografia',
  outro: 'Outro',
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  diretor: 'Diretor(a)',
  produtor_executivo: 'Produtor(a) Executivo(a)',
  coordenador_producao: 'Coordenador(a) de Producao',
  dop: 'Diretor(a) de Fotografia',
  primeiro_assistente: '1o Assistente de Direcao',
  editor: 'Editor(a)',
  colorista: 'Colorista',
  motion_designer: 'Motion Designer',
  diretor_arte: 'Diretor(a) de Arte',
  figurinista: 'Figurinista',
  produtor_casting: 'Produtor(a) de Casting',
  produtor_locacao: 'Produtor(a) de Locacao',
  gaffer: 'Gaffer',
  som_direto: 'Som Direto',
  maquiador: 'Maquiador(a)',
  outro: 'Outro',
};

export const HIRING_STATUS_LABELS: Record<HiringStatus, string> = {
  orcado: 'Orcado',
  proposta_enviada: 'Proposta Enviada',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Producao',
  aguardando_aprovacao: 'Aguardando Aprovacao',
  aprovado: 'Aprovado',
  entregue: 'Entregue',
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  alta: 'Alta',
  media: 'Media',
  baixa: 'Baixa',
};
```

## Apendice B: Variaveis de Ambiente

```bash
# .env.local.example

# Supabase (obrigatoria)
NEXT_PUBLIC_SUPABASE_URL=https://etvapcxesaxhsvzgaane.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Opcional (para gerar types localmente)
# SUPABASE_PROJECT_ID=etvapcxesaxhsvzgaane
```

Nao ha chaves secretas no frontend. O anon key e publico por design (RLS garante seguranca).

## Apendice C: Decisoes de trade-off

### C1: Client Components vs Server Components

**Decisao:** Paginas do dashboard sao Client Components.

**Trade-off:** Perdemos SSR initial render e SEO. Ganhamos simplicidade (um unico pattern de data fetching), interatividade imediata (filtros, auto-save, optimistic updates) e evitamos waterfall de dados (server -> client hydration -> refetch).

**Reversivel:** Sim. Em fase futura, podemos mover o fetch inicial para Server Components e hidratar o React Query com dados pre-fetchados (`dehydrate`/`hydrate`). O custo de refatoracao e baixo porque os hooks (useJobs, useJob) continuariam identicos.

### C2: Sem lib de global state

**Decisao:** Nenhum Redux, Zustand ou similar.

**Trade-off:** Se surgir estado global complexo (ex: presenca de usuarios, notificacoes real-time), precisaremos adicionar uma solucao. Mas na Fase 3 nao ha necessidade.

**Reversivel:** Sim. Zustand pode ser adicionado a qualquer momento sem refatoracao do codigo existente.

### C3: CRUD inline de clientes/agencias/pessoas via Supabase JS direto

**Decisao:** Para criacao inline em dropdowns, usamos `supabase.from('clients').insert()` direto, sem Edge Function.

**Trade-off:** Nao temos validacao de negocio centralizada para essas entidades (ex: email duplicado). Ganhamos velocidade de implementacao e evitamos criar Edge Functions que nao existem ainda.

**Reversivel:** Sim. Quando as Edge Functions de Clientes, Agencias e Pessoas forem criadas em fases futuras, basta trocar a chamada em useClients/useAgencies/usePeople de `.from().insert()` para `apiMutate('clients', 'POST', ...)`.

---

## Changelog

| Data       | Versao | Descricao                                    |
|------------|--------|----------------------------------------------|
| 2026-02-18 | 1.0    | Arquitetura inicial da Fase 3 - Frontend     |
