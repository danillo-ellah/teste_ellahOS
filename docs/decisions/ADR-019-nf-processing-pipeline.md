# ADR-019: Pipeline Assincrono de Processamento de Notas Fiscais

**Data:** 02/03/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 9 -- Automacoes Operacionais (substituicao de planilhas Google por pipeline automatizado)

---

## Contexto

Antes da Fase 9, o controle de Notas Fiscais (NFs) na Ellah Filmes era feito manualmente via planilhas Google: fornecedores enviavam NFs por email, a equipe financeira baixava os PDFs, registrava manualmente em uma planilha, e fazia a conciliacao com os custos dos jobs. Este processo era propenso a erros, lento e sem rastreabilidade.

O objetivo e automatizar o ciclo de vida completo da NF:

1. **Solicitacao**: Equipe financeira solicita NFs a fornecedores por email
2. **Recebimento**: NFs chegam por email e sao processadas automaticamente
3. **Armazenamento**: PDFs sao salvos no Google Drive com organizacao por job
4. **Conciliacao**: Match automatico NF <-> registro financeiro <-> cost item
5. **Validacao**: Equipe financeira confirma ou rejeita cada NF
6. **Arquivo**: NF confirmada e copiada para a pasta do job no Drive

Restricoes tecnicas:
- Supabase Edge Functions tem limite de 60s de execucao (nao suportam processos longos)
- n8n roda self-hosted na VPS com acesso ao Gmail, Google Drive e APIs externas
- O pipeline precisa ser resiliente a falhas parciais (email nao enviou, Drive timeout, etc.)
- Multi-tenant: cada tenant tem suas proprias credentials de Drive e configuracoes
- Concorrencia: multiplas NFs podem chegar simultaneamente do mesmo fornecedor

---

## Decisao

### Arquitetura do Pipeline

O pipeline e implementado como uma cadeia de etapas assincronas desacopladas, onde Edge Functions gerenciam estado e regras de negocio, n8n gerencia integracao com servicos externos (Gmail, Drive), e uma fila de eventos (`integration_events`) conecta os dois.

```
[1. Solicitacao]     [2. Envio Email]     [3. Monitoramento]     [4. Ingest]
  EF: request-send --> Fila: nf_email_send --> n8n: wf-nf-request --> n8n: wf-nf-processor
       |                     |                      |                      |
       v                     v                      v                      v
  FR.status=enviado    integration-processor   Gmail API send        Gmail trigger
  cost_items.status    processa fila           callback: sent        Drive upload
  =pedido                                      confirmado            callback: ingest

[5. Match+Registro]     [6. Notificacao]     [7. Validacao Manual]     [8. Arquivo]
  EF: nf-processor/      EF: notification-     UI: /nf-validation        EF: Drive copy
  ingest                 helper                 EF: validate/reject       (fire-and-forget)
       |                     |                      |                      |
       v                     v                      v                      v
  nf_documents INSERT    Realtime push         nf_documents.status    Copia PDF para
  dedup por file_hash    para financeiro/      =confirmed/rejected    pasta fin_nf_
  auto-match por email   admin/ceo             invoice criada/atualiz  recebimento do job
```

### Etapa 1: Solicitacao de NF (`nf-processor/request-send`)

**Acionamento:** Usuario (admin/ceo/financeiro) seleciona registros financeiros na UI e clica "Solicitar NF".

**Processamento:**
1. Valida payload (financial_record_ids, custom_message opcional)
2. Busca dados dos financial_records com JOIN em `people` (email do fornecedor) e `jobs` (codigo/titulo)
3. Agrupa registros por email do fornecedor (1 email por fornecedor, com todos os itens)
4. Gera HTML do email via `buildNfRequestEmail()` (template padrao com dados da empresa, itens, valores)
5. Enfileira evento `nf_email_send` na fila `integration_events` com chave de idempotencia
6. Atualiza `financial_records.nf_request_status = 'enviado'`
7. Sincroniza `cost_items.nf_request_status = 'pedido'` (match por `vendor_email_snapshot`)

**Idempotencia:** A chave `nf-request:{tenant}:{email}:{record_ids_sorted}` garante que o mesmo conjunto de registros para o mesmo fornecedor nao gere eventos duplicados.

### Etapa 2: Envio de Email via n8n (`wf-nf-request`)

**Acionamento:** `integration-processor` processa evento `nf_email_send` da fila (disparado pelo pg_cron a cada 60s).

