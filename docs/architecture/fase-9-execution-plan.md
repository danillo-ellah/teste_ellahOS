# Fase 9 -- Plano de Execucao

**Data:** 24/02/2026
**Autor:** Tech Lead -- ELLAHOS
**Referencia:** docs/architecture/fase-9-automacoes-architecture.md
**Status:** Aprovado para execucao

---

## 1. Inventario de Agentes

| Agente | Modelo | Capacidades principais | Carga na Fase 9 |
|--------|--------|----------------------|------------------|
| **db-architect** | opus | Migrations, schema, RLS, indices, triggers | Media (2 migrations + ALTERs) |
| **backend-dev** | sonnet | Edge Functions, logica de negocio, Zod, handlers | **Alta** (3 EFs novas + 2 expansoes + 7 _shared modules) |
| **frontend-dev** | sonnet | React/Next.js, componentes, hooks, paginas | **Alta** (4 paginas/abas novas + 8 componentes + 5 hooks) |
| **integrations-engineer** | sonnet | WhatsApp, Drive, DocuSeal, webhooks, APIs externas | **Alta** (DocuSeal client, Drive templates, webhook handlers) |
| **n8n-architect** | sonnet | Workflows n8n, automacoes, scheduling | **Alta** (4 workflows novos + 1 expansao) |
| **ai-engineer** | opus | Features com IA, prompts, Claude API | Baixa (apenas OCR NFs na 9.9, P2) |
| **ui-designer** | sonnet | Specs visuais, wireframes, design system | Media (3 telas novas: nf-validation, nf-request, contracts-tab) |
| **security-engineer** | sonnet | Audit de seguranca, webhook auth, sanitization | Media (review de webhooks, HMAC, secrets) |
| **qa-engineer** | sonnet | Testes, validacao, bugs | Media-Alta (testes E2E de 6 sub-fases) |
| **devops** | haiku | Docker, infra, VPS | Baixa (apenas Docker volume Evolution API na 9.9) |

---

## 2. Mapa de Responsabilidades por Sub-fase

### 2.1 Fase 9.1 -- Infraestrutura e Schema (Foundation)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Migration: tabelas nf_documents, docuseal_submissions | **db-architect** | -- |
| Migration: ALTER financial_records + invoices | **db-architect** | -- |
| _shared/docuseal-client.ts | **integrations-engineer** | -- |
| _shared/email-template.ts | **backend-dev** | -- |
| _shared/pdf-generator.ts | **backend-dev** | -- |
| Atualizar _shared/integration-client.ts (novos event_types) | **backend-dev** | -- |
| Atualizar _shared/types.ts (NfDocumentRow, DocuSealSubmissionRow) | **backend-dev** | -- |
| ADR-018 (NF Processing Pipeline) | **tech-lead** | -- |
| ADR-019 (DocuSeal Integration Pattern) | **tech-lead** | -- |

**Paralelismo interno:** db-architect, backend-dev e integrations-engineer podem trabalhar SIMULTANEAMENTE -- nao ha dependencia entre migrations e _shared modules nesse momento.

### 2.2 Fase 9.2 -- Fluxo de NF: Recebimento (P0)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Edge Function nf-processor (9 endpoints) | **backend-dev** | integrations-engineer (logica de match) |
| Workflow n8n wf-nf-processor (Gmail polling) | **n8n-architect** | integrations-engineer (Gmail OAuth config) |
| Spec visual: /financial/nf-validation | **ui-designer** | -- |
| Frontend: NfValidationPage + componentes | **frontend-dev** | ui-designer (spec deve vir antes) |
| Configurar credencial Gmail OAuth2 no n8n | **integrations-engineer** | devops (acesso VPS) |

**Paralelismo interno:** backend-dev (EF) e n8n-architect (workflow) podem trabalhar em paralelo. ui-designer deve entregar spec antes do frontend-dev comecar a tela.

### 2.3 Fase 9.3 -- Envio de Pedido de NF (P0)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Endpoints nf-processor/request-send + request-sent-callback | **backend-dev** | -- |
| Handler integration-processor para nf_email_send | **backend-dev** | -- |
| Workflow n8n wf-nf-request (enviar email Gmail) | **n8n-architect** | -- |
| Spec visual: /financial/nf-request | **ui-designer** | -- |
| Frontend: NfRequestPage + componentes | **frontend-dev** | ui-designer (spec deve vir antes) |

### 2.4 Fase 9.4 -- Conectar wf-job-approved ao JOB_FECHADO_CRIACAO (P0)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Expandir wf-job-approved (sub-workflow call) | **n8n-architect** | -- |
| Mapear payload ELLAHOS -> formato JOB_FECHADO_CRIACAO | **n8n-architect** | -- |
| Testar criacao de grupos WhatsApp | **qa-engineer** | n8n-architect |

**Nota:** Esta sub-fase NAO depende de 9.1. Pode comecar no dia 1.

