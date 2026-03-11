# Onda 1.2 -- CRM Conversao: Arquitetura de Implementacao

**Data:** 2026-03-09
**Status:** APROVADO
**Autor:** Tech Lead (Claude Opus 4.6)
**Esforco estimado:** 2 sprints (2-3 dias uteis)

---

## 0. Estado Atual -- O que ja existe

### Backend (Edge Function `crm/`)

17 handlers ja implementados. Router em `supabase/functions/crm/index.ts`.

| Rota | Handler | Relevante para Onda 1.2 |
|------|---------|--------------------------|
| `GET /crm/opportunities/:id` | `get-opportunity.ts` | SIM -- ja retorna `proposals[]`, `recent_activities[]`, `jobs(id,title,code,status)`, `contacts`, `assigned_profile`, `created_by_profile` |
| `PATCH /crm/opportunities/:id` | `update-opportunity.ts` | SIM -- altera stage, campos win/loss |
| `POST /crm/opportunities/:id/proposals` | `add-proposal.ts` | SIM -- adiciona proposta (version auto) |
| `GET /crm/opportunities/:id/activities` | `list-activities.ts` | SIM -- lista completa de atividades |
| `POST /crm/opportunities/:id/activities` | `add-activity.ts` | SIM -- registra atividade |
| `POST /crm/opportunities/:id/convert-to-job` | `convert-to-job.ts` | SIM -- conversao completa ja funciona |
| `GET /crm/agency-history/:agencyId` | `get-agency-history.ts` | SIM -- stats + jobs recentes |
| `GET /crm/pipeline` | `get-pipeline.ts` | NAO -- usado pelo Kanban |
| `GET /crm/dashboard` | `get-dashboard.ts` | NAO |
| `GET /crm/stats` | `get-stats.ts` | NAO |
| `GET /crm/alerts` | `get-alerts.ts` | NAO |

**Conclusao backend:** NENHUMA mudanca de backend necessaria. Todos os endpoints ja existem e retornam os dados necessarios.

### Frontend -- Paginas CRM

| Arquivo | O que faz | Estado |
|---------|-----------|--------|
| `(dashboard)/crm/page.tsx` | Kanban principal (DnD) + ListView toggle | COMPLETO |
| `(dashboard)/crm/[id]/page.tsx` | Pagina detalhe full-page | **JA EXISTE** -- usa `OpportunityFullDetail` |
| `(dashboard)/crm/dashboard/page.tsx` | Dashboard KPIs | COMPLETO |
| `(dashboard)/crm/report/page.tsx` | Relatorio mensal | COMPLETO |
| `(dashboard)/crm/layout.tsx` | Route guard RBAC | COMPLETO |

### Frontend -- Componentes CRM

| Componente | Linhas | O que faz | Reutilizavel? |
|-----------|--------|-----------|---------------|
| `CrmKanban.tsx` | ~519 | Kanban DnD com MutationRegistry, colunas droppable, cards arrastaveis | SIM -- ajustar onClick do card |
| `OpportunityCard.tsx` | ~198 | Card no Kanban: titulo, agencia, valor, deadline, badge concorrencia, calor | SIM -- nao precisa mudar |
| `OpportunityDetailDialog.tsx` | ~660 | Dialog rapido ao clicar card. Tem info, propostas, atividades, convert, loss, edit | SIM -- ja tem link `<Maximize2>` para `/crm/[id]` |
| `OpportunityFullDetail.tsx` | ~942 | Layout 3 colunas: info, propostas+timeline, agencia+acoes. Converter, pausar, perder, ganhar | **JA COMPLETO** -- e o componente principal da pagina de detalhe |
| `ProposalSection.tsx` | ~399 | Lista + form adicao manual + geracao IA de carta orcamento | SIM -- ja integrado no FullDetail |
| `AgencyHistoryPanel.tsx` | ~211 | Stats + jobs recentes da agencia | SIM -- ja integrado no FullDetail |
| `OpportunityDialog.tsx` | ~705 | Dialog create/edit com comboboxes (agencia, cliente, contato) | SIM -- reutilizado pelo FullDetail |
| `CrmListView.tsx` | ~200+ | Tabela com sort e navegacao para `/crm/[id]` | SIM -- ja navega |
| `CrmAlertsBanner.tsx` | --- | Banner de alertas follow-up | NAO -- independente |
| `CrmStatsBar.tsx` / `CrmStatsDialog.tsx` | --- | KPIs compactos | NAO -- independente |
| `CrmDashboard.tsx` | --- | Dashboard completo | NAO -- independente |

