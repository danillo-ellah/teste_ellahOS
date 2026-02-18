# ELLAHOS — Full Roadmap v1.0

**Data:** 18/02/2026
**Autor:** Revisão estratégica (Claude.ai + Danillo)
**Contexto:** Danillo sozinho com Claude Code, sem pressa (6+ meses), foco em qualidade. Ellah + 1-2 produtoras parceiras para teste.

---

## 1. ESTADO ATUAL (18/02/2026)

### ✅ O que está pronto
- **Banco de dados:** 14 tabelas, 18 migrations, RLS em todas as tabelas
- **Edge Functions:** 6 deployed (jobs, jobs-status, jobs-team, jobs-deliverables, jobs-shooting-dates, jobs-history)
- **Módulos compartilhados:** 10 (_shared/: cors, errors, response, auth, supabase-client, types, validation, history, column-map, pagination)
- **Design System:** Definido (paleta Ellah, dark mode, shadcn/ui, Tailwind config)
- **Squad Multi-Agent:** 11 agentes configurados no Claude Code
- **Segurança:** RLS multi-tenant, audit trail automático, security audit passado

### ⚠️ Observações do banco atual
- **1 advisory de segurança:** Leaked Password Protection está desabilitado no Auth (recomendação: ativar)
- **Tabelas existentes:** tenants, profiles, clients, agencies, contacts, people, jobs (~75 colunas), job_team, job_deliverables, job_history, job_budgets, job_files, job_code_sequences, job_shooting_dates
- **verify_jwt desabilitado** em todas as Edge Functions (auth feita via código com getAuthContext)

### ✅ Frontend Fase 3 — CONCLUÍDA (8/8 sub-fases)
- Auth flow (login, forgot password, reset password)
- Jobs List com filtros, busca, paginação, criação via modal
- Job Detail com 6 abas CRUD (Geral, Equipe, Entregáveis, Financeiro, Diárias, Histórico)
- Pipeline Kanban com drag-and-drop (@dnd-kit)
- Entregáveis com hierarquia pai/filho, prazo de entrega e indicadores de urgência
- Responsivo mobile, acessibilidade e polimento final

### ❌ O que falta
- 19 das 20 features planejadas
- Integrações externas (Google Drive, WhatsApp, DocuSeal, n8n workflows)
- Features de IA

---

## 2. AS 20 FEATURES — PRIORIZADAS

### Tier 1: Fundação (sem isso não existe produto)
| # | Feature | Dependência | Valor |
|---|---------|-------------|-------|
| 1 | ✅ Jobs Master Table | — | Núcleo do sistema |
| 3 | Pipeline Visual (Kanban) | Frontend + Jobs API | Ver status de todos os jobs de uma vez |
| 17 | Multi-tenant | ✅ Banco pronto | Isolar produtoras |

### Tier 2: Operação do dia a dia (substitui a planilha)
| # | Feature | Dependência | Valor |
|---|---------|-------------|-------|
| 5 | Controle Financeiro | Jobs API | Margem, custos, fluxo de caixa |
| 4 | Gestão de Equipe | People + Jobs API | Alocação, conflitos, agenda |
| 14 | Notificações e Alertas | n8n + Evolution API | Prazos, status, financeiro |
| 6 | Sistema de Aprovações | Jobs API + Frontend | Workflow interno + cliente |

### Tier 3: Automações (diferencial vs planilha)
| # | Feature | Dependência | Valor |
|---|---------|-------------|-------|
| 9 | Automação Google Drive | Google Drive API + n8n | Criar pastas/docs por status |
| 10 | Geração de Documentos | Google Docs API + Templates | Carta orçamento, contratos, PPM |
| 20 | Integrações (n8n, DocuSeal) | n8n workflows | Orquestração de automações |
| 11 | WhatsApp Bot | Evolution API + n8n | Criar job por mensagem |