### 2.5 Fase 9.5 -- DocuSeal Contracts (P1)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Edge Function docuseal-integration (6 endpoints) | **integrations-engineer** | backend-dev (patterns, validation) |
| Webhook handler (DocuSeal -> ELLAHOS) | **integrations-engineer** | security-engineer (HMAC validation) |
| Handler integration-processor para docuseal_create_batch | **backend-dev** | -- |
| Workflow n8n wf-docuseal-contracts | **n8n-architect** | integrations-engineer (DocuSeal API) |
| Configurar webhook URL no DocuSeal | **integrations-engineer** | devops (acesso VPS) |
| Spec visual: Aba Contratos (Job Detail) | **ui-designer** | -- |
| Frontend: ContractsTab + componentes | **frontend-dev** | ui-designer (spec deve vir antes) |

### 2.6 Fase 9.6 -- Drive Template Copy (P1)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Endpoint drive-integration/:jobId/copy-templates | **integrations-engineer** | -- |
| Expandir create-structure para incluir copy | **integrations-engineer** | -- |
| Handler integration-processor para drive_copy_templates | **backend-dev** | -- |
| Frontend: Config de templates em Settings > Integracoes | **frontend-dev** | -- |

### 2.7 Fase 9.7 -- Aprovacao Interna PDF (P1)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Edge Function pdf-generator (2 endpoints) | **backend-dev** | -- |
| Template HTML da aprovacao interna | **backend-dev** | ui-designer (layout do PDF) |
| ADR-020 (PDF Generation Approach) | **tech-lead** | backend-dev |
| Frontend: Botao + preview no Job Detail | **frontend-dev** | -- |

### 2.8 Fase 9.8 -- QA + Polish

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| Testes E2E todos os fluxos | **qa-engineer** | -- |
| Testar idempotencia | **qa-engineer** | -- |
| Testar fallbacks (n8n fora, DocuSeal fora) | **qa-engineer** | n8n-architect |
| Validar isolamento multi-tenant | **qa-engineer** | security-engineer |
| Security review: webhooks, secrets, sanitization | **security-engineer** | -- |
| Performance review | **qa-engineer** | backend-dev |
| Correcao de bugs encontrados | **backend-dev** + **frontend-dev** | -- |

### 2.9 Fase 9.9 -- P2 Features (Nice to Have)

| Tarefa | Agente Lider | Agentes de Apoio |
|--------|-------------|------------------|
| OCR de NFs com Claude (nf-processor/ocr-analyze) | **ai-engineer** | backend-dev (endpoint pattern) |
| ADR-021 (OCR NF via Claude Vision) | **tech-lead** | ai-engineer |
| Workflow n8n wf-claquete (Slides -> PDF + PNG) | **n8n-architect** | -- |
| Docker volume Evolution API | **devops** | -- |

---

## 3. Diagrama de Dependencias e Paralelismo