**Processamento no n8n:**
1. Recebe payload com email HTML, destinatario, reply_to
2. Envia email via Gmail API (OAuth2, conta do tenant)
3. Registra `gmail_message_id` do email enviado
4. Faz callback POST para `nf-processor/request-sent-callback` com `X-Cron-Secret`
5. Callback atualiza `financial_records.nf_request_status = 'enviado_confirmado'` e cria `invoices` com status `pending`

### Etapa 3: Monitoramento de Emails e Upload ao Drive (`wf-nf-processor`)

**Acionamento:** Trigger periodico no n8n que monitora caixa de entrada do Gmail.

**Processamento no n8n:**
1. Gmail trigger detecta novos emails com anexos PDF
2. Calcula `file_hash` (SHA-256) do anexo para deduplicacao
3. Faz upload do PDF para pasta centralizada no Google Drive (pasta NF do tenant)
4. Obtem `drive_file_id` e `drive_url` do arquivo salvo
5. Faz callback POST para `nf-processor/ingest` com metadados completos

### Etapa 4: Ingest e Match Automatico (`nf-processor/ingest`)

**Acionamento:** Callback POST do n8n com header `X-Cron-Secret`.

**Processamento:**
1. Valida autenticacao via `verifyCronSecret()` (ver ADR-018)
2. Valida payload com Zod (12 campos obrigatorios: tenant_id, gmail_message_id, sender_email, file_name, file_hash, drive_file_id, etc.)
3. **Deduplicacao:** Busca `nf_documents` por `file_hash + tenant_id`. Se existir, retorna `is_duplicate: true` sem criar novo registro
4. **Auto-match primario** (financial_records):
   - Busca por `supplier_email = sender_email` com status `enviado` ou `enviado_confirmado`
   - Fallback: busca via `people.email = sender_email` (JOIN)
   - Match unico (1 resultado): confianca 0.95, status `auto_matched`
   - Match multiplo: confianca 0.50, status `pending_review`
   - Sem match: status `pending_review`
5. **Auto-match secundario** (cost_items):
   - Busca `cost_items` por `vendor_email_snapshot = sender_email` com `nf_document_id IS NULL`
   - Se encontrar, vincula o primeiro item ao nf_document e atualiza `nf_request_status = 'recebido'`
6. **Permissao publica no Drive** (fire-and-forget): Chama Google Drive API para tornar o PDF acessivel via link (usando Service Account do Vault)
7. **Notificacoes:** Cria notificacoes para usuarios com role `financeiro`, `admin` ou `ceo`

**Deduplicacao:** O `file_hash` (SHA-256 do conteudo do PDF) garante que o mesmo arquivo processado mais de uma vez nao gere registros duplicados. A verificacao acontece antes de qualquer insert.

### Etapa 5: Upload Manual (`nf-processor/upload`)

**Alternativa ao fluxo automatico:** Usuarios com role `admin/ceo/financeiro/produtor_executivo` podem fazer upload manual de NFs.

- Cria `nf_documents` com `source = 'manual_upload'` (vs `source = 'email'` do fluxo automatico)
- Auto-match simplificado: busca por `job_id` + comparacao de valor (`nf_value` vs `financial_records.amount`)
- Mesma deduplicacao por `file_hash`

### Etapa 6: Validacao Manual (`nf-processor/validate` e `nf-processor/reject`)

**Acionamento:** Usuario na UI `/financeiro/nf-validation`.

**Confirmacao (`validate`):**
1. Verifica role (admin/ceo/financeiro) e existencia do documento
2. Verifica transicao de status valida (nao pode confirmar NF ja confirmada ou rejeitada)
3. Atualiza `nf_documents.status = 'confirmed'` com dados adicionais (nf_number, nf_value, CNPJ, nome emissor, data emissao)
4. Atualiza `financial_records.nf_request_status = 'validado'`
5. Cria ou atualiza `invoices` com status `approved`
6. Sincroniza `cost_items`: marca como `nf_request_status = 'aprovado'` e `nf_validation_ok = true`
7. Registra em `job_history` (audit trail)
8. **Copia para pasta do job** (fire-and-forget): Copia o PDF do Drive para a pasta `fin_nf_recebimento` do job, com nome padronizado: `NF_{data}_{J+code}_{NF+numero}_{emissor}.pdf`

**Rejeicao (`reject`):**
1. Mesma verificacao de role e existencia
2. Exige `rejection_reason` (obrigatorio, max 500 chars)
3. Atualiza `nf_documents.status = 'rejected'`
4. Registra em `job_history`
5. NF rejeitada pode ser reclassificada futuramente (nao e delete permanente)

