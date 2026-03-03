# CRM Improvements — Spec de Implementacao

**Data:** 2026-03-03
**Baseado em:** docs/commercial/crm-analysis-produtora.md (analise do consultor de produto)
**Objetivo:** Transformar o CRM generico em ferramenta especifica para produtoras audiovisuais

---

## Visao Geral

O CRM atual tem base tecnica solida mas usa terminologia de startup e falta campos criticos.
A transformacao ocorre em 2 sprints:

- **Sprint 1** (Correcoes criticas): Migration + backend + frontend labels + form fixes
- **Sprint 2** (Features): List view + full-page detail + agency history + WhatsApp

---

## Sprint 1 — Correcoes Criticas

### 1.1 Migration (APLICADA)

Migration: `crm_sprint1_new_fields_pausado_stage`

Novos campos na tabela `opportunities`:
| Campo | Tipo | Descricao |
|-------|------|-----------|
| response_deadline | DATE | Deadline de resposta a agencia |
| is_competitive_bid | BOOLEAN | Se e concorrencia |
| competitor_count | INT | Quantas produtoras concorrendo |
| deliverable_format | TEXT | Formato: "30s + 15s + bumper" |
| client_budget | NUMERIC(12,2) | Budget informado pela agencia |
| campaign_period | TEXT | Periodo de veiculacao |

Stage "pausado" adicionado ao CHECK constraint.

### 1.2 Backend — CRM Edge Function

Handlers atualizados para aceitar novos campos:
- `create-opportunity.ts` — Zod schema + insert
- `update-opportunity.ts` — Zod schema + VALID_TRANSITIONS com pausado
- `get-pipeline.ts` — pausado no agrupamento
- `get-stats.ts` — pausado no breakdown

Novo handler:
- `get-agency-history.ts` — GET /crm/agency-history/:agencyId

### 1.3 Frontend — OpportunityDialog

Formulario reorganizado em secoes:

1. **Quem mandou** — Agencia (combobox), Contato (filtrado por agencia), Cliente (combobox)
2. **Sobre o projeto** — Titulo*, Tipo (dropdown), Formato (texto)
3. **Valores** — Valor estimado, Budget da agencia
4. **Prazo** — Retorno ate* (deadline), Previsao fechar
5. **Concorrencia** — Checkbox + numero de produtoras
6. **Outros** — Origem, Notas

Removidos do form: Stage (sempre "lead"), Probabilidade (oculto)

### 1.4 Frontend — Renomeacao de Stages

| DB Value | Label Antigo | Label Novo |
|----------|-------------|------------|
| lead | Lead | Consulta |
| qualificado | Qualificado | Em Analise |
| proposta | Proposta | Orc. Enviado |
| negociacao | Negociacao | Negociacao |
| fechamento | Fechamento | Aprovacao |
| ganho | Ganho | Fechado |
| perdido | Perdido | Perdido |
| pausado | (novo) | Pausado |

### 1.5 Frontend — OpportunityCard Fixes

- Mostra agencia E cliente (formato: "AlmapBBDO -> Ambev")
- Indicador de calor (Quente/Morno/Frio) substitui badge de probabilidade
- response_deadline com alerta visual (vencido/em X dias)
- Badge de concorrencia quando is_competitive_bid=true
- Fontes aumentadas (minimo 13px)
- Padding aumentado (p-3 -> p-4)

### 1.6 Frontend — Source Labels (Portugues)

- cold_outreach -> "Prospecao ativa"
- (demais ja estao em portugues)

### 1.7 Frontend — Pagina Principal

- Titulo: "Pipeline Comercial" -> "Comercial"
- Subtitulo: "Propostas e negociacoes em andamento"

---

## Sprint 2 — Features Novas

### 2.1 List View (CrmListView.tsx)

Toggle "Kanban | Lista" no header da pagina.

Colunas da tabela:
- Data (created_at)
- Titulo
- Agencia
- Cliente
- Valor
- Etapa (badge colorido)
- PE Responsavel
- Retorno (response_deadline)

Funcionalidades:
- Sort por qualquer coluna
- Filtros: stage, assigned_to, agency_id, periodo
- Clique na linha abre detalhe
- Scroll horizontal no mobile

### 2.2 Full-Page Detail (/crm/[id])

Layout 3 colunas:
- **Esquerda:** Info cards (agencia, cliente, contato, tipo, valor, deadline, PE, origem)
- **Centro:** Propostas (component existente ProposalSection)
- **Direita:** Historico agencia + concorrencia + acoes

### 2.3 Agency History Panel

Componente: `AgencyHistoryPanel.tsx`

Dados:
- Total de jobs com a agencia
- Ticket medio
- Ultimo job (titulo, data)
- Taxa de fechamento
- Ultimos 5 jobs (titulo, valor, status, data)

Backend: GET /crm/agency-history/:agencyId

### 2.4 WhatsApp Button

No detalhe, secao de contato mostra:
- Nome, telefone, email do contato da agencia
- Botao "Abrir WhatsApp" -> link wa.me/{phone}

### 2.5 Stage Pausado

- Nova coluna no Kanban (visivel com toggle, junto com ganho/perdido)
- Cor: slate/cinza
- Transicoes: qualquer stage ativo -> pausado, pausado -> qualquer stage ativo

---

## Arquivos Modificados/Criados

### Backend (Edge Functions)
- `supabase/functions/crm/handlers/create-opportunity.ts` — MOD
- `supabase/functions/crm/handlers/update-opportunity.ts` — MOD
- `supabase/functions/crm/handlers/get-pipeline.ts` — MOD
- `supabase/functions/crm/handlers/get-stats.ts` — MOD
- `supabase/functions/crm/handlers/get-agency-history.ts` — NEW
- `supabase/functions/crm/index.ts` — MOD

### Frontend — Componentes
- `frontend/src/components/crm/OpportunityDialog.tsx` — REWRITE
- `frontend/src/components/crm/OpportunityCard.tsx` — MOD
- `frontend/src/components/crm/CrmKanban.tsx` — MOD
- `frontend/src/components/crm/CrmStatsBar.tsx` — MOD
- `frontend/src/components/crm/OpportunityDetailDialog.tsx` — MOD
- `frontend/src/components/crm/CrmListView.tsx` — NEW
- `frontend/src/components/crm/AgencyHistoryPanel.tsx` — NEW
- `frontend/src/components/crm/OpportunityFullDetail.tsx` — NEW

### Frontend — Pages
- `frontend/src/app/(dashboard)/crm/page.tsx` — MOD
- `frontend/src/app/(dashboard)/crm/[id]/page.tsx` — NEW

### Frontend — Hooks & Types
- `frontend/src/hooks/useCrm.ts` — MOD (tipos + useAgencyHistory)
- `frontend/src/lib/query-keys.ts` — MOD (agencyHistory key)

### Database
- Migration: `crm_sprint1_new_fields_pausado_stage` — APPLIED

---

## Checklist de Validacao

- [ ] `npx tsc --noEmit` — zero erros
- [ ] Criar oportunidade com agencia + cliente + deadline
- [ ] Card mostra agencia E cliente
- [ ] Stages mostram nomes em portugues de produtora
- [ ] Stage "Pausado" funciona (pausar e reativar)
- [ ] List view mostra tabela com sort e filtros
- [ ] Full-page detail mostra historico da agencia
- [ ] Botao WhatsApp abre link correto
- [ ] Fontes legiveis (minimo 13px em cards)
- [ ] Dark mode funciona em todos componentes