```
SEMANA 1 (Dias 1-5)
========================================================================

DIA 1-2 (Paralelo -- 4 trilhas simultaneas)
--------------------------------------------
Trilha A: [db-architect]   -> 9.1 Migrations (nf_documents, docuseal_submissions, ALTERs)
Trilha B: [backend-dev]    -> 9.1 _shared modules (types, integration-client, email-template, pdf-generator)
Trilha C: [integ-engineer] -> 9.1 _shared/docuseal-client.ts
Trilha D: [n8n-architect]  -> 9.4 wf-job-approved + JOB_FECHADO_CRIACAO (independente de 9.1!)
          [ui-designer]    -> Specs visuais: nf-validation, nf-request (paralelizavel com tudo)
          [tech-lead]      -> ADR-018, ADR-019

                               |
                               v  (9.1 concluida no fim do Dia 2)

DIA 3-5 (Paralelo -- 5 trilhas simultaneas)
--------------------------------------------
Trilha A: [backend-dev]    -> 9.2 Edge Function nf-processor (ingest, list, validate, reject, reassign, upload, stats)
Trilha B: [n8n-architect]  -> 9.2 Workflow wf-nf-processor (Gmail polling -> Drive -> callback)
Trilha C: [integ-engineer] -> 9.2 Config Gmail OAuth + 9.6 Drive copy-templates endpoint
Trilha D: [frontend-dev]   -> 9.2 NfValidationPage + componentes (spec do ui-designer ja pronto)
Trilha E: [ui-designer]    -> Spec visual: Aba Contratos (Job Detail) para 9.5


SEMANA 2 (Dias 6-10)
========================================================================

DIA 6-8 (Paralelo -- 5 trilhas simultaneas)
--------------------------------------------
Trilha A: [backend-dev]    -> 9.3 Endpoints request-send + callback + handler nf_email_send
                              -> 9.7 Edge Function pdf-generator (aprovacao-interna, preview)
Trilha B: [n8n-architect]  -> 9.3 Workflow wf-nf-request
                              -> 9.5 Workflow wf-docuseal-contracts
Trilha C: [integ-engineer] -> 9.5 Edge Function docuseal-integration (6 endpoints + webhook HMAC)
Trilha D: [frontend-dev]   -> 9.3 NfRequestPage + componentes
                              -> 9.6 Config templates em Settings
Trilha E: [ui-designer]    -> Spec layout PDF aprovacao interna (para backend-dev)
          [security-eng]   -> Review parcial: webhook auth (DocuSeal HMAC, cron secret)


DIA 9-10 (Paralelo -- 4 trilhas)
--------------------------------------------
Trilha A: [backend-dev]    -> 9.5 Handlers integration-processor (docuseal_create_batch, drive_copy_templates, pdf_generate)
                              -> 9.7 Template HTML aprovacao interna
Trilha B: [integ-engineer] -> 9.5 Configurar webhook no DocuSeal (VPS)
                              -> 9.6 Expandir create-structure para auto-copy
Trilha C: [frontend-dev]   -> 9.5 ContractsTab + componentes (Job Detail)
                              -> 9.7 Botao + preview PDF no Job Detail
Trilha D: [n8n-architect]  -> Testes dos workflows criados (wf-nf-processor, wf-nf-request, wf-docuseal)


SEMANA 3 (Dias 11-15)
========================================================================

DIA 11-13 (Paralelo -- 3 trilhas)
--------------------------------------------
Trilha A: [qa-engineer]       -> 9.8 Testes E2E: NF recebimento, NF request, DocuSeal, Drive, PDF
Trilha B: [security-engineer] -> 9.8 Security review completa: webhooks, secrets, input sanitization, multi-tenant
Trilha C: [ai-engineer]       -> 9.9 OCR de NFs com Claude Vision (endpoint + prompt)
          [n8n-architect]      -> 9.9 Workflow wf-claquete (P2)
          [devops]             -> 9.9 Docker volume Evolution API

DIA 14-15 (Paralelo -- 2 trilhas)
--------------------------------------------
Trilha A: [backend-dev] + [frontend-dev] -> 9.8 Correcao de bugs do QA
Trilha B: [qa-engineer]                  -> Re-teste apos correcoes


SEMANA 4 (Dias 16-18, se necessario)
========================================================================
Buffer para bugs criticos, ajustes de UX, e polimento final.
```

---

## 4. Handoffs Criticos

Cada handoff e um ponto onde um agente DEVE entregar um artefato ANTES que outro agente possa comecar. Falhar nesses pontos causa bloqueio.

### 4.1 Handoffs da Fase 9.1 (Foundation)

| # | De | Para | Artefato | Quando |
|---|-----|------|----------|--------|
| H1 | db-architect | backend-dev | Migration aplicada (tabelas criadas no Supabase) | Fim Dia 2 |
| H2 | db-architect | integrations-engineer | Tabela docuseal_submissions confirmada | Fim Dia 2 |
| H3 | backend-dev | backend-dev | _shared/types.ts com NfDocumentRow e DocuSealSubmissionRow | Dia 2 (morning) |
| H4 | backend-dev | integrations-engineer | _shared/integration-client.ts com novos event_types | Dia 2 |
| H5 | integrations-engineer | backend-dev | _shared/docuseal-client.ts pronto | Dia 2 |

**Protocolo:** Ao concluir, o agente faz commit com mensagem padrao `feat(fase-9.1): {descricao}` e notifica o proximo agente.

### 4.2 Handoffs entre Sub-fases

| # | De | Para | Artefato | Bloqueante para |
|---|-----|------|----------|-----------------|
| H6 | ui-designer | frontend-dev | Spec visual nf-validation-page.md | 9.2 Frontend |
| H7 | ui-designer | frontend-dev | Spec visual nf-request-page.md | 9.3 Frontend |
| H8 | ui-designer | frontend-dev | Spec visual contracts-tab.md | 9.5 Frontend |
| H9 | ui-designer | backend-dev | Spec layout PDF aprovacao interna | 9.7 Template HTML |
| H10 | backend-dev | n8n-architect | nf-processor deployed (para n8n callback) | 9.2 Workflow test |
| H11 | backend-dev | n8n-architect | nf-processor/request-sent-callback deployed | 9.3 Workflow test |
| H12 | integrations-engineer | n8n-architect | docuseal-integration deployed (webhook URL) | 9.5 Workflow test |
| H13 | backend-dev | frontend-dev | Edge Functions deployed com endpoints ativos | 9.2/9.3/9.5 Frontend |
| H14 | n8n-architect | qa-engineer | Todos os workflows funcionando | 9.8 QA |
| H15 | qa-engineer | backend-dev + frontend-dev | Lista de bugs | 9.8 Correcoes |

### 4.3 Diagrama de Handoffs

