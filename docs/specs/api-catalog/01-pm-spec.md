# Catalogo de APIs — Spec PM

**Data:** 2026-03-05
**Origem:** Roadmap Fase 12 — Sistema Multi-Agente de IAs (LangGraph/CrewAI)
**Status:** Rascunho para revisao

---

## 1. Problema e Objetivo

### O Problema

O ELLAHOS possui **51 Edge Functions** com aproximadamente **140 endpoints** documentados apenas em codigo. Quando um agente de IA (LangGraph node, CrewAI tool, ou Claude com function calling) precisa chamar a API, ele nao tem fonte estruturada para saber:

- Quais endpoints existem e o que cada um faz
- Quais parametros sao obrigatorios vs opcionais, e seus tipos
- Quais roles tem permissao para cada operacao
- Qual o formato exato da resposta esperada
- Quais erros podem ocorrer e o que significam

Sem esse catalogo, o desenvolvimento de agentes exige que o dev leia todos os index.ts manualmente.

### O Objetivo

Criar um **Catalogo de APIs** em formato estruturado (Tool Definitions + OpenAPI 3.1) que:

1. Sirva de manual para os agentes de IA
2. Sirva de documentacao tecnica para devs que constroem novos agentes
3. Seja a fonte unica de verdade sobre a interface publica do ELLAHOS
4. Seja mantido junto ao codigo para evitar drift

### Contexto do Sistema Multi-Agente

A Fase 12 do ELLAHOS planeja **6 agentes especializados** orquestrados por um roteador central (Ellaih). O catalogo define quais ferramentas cada agente recebe.

---
## 2. User Stories

### US-CAT-001: Agente com ferramentas definidas
**Como** desenvolvedor construindo um agente LangGraph para o modulo financeiro,
**Quero** encontrar no repositorio um arquivo JSON com todas as ferramentas disponiveis para aquele dominio, no formato tools[] do Anthropic function calling,
**Para que** eu possa injetar diretamente na chamada ao Claude API sem reescrever schemas manualmente.

**Criterios de aceite:**
- Existe arquivo docs/api-catalog/tools/{dominio}.json para cada dominio
- Cada entrada tem: name, description, input_schema (JSON Schema), metadata.http_method, metadata.path, metadata.auth, metadata.roles
- Todos os campos obrigatorios estao marcados em required: []
- Os tipos dos campos refletem o schema real do banco (UUID, string, number, boolean, enum values)

### US-CAT-002: Dev consultando endpoint especifico
**Como** desenvolvedor que precisa integrar o endpoint de aprovacao de pagamentos,
**Quero** consultar o catalogo e ver em menos de 2 minutos: metodo HTTP, path, parametros, roles permitidas, exemplo de request e exemplo de response,
**Para que** eu nao precise abrir o codigo da Edge Function para entender a interface.

**Criterios de aceite:**
- O catalogo tem secao de referencia rapida por endpoint (tabela markdown)
- Cada endpoint tem: METHOD, PATH, descricao curta, auth type, roles, parametros, response shape
- Existe pelo menos 1 exemplo de request body e 1 exemplo de response por endpoint

### US-CAT-003: Agente de IA executando operacao financeira
**Como** agente IA Diretora Financeira (LangGraph node),
**Quero** ter acesso apenas as ferramentas do meu dominio (financeiro, pagamentos, NFs, relatorios),
**Para que** eu nao possa acidentalmente chamar endpoints de outros dominios e respeite o principio de menor privilegio.

**Criterios de aceite:**
- O catalogo define para cada agente qual subconjunto de ferramentas ele recebe
- Ferramentas fora do dominio do agente NAO aparecem no seu tools[]
- O catalogo documenta qual role de service user cada agente usa para autenticar

### US-CAT-004: Mantenedor atualizando o catalogo
**Como** desenvolvedor que acabou de adicionar um novo endpoint ao jobs EF,
**Quero** seguir um processo claro para adicionar a entrada no catalogo,
**Para que** o catalogo nao fique desatualizado quando o sistema cresce.

**Criterios de aceite:**
- Existe docs/api-catalog/README.md com instrucoes de como adicionar/atualizar entradas
- O formato e consistente o suficiente para ser gerado/validado por script
- O catalogo tem campo last_updated por endpoint para detectar drift

---

## 3. Inventario de Endpoints

Base URL: https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/

### Legenda de Auth
- **JWT** — Bearer token de usuario autenticado (getAuthContext())
- **JWT+Role** — JWT + verificacao de role especifica dentro do handler
- **Cron** — Header x-cron-secret (chamadas internas do n8n/scheduler)
- **HMAC** — Assinatura HMAC-SHA256 (webhooks DocuSeal)
- **Webhook** — Secret header (webhooks WhatsApp/Z-API)
- **Hook** — Supabase hook secret (auth SMS)
- **Public** — Sem autenticacao (portal cliente com token UUID por URL)
- **Service** — Service role key (uso interno entre EFs)

