# Fase 5: Integracoes Core — Spec Completa (v2)

**Data:** 19/02/2026
**Status:** REFINADA (pos-analise do ecossistema real)
**Validada por:** PM, Tech Lead, Integrations Engineer
**Documento base:** docs/specs/analise-ecossistema-ellah (1).md

---

## Objetivo

Automatizar o que hoje e feito manualmente ou via Apps Scripts — criar pastas no Drive ao aprovar job, notificar equipe via WhatsApp e in-app, alertas automaticos de prazo/pagamento/diaria.

## Criterio de Done

Aprovar um job no ELLAHOS → 26 pastas Drive criadas automaticamente no Shared Drive → equipe notificada via WhatsApp (Evolution API) e in-app (Realtime) → links aparecem no job → alertas de prazo/pagamento funcionando → falhas logadas e visiveis no Settings.

---

## Contexto da Ellah Filmes

### Ecossistema Google atual (mapeado em detalhe)
- **Google Drive:** Shared Drive corporativo. 26 pastas por job (10 nivel-1 + 16 nivel-2)
- **Google Workspace:** Pago — domain-wide delegation disponivel para Service Account
- **Google Sheets:** Planilhas de controle (GG_ prefixo), banco de dados de ~286 freelancers
- **Google Docs:** Templates de documentos (carta orcamento, contratos, PPM)
- **Google Forms:** Cadastro de equipe por projeto (com bugs conhecidos)
- **Apps Scripts:** 7 scripts mapeados (claquete, contratos, NF, OCR, Calendar, email, equipe)

### Infraestrutura ja rodando
- **Supabase:** Free plan, 19 tabelas, 6 Edge Functions, sa-east-1
- **n8n:** Self-hosted na VPS Hetzner (ia.ellahfilmes.com), 3 workflows ativos (126 nodes total)
- **Evolution API:** Self-hosted na VPS Hetzner — **volume Docker NAO persistido (bloqueante)**
- **Z-API:** SaaS pago, usado nos workflows n8n existentes (criacao de grupos WhatsApp)
- **DocuSeal:** Self-hosted em assinaturas.ellahfilmes.com, template id:3 (contrato elenco)
- **Google Cloud:** Service Account configurada, acesso ao Shared Drive (permissoes manuais)

### Workflows n8n existentes (NAO alterar na Fase 5)
| Workflow | Nodes | Funcao | API WhatsApp |
|----------|-------|--------|-------------|
| JOB_FECHADO_CRIACAO | 20 | Cria 4 grupos WhatsApp por job | Z-API |
| WORKFLOW_PRINCIPAL | 95 | Assistente IA via WhatsApp (4 agents, Postgres proprio) | Z-API |
| TESTE2_JURIDICO | 11 | Contratos DocuSeal (em teste) | — |

---

## Decisoes Arquiteturais (ADR-003 a ADR-008)

### ADR-003: Dispatch no Application Layer (NAO pg_net em triggers)
- pg_net dentro de triggers tem zero observabilidade, sem retry
- Dispatch acontece na Edge Function (ex: approve.ts)
- Edge Function insere em `integration_events` (fila)
- pg_cron processa a fila a cada minuto com retry e backoff
- Operacao principal (aprovar job) NUNCA e bloqueada por integracao

### ADR-004: Vault para Secrets, tenant.settings para Config
| Dado | Storage | Motivo |
|------|---------|--------|
| Google Service Account JSON | Vault | Chave privada RSA |
| Evolution API token | Vault | Secret |
| DocuSeal token | Vault | Secret (prep Fase 6) |
| n8n webhook URLs | tenant.settings | Config, nao secret |
| Drive root folder ID | tenant.settings | Config |
| drive_type + shared_drive_id | tenant.settings | Config Shared Drive |
| nf_pending_folder_id | tenant.settings | Config (prep Fase 6) |
| folder_template (26 pastas) | tenant.settings | Config por tenant |
| drive.templates (IDs) | tenant.settings | Config (prep Fase 6) |
| enabled/disabled flags | tenant.settings | Config |

### ADR-005: Supabase Realtime para Notificacoes
- Tabela `notifications` no supabase_realtime publication
- Frontend subscribe filtrado por user_id
- Badge atualiza sem refresh da pagina