```
db-architect ----H1,H2----> backend-dev / integrations-engineer
                                |
backend-dev -----H3,H4-------> (self) + integrations-engineer
integrations-eng --H5---------> backend-dev
                                |
ui-designer ----H6,H7,H8,H9--> frontend-dev / backend-dev
                                |
backend-dev ----H10,H11,H13---> n8n-architect / frontend-dev
integrations-eng ---H12-------> n8n-architect
                                |
n8n-architect ------H14-------> qa-engineer
                                |
qa-engineer --------H15-------> backend-dev + frontend-dev
```

---

## 5. Bloqueios (O que NAO pode comecar)

| Tarefa bloqueada | Bloqueada por | Razao |
|-----------------|---------------|-------|
| 9.2 Edge Function nf-processor | 9.1 (migration + types) | Precisa das tabelas nf_documents e dos tipos TypeScript |
| 9.2 Frontend nf-validation | 9.1 + spec ui-designer | Precisa dos endpoints + spec visual |
| 9.3 Edge Function request-send | 9.1 (migration + email-template) | Precisa dos campos nf_request_status em financial_records |
| 9.3 Frontend nf-request | 9.1 + spec ui-designer | Precisa dos endpoints + spec visual |
| 9.5 Edge Function docuseal-integration | 9.1 (migration + docuseal-client) | Precisa da tabela docuseal_submissions + client HTTP |
| 9.5 Frontend contracts-tab | 9.5 EF + spec ui-designer | Precisa dos endpoints + spec visual |
| 9.5 n8n wf-docuseal-contracts | 9.5 EF (para callback URL) | Precisa do endpoint de callback deployed |
| 9.7 Template HTML PDF | spec layout do ui-designer | Precisa saber o layout esperado |
| 9.8 QA E2E | 9.2-9.7 concluidas | Precisa de todo o sistema funcionando |
| 9.9 OCR NFs | 9.2 (nf_documents existir) | OCR opera sobre NFs ja registradas |

**Bloqueio ZERO (pode comecar imediatamente, dia 1):**
- 9.4 (wf-job-approved -> JOB_FECHADO_CRIACAO) -- totalmente independente
- ui-designer (specs visuais) -- nao depende de nenhuma implementacao
- ADRs (tech-lead) -- documentacao

---

## 6. Quick Wins (Desbloquear maximo de trabalho paralelo)

A ordem de prioridade para desbloquear o maximo de trabalho paralelo:

### Quick Win 1: Migration + Types (Dia 1, primeiras 4 horas)
**Quem:** db-architect
**O que:** Criar e aplicar a migration 016 com nf_documents + docuseal_submissions + ALTERs.
**Desbloqueia:** backend-dev (nf-processor, docuseal-integration, pdf-generator), integrations-engineer (docuseal client), frontend-dev (tipos), n8n-architect (endpoints para callback)
**Impacto:** Desbloqueia 5 agentes

### Quick Win 2: Specs Visuais (Dia 1-2)
**Quem:** ui-designer
**O que:** Criar specs visuais das 3 telas: nf-validation, nf-request, contracts-tab
**Desbloqueia:** frontend-dev (todas as telas da Fase 9)
**Impacto:** Desbloqueia todo o trabalho frontend

### Quick Win 3: _shared modules (Dia 1-2)
**Quem:** backend-dev + integrations-engineer (paralelo)
**O que:** Criar types.ts (novos tipos), integration-client.ts (novos events), docuseal-client.ts, email-template.ts
**Desbloqueia:** Todas as Edge Functions e handlers
**Impacto:** Desbloqueia toda a camada backend

### Quick Win 4: wf-job-approved (Dia 1-2)
**Quem:** n8n-architect
**O que:** Conectar wf-job-approved ao JOB_FECHADO_CRIACAO (3 nodes novos)
**Desbloqueia:** Nenhum outro agente, mas e P0 e rapido (1-2 dias). Entrega valor imediato.
**Impacto:** Feature P0 entregue no Dia 2

### Quick Win 5: ADRs (Dia 1)
**Quem:** tech-lead
**O que:** Escrever ADR-018, ADR-019, ADR-020 (ja rascunhados na arquitetura)
**Desbloqueia:** Documentacao formal para decisoes tecnicas. Referencia para todos os agentes.
**Impacto:** Clareza arquitetural

---

## 7. Estimativa por Agente

### 7.1 db-architect (Carga: MEDIA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| Migration 016: nf_documents + docuseal_submissions | 9.1 | 0.5 |
| Migration 016: ALTERs financial_records + invoices | 9.1 | 0.5 |
| Review de RLS e indices | 9.1 | 0.5 |
| **Total** | | **1.5 dias** |

**Disponibilidade apos:** Dia 3. Pode apoiar security-engineer no review de RLS (9.8).