### Tier 4: Experiência premium (o que torna o ELLAHOS especial)
| # | Feature | Dependência | Valor |
|---|---------|-------------|-------|
| 2 | Dashboard Inteligente | Frontend + dados reais | Visão geral do negócio |
| 7 | Linha do Tempo de Produção | Jobs API + datas | Timeline visual |
| 8 | Gestão de Entregáveis | Job Deliverables + Storage | Versionamento, review |
| 13 | Health Score Inteligente | ✅ Básico pronto | IA sugere ações |
| 15 | Portal do Cliente | Auth separado + Jobs API | Cliente acompanha e aprova |
| 18 | Busca Inteligente | Full-text search | Buscar qualquer coisa rápido |
| 19 | Mobile App (PWA) | Frontend responsivo | Usar no set de filmagem |

### Tier 5: IA e features avançadas (diferencial competitivo)
| # | Feature | Dependência | Valor |
|---|---------|-------------|-------|
| 12 | Resumo IA dos Grupos WhatsApp | Claude API + WhatsApp | Resumos diários automáticos |
| 16 | Relatórios e Analytics | Dados acumulados | Performance, tendências |

### Features revolucionárias (documento original — pós-MVP)
- Shooting Board no iPad (5.1)
- Estimativa de Orçamento por IA (5.2)
- Callsheet Automática (5.3)
- IA Analista de Dailies (5.4)
- Portal do Cliente (5.5)
- Matching Automático de Freelancer (5.6)
- Relatório Pós-Job com Lições Aprendidas (5.7)
- Decupagem Automática do Roteiro (5.8)
- Comparador de Fornecedores (5.9)
- Bot de Freelancers via WhatsApp (5.10)

---

## 3. FASES DE IMPLEMENTAÇÃO

### FASE 3 — Frontend do Módulo Jobs (4-6 semanas)
**Objetivo:** Primeira tela funcional. Ver, criar e gerenciar jobs pelo browser.

**Tabelas necessárias:** Nenhuma nova (usa as 14 existentes)

**Edge Functions necessárias:** Nenhuma nova (usa as 6 existentes)

**Telas:**
1. **Layout base** — Sidebar, topbar, dark mode, auth flow (login/register)
2. **Jobs List** — Tabela principal com filtros, busca, ordenação, paginação
3. **Job Create** — Formulário multi-step (dados básicos → cliente/agência → financeiro → equipe)
4. **Job Detail** — Página com tabs (Visão Geral, Equipe, Entregáveis, Filmagem, Financeiro, Histórico)
5. **Job Edit** — Formulário preenchido com dados existentes
6. **Pipeline Kanban** — Visualização por colunas de status, drag-and-drop

**Componentes chave:**
- StatusBadge (14 status com cores)
- HealthScoreBadge (0-100 com breakdown)
- MarginIndicator (verde/amarelo/vermelho)
- CurrencyInput (R$ formatado)
- PersonCombobox (buscar pessoa por nome)
- ConfirmDialog (soft delete)

**Decisões técnicas:**
- Next.js 16+ App Router (atualizado de 14 para 16 com React 19)
- TypeScript strict
- Tailwind v4 + shadcn/ui (design system já definido)
- Supabase JS client (auth + data)
- TanStack Query v5 (cache, loading states, mutations)
- React Hook Form + Zod (validação igual ao backend)
- Dark mode por padrão

**Critério de done:** Conseguir criar um job pelo browser, ver na lista, abrir detalhes, mudar status, adicionar equipe.

#### Progresso das Sub-fases:

| Sub-fase | Descrição | Status | Data |
|----------|-----------|--------|------|
| 3.1 | Init projeto (Next.js, Tailwind, shadcn/ui, Supabase client, tipos) | ✅ Concluída | 18/02/2026 |
| 3.2 | Auth flow (login, registro, forgot/reset password, middleware) | ✅ Concluída | 18/02/2026 |
| 3.3 | Layout base (sidebar, topbar, dark mode, responsivo) | ✅ Concluída | 18/02/2026 |
| 3.4 | Jobs List (tabela, filtros, busca, paginação, criar job modal) | ✅ Concluída | 18/02/2026 |
| 3.5 | Job Detail (header sticky, pipeline de status, 6 abas placeholder) | ✅ Concluída | 18/02/2026 |
| 3.6 | Conteúdo das abas (6 tabs CRUD, hooks, dialogs, formatação BR) | ✅ Concluída | 18/02/2026 |
| 3.7 | Pipeline Kanban (drag-and-drop com @dnd-kit, optimistic UI) | ✅ Concluída | 18/02/2026 |
| 3.8 | Polimento final (responsivo mobile, acessibilidade, code quality) | ✅ Concluída | 18/02/2026 |

---

### FASE 4 — Cadastros Base + Financeiro (3-4 semanas)
**Objetivo:** Cadastrar clientes, agências e pessoas. Ver dados financeiros.

**Tabelas necessárias (novas):**
- `financial_records` — receitas, despesas, provisões por job
- `budget_items` — itens detalhados do orçamento (categorias: equipe, locação, equipamento, etc.)
- `invoices` — notas fiscais emitidas e recebidas

**Edge Functions necessárias (novas):**
- `clients` — CRUD de clientes
- `agencies` — CRUD de agências
- `people` — CRUD de pessoas (equipe interna + freelancers)
- `contacts` — CRUD de contatos
- `financial` — CRUD de registros financeiros
- `budgets` — CRUD de orçamentos com versionamento (v1, v2, v3)

**Telas:**
1. **Clients List + Detail** — Cadastro com histórico de jobs
2. **Agencies List + Detail** — Idem
3. **People List + Detail** — Equipe interna + freelancers + elenco, com dados bancários, CPF, etc.
4. **Financial Dashboard por Job** — Custos estimados vs reais, margem, breakdown por categoria
5. **Budget Editor** — Criar/editar orçamento com itens, versionamento
6. **Financial Overview** — Fluxo de caixa 30/60/90 dias (todas as produtoras)

**Critério de done:** Cadastrar cliente, vincular a um job, ver margem do job atualizar conforme adiciona custos.

---

### FASE 5 — Integrações Core (4-6 semanas)
**Objetivo:** Automações que substituem os Apps Scripts atuais.

**Tabelas necessárias (novas):**
- `notifications` — registro de todas as notificações enviadas
- `notification_preferences` — preferências por usuário (canal, frequência)
- `drive_folders` — mapeamento job ↔ pasta no Drive
- `whatsapp_messages` — log de mensagens enviadas/recebidas

**Integrações:**
1. **Google Drive** — Criar estrutura de pastas quando job é aprovado (replicar Apps Script atual)
2. **n8n Workflows:**
   - [PRODUÇÃO] Job Aprovado → Criar pastas Drive + Grupos WhatsApp
   - [FINANCEIRO] Margem < 15% → Alerta WhatsApp pro PE e Financeiro
   - [NOTIFICAÇÕES] Mudança de status → Notificar equipe
   - [DOCUMENTOS] Gerar Carta Orçamento quando orçamento é enviado
3. **Evolution API (WhatsApp):**
   - Enviar notificações de status
   - Enviar documentos (carta orçamento, callsheet)
   - Receber mensagens (futuro: criar jobs por WhatsApp)

**Edge Functions necessárias (novas):**
- `notifications` — Enviar e listar notificações
- `drive-integration` — Criar estrutura de pastas, sincronizar URLs
- `documents` — Gerar carta orçamento, contratos (via Google Docs API ou n8n)

**Critério de done:** Aprovar um job no ELLAHOS e automaticamente criar a estrutura de pastas no Drive e notificar a equipe via WhatsApp.

---

### FASE 6 — Gestão de Equipe + Aprovações (3-4 semanas)
**Objetivo:** Alocação inteligente, conflitos de agenda, aprovações formais.

**Tabelas necessárias (novas):**
- `allocations` — pessoa + job + período + papel (pra detectar conflitos)
- `approval_requests` — pedidos de aprovação com status e deadline
- `approval_logs` — quem aprovou/rejeitou e quando