### 3.1 Financeiro — Dashboard e Relatorios

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /financial-dashboard/summary | KPIs financeiros do tenant (receita, custos, margem) | JWT+Role | admin, ceo, financeiro |
| GET | /financial-dashboard/cashflow | Dados de fluxo de caixa por periodo | JWT+Role | admin, ceo, financeiro |
| GET | /financial-dashboard/categories | Breakdown de custos por categoria | JWT+Role | admin, ceo, financeiro |
| GET | /financial-dashboard/top-jobs | Jobs com maior receita/custo no periodo | JWT+Role | admin, ceo, financeiro |
| GET | /dashboard/summary | Dashboard geral multi-modulo | JWT | todos |
| GET | /cost-items | Listar itens de custo de um job | JWT | admin, ceo, financeiro, produtor_executivo |
| POST | /cost-items | Criar item de custo | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| PATCH | /cost-items | Atualizar item de custo | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| DELETE | /cost-items | Remover item de custo | JWT+Role | admin, ceo, financeiro |
| GET | /payment-calendar/events | Eventos do calendario de pagamentos | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| GET | /payment-calendar/kpis | KPIs do calendario (total a pagar, vencido, etc.) | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| PATCH | /payment-calendar/postpone | Adiar pagamento | JWT+Role | admin, ceo, financeiro |
| GET | /bank-reconciliation/transactions | Listar transacoes bancarias | JWT+Role | admin, ceo, financeiro |
| POST | /bank-reconciliation/import | Importar extrato bancario (OFX/CSV) | JWT+Role | admin, ceo, financeiro |
| POST | /bank-reconciliation/match | Conciliar transacao com cost_item | JWT+Role | admin, ceo, financeiro |
| POST | /bank-reconciliation/unmatch | Desfazer conciliacao | JWT+Role | admin, ceo, financeiro |
| GET | /bank-reconciliation/summary | Resumo de conciliacao | JWT+Role | admin, ceo, financeiro |
| GET | /payment-manager/list | Listar pagamentos | JWT+Role | admin, ceo, financeiro |
| POST | /payment-manager/create | Criar pagamento | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| PATCH | /payment-manager/update | Atualizar pagamento | JWT+Role | admin, ceo, financeiro |
| POST | /payment-manager/bulk-action | Acoes em lote (aprovar, pagar, cancelar) | JWT+Role | admin, ceo, financeiro |
| GET | /payment-approvals/pending | Pagamentos pendentes de aprovacao | JWT+Role | admin, ceo, financeiro |
| POST | /payment-approvals/approve | Aprovar pagamento | JWT+Role | admin, ceo, financeiro |
| POST | /payment-approvals/reject | Rejeitar pagamento | JWT+Role | admin, ceo, financeiro |
| GET | /reports/financial | Relatorio financeiro consolidado | JWT+Role | admin, ceo, financeiro |
| GET | /reports/job | Relatorio financeiro de job especifico | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| GET | /reports/cashflow | Relatorio de fluxo de caixa | JWT+Role | admin, ceo, financeiro |

### 3.2 Notas Fiscais

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| POST | /nf-processor/ingest | Ingerir NF do Google Drive (chamada n8n) | Cron | — |
| GET | /nf-processor/list | Listar NFs do tenant | JWT | admin, ceo, financeiro |
| GET | /nf-processor/stats | Estatisticas de NFs | JWT | admin, ceo, financeiro |
| POST | /nf-processor/validate | Validar NF manualmente | JWT | admin, ceo, financeiro |
| POST | /nf-processor/reject | Rejeitar NF | JWT | admin, ceo, financeiro |
| POST | /nf-processor/reassign | Reassociar NF a outro job | JWT | admin, ceo, financeiro |
| POST | /nf-processor/request-send | Solicitar envio de NF ao cliente | JWT | admin, ceo, financeiro, produtor_executivo |
| POST | /nf-processor/request-sent-callback | Callback de envio confirmado (n8n) | Cron | — |
| POST | /nf-processor/upload | Upload manual de NF | JWT | admin, ceo, financeiro |
| POST | /nf-processor/link-cost-item | Vincular NF a item de custo | JWT | admin, ceo, financeiro |
| POST | /nf-processor/ocr-analyze | Analisar NF via OCR (IA) | JWT | admin, ceo, financeiro |
| GET | /nf-processor/cost-items-search | Buscar cost_items para vincular a NF | JWT | admin, ceo, financeiro |