### 7.2 backend-dev (Carga: ALTA -- agente mais demandado)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| _shared/types.ts (novos tipos) | 9.1 | 0.5 |
| _shared/integration-client.ts (novos events) | 9.1 | 0.25 |
| _shared/email-template.ts | 9.1 | 0.5 |
| _shared/pdf-generator.ts | 9.1 | 0.5 |
| Edge Function nf-processor (9 endpoints) | 9.2 | 3 |
| Endpoints request-send + callback | 9.3 | 1.5 |
| Handler nf_email_send no integration-processor | 9.3 | 0.5 |
| Edge Function pdf-generator (2 endpoints + template HTML) | 9.7 | 2 |
| Handlers integration-processor (docuseal, drive, pdf) | 9.5/9.6 | 1 |
| Correcoes de bugs QA | 9.8 | 1.5 |
| **Total** | | **11.25 dias** |

**Nota:** backend-dev e o gargalo. As tarefas de 9.2, 9.3 e 9.7 sao sequenciais para ele. Otimizacao: a nf-processor/request-send (9.3) reutiliza a mesma EF da 9.2, entao e continuacao natural.

### 7.3 frontend-dev (Carga: ALTA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| NfValidationPage + 4 componentes + 2 hooks | 9.2 | 2.5 |
| NfRequestPage + 3 componentes + 1 hook | 9.3 | 1.5 |
| ContractsTab + 3 componentes + 1 hook | 9.5 | 2 |
| Config templates em Settings > Integracoes | 9.6 | 1 |
| Botao + preview PDF no Job Detail | 9.7 | 0.5 |
| Correcoes de bugs QA | 9.8 | 1 |
| **Total** | | **8.5 dias** |

**Dependencia:** Precisa dos specs do ui-designer ANTES de cada tela. Precisa dos endpoints do backend-dev deployed ANTES de integrar.

### 7.4 integrations-engineer (Carga: ALTA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| _shared/docuseal-client.ts | 9.1 | 1 |
| Config Gmail OAuth2 no n8n | 9.2 | 0.5 |
| Edge Function docuseal-integration (6 endpoints) | 9.5 | 3 |
| Webhook HMAC validation | 9.5 | 0.5 |
| Config webhook no DocuSeal (VPS) | 9.5 | 0.5 |
| Endpoint drive-integration copy-templates | 9.6 | 1 |
| Expandir create-structure para auto-copy | 9.6 | 0.5 |
| **Total** | | **7 dias** |

### 7.5 n8n-architect (Carga: ALTA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| wf-job-approved + JOB_FECHADO_CRIACAO (3 nodes) | 9.4 | 1.5 |
| wf-nf-processor (Gmail polling, ~15 nodes) | 9.2 | 2 |
| wf-nf-request (~10 nodes) | 9.3 | 1.5 |
| wf-docuseal-contracts (~12 nodes) | 9.5 | 1.5 |
| wf-claquete (~8 nodes, P2) | 9.9 | 1.5 |
| Testes de workflows | 9.2-9.5 | 1 |
| **Total** | | **9 dias** |

### 7.6 ui-designer (Carga: MEDIA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| Spec: nf-validation-page.md | 9.2 | 0.75 |
| Spec: nf-request-page.md | 9.3 | 0.5 |
| Spec: contracts-tab.md | 9.5 | 0.75 |
| Spec: layout PDF aprovacao interna | 9.7 | 0.5 |
| Review de implementacao frontend | 9.2-9.7 | 0.5 |
| **Total** | | **3 dias** |

**Disponibilidade apos:** Dia 4. Pode ser liberado para outras atividades do projeto.

### 7.7 ai-engineer (Carga: BAIXA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| OCR de NFs com Claude Vision (endpoint + prompt) | 9.9 | 2 |
| ADR-021 (tech-lead escreve, ai-engineer revisa) | 9.9 | 0.25 |
| **Total** | | **2.25 dias** |

**Nota:** ai-engineer so entra na Fase 9.9 (P2). Pode estar alocado em outras tarefas do projeto ate la.

### 7.8 security-engineer (Carga: MEDIA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| Review parcial: webhook HMAC (DocuSeal) | 9.5 | 0.5 |
| Review parcial: cron secret pattern | 9.2 | 0.25 |
| Security review completa (9.8) | 9.8 | 1.5 |
| **Total** | | **2.25 dias** |

### 7.9 qa-engineer (Carga: MEDIA-ALTA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| Testes E2E: NF recebimento flow | 9.8 | 1 |
| Testes E2E: NF request flow | 9.8 | 0.5 |
| Testes E2E: DocuSeal contracts | 9.8 | 1 |
| Testes E2E: Drive templates | 9.8 | 0.5 |
| Testes E2E: PDF aprovacao | 9.8 | 0.5 |
| Testes: idempotencia + fallbacks | 9.8 | 0.5 |
| Re-testes apos correcoes | 9.8 | 0.5 |
| **Total** | | **4.5 dias** |

### 7.10 devops (Carga: BAIXA)