**Telas:**
1. **Calendário de Alocação** — Quem está em qual job, por período
2. **Conflito de Agenda** — Alertas visuais quando pessoa está em 2 jobs
3. **Fluxo de Aprovação** — Interno (equipe marca) + Externo (botão pro cliente)
4. **People Detail expandido** — Histórico de jobs, avaliação, disponibilidade

**Critério de done:** Ver que um diretor está alocado em 2 jobs no mesmo período e receber alerta.

---

### FASE 7 — Dashboard + Relatórios + Portal do Cliente (4-6 semanas)
**Objetivo:** Visão gerencial e acesso externo do cliente.

**Tabelas necessárias (novas):**
- `client_portal_tokens` — tokens JWT para acesso do cliente
- `client_portal_messages` — mensagens cliente ↔ produtora

**Telas:**
1. **Dashboard Home** — Jobs ativos, margem geral, alertas, health score médio, pipeline visual
2. **Relatório de Performance** — Por diretor, por tipo de projeto, por cliente
3. **Relatório Financeiro** — Faturamento mensal, projeção, comparativo
4. **Portal do Cliente** — Timeline, documentos, pendências, aprovar/pedir ajuste

**Critério de done:** CEO abre o dashboard e vê a saúde de todos os jobs em 5 segundos. Cliente acessa o portal e aprova o PPM.

---

### FASE 8 — Features de IA + PWA (6-8 semanas)
**Objetivo:** Diferencial competitivo. O que nenhum concorrente tem.

**Tabelas necessárias (novas):**
- `ai_estimates` — estimativas de orçamento geradas pela IA
- `script_breakdowns` — decupagem de roteiro (cenas, locações, elenco, props)
- `dailies_reports` — relatórios de dailies gerados pela IA
- `supplier_reviews` — avaliações de fornecedores
- `whatsapp_group_summaries` — resumos de grupos

**Features:**
1. **Estimativa de Orçamento por IA** — Analisa jobs passados e sugere orçamento
2. **Health Score Inteligente** — IA sugere ações ("falta roteiro aprovado, entrega em 7 dias")
3. **Busca Inteligente** — Full-text search em português
4. **PWA** — Manifest, service worker, offline básico, notificações push
5. **Callsheet Automática** — Gera PDF com clima, trânsito, equipe, elenco
6. **Resumo de Grupos WhatsApp** — IA lê mensagens e gera resumo diário

**Critério de done:** Pedir orçamento pra um "filme institucional pro governo, 3 dias de gravação" e receber estimativa baseada em jobs passados.

---

### FASE 9 — Polimento + Multi-tenant real (4 semanas)
**Objetivo:** Preparar para outras produtoras usarem.

**Tarefas:**
1. **Onboarding flow** — Cadastro de nova produtora, configuração inicial
2. **Tenant settings** — Logo, cores, campos customizados, status customizados
3. **Roles e permissions granulares** — Admin, PE, Coordenador, Financeiro, etc.
4. **Billing** — Planos (free trial → paid), Stripe ou similar
5. **Testes de carga** — 500+ jobs, múltiplos tenants simultâneos
6. **Documentação** — Help center, onboarding guides

**Critério de done:** Uma produtora parceira se cadastra sozinha, configura seu tenant e começa a usar.

---

## 4. TABELAS QUE FALTAM (GAPS NO BANCO)

### Existem (14 tabelas):
tenants, profiles, clients, agencies, contacts, people, jobs, job_team, job_deliverables, job_history, job_budgets, job_files, job_code_sequences, job_shooting_dates

### Faltam criar (por fase):

**Fase 4 — Financeiro:**
- `financial_records` (type: income/expense/provision, category, valor, status, vencimento)
- `budget_items` (budget_id → job_budgets, category, description, estimated_value, actual_value)
- `invoices` (type: emitida/recebida, nf_number, valor, status, pdf_url)
- `payment_history` (financial_record_id, amount, paid_at, method)