### Etapa 7: Copia de NF para o Drive do Job

**Acionamento:** Fire-and-forget apos confirmacao da NF.

**Processamento:**
1. Busca `jobs.code` para compor o nome do arquivo
2. Busca `drive_folders` por `job_id + folder_key = 'fin_nf_recebimento'`
3. Obtem Google Drive access token via Service Account (Vault)
4. Copia arquivo via `copyDriveFile()` com nome padronizado
5. Salva referencia da copia em `nf_documents.metadata.job_copy`

Se a pasta do job nao existir ou o token falhar, a operacao e silenciada (logs de erro, mas nao bloqueia a confirmacao). A copia pode ser refeita manualmente.

### Tratamento de Erros e Retry

**Fila de eventos (`integration_events`):**
- Lock atomico via `FOR UPDATE SKIP LOCKED` (RPC `lock_integration_events`)
- Backoff exponencial: [0s, 60s, 5min, 15min, 1h, 4h] com jitter de +/-20%
- Maximo de 7 tentativas antes de marcar como `failed`
- Eventos travados ha mais de 5 minutos sao automaticamente elegidos para reprocessamento (protecao contra worker morto)
- Notificacao para admins em caso de falha permanente

**Operacoes fire-and-forget (nao bloqueiam o fluxo principal):**
- Permissao publica no Drive (ingest)
- Notificacoes de usuario (ingest)
- Copia de NF para pasta do job (validate)
- Sincronizacao de cost_items (ingest, validate, request-send)

Essas operacoes sao envolvidas em `try/catch` com logging. Falhas sao registradas nos logs mas nao impedem a operacao principal de completar com sucesso.

**Idempotencia em cada etapa:**
- Ingest: dedup por `file_hash + tenant_id` (retorna registro existente)
- Request-send: `idempotency_key` no `integration_events` (ON CONFLICT)
- Validate: check de status (nao pode confirmar NF ja confirmada -- retorna 409)
- Reject: check de status (nao pode rejeitar NF ja rejeitada -- retorna 409)

### Modelo de Dados

```
nf_documents
  - id, tenant_id, job_id
  - source: 'email' | 'manual_upload'
  - status: 'pending_review' | 'auto_matched' | 'confirmed' | 'rejected'
  - sender_email, sender_name, subject, received_at
  - file_name, file_hash (SHA-256), file_size_bytes
  - drive_file_id, drive_url
  - matched_financial_record_id, match_confidence, match_method
  - nf_number, nf_value, nf_issuer_cnpj, nf_issuer_name, nf_issue_date
  - validated_by, validated_at, rejection_reason
  - metadata (JSONB): ingested_at, match_count, job_copy {drive_file_id, url, file_name, copied_at}
```

```
Relacoes:
  nf_documents.matched_financial_record_id -> financial_records.id
  cost_items.nf_document_id -> nf_documents.id
  invoices.nf_document_id -> nf_documents.id
```

---

## Consequencias

### Positivas
- **Eliminacao de trabalho manual**: NFs recebidas por email sao processadas automaticamente (upload ao Drive, dedup, match)
- **Rastreabilidade completa**: Cada NF tem historico desde o recebimento ate a validacao, com audit trail no `job_history`
- **Resiliencia**: Fila de eventos com retry exponencial tolera falhas transitorias de APIs externas (Gmail, Drive)
- **Desacoplamento**: Edge Functions nao dependem diretamente do n8n (comunicam via fila). Se n8n estiver fora, eventos acumulam e sao processados quando voltar
- **Multi-tenant**: Cada tenant tem suas proprias credentials de Drive, templates de email e configuracoes
- **Deduplicacao robusta**: `file_hash` (SHA-256) previne registros duplicados mesmo com reprocessamentos
- **Dois caminhos de entrada**: Email automatico (via n8n) e upload manual (via UI) convergem para o mesmo modelo de dados
- **Fire-and-forget para operacoes secundarias**: Copia ao Drive, notificacoes e sincronizacao de cost_items nao bloqueiam o fluxo principal