| Tarefa | Sub-fase | Dias |
|--------|----------|------|
| Docker volume Evolution API | 9.9 | 0.5 |
| Apoio acesso VPS (Gmail OAuth, DocuSeal webhook) | 9.2/9.5 | 0.25 |
| **Total** | | **0.75 dias** |

---

## 8. Resumo de Carga Total

| Agente | Dias estimados | Semanas de pico |
|--------|---------------|-----------------|
| backend-dev | 11.25 | Semanas 1-3 (continuo) |
| n8n-architect | 9.0 | Semanas 1-2 (continuo) |
| frontend-dev | 8.5 | Semanas 1-3 (depende de specs e EFs) |
| integrations-engineer | 7.0 | Semanas 1-2 |
| qa-engineer | 4.5 | Semana 3 |
| ui-designer | 3.0 | Semana 1 (front-loaded) |
| security-engineer | 2.25 | Semana 2-3 |
| ai-engineer | 2.25 | Semana 3 |
| db-architect | 1.5 | Semana 1 (primeiros 2 dias) |
| devops | 0.75 | Semana 3 |
| **Total pessoa-dias** | **~50 dias** | |

**Com paralelismo maximo (5 trilhas simultaneas): ~15-18 dias uteis de calendario**

---

## 9. Cronograma Condensado com Paralelismo

```
         DIA:  1    2    3    4    5  |  6    7    8    9   10  |  11   12   13   14   15  |  16-18
              ========================|=========================|==========================|========
db-arch:     [--- 9.1 Migrations ---]  (livre)
backend:     [---- 9.1 _shared -----][---------- 9.2 nf-processor ----------][-- 9.3 req ][9.7 pdf][-- 9.5 handlers --][-- fix --]
integ-eng:   [9.1 docuseal-client][9.2 Gmail OAuth][------------ 9.5 docuseal-integration ----------][-- 9.6 drive --]
n8n-arch:    [--- 9.4 job-approved ---][-- 9.2 wf-nf-processor -][-- 9.3 wf-nf-request --][9.5 wf-docuseal][-- 9.9 claquete --]
frontend:           [wait spec][------ 9.2 NfValidation ------][-- 9.3 NfReq --][---- 9.5 Contracts ----][9.6+9.7][fix]
ui-designer: [-- nf-validation spec --][nf-request][contracts-tab][pdf-layout]  (livre)
security:                                                       [review parcial]          [--- 9.8 full review ---]
qa-engineer:                                                              [-- 9.4 test --][-------- 9.8 QA completo --------][re-test]
ai-engineer:                                                                              [-------- 9.9 OCR NFs ----------]
devops:                                                                                   [9.9 Docker]
tech-lead:   [ADRs][review][----------- revisao continua de handoffs, arquitetura, desbloqueio -----------]
```

---

## 10. Checklist de Entrega por Sub-fase

### 9.1 Foundation -- Criterios de Aceite
- [ ] Migration aplicada: `nf_documents` criada com RLS, indices, trigger
- [ ] Migration aplicada: `docuseal_submissions` criada com RLS, indices, trigger
- [ ] Migration aplicada: `financial_records` ALTERed (nf_request_status, supplier_email, supplier_cnpj)
- [ ] Migration aplicada: `invoices` ALTERed (nf_document_id, drive_file_id, issuer_cnpj, issuer_name)
- [ ] `_shared/types.ts` atualizado com NfDocumentRow, DocuSealSubmissionRow
- [ ] `_shared/integration-client.ts` atualizado com 4 novos event_types
- [ ] `_shared/docuseal-client.ts` criado e funcional
- [ ] `_shared/email-template.ts` criado com buildNfRequestEmail
- [ ] `_shared/pdf-generator.ts` criado com generatePdfFromHtml e savePdfToDrive
- [ ] ADR-018, ADR-019 escritos

### 9.2 NF Recebimento -- Criterios de Aceite
- [ ] Edge Function `nf-processor` deployed com 9 endpoints
- [ ] Match automatico funciona (email + valor)
- [ ] Deduplicacao por file_hash funciona
- [ ] Workflow `wf-nf-processor` ativo no n8n (polling 5 min)
- [ ] Credencial Gmail OAuth2 configurada
- [ ] Tela `/financial/nf-validation` funcional (stats, tabela, modal)
- [ ] Fluxo E2E testado: email com PDF -> aparece na UI -> validar/rejeitar

### 9.3 Pedido NF -- Criterios de Aceite
- [ ] Endpoints `request-send` e `request-sent-callback` deployed
- [ ] Handler `nf_email_send` no integration-processor
- [ ] Workflow `wf-nf-request` ativo no n8n
- [ ] Tela `/financial/nf-request` funcional (selecao, preview, envio)
- [ ] Agrupamento por fornecedor funciona (1 email por fornecedor)
- [ ] Financial_records atualizado para `nf_request_status = 'enviado_confirmado'` apos envio