### 3.3 Adiantamentos e Fornecedores

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /cash-advances/list | Listar adiantamentos | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| POST | /cash-advances/create | Criar adiantamento | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| PATCH | /cash-advances/update | Atualizar adiantamento | JWT+Role | admin, ceo, financeiro |
| POST | /cash-advances/approve | Aprovar adiantamento | JWT+Role | admin, ceo |
| POST | /cash-advances/settle | Dar baixa em adiantamento | JWT+Role | admin, ceo, financeiro |
| GET | /vendors/list | Listar fornecedores | JWT | admin, ceo, financeiro, produtor_executivo |
| POST | /vendors/create | Cadastrar fornecedor | JWT+Role | admin, ceo, financeiro |
| PATCH | /vendors/update | Atualizar fornecedor | JWT+Role | admin, ceo, financeiro |
| GET | /vendors/search | Buscar fornecedores | JWT | todos |
| GET | /budget-letter/list | Listar cartas-orcamento | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| POST | /budget-letter/create | Criar carta-orcamento | JWT+Role | admin, ceo, financeiro, produtor_executivo |
| GET | /budget-letter/pdf | Gerar PDF da carta-orcamento | JWT+Role | admin, ceo, financeiro, produtor_executivo |

### 3.4 Jobs (Projetos)

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /jobs/list | Listar jobs do tenant | JWT | todos |
| POST | /jobs/create | Criar novo job | JWT+Role | admin, ceo, produtor_executivo |
| GET | /jobs/get | Detalhes de um job | JWT | todos |
| PATCH | /jobs/update | Atualizar campos do job | JWT+Role | admin, ceo, produtor_executivo |
| DELETE | /jobs/delete | Arquivar job | JWT+Role | admin, ceo |
| GET | /jobs/search | Busca full-text de jobs | JWT | todos |
| POST | /jobs-status/update | Atualizar status do job | JWT+Role | admin, ceo, produtor_executivo |
| GET | /jobs-status/history | Historico de mudancas de status | JWT | todos |
| GET | /jobs-team/list | Listar equipe do job | JWT | todos |
| POST | /jobs-team/add | Adicionar membro a equipe | JWT+Role | admin, ceo, produtor_executivo |
| PATCH | /jobs-team/update | Atualizar membro da equipe | JWT+Role | admin, ceo, produtor_executivo |
| DELETE | /jobs-team/remove | Remover membro da equipe | JWT+Role | admin, ceo, produtor_executivo |
| GET | /jobs-deliverables/list | Listar entregaveis do job | JWT | todos |
| POST | /jobs-deliverables/create | Criar entregavel | JWT+Role | admin, ceo, produtor_executivo |
| PATCH | /jobs-deliverables/update | Atualizar entregavel | JWT+Role | admin, ceo, produtor_executivo |
| DELETE | /jobs-deliverables/delete | Remover entregavel | JWT+Role | admin, ceo |
| GET | /jobs-shooting-dates/list | Listar datas de filmagem | JWT | todos |
| POST | /jobs-shooting-dates/create | Criar data de filmagem | JWT+Role | admin, ceo, produtor_executivo, coordenador_producao |
| PATCH | /jobs-shooting-dates/update | Atualizar data de filmagem | JWT+Role | admin, ceo, produtor_executivo, coordenador_producao |
| DELETE | /jobs-shooting-dates/delete | Remover data de filmagem | JWT+Role | admin, ceo, produtor_executivo |
| GET | /jobs-history/list | Historico de auditoria do job | JWT+Role | admin, ceo |