### Frontend -- Hooks

| Hook | Arquivo | O que faz |
|------|---------|-----------|
| `useOpportunity(id)` | `useCrm.ts` L227 | GET detalhe completo (`OpportunityDetail`) |
| `useOpportunityActivities(id)` | `useCrm.ts` L237 | GET lista atividades |
| `useAddActivity(id)` | `useCrm.ts` L477 | POST atividade + invalidate |
| `useAddProposal(id)` | `useCrm.ts` L460 | POST proposta + invalidate |
| `useUpdateOpportunity(id)` | `useCrm.ts` L442 | PATCH oportunidade + invalidate pipeline/alerts |
| `useConvertToJob(id)` | `useCrm.ts` L495 | POST convert + invalidate pipeline/dashboard |
| `useAgencyHistory(agencyId)` | `useCrm.ts` L415 | GET historico agencia |
| `useCrmPipeline(includeClosed)` | `useCrm.ts` L208 | GET pipeline (Kanban) |

**Conclusao hooks:** TODOS os hooks necessarios ja existem. Nenhum novo hook precisa ser criado.

### Tipos

| Interface | Arquivo | Campos chave |
|-----------|---------|-------------|
| `Opportunity` | `useCrm.ts` L38 | 30+ campos incluindo `is_competitive_bid`, `response_deadline`, `loss_category`, `win_reason` |
| `OpportunityDetail` | `useCrm.ts` L77 | Extends `Opportunity` + `contacts`, `created_by_profile`, `jobs`, `proposals[]`, `recent_activities[]` |
| `OpportunityProposal` | `useCrm.ts` L85 | `version`, `title`, `content`, `value`, `status`, `file_url`, `valid_until` |
| `OpportunityActivity` | `useCrm.ts` L103 | `activity_type` (6 enum), `description`, `scheduled_at`, `completed_at` |
| `ConvertToJobPayload` | `useCrm.ts` L193 | `job_title`, `project_type`, `client_id`, `agency_id`, `closed_value`, `description`, `deliverable_format`, `campaign_period` |

---

## 1. Analise de Gap -- O que REALMENTE falta

Apos leitura completa do codigo existente, a situacao e radicalmente diferente do esperado. A maior parte da funcionalidade ja esta implementada.

### O que JA funciona (nao precisa de trabalho)

1. **Pagina de detalhe `/crm/[id]`** -- ja existe com `OpportunityFullDetail` (layout 3 colunas)
2. **Propostas UI** -- `ProposalSection` com add manual + geracao IA
3. **Timeline de atividades** -- form de adicao + lista com icons
4. **Historico da agencia** -- `AgencyHistoryPanel` com stats e jobs
5. **Conversao para job** -- dialog de confirmacao + redirect + backend completo
6. **Badges de concorrencia** -- no `OpportunityCard` e no `OpportunityFullDetail`
7. **Deadline vencido** -- visual no card (vermelho) e no detalhe
8. **Link Kanban -> detalhe** -- card abre `OpportunityDetailDialog` que tem botao `<Maximize2>` para `/crm/[id]`
9. **Link Lista -> detalhe** -- `CrmListView` ja navega para `/crm/[id]` via `router.push`
10. **Pausar/Perder/Ganhar** -- todos implementados com formularios inline

### O que falta (gaps reais)

