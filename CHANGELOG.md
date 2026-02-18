# ELLAHOS — Changelog

Registro de todas as sub-fases concluidas, ordenado do mais recente ao mais antigo.

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