### ADR-006: n8n como Orquestrador
- Edge Functions = API layer (CRUD, validacao, dispatch)
- n8n = workflows complexos (Drive + WhatsApp + email em sequencia)
- Cada integracao e opcional por tenant
- Se servico externo falha, operacao principal sempre completa
- **4 workflows NOVOS** na Fase 5, **0 workflows existentes alterados**
- `wf-job-approved` pode chamar `JOB_FECHADO_CRIACAO` (existente) como sub-workflow
- Postgres separado do WORKFLOW_PRINCIPAL e mantido — consolidacao na Fase 8

### ADR-008: Z-API vs Evolution API (NOVO)
- **Evolution API** para fluxos novos do ELLAHOS (gratuita, self-hosted, controle total)
- **Z-API** mantida nos workflows n8n existentes (producao, nao mexer)
- Interface abstrata `IWhatsAppProvider` com duas implementacoes
- Feature flag em `tenant.settings.whatsapp_provider` decide qual usar
- Migracao gradual de Z-API → Evolution API na Fase 6+

---

## Pre-requisitos Bloqueantes (resolver ANTES de comecar)

| # | Item | Responsavel | Status |
|---|------|-------------|--------|
| 1 | Persistir volume Docker da Evolution API (`evolution_data`) | DevOps/Danillo | ⚠️ PENDENTE |
| 2 | Confirmar Service Account como "Content manager" no Shared Drive | Danillo | ✅ Confirmado (permissoes manuais) |
| 3 | Habilitar pg_cron no Supabase (se nao estiver) | DB Architect | A verificar |
| 4 | Habilitar pg_net no Supabase (se nao estiver) | DB Architect | A verificar |

---

## 6 Sub-fases

### 5.1 — Infrastructure Foundation

**Banco de dados (migration):**

5 novas tabelas:
- `notifications` (id, tenant_id, user_id, type, priority, title, body, metadata JSONB, action_url TEXT, job_id, read_at, created_at)
- `notification_preferences` (id, tenant_id, user_id, preferences JSONB DEFAULT '{"in_app":true,"whatsapp":false}', muted_types TEXT[] DEFAULT '{}', UNIQUE(tenant_id, user_id))
- `drive_folders` (id, tenant_id, job_id, folder_key TEXT, google_drive_id, url, parent_folder_id, created_by UUID, UNIQUE(tenant_id, job_id, folder_key))
- `whatsapp_messages` (id, tenant_id, job_id, phone, recipient_name TEXT, message, status, provider, external_message_id TEXT, sent_at)
- `integration_events` (id, tenant_id, event_type, payload JSONB, status, attempts, locked_at TIMESTAMPTZ, started_at TIMESTAMPTZ, processed_at TIMESTAMPTZ, error_message TEXT, next_retry_at, result JSONB, idempotency_key TEXT UNIQUE)

Alteracoes em tabelas existentes:
- `jobs`: ADD `audio_company TEXT`, ADD `risk_buffer NUMERIC(12,2)`, ADD `drive_folder_url TEXT`
- `jobs`: UPDATE trigger `calculate_job_financials()` — nova formula:
  `gross_profit = closed_value - production_cost - tax_value - other_costs - risk_buffer`
  (formula atual nao inclui other_costs nem risk_buffer)
- `job_files`: ADD `external_id TEXT`, ADD `external_source TEXT`
- `people`: ADD CHECK constraint em `bank_info` (validacao basica JSONB)

ENUMs / tipos:
- `notification_type`: job_approved, status_changed, team_added, deadline_approaching, margin_alert, deliverable_overdue, shooting_date_approaching, integration_failed
- `notification_priority`: low, normal, high, urgent
- `notification_channel`: in_app, whatsapp, email
- `integration_event_type`: drive_create_structure, whatsapp_send, n8n_webhook, nf_request_sent, nf_received, nf_validated, docuseal_submission_created, docuseal_submission_signed, docuseal_submission_failed

Infraestrutura:
- Habilitar pg_net + pg_cron (limite Free plan: 2 cron jobs)
- pg_cron job 1: a cada minuto, chama `integration-processor` via pg_net HTTP POST
  - Processor usa lock atomico: `UPDATE ... SET locked_at = now() WHERE status = 'pending' AND (locked_at IS NULL OR locked_at < now() - interval '5 min') ... FOR UPDATE SKIP LOCKED`
  - Batch de 20 eventos, FIFO, delay 3s entre msgs WhatsApp
  - Se fila pendente > 50 registros, cria notificacao `integration_failed` para admin