| ID | Gap | Severidade | Descricao |
|----|-----|------------|-----------|
| GAP-01 | Navegacao direta Kanban -> detalhe | MEDIO | Clicar no card abre `OpportunityDetailDialog` (dialog). O ideal para o fluxo de "CRM Conversao" e que o clique leve diretamente a `/crm/[id]` (pagina full), sem o intermediario do dialog. O dialog pode ser mantido como atalho rapido, mas o fluxo principal deve ser full-page. |
| GAP-02 | Dialog de conversao sem preview de campos | MEDIO | O `ConfirmDialog` mostra texto descritivo mas nao permite editar titulo/campos antes de converter. O usuario nao pode ajustar o titulo do job antes de criar. |
| GAP-03 | Conversao sem valor editavel | MEDIO | O `handleConvertToJob` copia `estimated_value` direto, mas o valor final pode ser diferente do estimado (negociacao). Precisa de campo editavel para `closed_value`. |
| GAP-04 | Invalidacao de cache pos-conversao | BAIXO | `useConvertToJob` invalida `pipeline` e `dashboard` mas NAO invalida `detail(id)`. Apos conversao, se o usuario voltar, o estado pode estar stale. |
| GAP-05 | Falta breadcrumb semantico na pagina de detalhe | BAIXO | Breadcrumb atual mostra apenas "Comercial > [titulo]". Poderia incluir a etapa (stage). |

---

## 2. Decisoes de Arquitetura

### D-01: Manter dialog como "quick preview", pagina como "detalhe completo"

**Contexto:** Atualmente clicar no card do Kanban abre `OpportunityDetailDialog` (dialog modal). O dialog tem um botao `<Maximize2>` que leva a `/crm/[id]`. A spec pede que clicar no card abra a pagina de detalhe.

**Decisao:** Oferecer DUAS opcoes de navegacao:
- **Clique normal no card** -> navega para `/crm/[id]` (full-page)
- **Dialog de preview rapido** -> removido como intermediario padrao, pois duplica funcionalidade do FullDetail

**Justificativa:**
- O `OpportunityFullDetail` ja tem TUDO que o dialog tem e mais (layout 3 colunas, WhatsApp, pausar, etc.)
- O dialog faz fetch dos mesmos dados e renderiza uma versao inferior (1 coluna, sem historico da agencia)
- Ter dois caminhos para o mesmo dado confunde o usuario
- Pages do Next.js sao prefetchaveis (melhor UX que dialog que faz fetch on-open)

**Implementacao:** Alterar `CrmKanban.onCardClick` para chamar `router.push(\`/crm/\${opp.id}\`)` ao inves de abrir o dialog.

**Consequencia:** O `OpportunityDetailDialog` continua existindo no codigo mas nao e mais chamado pelo Kanban. Pode ser removido futuramente ou mantido para uso em outros contextos (ex: alertas).

### D-02: Dialog de conversao com campos editaveis (ConvertToJobDialog)

**Contexto:** O `ConfirmDialog` atual apenas exibe texto e um botao "Criar Job". O usuario nao pode ajustar titulo, valor fechado, ou outros campos antes da conversao.

**Decisao:** Criar um componente `ConvertToJobDialog` dedicado que substitua o `ConfirmDialog` no fluxo de conversao. O dialog tera:
- **Titulo do job** (pre-preenchido com `opportunity.title`, editavel)
- **Valor fechado** (pre-preenchido com `estimated_value`, editavel)
- **Tipo de projeto** (pre-preenchido, editavel)
- **Preview somente-leitura:** cliente, agencia, formato entregavel, periodo campanha
- **Botao "Criar Job"** que chama `useConvertToJob` com os valores editados

**Justificativa:**
- O `ConvertToJobPayload` do backend ja aceita todos esses campos como opcionais (pode sobrescrever)
- O valor final de um projeto frequentemente difere do estimado (negociacao de desconto)
- O titulo do job pode precisar de ajuste (remover prefixo "Proposta de", etc.)
- Manter fields editaveis reduz a necessidade de editar o job imediatamente apos criacao

**Consequencia:** Componente novo, mas simples (~150 linhas). Reutiliza hooks existentes.

### D-03: Invalidacao completa do cache apos conversao

**Contexto:** `useConvertToJob.onSuccess` invalida `crmKeys.pipeline()` e `crmKeys.dashboard()`. Mas nao invalida `crmKeys.detail(opportunityId)`, `crmKeys.activities(opportunityId)`, nem `crmKeys.stats()`.