### 3.5 Producao

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /job-timeline/get | Cronograma do job | JWT | todos |
| POST | /job-timeline/create | Criar fase no cronograma | JWT+Role | admin, ceo, produtor_executivo, coordenador_producao |
| PATCH | /job-timeline/update | Atualizar fase | JWT+Role | admin, ceo, produtor_executivo, coordenador_producao |
| DELETE | /job-timeline/delete | Remover fase | JWT+Role | admin, ceo, produtor_executivo |
| POST | /job-timeline/reorder | Reordenar fases | JWT+Role | admin, ceo, produtor_executivo |
| GET | /job-cast/list | Listar elenco do job | JWT | todos |
| POST | /job-cast/add | Adicionar membro ao elenco | JWT+Role | admin, ceo, produtor_executivo |
| PATCH | /job-cast/update | Atualizar membro do elenco | JWT+Role | admin, ceo, produtor_executivo |
| DELETE | /job-cast/remove | Remover do elenco | JWT+Role | admin, ceo, produtor_executivo |
| GET | /production-diary/list | Listar diarios de producao | JWT | todos |
| POST | /production-diary/create | Criar entrada no diario | JWT | admin, ceo, produtor_executivo, coordenador_producao |
| GET | /storyboard/list | Listar cenas do storyboard | JWT | todos |
| POST | /storyboard/create | Criar cena | JWT+Role | admin, ceo, produtor_executivo |
| PATCH | /storyboard/update | Atualizar cena | JWT+Role | admin, ceo, produtor_executivo |
| GET | /call-sheet/get | Obter call sheet do dia | JWT | todos |
| POST | /call-sheet/create | Criar call sheet | JWT+Role | admin, ceo, produtor_executivo, coordenador_producao |
| PATCH | /call-sheet/update | Atualizar call sheet | JWT+Role | admin, ceo, produtor_executivo, coordenador_producao |
| GET | /shooting-day-order/get | Ordem do dia de filmagem | JWT | todos |
| POST | /wrap-report/create | Criar wrap report | JWT+Role | admin, ceo, produtor_executivo |
| GET | /wrap-report/get | Obter wrap report | JWT | todos |
| POST | /claquete-generator/generate | Gerar imagem de claquete | JWT | todos |
| POST | /pdf-generator/generate | Gerar PDF generico | JWT | todos |
| GET | /allocations/list | Listar alocacoes de equipe | JWT+Role | admin, ceo, produtor_executivo |
| POST | /allocations/create | Criar alocacao | JWT+Role | admin, ceo, produtor_executivo |
| GET | /locations/list | Listar locacoes | JWT | todos |
| POST | /locations/create | Cadastrar locacao | JWT+Role | admin, ceo, produtor_executivo |
| GET | /wardrobe/list | Listar itens de figurino | JWT | todos |
| POST | /overtime/register | Registrar hora extra | JWT | admin, ceo, produtor_executivo, coordenador_producao |
| GET | /weather-alerts/get | Alertas de clima por locacao | JWT | todos |

### 3.6 CRM e Comercial

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /crm/pipeline | Lista de deals no pipeline | JWT+Role | admin, ceo, produtor_executivo |
| POST | /crm/deal/create | Criar deal | JWT+Role | admin, ceo, produtor_executivo |
| PATCH | /crm/deal/update | Atualizar deal | JWT+Role | admin, ceo, produtor_executivo |
| POST | /crm/deal/move | Mover deal entre estagios | JWT+Role | admin, ceo, produtor_executivo |
| DELETE | /crm/deal/delete | Arquivar deal | JWT+Role | admin, ceo |
| GET | /crm/contacts | Listar contatos do CRM | JWT+Role | admin, ceo, produtor_executivo |
| POST | /crm/contacts/create | Criar contato | JWT+Role | admin, ceo, produtor_executivo |
| GET | /crm/activities | Listar atividades CRM | JWT+Role | admin, ceo, produtor_executivo |
| POST | /crm/activities/create | Registrar atividade (ligacao, reuniao, email) | JWT+Role | admin, ceo, produtor_executivo |
| GET | /crm/stats | Estatisticas do pipeline | JWT+Role | admin, ceo |
| POST | /ai-budget-estimate/estimate | Estimar orcamento via IA | JWT+Role | admin, ceo, produtor_executivo |

### 3.7 Contratos e Aprovacoes

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /docuseal-integration/list | Listar contratos | JWT | admin, ceo, produtor_executivo |
| POST | /docuseal-integration/create | Criar submissao de contrato | JWT+Role | admin, ceo |
| GET | /docuseal-integration/status | Status de assinatura de contrato | JWT | admin, ceo, produtor_executivo |
| POST | /docuseal-integration/send | Enviar contrato para assinatura | JWT+Role | admin, ceo |
| POST | /docuseal-integration/webhook | Webhook DocuSeal (callback assinatura) | HMAC | — |
| GET | /approvals/list | Listar aprovacoes pendentes | JWT | admin, ceo, financeiro, produtor_executivo |
| POST | /approvals/approve | Aprovar item | JWT+Role | admin, ceo, financeiro |
| POST | /approvals/reject | Rejeitar item | JWT+Role | admin, ceo, financeiro |

### 3.8 Portais Externos

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| POST | /client-portal/session | Criar sessao do portal do cliente | Public | — |
| GET | /client-portal/job | Dados do job para o cliente | Public | — |
| POST | /client-portal/approval | Cliente aprova/rejeita item | Public | — |
| GET | /client-portal/files | Arquivos do job para o cliente | Public | — |
| GET | /vendor-portal/job | Dados do job para o fornecedor | Public | — |
| POST | /vendor-portal/submit | Fornecedor submete NF/doc | Public | — |