- pg_cron job 2: alertas diarios (08h) — SQL puro, sem Edge Function:
  - Verifica `financial_records.due_date`, `job_shooting_dates.date`, `job_deliverables.delivery_date`
  - Cria `notifications` + `integration_events` (WhatsApp)
  - **Deduplicacao:** `WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE type = X AND job_id = Y AND created_at::date = CURRENT_DATE)`
  - Entregavel atrasado: alerta unico no dia + reenvio a cada 2 dias enquanto `status != 'completed'`
- Realtime: `notifications` no supabase_realtime publication
- RLS em todas as novas tabelas com `get_tenant_id()`
- Index em `integration_events(status, created_at)`, `integration_events(idempotency_key)`, `notifications(user_id, read_at)`
- Index UNIQUE em `drive_folders(tenant_id, job_id, folder_key)`
- Cleanup policy: DELETE integration_events WHERE status = 'completed' AND created_at < now() - interval '90 days'

**Shared modules (3 novos):**
- `_shared/vault.ts` — ler/escrever secrets do Supabase Vault
- `_shared/integration-client.ts` — enfileirar eventos, logar integracoes
- `_shared/notification-helper.ts` — criar notificacoes, notificar equipe do job, alertas de prazo

---

### 5.2 — Notificacoes In-App + Alertas Automaticos

**Edge Function `notifications`:**
- GET /notifications — lista paginada (filtros: type, unread_only, job_id)
- GET /notifications/unread-count
- PATCH /notifications/:id/read
- POST /notifications/mark-all-read
- GET /notifications/preferences
- PATCH /notifications/preferences

**Modificar `jobs-status`:**
- Apos mudar status → `notifyJobTeam()` cria notificacao para cada membro
- Apos aprovar → `notifyJobTeam()` + enfileirar eventos de integracao (Drive + WhatsApp + n8n)

**Alertas automaticos (pg_cron diario 08h):**
| Alerta | Gatilho | Destinatarios | Dias antes |
|--------|---------|---------------|------------|
| Pagamento se aproximando | `financial_records.due_date` | PE + Financeiro | 7, 3, 1 |
| Diaria de filmagem | `job_shooting_dates.date` | Equipe do job | 3 |
| Entregavel atrasado | `job_deliverables.delivery_date` passou | PE + Coordenador | 0 (no dia) |
| Margem critica | `jobs.margin_percentage < 15%` | PE + Financeiro | Imediato (trigger) |

**Frontend:**
- Icone de sino (bell) no Topbar com badge de nao-lidas (numero)
- Dropdown com ultimas 10 notificacoes, agrupadas por hoje/ontem/esta semana
- Pagina /notifications com filtros (tipo, lido/nao-lido) e paginacao
- Supabase Realtime: badge atualiza sem refresh
- Clicar notificacao → navega para o job correspondente
- Notificacao de alerta de prazo mostra: "Pagamento de R$ X vence em 3 dias (Job ELH-042)"

---

### 5.3 — Settings + Vault

**Edge Function `tenant-settings`:**
- GET /tenant-settings/integrations — config completa (sem secrets raw)
- PATCH /tenant-settings/integrations/:integration — atualiza config + secrets no Vault
- POST /tenant-settings/integrations/:integration/test — testa conexao
- GET /tenant-settings/integration-logs — logs paginados (ultimos 100)
- Seguranca: apenas admin/ceo

**Integracoes configuráveis:**

Google Drive:
- Upload service account JSON → Vault
- `drive_type`: my_drive | shared_drive
- `shared_drive_id` (obrigatorio se shared_drive)
- `root_folder_id` — pasta raiz onde criar pastas de jobs
- `folder_template` — array de objetos com `name`, `key`, `children[]` (default: 26 pastas reais)
- `templates` — IDs opcionais de templates a copiar (GG_, cronograma, etc.) — prep Fase 6
- `nf_pending_folder_id` — pasta temp para NFs pendentes — prep Fase 6
- Botao "Testar Conexao" → tenta listar pastas no root_folder_id