**Decisao:** Expandir o `onSuccess` para invalidar:
- `crmKeys.detail(opportunityId)` -- o stage mudou para "ganho" e `job_id` foi preenchido
- `crmKeys.stats()` -- a conversao afeta metricas
- `crmKeys.alerts()` -- oportunidade convertida sai dos alertas

**Implementacao:** Alterar `useConvertToJob` em `useCrm.ts` para receber callback ou invalidar diretamente via closure.

**Consequencia:** Nenhum breaking change. O parametro `opportunityId` ja esta disponivel na closure do hook.

### D-04: Nenhuma mudanca de backend

**Contexto:** O endpoint `POST /crm/opportunities/:id/convert-to-job` ja:
- Valida role (admin, ceo, produtor_executivo)
- Impede conversao de oportunidade perdida ou ja convertida
- Cria job com campos copiados (titulo, tipo, cliente, agencia, valor, notas, formato, periodo)
- Gera codigo sequencial do job
- Marca oportunidade como "ganho" com `actual_close_date`
- Registra atividade automatica
- Retorna `{ opportunity, job: { id, title, code, status } }`

**Decisao:** Nao alterar nenhum endpoint. O backend ja esta completo para este fluxo.

**Justificativa:** Principio API-first respeitado -- a API foi construida antes da UI completa. Os campos do `ConvertToJobSchema` ja cobrem todos os ajustes que o `ConvertToJobDialog` precisa enviar.

### D-05: Nenhum novo hook necessario

**Contexto:** A spec original pedia hooks `useOpportunityDetail`, `useProposals`, `useConvertToJob`.

**Decisao:** Nao criar novos hooks. Todos ja existem:
- `useOpportunity(id)` = `useOpportunityDetail` (retorna `OpportunityDetail` com proposals e activities)
- `useAddProposal(id)` + `ProposalSection` = gerenciamento completo de propostas
- `useConvertToJob(id)` = conversao com payload editavel

**Justificativa:** Criar hooks wrapper adicionaria indirecton sem valor. Os nomes atuais sao claros e os tipos estao corretos.

---

## 3. Plano de Implementacao

### Sprint 1: Navegacao Direta + ConvertToJobDialog (~1 dia)

| # | Tarefa | Arquivo | Tipo | Linhas |
|---|--------|---------|------|--------|
| 1.1 | Alterar Kanban para navegar direto para `/crm/[id]` | `CrmKanban.tsx` | EDIT | ~10 |
| 1.2 | Criar `ConvertToJobDialog` com campos editaveis | `components/crm/ConvertToJobDialog.tsx` | NEW | ~200 |
| 1.3 | Substituir `ConfirmDialog` por `ConvertToJobDialog` em `OpportunityFullDetail.tsx` | `OpportunityFullDetail.tsx` | EDIT | ~20 |
| 1.4 | Substituir `ConfirmDialog` por `ConvertToJobDialog` em `OpportunityDetailDialog.tsx` | `OpportunityDetailDialog.tsx` | EDIT | ~20 |
| 1.5 | Expandir invalidacao em `useConvertToJob` | `useCrm.ts` | EDIT | ~5 |
| 1.6 | Adicionar badge de etapa no breadcrumb | `crm/[id]/page.tsx` | EDIT | ~10 |

**Total Sprint 1:** ~265 linhas de codigo novo/editado

### Sprint 2: Polimento e Consistencia (~0.5 dia)

| # | Tarefa | Arquivo | Tipo | Linhas |
|---|--------|---------|------|--------|
| 2.1 | Remover import de `OpportunityDetailDialog` do Kanban (limpeza) | `CrmKanban.tsx` | EDIT | ~5 |
| 2.2 | Garantir que `CrmListView` navega para `/crm/[id]` (ja faz) | `CrmListView.tsx` | VERIFY | 0 |
| 2.3 | Testar fluxo completo: Kanban click -> detalhe -> converter -> redirect ao job | Manual | TEST | 0 |
| 2.4 | Testar fluxo: dialog quick-preview (via alertas) -> full-page -> converter | Manual | TEST | 0 |
| 2.5 | Verificar dark mode no `ConvertToJobDialog` | Manual | TEST | 0 |
| 2.6 | Verificar mobile responsivo no `ConvertToJobDialog` | Manual | TEST | 0 |

