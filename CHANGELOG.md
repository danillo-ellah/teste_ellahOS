# ELLAHOS — Changelog

Registro de todas as sub-fases concluidas, ordenado do mais recente ao mais antigo.

---

## [Sub-fase 3.8] - 2026-02-18

### Polimento Final: Responsivo, Acessibilidade e Code Quality

Auditoria e correcoes em 3 ondas para fechar a Fase 3.

**Onda 1 — Responsivo Mobile (8 arquivos):**
- JobsTable: overflow-x-auto para scroll horizontal mobile
- TabEquipe, TabEntregaveis: overflow-x-auto nas tabelas
- DeliverableDialog, ShootingDateDialog: grids 2-col responsivos (1-col em mobile)
- JobDetailTabs: scroll horizontal nas abas, texto responsivo
- dialog.tsx: max-h-[85vh] overflow-y-auto para dialogs longos
- jobs/page.tsx: header empilha em mobile (flex-col sm:flex-row)

**Onda 2 — Acessibilidade (5 arquivos):**
- jobs/page.tsx: aria-pressed nos botoes toggle tabela/kanban
- JobsTable: title em celulas truncadas (titulo, cliente)
- TabEquipe: title no nome truncado do membro
- JobHeader: title no job_code truncado no breadcrumb
- TabDiarias: truncate + title no texto de localizacao

**Onda 3 — Code Quality (1 arquivo):**
- KanbanView: substituido @ts-expect-error por `as React.CSSProperties` (CSS custom properties)

**Verificacao:**
- `next build` compila sem erros (TypeScript + pages OK)
- tw-animate-css confirmado em uso (globals.css import)

---

## [Sub-fase 3.7b] - 2026-02-18

### Entregaveis: Prazo + Hierarquia Pai/Filho

Adicionado prazo de entrega por entregavel com indicadores de urgencia,
e conceito de entregavel pai (90") com reducoes/copias vinculadas (2x 30").

**Migration:**
- `add_parent_id_to_job_deliverables` — coluna parent_id (self-referencing FK) + indice + constraint

**Edge Function atualizada (v3):**
- `jobs-deliverables` — CreateDeliverableSchema: +delivery_date, +parent_id, +link
- UpdateDeliverableSchema: +parent_id, +link
- Validacao de parent_id (existe no mesmo job, nao e self-ref)

**Arquivos modificados (5):**
- `frontend/src/types/jobs.ts` — JobDeliverable: +parent_id, file_url/review_url substituidos por link
- `frontend/src/lib/format.ts` — +formatIndustryDuration (90", 2'30"), +daysUntil
- `frontend/src/hooks/useJobDeliverables.ts` — +delivery_date, +parent_id, +link nos params
- `frontend/src/components/job-detail/tabs/DeliverableDialog.tsx` — +campo prazo (date), +selector entregavel pai, link unico
- `frontend/src/components/job-detail/tabs/TabEntregaveis.tsx` — Hierarquia visual, coluna Prazo com urgencia, duracao industria