### 3.9 Comunicacao e IA

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| POST | /whatsapp/send | Enviar mensagem WhatsApp | JWT+Role | admin, ceo, produtor_executivo |
| POST | /whatsapp/webhook | Webhook Z-API (receber mensagens) | Webhook | — |
| POST | /notifications/send | Enviar notificacao interna | JWT | todos |
| GET | /notifications/list | Listar notificacoes do usuario | JWT | todos |
| PATCH | /notifications/mark-read | Marcar notificacao como lida | JWT | todos |
| POST | /ai-copilot/chat | Chat com copilot Ellaih | JWT | todos |
| POST | /ai-copilot/suggest | Sugestao contextual do copilot | JWT | todos |
| POST | /ai-freelancer-match/match | Match de freelancer para vaga | JWT+Role | admin, ceo, produtor_executivo |
| POST | /ai-dailies-analysis/analyze | Analise de diarios de producao via IA | JWT+Role | admin, ceo, produtor_executivo |
| POST | /emoji-suggest | Sugerir emojis para nome de fase | JWT | todos |

### 3.10 Google Drive

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| POST | /drive-integration/{jobId}/create-structure | Criar estrutura de pastas do job | JWT+Role | admin, ceo |
| POST | /drive-integration/{jobId}/recreate | Recriar pastas do job | JWT+Role | admin, ceo |
| POST | /drive-integration/{jobId}/sync-urls | Callback n8n com URLs das pastas criadas | Webhook | — |
| POST | /drive-integration/{jobId}/copy-templates | Copiar templates para o job | JWT+Role | admin, ceo, produtor_executivo |
| DELETE | /drive-integration/{jobId}/delete-structure | Excluir pastas do Drive | JWT+Role | admin, ceo |
| GET | /drive-integration/{jobId}/folders | Listar pastas do job | JWT | todos |
| POST | /drive-integration/{jobId}/sync-permissions | Re-sync completo de permissoes | JWT+Role | admin, ceo |
| POST | /drive-integration/{jobId}/grant-member-permissions | Conceder permissao de Drive a membro | JWT+Role | admin, ceo, produtor_executivo |
| POST | /drive-integration/{jobId}/revoke-member-permissions | Revogar permissao de Drive de membro | JWT+Role | admin, ceo, produtor_executivo |
| GET | /drive-integration/{jobId}/permissions | Listar permissoes do job no Drive | JWT | todos |

### 3.11 Configuracoes e Admin

| Metodo | Path | Descricao | Auth | Roles |
|--------|------|-----------|------|-------|
| GET | /tenant-settings/get | Configuracoes do tenant | JWT | admin, ceo |
| PATCH | /tenant-settings/update | Atualizar configuracoes | JWT+Role | admin, ceo |
| GET | /tenant-settings/integrations | Configuracoes de integracoes | JWT+Role | admin, ceo |
| POST | /tenant-settings/vault-secret | Salvar secret no Vault | JWT+Role | admin, ceo |
| GET | /tenant-management/tenants | Listar tenants (super admin) | JWT+Role | super_admin |
| POST | /tenant-management/create | Criar tenant | JWT+Role | super_admin |
| POST | /integration-processor/process | Processar evento de integracao | Cron | — |
| POST | /auth-sms-hook/hook | Hook de SMS de autenticacao | Hook | — |

---

## 4. Formato do Catalogo

### Decisao: Hibrido (Tool Definitions + OpenAPI 3.1)

Dois formatos complementares, com o OpenAPI derivado dos Tool Definitions:

**Formato primario: Tool Definitions (Anthropic function calling)**
- Arquivo: docs/api-catalog/tools/{dominio}.json
- Usado diretamente pelos agentes de IA via function calling
- Estrutura padrao Anthropic: name, description, input_schema
- Campo adicional metadata (nao enviado ao modelo, usado por tooling interno)

**Formato secundario: OpenAPI 3.1 YAML**
- Arquivo: docs/api-catalog/openapi.yaml
- Auto-gerado a partir dos tool definitions via script
- Util para Swagger UI, geracao de tipos TypeScript, validacao de requests

### Estrutura de um Tool Definition

Cada entrada no catalogo tem a forma:

  name: financial_dashboard_get_summary
  description: Retorna KPIs financeiros consolidados do tenant para um periodo especifico. Use quando o usuario perguntar sobre saude financeira geral ou performance do periodo.
  input_schema.type: object
  input_schema.properties: period_start (date), period_end (date), compare_previous (boolean, default true)
  input_schema.required: []
  metadata.http_method: GET
  metadata.path: /financial-dashboard/summary
  metadata.auth_type: JWT
  metadata.roles: [admin, ceo, financeiro]
  metadata.edge_function: financial-dashboard
  metadata.handler: handlers/summary.ts
  metadata.last_updated: 2026-03-05
  metadata.tier: 1

