# Onda 1.2 — CRM Conversao

**Data:** 2026-03-09
**Status:** IMPLEMENTADO (Sprint 1 completo, commit 00a3540)
**Autor:** PM (Claude Sonnet 4.6)
**Esforco estimado:** 1.5 dias uteis (2 sprints)
**Arquitetura detalhada:** docs/specs/onda-1/06-crm-conversao-arquitetura.md

---

## 1. Objetivo

Fechar os ultimos gaps do fluxo de conversao de oportunidade em job no modulo CRM, permitindo que o PE e o CEO convertam uma oportunidade ganha com controle total sobre os campos do job antes da criacao, e que a navegacao entre Kanban e pagina de detalhe seja direta.

---

## 2. Contexto e Auditoria do Estado Atual

Uma auditoria completa do codigo (45+ arquivos) revelou que a grande maioria do CRM ja esta implementada. A spec trata apenas dos 4 gaps confirmados.

### O que JA existe (nao retrabalhado)

| Area | Estado |
|------|--------|
| Pagina `/crm/[id]` com layout 3 colunas | COMPLETO |
| ProposalSection (adicao manual + geracao IA) | COMPLETO |
| Timeline de atividades (lista + form) | COMPLETO |
| AgencyHistoryPanel (stats + jobs recentes) | COMPLETO |
| Backend `convert-to-job` (7 campos copiados) | COMPLETO |
| Kanban DnD + ListView | COMPLETO |
| Dashboard KPIs + funil + concorrencia | COMPLETO |
| Alertas follow-up (CrmAlertsBanner) | COMPLETO |
| Todos os hooks CRM (8 hooks, tipos completos) | COMPLETO |
| RBAC layout guard `/crm` | COMPLETO |

### Gaps confirmados (escopo desta onda)

| ID | Gap | Severidade | Status |
|----|-----|------------|--------|
| GAP-01 | Kanban card abre dialog intermediario | MEDIO | CORRIGIDO |
| GAP-02 | ConfirmDialog sem campos editaveis | MEDIO | CORRIGIDO |
| GAP-03 | Cache stale apos conversao | BAIXO | CORRIGIDO |
| GAP-04 | Breadcrumb sem badge de etapa | BAIXO | CORRIGIDO |

---

## 3. User Stories

### US-CRM-01 — Navegacao direta Kanban para Detalhe (Must Have)

Como comercial ou PE, quero que clicar em um card do Kanban me leve diretamente para `/crm/[id]`.

**Criterios de Aceite:**
- CA-01.1: Clicar no card executa `router.push('/crm/{id}')`
- CA-01.2: Nao ha mais abertura de `OpportunityDetailDialog` como intermediario
- CA-01.3: Transicao instantanea (Next.js prefetch ativo)

### US-CRM-02 — Dialog de conversao com campos editaveis (Must Have)

Como PE ou CEO, quero campos editaveis (titulo, valor, tipo) ao converter em job.

**Criterios de Aceite:**
- CA-02.1: Titulo pre-preenchido com `opportunity.title`, editavel
- CA-02.2: Valor fechado pre-preenchido com `estimated_value`, editavel
- CA-02.3: Select de tipo de producao pre-preenchido
- CA-02.4: Dados readonly: cliente, agencia, formato, periodo
- CA-02.5: Titulo obrigatorio
- CA-02.6: Botao desabilitado + spinner enquanto pendente
- CA-02.7: Toast + redirect para `/jobs/{id}` apos sucesso
- CA-02.8: Dark mode e mobile OK

### US-CRM-03 — Cache consistente apos conversao (Should Have)

**Criterios de Aceite:**
- CA-03.1: `detail(id)`, `stats()`, `alerts()` invalidados apos conversao
- CA-03.2: Somados aos ja existentes: `pipeline()` e `dashboard()`

### US-CRM-04 — Stage no breadcrumb (Could Have)

**Criterios de Aceite:**
- CA-04.1: Badge de stage no breadcrumb de `/crm/[id]`
- CA-04.2: Usa cores do `STAGE_CONFIG`

---

## 4. Fora de Escopo

- Linhas de custo na oportunidade (onda futura)
- Diretores propostos por licitacao
- Upload de PDF de proposta
- Alteracoes no backend (0 mudancas)
- Novos hooks (0 criados)

---

## 5. Implementacao (Sprint 1 — CONCLUIDO)

| Tarefa | Arquivo | Tipo |
|--------|---------|------|
| Kanban `router.push` no clique | `CrmKanban.tsx` | EDIT |
| `ConvertToJobDialog` com campos editaveis | `ConvertToJobDialog.tsx` | NEW |
| Substituir ConfirmDialog em FullDetail | `OpportunityFullDetail.tsx` | EDIT |
| Substituir ConfirmDialog em DetailDialog | `OpportunityDetailDialog.tsx` | EDIT |
| Expandir invalidacao useConvertToJob | `useCrm.ts` | EDIT |
| Badge de stage no breadcrumb | `crm/[id]/page.tsx` | EDIT |

---

## 6. Perguntas Abertas (nao bloqueantes, ondas futuras)

- PA-01: Carta orcamento sem job_id (budget-letter exige job_id)
- PA-02: Pre-orcamento por categoria na oportunidade (gap critico CEO/CFO)
- PA-03: Bucket `proposals` no Storage para PDF upload