### 9.4 Job Approved -- Criterios de Aceite
- [ ] wf-job-approved expandido com sub-workflow call
- [ ] Payload mapeado corretamente para JOB_FECHADO_CRIACAO
- [ ] Falha no JOB_FECHADO_CRIACAO NAO bloqueia wf-job-approved
- [ ] Grupos WhatsApp criados ao aprovar job (teste manual)

### 9.5 DocuSeal -- Criterios de Aceite
- [ ] Edge Function `docuseal-integration` deployed com 6 endpoints
- [ ] Webhook HMAC validation funcional
- [ ] Workflow `wf-docuseal-contracts` ativo no n8n
- [ ] Webhook configurado no DocuSeal (assinaturas.ellahfilmes.com)
- [ ] Aba "Contratos" no Job Detail funcional
- [ ] Fluxo E2E: criar contrato -> DocuSeal envia email -> assinatura -> webhook -> status atualiza

### 9.6 Drive Templates -- Criterios de Aceite
- [ ] Endpoint `copy-templates` deployed
- [ ] `create-structure` expandido para auto-copy
- [ ] Config de templates em Settings funcional
- [ ] Fluxo E2E: criar job -> pastas + templates copiados

### 9.7 PDF Aprovacao -- Criterios de Aceite
- [ ] Edge Function `pdf-generator` deployed
- [ ] Template HTML com todos os dados do job (referencia sec 4.3 da arquitetura)
- [ ] PDF salvo no Drive + job_files
- [ ] Botao e preview no Job Detail funcional

### 9.8 QA -- Criterios de Aceite
- [ ] Todos os fluxos E2E testados (NF, pedido NF, DocuSeal, Drive, PDF)
- [ ] Idempotencia validada (reprocessar email, recriar contrato)
- [ ] Fallbacks testados (n8n fora, DocuSeal fora)
- [ ] Multi-tenant isolation confirmado
- [ ] Security review completo (sem findings CRITICOS)
- [ ] Todos os bugs Blocker/Critical corrigidos

### 9.9 P2 -- Criterios de Aceite
- [ ] OCR de NFs funcional (extrair nf_number, valor, CNPJ)
- [ ] Resultado OCR e sugestao (requer validacao humana)
- [ ] wf-claquete funcional (Slides -> PDF + PNG)
- [ ] Docker volume Evolution API persistido
- [ ] ADR-021 escrito

---

## 11. Riscos do Plano de Execucao

| Risco | Prob. | Mitigacao |
|-------|-------|-----------|
| backend-dev como gargalo (11+ dias) | Alta | Integrations-engineer assume docuseal-integration (9.5), aliviando backend-dev |
| Gmail OAuth token dificil de configurar | Media | integrations-engineer + devops alocados juntos no Dia 3 |
| Specs do ui-designer atrasam | Media | frontend-dev pode comecar pelo scaffold (rotas, hooks, fetch) antes do spec visual |
| n8n workflows falham em producao | Media | Testar cada workflow isoladamente antes de integrar E2E |
| jspdf insuficiente para layout do PDF | Baixa | Fallback para n8n + Puppeteer (ADR-020 ja documenta) |
| QA encontra muitos bugs | Media | Buffer de 3 dias (Semana 4) reservado para correcoes |

---

## 12. Protocolo de Comunicacao entre Agentes

### 12.1 Convencao de Commits
```
feat(fase-9.{N}): {descricao curta}
fix(fase-9.{N}): {descricao do bug corrigido}
chore(fase-9.{N}): {ajuste nao funcional}
```

### 12.2 Notificacao de Handoff
Quando um agente conclui um artefato bloqueante, deve:
1. Fazer commit com a convencao acima
2. Confirmar que o artefato esta deployado/funcional
3. Listar exatamente o que foi entregue e onde esta

### 12.3 Sinalizacao de Bloqueio
Se um agente esta bloqueado esperando handoff:
1. Declarar qual artefato esta esperando
2. Sugerir trabalho alternativo que pode fazer enquanto espera
3. Pedir ao tech-lead para priorizar o desbloqueio

---

## 13. Ordem de Invocacao dos Agentes (Roteiro para o Operador)

Este roteiro detalha exatamente em que ordem invocar cada agente, otimizado para maxima eficiencia.

### Batch 1 (Dia 1 -- Invocar 4 agentes em paralelo)

1. **db-architect**: "Implemente a migration 016 da Fase 9.1 conforme docs/architecture/fase-9-automacoes-architecture.md secao 3 (Schema Changes). Crie nf_documents, docuseal_submissions, ALTER financial_records e invoices. Migration idempotente."

2. **backend-dev**: "Implemente os _shared modules da Fase 9.1: atualizar types.ts com NfDocumentRow e DocuSealSubmissionRow, atualizar integration-client.ts com 4 novos event_types, criar email-template.ts e pdf-generator.ts. Referencia: secoes 13 e 14 da arquitetura."