**Total Sprint 2:** ~5 linhas de codigo, foco em QA

---

## 4. Mapa de Arquivos -- Criar e Editar

### Arquivos a CRIAR (1)

```
frontend/src/components/crm/ConvertToJobDialog.tsx   (~200 linhas)
```

### Arquivos a EDITAR (5)

```
frontend/src/components/crm/CrmKanban.tsx            (remover dialog, usar router.push)
frontend/src/components/crm/OpportunityFullDetail.tsx (trocar ConfirmDialog por ConvertToJobDialog)
frontend/src/components/crm/OpportunityDetailDialog.tsx (trocar ConfirmDialog por ConvertToJobDialog)
frontend/src/hooks/useCrm.ts                         (expandir invalidacao do useConvertToJob)
frontend/src/app/(dashboard)/crm/[id]/page.tsx       (badge de etapa no breadcrumb)
```

### Arquivos que NAO mudam

```
supabase/functions/crm/**                            (backend completo)
frontend/src/components/crm/ProposalSection.tsx       (completo)
frontend/src/components/crm/AgencyHistoryPanel.tsx    (completo)
frontend/src/components/crm/OpportunityCard.tsx       (completo)
frontend/src/components/crm/OpportunityDialog.tsx     (completo)
frontend/src/components/crm/CrmListView.tsx           (ja navega para /crm/[id])
frontend/src/lib/query-keys.ts                       (crmKeys ja tem tudo)
frontend/src/lib/format.ts                           (helpers existentes)
```

---

## 5. Especificacao do ConvertToJobDialog

### Props

```typescript
interface ConvertToJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: OpportunityDetail
}
```

### Layout

```
+-----------------------------------------------+
| Converter em Job                          [X]  |
|-----------------------------------------------|
| Dados do Job (editaveis)                       |
|                                                |
| Titulo do job *        [...........................] |
| Valor fechado (R$)     [...........................] |
| Tipo de producao       [Select...................]  |
|                                                |
|-----------------------------------------------|
| Dados copiados (somente leitura)               |
|                                                |
| Cliente:    ACME Corp                          |
| Agencia:    WMcCann                            |
| Formato:    30s + 15s + bumper 6s              |
| Periodo:    Q2 2026                            |
| Notas:      Brief do projeto com...            |
|                                                |
|-----------------------------------------------|
| [info] A oportunidade sera marcada como        |
|        "ganho" e voce sera redirecionado        |
|        ao novo job.                            |
|                                                |
|              [Cancelar]  [Criar Job]           |
+-----------------------------------------------+
```

### Comportamento

1. **Ao abrir:** pre-preenche `title` com `opportunity.title`, `closed_value` com `opportunity.estimated_value`, `project_type` com `opportunity.project_type`
2. **Ao confirmar:** chama `useConvertToJob(opportunity.id).mutateAsync(payload)` com os valores editados
3. **Ao sucesso:** toast de sucesso, fecha dialog, `router.push(\`/jobs/\${job.id}\`)`
4. **Ao erro:** toast de erro (usando `safeErrorMessage`)
5. **Botao desabilitado** enquanto `isPending`

### Campos enviados ao backend

```typescript
{
  job_title: editedTitle,
  project_type: editedProjectType,
  client_id: opportunity.client_id,      // nao editavel
  agency_id: opportunity.agency_id,      // nao editavel
  closed_value: editedClosedValue,
  description: opportunity.notes,        // nao editavel
  deliverable_format: opportunity.deliverable_format,  // nao editavel
  campaign_period: opportunity.campaign_period,         // nao editavel
}
```

---

## 6. Detalhamento das Edicoes

### 6.1 CrmKanban.tsx -- Navegacao direta

**Antes:**
```tsx
// No CrmKanban, onCardClick abre dialog
<KanbanBoard ... onCardClick={setSelectedOpportunity} />

{selectedOpportunity && (
  <OpportunityDetailDialog
    opportunityId={selectedOpportunity.id}
    open={!!selectedOpportunity}
    onOpenChange={(open) => { if (!open) setSelectedOpportunity(null) }}
  />
)}
```