### Negativas
- **Latencia no fluxo de email**: Do recebimento do email ate o registro no sistema pode levar ate 2 minutos (polling do Gmail + processamento da fila pelo pg_cron)
- **Dependencia do n8n para fluxo de email**: Se o n8n cair, NFs por email param de ser processadas (upload manual continua funcionando)
- **Complexidade de debug**: Pipeline distribuido entre EFs e n8n torna o troubleshooting mais complexo (mitigado: logging estruturado em cada etapa)
- **Match automatico limitado**: Depende de `sender_email` coincidir com `supplier_email` ou `people.email`. Fornecedores que enviam de emails diferentes nao sao matchados
- **Sem OCR**: O pipeline atual nao extrai dados automaticamente do PDF da NF (numero, valor, CNPJ). Esses campos sao preenchidos manualmente na validacao. OCR planejado para fase futura
- **Metadata JSONB para job_copy**: A referencia da copia no Drive esta em campo JSONB, nao em coluna tipada. Dificulta queries diretas (mitigado: campo e write-once e raramente consultado)

---

## Alternativas Consideradas

### A1: Pipeline sincrono (tudo na Edge Function)

**Rejeitada.** Uma unica Edge Function que recebe o email, faz upload ao Drive, processa OCR e cria o registro excederia o limite de 60s de execucao. Alem disso, chamadas ao Gmail e Drive dentro da EF exigiriam tokens OAuth2 que sao mais naturais no n8n (que ja tem nodes nativos para Google).

### A2: Pipeline inteiramente no n8n (sem Edge Functions)

**Rejeitada.** O n8n nao tem suporte nativo a RLS do Supabase, multi-tenancy ou validacao complexa com Zod. Mover logica de negocio para o n8n quebraria o principio "Edge Functions para logica de negocio, n8n para automacoes" (ADR-001). Alem disso, atualizacoes atomicas em multiplas tabelas (nf_documents + financial_records + cost_items + invoices) sao mais seguras via Edge Functions com service_role client.

### A3: Supabase Storage em vez de Google Drive

**Rejeitada.** A Ellah Filmes ja usa Google Drive extensivamente para organizacao de projetos (pastas por job com subpastas para orcamentos, contratos, NFs). Migrar para Supabase Storage quebraria o fluxo existente e exigiria duplicar a estrutura de pastas. O Google Drive tambem oferece preview nativo de PDFs, compartilhamento com clientes e integracao com Google Workspace.

### A4: Webhook direto do Gmail (sem polling no n8n)

**Rejeitada.** Gmail Push Notifications via Pub/Sub exigem um endpoint HTTPS publico fixo e configuracao de Cloud Pub/Sub (servico pago do Google Cloud). O n8n com Gmail trigger (polling) e mais simples de configurar e manter, e o atraso de 1-2 minutos e aceitavel para o fluxo de NFs.

### A5: Message broker dedicado (RabbitMQ, Redis Queue) em vez de tabela integration_events

**Rejeitada.** Adiciona mais um servico para operar na VPS. A tabela `integration_events` com lock atomico (`FOR UPDATE SKIP LOCKED`) funciona como uma job queue leve o suficiente para o volume esperado (<500 eventos/dia). Se escalar, migrar para um broker dedicado e possivel sem mudar a interface das Edge Functions (apenas trocar o `enqueueEvent`).

### A6: OCR automatico no pipeline (AWS Textract, Google Document AI)

**Adiada para fase futura.** OCR adicionaria custo por pagina processada e complexidade na integracao. O volume atual de NFs (~50-100/mes) nao justifica o investimento. A arquitetura esta preparada para adicionar OCR como etapa opcional entre o upload e o ingest (n8n processaria o PDF via API de OCR e incluiria os dados extraidos no payload do callback).

---

## Referencias

- `supabase/functions/nf-processor/index.ts` (roteamento de todas as acoes)
- `supabase/functions/nf-processor/handlers/ingest.ts` (ingest + dedup + auto-match)
- `supabase/functions/nf-processor/handlers/validate.ts` (confirmacao + Drive copy)
- `supabase/functions/nf-processor/handlers/reject.ts` (rejeicao)
- `supabase/functions/nf-processor/handlers/upload.ts` (upload manual)
- `supabase/functions/nf-processor/handlers/request-send.ts` (solicitacao de NF)
- `supabase/functions/nf-processor/handlers/request-sent-callback.ts` (callback n8n)
- `supabase/functions/_shared/integration-client.ts` (fila de eventos, backoff, lock)
- `supabase/functions/integration-processor/handlers/n8n-handler.ts` (envio de webhooks)
- docs/architecture/fase-9-automacoes-architecture.md
- ADR-018 (autenticacao de webhooks n8n)