3. **integrations-engineer**: "Crie o _shared/docuseal-client.ts conforme secao 13.1 da arquitetura Fase 9. Cliente HTTP para DocuSeal self-hosted com createSubmission, getSubmission, listTemplates e validateWebhookSignature."

4. **n8n-architect**: "Implemente a Fase 9.4: expandir wf-job-approved para chamar JOB_FECHADO_CRIACAO como sub-workflow. Mapear payload conforme secao 5.3 da arquitetura. NAO alterar o JOB_FECHADO_CRIACAO."

Em paralelo com todos:

5. **ui-designer**: "Crie specs visuais para 3 telas novas da Fase 9: /financial/nf-validation, /financial/nf-request, e aba Contratos no Job Detail. Salve em docs/design/screens/. Referencia: secao 6 da arquitetura."

6. **tech-lead**: Escrever ADR-018, ADR-019, ADR-020.

### Batch 2 (Dia 3 -- Apos Batch 1 concluido)

7. **backend-dev**: "Implemente a Edge Function nf-processor (Fase 9.2) com 9 endpoints conforme secao 4.1 da arquitetura. Logica de match automatico, deduplicacao por hash, validacao, rejeicao, upload manual."

8. **n8n-architect**: "Crie o workflow wf-nf-processor (Fase 9.2) conforme secao 5.1 da arquitetura. Gmail IMAP polling a cada 5 min, extrair PDF, SHA-256, Drive upload, callback para nf-processor/ingest."

9. **integrations-engineer**: "Configure credencial Gmail OAuth2 no n8n para financeiro@ellahfilmes.com. Em seguida, comece o endpoint drive-integration/:jobId/copy-templates (Fase 9.6)."

10. **frontend-dev**: "Implemente a tela /financial/nf-validation (Fase 9.2) conforme spec do ui-designer. NfValidationPage, NfStatsCards, NfDocumentTable, NfValidationDialog, NfReassignDialog."

### Batch 3 (Dia 6 -- Apos 9.2 backend concluido)

11. **backend-dev**: "Implemente os endpoints nf-processor/request-send e request-sent-callback (Fase 9.3). Crie o handler nf_email_send no integration-processor. Em seguida, comece o pdf-generator (Fase 9.7)."

12. **n8n-architect**: "Crie o workflow wf-nf-request (Fase 9.3). Em seguida, crie wf-docuseal-contracts (Fase 9.5)."

13. **integrations-engineer**: "Implemente a Edge Function docuseal-integration (Fase 9.5) com 6 endpoints. Webhook HMAC validation. Configure webhook no DocuSeal."

14. **frontend-dev**: "Implemente /financial/nf-request (Fase 9.3). Em seguida, config templates Settings (9.6), ContractsTab (9.5), botao PDF (9.7)."

15. **security-engineer**: "Review parcial: validar webhook auth (DocuSeal HMAC + cron secret), input sanitization nos endpoints novos."

### Batch 4 (Dia 11 -- Apos P0+P1 concluidos)

16. **qa-engineer**: "Execute QA completo da Fase 9.8. Testar todos os fluxos E2E, idempotencia, fallbacks, multi-tenant isolation."

17. **security-engineer**: "Security review completo: todas as Edge Functions novas, webhooks, secrets, RLS das tabelas novas."

18. **ai-engineer**: "Implemente OCR de NFs com Claude Vision (Fase 9.9). Endpoint nf-processor/ocr-analyze, prompt estruturado, salvar em extracted_data."

19. **n8n-architect**: "Crie wf-claquete (Fase 9.9 P2)."

20. **devops**: "Configure Docker volume para Evolution API (Fase 9.9)."

### Batch 5 (Dia 14 -- Apos QA)

21. **backend-dev** + **frontend-dev**: "Corrijam os bugs reportados pelo qa-engineer."
22. **qa-engineer**: "Re-teste apos correcoes. Validar que todos os bugs Blocker/Critical estao resolvidos."

---

## 14. Metricas de Progresso

| Marco | Quando | Validacao |
|-------|--------|-----------|
| 9.1 concluida | Fim Dia 2 | Tabelas criadas, types atualizados, _shared modules prontos |
| 9.4 concluida | Fim Dia 2 | wf-job-approved funcional, grupos WhatsApp criados em teste |
| Primeiro P0 concluido (9.2 ou 9.3) | Fim Dia 7 | NF aparece na UI apos envio por email |
| Todos P0 concluidos (9.2+9.3+9.4) | Fim Dia 10 | Fluxo NF completo + job approved |
| Todos P1 concluidos (9.5+9.6+9.7) | Fim Dia 13 | DocuSeal, Drive templates, PDF todos funcionais |
| QA verde | Fim Dia 16 | Zero bugs Blocker/Critical |
| Fase 9 completa | Fim Dia 18 | Tudo deployed, P2 entregues, documentacao atualizada |