**Fase 5 — Integrações:**
- `notifications` (tenant_id, user_id, type, channel, title, body, read_at, sent_at)
- `notification_preferences` (user_id, channel, types_enabled, frequency)
- `drive_folders` (tenant_id, job_id, folder_type, google_drive_id, url)
- `whatsapp_messages` (tenant_id, direction, phone, content, status, job_id)

**Fase 6 — Equipe + Aprovações:**
- `allocations` (tenant_id, person_id, job_id, role, start_date, end_date)
- `approval_requests` (tenant_id, job_id, type, requested_by, status, deadline)
- `approval_logs` (request_id, action, user_id, comment, timestamp)

**Fase 7 — Portal + Dashboard:**
- `client_portal_tokens` (tenant_id, job_id, contact_id, token, permissions, expires_at)
- `client_portal_messages` (token_id, direction, content, attachments)

**Fase 8 — IA:**
- `ai_estimates` (tenant_id, job_id, input_description, estimated_breakdown, confidence, similar_jobs)
- `script_breakdowns` (tenant_id, job_id, scenes, locations, cast, wardrobe, props, tech_requirements)
- `dailies_reports` (tenant_id, job_id, shooting_date, material_analysis, recommendations)
- `supplier_reviews` (tenant_id, supplier_id, job_id, rating, price, delivery_time, notes)
- `whatsapp_group_summaries` (tenant_id, group_id, date, summary, key_decisions, action_items)

**Total: ~17 tabelas novas** ao longo de todas as fases.

---

## 5. TELAS DO FRONTEND (VISÃO GERAL)

### Fase 3 — Jobs (6 telas)
| Tela | Rota | Descrição |
|------|------|-----------|
| Login | /login | Auth com Supabase (email/password + magic link) |
| Register | /register | Cadastro com criação de tenant |
| Jobs List | /jobs | Tabela master com filtros, busca, paginação |
| Job Create | /jobs/new | Formulário multi-step |
| Job Detail | /jobs/[id] | Tabs: overview, equipe, entregáveis, filmagem, financeiro, histórico |
| Pipeline | /jobs/pipeline | Kanban drag-and-drop por status |

### Fase 4 — Cadastros + Financeiro (6 telas)
| Tela | Rota | Descrição |
|------|------|-----------|
| Clients List | /clients | Lista com busca e filtros |
| Client Detail | /clients/[id] | Dados + histórico de jobs + contatos |
| People List | /people | Equipe interna + freelancers + elenco |
| Person Detail | /people/[id] | Dados pessoais + bancários + jobs + avaliação |
| Budget Editor | /jobs/[id]/budget | Editor de orçamento com itens e versões |
| Financial Overview | /financial | Dashboard financeiro geral |

### Fase 5 — Integrações (2 telas + configuração)
| Tela | Rota | Descrição |
|------|------|-----------|
| Notifications Center | /notifications | Lista de notificações com filtros |
| Integration Settings | /settings/integrations | Configurar Google Drive, WhatsApp, n8n |

### Fase 6 — Equipe + Aprovações (3 telas)
| Tela | Rota | Descrição |
|------|------|-----------|
| Allocation Calendar | /team/calendar | Calendário com alocações por pessoa |
| Approvals List | /approvals | Aprovações pendentes e histórico |
| Conflict Alert | (modal) | Alerta visual de conflito de agenda |

### Fase 7 — Dashboard + Portal (4 telas)
| Tela | Rota | Descrição |
|------|------|-----------|
| Dashboard Home | / | Métricas, alertas, pipeline mini, health scores |
| Reports | /reports | Relatórios com filtros e gráficos |
| Client Portal | /portal/[token] | Acesso externo do cliente (timeline, docs, aprovar) |
| Portal Settings | /settings/portal | Configurar portal do cliente |