WhatsApp (Evolution API):
- URL da instancia + API key → Vault
- `whatsapp_provider`: evolution | zapi (feature flag)
- Status da instancia visivel (conectado/desconectado)
- Botao "Testar Conexao" → GET /instance/connectionState

DocuSeal (prep Fase 6 — toggle desabilitado):
- URL + X-Auth-Token → Vault
- Status: "Disponivel na Fase 6"

n8n:
- Webhook URLs para cada workflow (wf-job-approved, wf-margin-alert, wf-status-change)
- Botao "Testar Conexao" → POST test payload

**Frontend /settings/integrations:**
- Card por integracao com status badge (conectado/desconectado/nao configurado)
- Formularios por integracao
- Secrets mascarados (nunca expostos raw)
- Habilitar "Configuracoes" na sidebar (icone engrenagem)

---

### 5.4 — Google Drive Integration

**_shared/google-drive-client.ts:**
- JWT RS256 via WebCrypto nativo do Deno
- Service Account JSON → JWT assinado → access_token (1h)
- `private_key.replace(/\\n/g, '\n')` antes de importar
- **Shared Drive:** `supportsAllDrives: true`, `includeItemsFromAllDrives: true` em toda chamada
- List: `driveId` + `corpora: 'drive'`
- Apos criar pasta: `permissions.create` para dar acesso a equipe do job (emails dos membros)

**Edge Function `drive-integration`:**
- POST /drive-integration/:jobId/create-structure — cria arvore de 26 pastas
- POST /drive-integration/:jobId/sync-urls — callback do n8n (autenticado via X-Webhook-Secret HMAC-SHA256)
- GET /drive-integration/:jobId/folders — lista pastas do job
- POST /drive-integration/:jobId/recreate — recriar pastas (se algo deu errado, sem re-aprovar)

**Edge Function `integration-processor`:**
- Processa fila de `integration_events` (invocada via pg_cron a cada minuto)
- Roteia para handler correto (Drive, WhatsApp, n8n)
- Retry com exponential backoff (1min, 5min, 30min, 2h)
- Max 5 tentativas, depois marca como `failed` + cria notificacao para admin
- Batch de 20 eventos por execucao, FIFO

**Fluxo completo (responsabilidades separadas — Drive direto, WhatsApp via n8n):**
```
Aprovar job (Edge Function jobs-status)
  → INSERT integration_events (drive_create_structure, idempotency_key: drive:{jobId})
  → INSERT integration_events (n8n_webhook: wf-job-approved, idempotency_key: wf-approved:{jobId})
  → INSERT notifications (job_approved) para equipe
  → RETURN 200 imediatamente

pg_cron (1 min depois):
  → integration-processor pega eventos com lock atomico
  → Handler Drive (DIRETO, sem n8n):
    → Cria 26 pastas no Shared Drive (supportsAllDrives: true)
    → Verifica existencia antes de criar (evita duplicatas no Drive)
    → Salva em drive_folders (1 registro por pasta, folder_key TEXT)
    → Atualiza jobs.drive_folder_url
    → permissions.create na PASTA RAIZ apenas (Shared Drive herda permissoes)
    → Role: fileOrganizer para PE, writer para demais membros
    → Se job_team vazio: cria pastas sem permissoes (adicionadas quando membros forem cadastrados)
  → Handler n8n (via webhook):
    → POST wf-job-approved: n8n orquestra WhatsApp (Evolution API) + [JOB_FECHADO_CRIACAO Z-API para grupos]
    → n8n faz callback: POST /drive-integration/:jobId/sync-urls (confirma sucesso)
```

**Decisao arquitetural:** Drive e criado DIRETAMENTE pelo integration-processor (menor dependencia, melhor observabilidade). n8n e responsavel apenas por WhatsApp e orquestracao de workflows existentes. Nao ha duplicacao de criacao de pastas.