### Convencoes de nomenclatura de ferramentas

Padrao: {dominio}_{recurso}_{acao}

Exemplos:
- financial_dashboard_get_summary
- payment_calendar_list_events
- jobs_create
- nf_processor_validate
- crm_deal_move_stage

---

## 5. Escopo e Tiers

### Tier 1 — Essenciais para Agentes (implementar primeiro)

Endpoints necessarios para que os 6 agentes completem seus casos de uso principais. Aproximadamente 90 endpoints.

**Criterio:** endpoint necessario para pelo menos 1 agente completar sua tarefa principal sem depender de endpoint de outro tier.

Dominios Tier 1:
- Financeiro completo (financial-dashboard, cost-items, payment-calendar, payment-manager, payment-approvals, reports)
- NFs — leitura e operacoes manuais (nf-processor, exceto rotas Cron)
- Jobs — leitura e status (jobs/list, jobs/get, jobs/search, jobs-status)
- Producao — cronograma e datas (job-timeline, jobs-shooting-dates)
- CRM — pipeline e deals (crm/pipeline, crm/deal/*)
- Contratos — listagem e status (docuseal-integration/list, docuseal-integration/status)
- Aprovacoes (approvals/list)
- Fornecedores (vendors/list, vendors/search)

### Tier 2 — Disponiveis para Agentes (implementar apos Tier 1)

Endpoints uteis para cenarios secundarios ou de suporte. Aproximadamente 40 endpoints.

Dominios Tier 2:
- Jobs — escrita (jobs/create, jobs/update, jobs-team/*)
- Producao — call sheet, wrap report, storyboard, elenco
- Adiantamentos (cash-advances)
- Comunicacao — WhatsApp e notificacoes (com restricoes de template)
- Drive — listagem de pastas e permissoes
- IA auxiliar (ai-budget-estimate, ai-freelancer-match)

### Tier 3 — Infraestrutura (NAO expor a agentes)

Endpoints de plombing interno que agentes de IA nunca devem chamar diretamente.

- auth-sms-hook — hook de autenticacao Supabase
- integration-processor — processamento interno de eventos
- drive-integration/{jobId}/sync-urls — callback do n8n
- nf-processor/ingest e nf-processor/request-sent-callback — chamadas Cron
- google-reader — uso interno entre Edge Functions
- tenant-management — provisionamento de tenants

### Tier 4 — Webhooks Externos (documentar, nao expor)

Endpoints que recebem callbacks de sistemas externos. Agentes NAO chamam esses endpoints.

- docuseal-integration/webhook
- whatsapp/webhook
- drive-integration/{jobId}/sync-urls

---

## 6. Mapeamento de Agentes

### Agente 1: IA Diretora Financeira

**Perfil:** Supervisora do departamento financeiro. Acessa dados consolidados, aprova excecoes, gera relatorios executivos. Nao executa operacoes manuais — analisa e decide.

**Ferramentas Tier 1:**
- financial_dashboard_get_summary
- financial_dashboard_get_cashflow
- financial_dashboard_get_categories
- financial_dashboard_get_top_jobs
- payment_approvals_list_pending
- payment_approvals_approve
- payment_approvals_reject
- reports_get_financial
- reports_get_cashflow
- payment_manager_list
- payment_manager_bulk_action

**Role sugerida:** ia_financeiro

---

### Agente 2: IA Analista Financeira

**Perfil:** Operacional do financeiro. Faz lancamentos, conciliacao bancaria, gestao de NFs, controle de custos por job.

**Ferramentas Tier 1:**
- cost_items_list
- cost_items_create
- cost_items_update
- payment_calendar_list_events
- payment_calendar_get_kpis
- payment_calendar_postpone
- payment_manager_create
- payment_manager_update
- bank_reconciliation_list_transactions
- bank_reconciliation_match
- bank_reconciliation_get_summary
- nf_processor_list
- nf_processor_validate
- nf_processor_reject
- nf_processor_link_cost_item
- nf_processor_ocr_analyze
- nf_processor_cost_items_search
- vendors_list
- vendors_search
- reports_get_job

**Role sugerida:** ia_financeiro

---

### Agente 3: IA Estagiaria Financeira

**Perfil:** Consultas e leituras. Responde duvidas operacionais, explica lancamentos existentes, gera resumos — sem poder criar ou alterar dados.

**Ferramentas (somente leitura):**
- financial_dashboard_get_summary
- cost_items_list
- payment_calendar_list_events
- payment_calendar_get_kpis
- payment_manager_list
- nf_processor_list
- nf_processor_stats
- vendors_list
- vendors_search
- reports_get_job

**Role sugerida:** ia_financeiro com instrucoes no system prompt para NAO usar ferramentas de escrita.

Nota: a restricao e imposta pelo system prompt e pela lista de ferramentas injetadas, nao por role separada. Ver PA-04 para discussao.

---

### Agente 4: IA Atendimento

**Perfil:** Interface com clientes. Responde sobre status de projetos, compartilha entregaveis, escala aprovacoes, acompanha cronograma.

**Ferramentas Tier 1:**
- jobs_list
- jobs_get
- jobs_search
- jobs_status_get_history
- jobs_deliverables_list
- job_timeline_get
- approvals_list_pending
- docuseal_integration_list
- docuseal_integration_get_status
- drive_integration_list_folders

**Ferramentas Tier 2:**
- whatsapp_send (com restricao de template pre-aprovado no system prompt)
- notifications_send

**Role sugerida:** ia_atendimento

---

### Agente 5: IA Juridica

**Perfil:** Contratos e compliance. Verifica status de contratos, solicita assinatura, alerta sobre prazos, responde duvidas sobre clausulas.

**Ferramentas Tier 1:**
- docuseal_integration_list
- docuseal_integration_get_status
- approvals_list_pending
- approvals_approve
- approvals_reject
- jobs_get (para contexto do contrato)
- jobs_team_list (para identificar signatarios)

**Ferramentas Tier 2:**
- docuseal_integration_send
- notifications_send

**Role sugerida:** ia_juridico

---

### Agente 6: IA Producao

**Perfil:** Acompanhamento operacional de producao. Cronograma, equipe, locacoes, alertas de clima, diario de producao.

**Ferramentas Tier 1:**
- jobs_list
- jobs_get
- job_timeline_get
- jobs_shooting_dates_list
- jobs_team_list
- allocations_list
- production_diary_list
- weather_alerts_get
- locations_list

**Ferramentas Tier 2:**
- call_sheet_get
- call_sheet_create
- job_timeline_create
- job_timeline_update
- storyboard_list
- ai_dailies_analysis_analyze
- overtime_register

**Role sugerida:** ia_producao

---

## 7. Modelo de Autenticacao para Agentes

### Opcoes Analisadas

**Opcao A (Recomendada): Service Users por Departamento**

Criar usuarios Supabase dedicados para cada departamento de agentes, com roles customizadas no app_metadata:

  ia_financeiro@ellahos-agent.internal  -> role: ia_financeiro,  tenant_id: {tenant_uuid}
  ia_atendimento@ellahos-agent.internal -> role: ia_atendimento, tenant_id: {tenant_uuid}
  ia_juridico@ellahos-agent.internal    -> role: ia_juridico,    tenant_id: {tenant_uuid}
  ia_producao@ellahos-agent.internal    -> role: ia_producao,    tenant_id: {tenant_uuid}

- Cada agente faz supabase.auth.signInWithPassword() e usa o JWT resultante
- Os JWTs tem expiry normal (1h) — refresh automatico pelo SDK Supabase Python
- As policies RLS incluem as roles ia_* onde apropriado
- Vantagem: JWT valido, RLS funciona naturalmente, rastreavel por userId nos logs
- Desvantagem: precisa provisionar 1 usuario por tenant por departamento (4 usuarios por tenant)

**Opcao B: Service Role Key compartilhada**

Usar a service role key do Supabase — bypassa RLS completamente.

Nao recomendada: sem isolamento por tenant, sem rastreabilidade granular, violacao de principio de menor privilegio.

**Opcao C: Tokens de API customizados**

Criar tabela api_keys com tokens de longa duracao para agentes.

Nao recomendada para fase atual: mais trabalho de infraestrutura sem vantagem clara sobre Opcao A.

### Recomendacao: Opcao A

Provisionar service users com roles ia_* no app_metadata. O tenant_id e injetado normalmente — o agente opera apenas dentro do tenant autorizado.

**Registro de atividade:** todos os logs de agentes devem incluir o user_id (UUID do service user) para auditoria. A tabela ai_agent_logs (da Fase 12) deve gravar o agent_user_id de cada invocacao de ferramenta.

---

## 8. Criterios de Aceite

- [ ] CAT-AC-01: Arquivo docs/api-catalog/tools/financeiro.json existe e e JSON Schema valido
- [ ] CAT-AC-02: Arquivo docs/api-catalog/tools/producao.json existe e e JSON Schema valido
- [ ] CAT-AC-03: Arquivo docs/api-catalog/tools/atendimento.json existe e e JSON Schema valido
- [ ] CAT-AC-04: Arquivo docs/api-catalog/tools/juridico.json existe e e JSON Schema valido
- [ ] CAT-AC-05: Arquivo docs/api-catalog/tools/crm.json existe e e JSON Schema valido
- [ ] CAT-AC-06: Todos os endpoints Tier 1 estao catalogados (100% de cobertura)
- [ ] CAT-AC-07: Cada tool definition tem name, description, input_schema e metadata preenchidos
- [ ] CAT-AC-08: Campos obrigatorios de cada endpoint estao corretos em required: []
- [ ] CAT-AC-09: Existe docs/api-catalog/README.md com instrucoes de manutencao do catalogo
- [ ] CAT-AC-10: Script de validacao (tools/validate-catalog.ts) verifica estrutura JSON Schema sem erros
- [ ] CAT-AC-11: Arquivo docs/api-catalog/openapi.yaml gerado automaticamente e valido OpenAPI 3.1
- [ ] CAT-AC-12: Cada agente tem arquivo de configuracao listando exatamente suas ferramentas (docs/api-catalog/agents/{agente}.json)
- [ ] CAT-AC-13: O description de cada tool menciona em que situacoes usar — nao apenas o que faz
- [ ] CAT-AC-14: Existe pelo menos 1 exemplo de request e 1 exemplo de response por endpoint Tier 1

---

## 9. Fora de Escopo

- Implementacao dos agentes LangGraph (escopo da Fase 12)
- Mudancas no schema das Edge Functions (o catalogo documenta, nao altera)
- Interface grafica de navegacao do catalogo (Swagger UI e opcional, gerado automaticamente)
- Testes automatizados de contrato (contract testing) — fase futura
- Versionamento semantico de endpoints individuais
- Catalogo de endpoints de outros sistemas (n8n webhooks, DocuSeal API, Z-API) — fora do ELLAHOS
- Provisionamento automatico dos service users ia_* nos tenants — operacional, nao documentacao

---

## 10. Dependencias

| Dependencia | Tipo | Status | Impacto se bloqueada |
|-------------|------|--------|----------------------|
| Todos os EFs Tier 1 existem e sao estaveis | Tecnica | CONCLUIDO | Catalogo reflete API real |
| Definicao final dos 6 agentes e seus casos de uso | PM | CONCLUIDO (nesta spec) | Mapeamento agente -> ferramentas |
| Decisao sobre roles ia_* e processo de provisioning | Arquitetura | ABERTO (PA-01) | Auth model dos agentes |
| Schema da tabela ai_agent_logs (Fase 12) | Tecnica | ABERTO | Campos de auditoria no metadata |
| Script de validacao de JSON Schema | Tecnica | A implementar | Criterio CAT-AC-10 |
| Script de geracao OpenAPI a partir de tool definitions | Tecnica | A implementar | Criterio CAT-AC-11 |

---

## 11. Perguntas Abertas

**PA-01 — Provisioning de service users**
Como os service users ia_* sao criados em novos tenants? Manual pelo admin via dashboard Supabase, trigger automatico no onboarding do tenant, ou via API de tenant management?

**PA-02 — Refresh de tokens dos agentes**
Os agentes LangGraph rodam como processos de longa duracao (daemon ou serverless com warm start). Como o refresh do JWT e feito — SDK Supabase Python com refresh automatico, ou os agentes usam tokens de mais longa duracao?

**PA-03 — Cobertura de RLS para roles ia_***
As roles ia_financeiro, ia_atendimento, ia_juridico e ia_producao precisam ser adicionadas nas policies RLS de cada tabela relevante. Qual o processo para garantir que todas as tabelas foram atualizadas?

**PA-04 — Estagiaria sem escrita via system prompt vs via roles**
A restricao da Estagiaria Financeira (apenas leitura) esta no system prompt e na lista de ferramentas injetadas, nao em roles de API. Isso e intencional (mais flexivel) ou deveriamos criar role ia_financeiro_readonly com policies RLS mais restritivas como camada extra de seguranca?

**PA-05 — Rate limiting para agentes**
Os agentes podem fazer muitas chamadas em paralelo. Supabase nao tem rate limiting por role nativamente — isso seria implementado no n8n, no LangGraph, ou via Cloudflare Workers na frente das EFs?

**PA-06 — Manutencao do catalogo como processo**
Quando um dev adiciona um novo endpoint, como ele sabe que precisa atualizar o catalogo? Pull request template com checklist? Linter que detecta novos handlers sem entrada no catalogo? Ou documentacao confia em disciplina do time?

---

## Historico de Revisoes

| Data | Autor | Descricao |
|------|-------|-----------|
| 2026-03-05 | PM (Claude) | Versao inicial — mapeamento dos 51 EFs, inventario de ~140 endpoints, 6 agentes definidos, formato hibrido Tool Definitions + OpenAPI 3.1 |