**Funcionalidades:**
- Hierarquia pai/filho: entregavel raiz (90") com reducoes indentadas abaixo (CornerDownRight icon)
- Prazo com indicadores: vermelho (atrasado), amber (3 dias), tooltip com contagem de dias
- Duracao formato industria: 90", 30", 2'30" (padrao audiovisual)
- Ordenacao automatica: pais por data de entrega (mais urgente primeiro), filhos agrupados
- Selector de pai no dialog: dropdown com entregaveis raiz do job
- Campo link unico (substitui file_url/review_url que nao existiam no banco)
- Entregaveis aprovados/entregues nao mostram indicador de urgencia

---

## [Sub-fase 3.7] - 2026-02-18

### Pipeline Kanban com Drag-and-Drop

Adicionado drag-and-drop ao KanbanView existente usando @dnd-kit.
Cards podem ser arrastados entre colunas para mudar status do job.

**Dependencia adicionada:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Arquivos modificados (3):**
- `frontend/src/components/jobs/KanbanView.tsx` — Refatorado com DndContext, DraggableCard, DroppableColumn, DragOverlay
- `frontend/src/app/(dashboard)/jobs/page.tsx` — Kanban usa per_page: 200, esconde paginacao, passa onCancelRequest
- `frontend/package.json` / `package-lock.json` — Dependencia @dnd-kit

**Funcionalidades:**
- Arrastar card entre colunas muda status via API
- Card fantasma com rotacao e sombra durante drag
- Coluna destino destaca com ring colorido durante hover
- Coluna vazia mostra "Soltar aqui" durante drag
- Arrastar para "Cancelado" abre CancelReasonDialog (motivo obrigatorio)
- Dropdown de status no card continua funcionando
- Touch support nativo (dnd-kit)
- Kanban carrega ate 200 jobs (sem paginacao visual)

---

## [Sub-fase 3.6] - 2026-02-18

### Conteudo das Abas do Detalhe do Job

Implementacao completa das 6 abas do detalhe do job com CRUD funcional,
hooks de dados, dialogs de formulario, e formatacao brasileira.

**Arquivos criados (17):**

Hooks (5):
- `frontend/src/hooks/usePeople.ts` — Lista pessoas para selector de equipe
- `frontend/src/hooks/useJobTeam.ts` — CRUD equipe (list, add, update, remove)
- `frontend/src/hooks/useJobDeliverables.ts` — CRUD entregaveis
- `frontend/src/hooks/useJobShootingDates.ts` — CRUD diarias de filmagem
- `frontend/src/hooks/useJobHistory.ts` — Lista historico paginado

Componentes shared (3):
- `frontend/src/components/shared/SearchableSelect.tsx` — Popover+Command para busca
- `frontend/src/components/shared/FormField.tsx` — Wrapper Label+children+error
- `frontend/src/components/shared/EmptyTabState.tsx` — Estado vazio para tabs CRUD

Tabs (6):
- `frontend/src/components/job-detail/tabs/TabGeral.tsx` — Info completa + edit inline
- `frontend/src/components/job-detail/tabs/TabEquipe.tsx` — Tabela CRUD equipe
- `frontend/src/components/job-detail/tabs/TabEntregaveis.tsx` — Tabela CRUD entregaveis
- `frontend/src/components/job-detail/tabs/TabFinanceiro.tsx` — Cards resumo + campos editaveis
- `frontend/src/components/job-detail/tabs/TabDiarias.tsx` — Cards CRUD diarias
- `frontend/src/components/job-detail/tabs/TabHistorico.tsx` — Timeline com diff expandivel

Dialogs (3):
- `frontend/src/components/job-detail/tabs/TeamMemberDialog.tsx` — Add/edit membro
- `frontend/src/components/job-detail/tabs/DeliverableDialog.tsx` — Add/edit entregavel
- `frontend/src/components/job-detail/tabs/ShootingDateDialog.tsx` — Add/edit diaria

**Arquivos modificados (4):**
- `frontend/src/types/jobs.ts` — Fix tipos TeamMember, HistoryEntry, Deliverable, UpdateJobPayload
- `frontend/src/lib/format.ts` — Adicionado formatDuration, formatTime, formatBRNumber, parseBRNumber
- `frontend/src/components/job-detail/JobDetailTabs.tsx` — Substituido placeholders por tabs reais
- `frontend/src/components/jobs/CreateJobModal.tsx` — Extraido SearchableSelect para shared/

**Bugs corrigidos (18):**
- BUG-001: UpdateJobPayload alinhado com API schema (briefing_text, campos read-only)
- BUG-002: Campo notes removido de DeliverableDialog (API nao aceita)
- BUG-003: Validacao duracao positiva em DeliverableDialog
- BUG-004: Validacao URLs com z.union([z.string().url(), z.literal('')])
- BUG-005: usePathname() ao inves de window.location.pathname
- BUG-006: useRef + cleanup para setTimeout (memory leak)
- BUG-007: useEffect para sync local state com props
- BUG-008: Error states em TabEquipe, TabEntregaveis, TabDiarias, TabHistorico
- BUG-010: aria-labels nos dropdown menus de acoes
- BUG-011: FormField importa ReactNode corretamente
- BUG-012: formatTime com edge cases
- BUG-013: Label "Cache" renomeado para "Valor" (consistencia)
- BUG-014: Removidos status, approval_type, cancellation_reason de UpdateJobPayload
- BUG-016: min="1" no input de duracao
- BUG-017: Validacao isNaN antes de enviar valores financeiros
- BUG-018: Error state no TabHistorico (consistencia)
- BUG-020: Label "Cache (R$)" para "Valor (R$)" no TeamMemberDialog
- Formatacao financeira padronizada para pt-BR (virgula decimal, ponto milhar)

---

## [Sub-fase 3.5] - 2026-02-18

### Pagina de Detalhe do Job

Header sticky com info do job, pipeline visual de status clicavel, sistema de 6 abas
com navegacao via URL query param (?tab=equipe).

---

## [Sub-fase 3.4] - 2026-02-18

### Jobs List + Criar Job

Tabela master de jobs com filtros (status, prioridade), busca por titulo/codigo,
ordenacao, paginacao. Modal de criacao de job com formulario validado.

---

## [Sub-fase 3.3] - 2026-02-18

### Layout Base

Sidebar responsiva, topbar com user menu, dark mode toggle, breadcrumbs.
Layout dashboard com autenticacao protegida via middleware.

---

## [Sub-fase 3.2] - 2026-02-18

### Auth Flow

Login com email/senha, pagina forgot password, pagina reset password.
Middleware de protecao de rotas com redirect para /login.

---

## [Sub-fase 3.1] - 2026-02-18

### Init Projeto Frontend

Next.js 16 com App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui.
Supabase client configurado, tipos gerados, env vars, tema dark mode.

---

## [Fase 2] - 2026-02-18

### Edge Functions - API do Modulo Jobs

6 Edge Functions deployed: jobs, jobs-status, jobs-team, jobs-deliverables,
jobs-shooting-dates, jobs-history. 10 modulos shared. 10/10 testes OK.

---

## [Fase 1] - 2026-02-18

### Banco de Dados - Schema do Modulo Jobs

14 tabelas, 18 migrations, RLS multi-tenant em todas as tabelas.
Triggers, generated columns, indices. Security audit passado.