**Estrutura de pastas default (26 pastas, configuravel por tenant):**
```
{JOB_CODE}_{TITULO}_{CLIENTE}/                     key: root
├── 01_DOCUMENTOS/                                  key: documentos
├── 02_FINANCEIRO/                                  key: financeiro
│   ├── 01_CARTAORCAMENTO/                          key: fin_carta_orcamento
│   ├── 02_DECUPADO/                                key: fin_decupado
│   ├── 03_GASTOS GERAIS/                           key: fin_gastos_gerais
│   ├── 04_NOTAFISCAL_RECEBIMENTO/                  key: fin_nf_recebimento
│   ├── 05_COMPROVANTES_PG/                         key: fin_comprovantes_pg
│   ├── 06_NOTINHAS_EM_PRODUCAO/                    key: fin_notinhas_producao
│   ├── 07_NOTAFISCAL_FINAL_PRODUCAO/               key: fin_nf_final
│   └── 08_FECHAMENTO_LUCRO_PREJUIZO/               key: fin_fechamento
├── 03_MONSTRO_PESQUISA_ARTES/                      key: monstro_pesquisa
├── 04_CRONOGRAMA/                                  key: cronograma
├── 05_CONTRATOS/                                   key: contratos
├── 06_FORNECEDORES/                                key: fornecedores
├── 07_CLIENTES/                                    key: clientes
├── 08_POS_PRODUCAO/                                key: pos_producao
│   ├── 01_MATERIAL BRUTO/                          key: pos_material_bruto
│   ├── 02_MATERIAL LIMPO/                          key: pos_material_limpo
│   ├── 03_PESQUISA/                                key: pos_pesquisa
│   ├── 04_STORYBOARD/                              key: pos_storyboard
│   ├── 05_MONTAGEM/                                key: pos_montagem
│   ├── 06_COLOR/                                   key: pos_color
│   ├── 07_FINALIZACAO/                             key: pos_finalizacao
│   └── 08_COPIAS/                                  key: pos_copias
├── 09_ATENDIMENTO/                                 key: atendimento
└── 10_VENDAS/PRODUTOR_EXECUTIVO/                   key: vendas
```

**Frontend:** secao "Google Drive" no TabGeral do job com:
- Links para cada pasta (agrupados por nivel-1)
- Badge de status (criado/pendente/erro)
- Botao "Recriar pastas" (se algo deu errado)
- Log de integracao inline ("Pastas criadas em 19/02 as 14:32")

---

### 5.5 — WhatsApp + n8n Workflows

**Pre-requisito bloqueante:** Volume Docker da Evolution API persistido.

**_shared/whatsapp-client.ts:**
Interface abstrata `IWhatsAppProvider`:
```typescript
interface IWhatsAppProvider {
  sendText(phone: string, message: string): Promise<SendResult>;
  sendDocument(phone: string, url: string, caption: string): Promise<SendResult>;
  getConnectionStatus(): Promise<ConnectionStatus>;
}
```
Duas implementacoes: `EvolutionApiClient` (default) e `ZApiClient` (fallback).
Feature flag: `tenant.settings.whatsapp_provider`.

Evolution API client:
- POST /message/sendText/{instanceName} com apikey header
- GET /instance/connectionState/{instanceName}
- Rate limit: 1msg/s por numero, delay 3-5s entre broadcasts

**Edge Function `whatsapp`:**
- POST /whatsapp/send — enviar mensagem individual
- POST /whatsapp/webhook — callback normalizado do n8n (NAO direto da Evolution API)
  - Payload: `{ message_id, status: 'sent'|'delivered'|'read'|'failed', timestamp }`
  - Autenticacao: header `X-Webhook-Secret` validado contra `tenant.settings` (HMAC-SHA256)
- GET /whatsapp/messages?job_id=... — lista mensagens por job

**Triggers automaticos via integration_events:**
| Trigger | Destinatarios | Canal |
|---------|---------------|-------|
| Job aprovado | PE + Diretor | WhatsApp + in-app |
| Margem < 15% | PE + Financeiro | WhatsApp + in-app |
| Status mudou | Equipe do job | in-app (WhatsApp opcional via preferencia) |
| Diaria em 3 dias | Equipe do job | WhatsApp + in-app |
| Pagamento em 7/3/1 dias | PE + Financeiro | WhatsApp + in-app |

**Template de mensagem (job aprovado):**
```
*Job Aprovado* ✅
ELH-042 - Filme Institucional Marca X
Cliente: SENAC SP | Agencia: AlmapBBDO
Valor: R$ 85.000,00
Aprovado em: 19/02/2026

📁 Drive: https://drive.google.com/...
🔗 ELLAHOS: https://app.ellahos.com/jobs/uuid
```