**Depois:**
```tsx
// No CrmKanban, onCardClick navega para pagina
const router = useRouter()

<KanbanBoard ... onCardClick={(opp) => router.push(`/crm/${opp.id}`)} />

// Remover selectedOpportunity state e OpportunityDetailDialog
```

**Impacto:** Remove estado local, simplifica componente. O `OpportunityDetailDialog` nao e mais renderizado no Kanban.

### 6.2 useCrm.ts -- Invalidacao expandida

**Antes:**
```typescript
export function useConvertToJob(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    ...
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() })
      qc.invalidateQueries({ queryKey: crmKeys.dashboard() })
    },
  })
}
```

**Depois:**
```typescript
export function useConvertToJob(opportunityId: string) {
  const qc = useQueryClient()
  return useMutation({
    ...
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.pipeline() })
      qc.invalidateQueries({ queryKey: crmKeys.dashboard() })
      qc.invalidateQueries({ queryKey: crmKeys.detail(opportunityId) })
      qc.invalidateQueries({ queryKey: crmKeys.stats() })
      qc.invalidateQueries({ queryKey: crmKeys.alerts() })
    },
  })
}
```

### 6.3 crm/[id]/page.tsx -- Badge de etapa no breadcrumb

Adicionar o stage badge ao lado do titulo no breadcrumb, usando `STAGE_CONFIG` do `CrmKanban.tsx` (exportado).

---

## 7. Riscos e Mitigacoes

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Remover dialog do Kanban quebra fluxo de alertas | Baixa | Medio | `CrmAlertsBanner` usa link proprio, nao passa pelo Kanban |
| `ConvertToJobDialog` com campo de valor diverge do estimado | Nenhum | N/A | Backend ja aceita `closed_value` diferente de `estimated_value` |
| Prefetch de `/crm/[id]` causa N+1 no hover dos cards | Baixa | Baixo | Next.js prefetch e GET request cacheavel; staleTime de 30s nos hooks |
| `STAGE_CONFIG` exportado do `CrmKanban` cria dependencia circular | Nenhum | N/A | O import e unidirecional (`page.tsx` importa de `CrmKanban`), nao ha ciclo |

---

## 8. Checklist de Qualidade

- [ ] TypeScript strict sem `any` (todos os tipos ja existem em `useCrm.ts`)
- [ ] Dark mode testado no `ConvertToJobDialog`
- [ ] Mobile responsivo (min touch target 44px nos botoes)
- [ ] Validacao: titulo obrigatorio, valor >= 0
- [ ] Loading state no botao "Criar Job" (Loader2 spinner)
- [ ] Error boundary: toast com `safeErrorMessage`
- [ ] Cache invalidado: pipeline, dashboard, detail, stats, alerts
- [ ] Redirect funcional apos conversao (`router.push(/jobs/[id])`)
- [ ] Kanban: click no card navega para `/crm/[id]` sem flash

---

## 9. Resumo Executivo

A Onda 1.2 (CRM Conversao) requer **significativamente menos trabalho** do que estimado originalmente. A analise do codigo revela que:

1. **Backend:** 100% pronto (17 handlers, convert-to-job funcional)
2. **Pagina de detalhe:** 100% pronta (3 colunas, info, propostas, atividades, historico agencia)
3. **Hooks e tipos:** 100% prontos (8 hooks, 5 interfaces, query keys)
4. **Conversao UI:** 80% pronta (falta apenas dialog com campos editaveis)
5. **Navegacao Kanban -> detalhe:** 90% pronta (falta remover intermediario dialog)

**Trabalho real:**
- 1 componente novo (`ConvertToJobDialog`, ~200 linhas)
- 5 edicoes pequenas (total ~40 linhas alteradas)
- 0 mudancas de backend
- 0 novos hooks
- 0 novas migrations

**Estimativa:** 1.5 dias (Sprint 1: 1 dia implementacao, Sprint 2: 0.5 dia QA/polimento)