### Fase 8 — IA + PWA (3 telas)
| Tela | Rota | Descrição |
|------|------|-----------|
| AI Budget Estimator | /jobs/[id]/estimate | Estimativa de orçamento com breakdown |
| Search | /search | Busca global full-text |
| Callsheet Generator | /jobs/[id]/callsheet | Gerar e enviar callsheet |

**Total: ~24 telas** ao longo de todas as fases.

---

## 6. EDGE FUNCTIONS QUE FALTAM

### Existem (6):
jobs, jobs-status, jobs-team, jobs-deliverables, jobs-shooting-dates, jobs-history

### Faltam (por fase):

**Fase 4:** clients, agencies, people, contacts, financial, budgets (6 novas)
**Fase 5:** notifications, drive-integration, documents, whatsapp (4 novas)
**Fase 6:** allocations, approvals (2 novas)
**Fase 7:** client-portal, reports (2 novas)
**Fase 8:** ai-estimate, search, callsheet (3 novas)

**Total: ~17 Edge Functions novas.**

---

## 7. INTEGRAÇÕES EXTERNAS

| Serviço | Fase | Uso |
|---------|------|-----|
| Google Drive API | 5 | Criar pastas, copiar templates, gerenciar permissões |
| Google Docs API | 5 | Preencher templates (carta orçamento, contratos) |
| Evolution API (WhatsApp) | 5 | Enviar notificações, receber mensagens |
| n8n (self-hosted) | 5 | Workflows de automação (lifecycle, notificações, docs) |
| DocuSeal | 5 | Assinatura digital de contratos |
| OpenWeather API | 8 | Clima para callsheets |
| Google Maps API | 8 | Trânsito e direções para callsheets |
| Claude API (Sonnet) | 8 | Estimativa de orçamento, health score inteligente, resumos |
| Claude API (Haiku) | 8 | Copilot de produção (WhatsApp), bot de freelancers |
| Stripe | 9 | Billing para SaaS multi-tenant |

---

## 8. ESTIMATIVA DE TEMPO

| Fase | Conteúdo | Estimativa | Acumulado |
|------|----------|------------|-----------|
| 1-2 | ✅ Banco + API Jobs | Concluído | 0 |
| 3 | Frontend Jobs + Kanban | 4-6 semanas | 6 sem |
| 4 | Cadastros + Financeiro | 3-4 semanas | 10 sem |
| 5 | Integrações Core | 4-6 semanas | 16 sem |
| 6 | Equipe + Aprovações | 3-4 semanas | 20 sem |
| 7 | Dashboard + Portal | 4-6 semanas | 26 sem |
| 8 | IA + PWA | 6-8 semanas | 34 sem |
| 9 | Multi-tenant real | 4 semanas | 38 sem |

**Total estimado: 8-10 meses** (com folga para qualidade).

Isso está alinhado com seu horizonte de 6+ meses. As fases 3-5 já entregam um produto usável (~4 meses), e as fases 6-9 são polimento e diferencial.

---

## 9. RECOMENDAÇÕES IMEDIATAS

### Para o Claude Code (próxima sessão):
1. **Colar este roadmap** em `docs/architecture/full-roadmap.md`
2. **Iniciar Fase 3** — Frontend do módulo Jobs
3. Ordem sugerida: Layout base → Auth flow → Jobs List → Job Detail → Job Create → Pipeline Kanban

### Para o Supabase:
1. **Ativar Leaked Password Protection** (advisory de segurança encontrado)
2. **Seed data de desenvolvimento** — Criar 1 tenant, 1 user, 5-10 jobs fictícios para testar o frontend

### Decisões pendentes (pra você responder):
1. **Deploy do frontend:** Vercel (mais fácil) ou VPS (mais controle)?
2. **Domínio:** app.ellahos.com? ellahos.ellahfilmes.com?
3. **Auth:** Email/password, magic link, ou Google OAuth?
4. **Quando trazer produtoras parceiras:** Fase 5 (integrações prontas) ou antes?

---

*Documento vivo — atualizar conforme fases são concluídas.*