**4 workflows n8n NOVOS:**

1. `wf-job-approved` — webhook ELLAHOS → cria pastas Drive (26) → WhatsApp PE/Diretor via Evolution API → [opcional: chama JOB_FECHADO_CRIACAO para grupos Z-API] → callback sync-urls
2. `wf-margin-alert` — webhook ELLAHOS → buscar PE/Financeiro → WhatsApp alerta
3. `wf-status-change` — webhook ELLAHOS → buscar equipe do job → WhatsApp por membro (com rate limit)
4. `wf-deadline-alert` — webhook ELLAHOS → WhatsApp para destinatarios do alerta

Diagrama de interacao:
```
Evolution API (webhooks de status)
  → n8n (relay/normaliza)
    → POST /whatsapp/webhook (ELLAHOS)
      → atualiza whatsapp_messages.status

integration-processor (pg_cron)
  → POST n8n wf-* webhooks
    → n8n orquestra acoes externas
      → callback ELLAHOS com resultado
```

**Frontend:** historico de mensagens WhatsApp no job detail:
- Tab ou secao "Comunicacao" com lista de mensagens enviadas
- Status por mensagem (enviada/entregue/lida/falhou)
- Read-only (envio apenas automatico nesta fase)

---

### 5.6 — Polish + End-to-End

- Preferencias de notificacao simples (toggle WhatsApp on/off por usuario)
- Badges de status de integracao no job detail (Drive: ok, WhatsApp: 3 enviados)
- Empty states em todas as paginas novas (/notifications vazia, /settings sem config)
- Log de integracoes inline no job detail ("Drive: criado em 18/02, WhatsApp: 3 enviados")
- Teste end-to-end do flow completo: criar job → aprovar → verificar pastas + notificacoes + WhatsApp
- Atualizar MEMORY.md + roadmap

---

## O que NAO esta no scope (DEFERIDO)

| Item | Motivo | Fase |
|------|--------|------|
| DocuSeal (assinatura digital) | Prep feita (Vault), implementacao depende de templates | 6 |
| Criacao automatica de 4 grupos WhatsApp | Risco de bloqueio de conta pelo WhatsApp | 6 |
| Copia de templates Google Docs/Sheets | Cria pastas vazias; copia de templates na Fase 6 | 6 |
| Fluxo de NF (Gmail → Drive → ELLAHOS) | Complexo, precisa migrar dados financeiros antes | 6 |
| Cadastro de equipe via form integrado | Requer autocomplete + campos bancarios no frontend | 6 |
| Geracao de contratos de elenco | DocuSeal + 40 campos | 6 |
| Receber mensagens WhatsApp | Parser de intencao, complexo | 8 |
| Criar job via WhatsApp | Feature de IA | 8 |
| OCR de NFs | IA + integracao com financeiro | 7+ |
| Geracao de claquete / Aprovacao Interna PDF | Templates + geracao de documento | 7+ |
| Migrar Postgres separado do n8n | Consolidar quando redesenhar assistente IA | 8 |

---

## Notas Tecnicas Importantes

1. **Shared Drive obrigatorio:** `supportsAllDrives: true` + `includeItemsFromAllDrives: true` em toda chamada. List: `driveId` + `corpora: 'drive'`
2. **Google Drive private_key:** `.replace(/\\n/g, '\n')` antes de importar via WebCrypto. **POC obrigatorio na 5.1:** assinar JWT com chave da SA e obter access_token para validar que Deno Edge Runtime suporta RSA PKCS#8
3. **Permissoes Shared Drive:** Dar permissao apenas na PASTA RAIZ do job (heranca automatica). Role: `fileOrganizer` para PE, `writer` para demais. Se job_team vazio, criar pastas sem permissoes
4. **Evolution API rate limit:** 1 msg/s por numero, delay 3-5s entre broadcasts. Batch de 20 msgs max por ciclo pg_cron
5. **Volume Docker bloqueante:** Persistir `evolution_data` ANTES de iniciar Sub-fase 5.5
6. **n8n HTTPS:** pg_net pode rejeitar HTTP puro. n8n deve ter SSL via Caddy/nginx + Let's Encrypt
7. **Supabase Free:** pg_net e pg_cron disponiveis (limite: 2 cron jobs), Vault funciona, Realtime limite 200 conexoes simultaneas
8. **WhatsApp provider abstrato:** `IWhatsAppProvider` interface — `EvolutionApiClient` completo, `ZApiClient` como stub ("use via n8n")
9. **folder_key TEXT (nao ENUM):** Permite flexibilidade sem migrations. Documentar keys core em `_shared/types.ts`
10. **Domain-wide delegation disponivel:** Workspace pago — habilita acesso Gmail/Calendar via SA na Fase 6+
11. **Concorrencia na fila:** `locked_at` + `FOR UPDATE SKIP LOCKED` impede dois workers pegarem o mesmo evento
12. **Idempotencia Drive:** Verificar `drive_folders` antes de criar pasta. Se ja existe registro para `job_id + folder_key`, pular
13. **Webhook security:** Endpoints de callback (/whatsapp/webhook, /sync-urls) validam `X-Webhook-Secret` HMAC-SHA256
14. **Vault vs Deno.env:** Testar acesso ao Vault via `supabase.rpc()` na 5.1. Se nao funcionar, usar Supabase Edge Function Secrets (`Deno.env.get()`) como fallback
15. **gross_profit formula atualizada:** `closed_value - production_cost - tax_value - other_costs - risk_buffer` (trigger `calculate_job_financials` precisa ser alterado)
16. **Edge Function timeout:** Free plan = 150s. Processar eventos Drive individualmente, nao em batch, para evitar timeout

---

## Numeros

- **5 tabelas novas** (24 total)
- **5 Edge Functions novas** (11 total): notifications, tenant-settings, drive-integration, whatsapp, integration-processor
- **3 shared modules novos** (13 total): vault.ts, integration-client.ts, notification-helper.ts
- **~15 componentes React novos**
- **3 paginas novas:** /notifications, /settings, /settings/integrations
- **4 workflows n8n novos** (7 total com os 3 existentes)
- **2 pg_cron jobs:** processador de fila (1/min) + alertas diarios (08h)
- **3 campos novos** em jobs: audio_company, risk_buffer, drive_folder_url
- **2 campos novos** em job_files: external_id, external_source
- **1 trigger alterado:** calculate_job_financials (adicionar other_costs + risk_buffer na formula)
- **1 POC obrigatorio:** RSA key signing no Deno Edge Runtime (validar na 5.1)

---

## Ordem de Execucao

```
PRE-REQ: Persistir volume Docker Evolution API
  |
5.1 Infrastructure (migrations + shared modules + pg_cron + alertas)
  |
  +---> 5.2 Notifications + Alertas (Edge Function + frontend bell/page + Realtime)
  |
  +---> 5.3 Settings + Vault (Edge Function + frontend /settings)
         |
         +---> 5.4 Google Drive (Edge Function + 26 pastas Shared Drive + job detail)
         |
         +---> 5.5 WhatsApp + n8n (Edge Function + Evolution API + 4 workflows)
                |
                +---> 5.6 Polish + E2E (preferences, empty states, test flow)
```

5.2 e 5.3 podem rodar em paralelo apos 5.1.
5.4 e 5.5 podem rodar em paralelo apos 5.3.
5.6 requer tudo anterior.

---

## ADRs

| ADR | Titulo | Status | Fase |
|-----|--------|--------|------|
| ADR-003 | Dispatch no Application Layer | Aceito | 5 |
| ADR-004 | Vault para Secrets, tenant.settings para Config | Aceito | 5 |
| ADR-005 | Supabase Realtime para Notificacoes | Aceito | 5 |
| ADR-006 | n8n como Orquestrador (4 novos, 0 alterados) | Aceito | 5 |
| ADR-007 | Migracao do Fluxo de NF (Gmail→n8n→ELLAHOS) | Proposto | 6 |
| ADR-008 | Z-API vs Evolution API (IWhatsAppProvider) | Aceito | 5.5 |
| ADR-009 | Dados Sensiveis e LGPD (bank_info, CPF) | Proposto | 6 |

---

*Documento vivo — v2 refinada com base na analise do ecossistema real da Ellah Filmes.*
