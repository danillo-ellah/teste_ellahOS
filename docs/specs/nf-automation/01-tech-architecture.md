# Arquitetura Tecnica: Workflow Automatico de NF por Email

**Autor:** Tech Lead
**Data:** 2026-03-05
**Status:** Proposta
**Prioridade:** ALTA (gap operacional — hoje e 100% manual)

---

## 1. Contexto e Situacao Atual

### O que ja existe

O EllaHOS ja possui um modulo completo de NF com os seguintes componentes:

| Componente | Funcao | Status |
|---|---|---|
| `nf-processor/ingest` | Recebe NF (JSON com metadados + referencia Drive), deduplica por `file_hash`, faz smart auto-match em 2 etapas, cria `nf_documents`, vincula `cost_items`, notifica financeiro | **Operacional** |
| `nf-processor/upload` | Upload manual de NF pelo frontend | **Operacional** |
| `nf-processor/validate` | Validacao humana de NFs pendentes, vincula a cost_item, copia para pasta do job no Drive | **Operacional** |
| `nf-processor/ocr-analyze` | Extracao de dados por IA (Groq) a partir do nome do arquivo | **Operacional** |
| `nf-processor/reject` | Rejeicao de NF com motivo | **Operacional** |
| `nf-processor/reassign` | Re-vinculacao de NF a outro cost_item | **Operacional** |
| `nf-processor/request-send` | Envia pedido de NF ao fornecedor (email via n8n) | **Operacional** |
| `nf-processor/request-sent-callback` | Callback do n8n confirmando envio do email de pedido | **Operacional** |
| Workflow n8n `wf-nf-processor` (VLgQcxR0fyR5Ptfy) | Le emails, extrai PDFs, faz upload para Drive, chama `/ingest` | **Testado E2E** (manual trigger) |

### O que falta

O workflow `wf-nf-processor` no n8n foi testado E2E com **trigger manual**. Para automatizar, precisa:

1. Trocar o trigger manual por **monitoramento continuo do Gmail** (IMAP poll ou Gmail API push)
2. Garantir **idempotencia** (emails ja processados nao sao re-processados)
3. Configurar **error handling** robusto (retry, dead-letter, alertas)
4. Documentar e versionar a configuracao final

### O que NAO precisa mudar

O endpoint `POST /nf-processor/ingest` **ja esta pronto** para receber chamadas do n8n. Ele:
- Autentica via `X-Cron-Secret` (timing-safe comparison)
- Recebe metadados JSON (NAO recebe o PDF em si -- o PDF ja esta no Drive)
- Deduplica por `file_hash`
- Faz smart auto-match por subject (codigo do job) + email do fornecedor
- Cria registro em `nf_documents` com status `auto_matched` ou `pending_review`
- Vincula `cost_items` quando match unico
- Define permissao publica no Drive (para visualizacao no frontend)
- Notifica usuarios financeiro/admin/ceo

---

## 2. Fluxo Completo: Gmail --> n8n --> EllaHOS --> Drive --> Dashboard

```
    [Gmail Inbox]
         |
         | (a cada 5 min)
         v
  [n8n: Gmail Trigger]
         |
         | Filtra: emails NAO lidos
         | Criterio: has:attachment filename:pdf
         v
  [n8n: Extract Attachments]
         |
         | Extrai PDFs anexados
         | Ignora emails sem .pdf
         v
  [n8n: Compute SHA-256 Hash]
         |
         | file_hash = SHA-256(conteudo do PDF)
         v
  [n8n: Check Duplicate (opcional)]
         |
         | GET /nf_documents?file_hash=X (via REST API Supabase)
         | Se ja existe: skip + mark as read
         v
  [n8n: Upload PDF ao Google Drive]
         |
         | Pasta destino: NF_RECEBIMENTO (fixa, staging)
         | ID: 16ETBO-yyqvaAI1wd1YswrCmvXxmEUBOs
         | Retorna: drive_file_id, drive_url
         v
  [n8n: POST /nf-processor/ingest]
         |
         | Payload: { tenant_id, gmail_message_id, sender_email,
         |   sender_name, subject, received_at, file_name,
         |   file_hash, file_size_bytes, drive_file_id, drive_url }
         | Header: X-Cron-Secret
         v
  [Edge Function: ingest.ts]
         |
         +---> Deduplica por file_hash
         +---> Smart auto-match (subject code + vendor email)
         +---> Cria nf_documents (auto_matched | pending_review)
         +---> Vincula cost_items (se match unico)
         +---> Permissao publica no Drive
         +---> Notificacoes (financeiro/admin/ceo)
         v
  [n8n: Mark Email as Read]
         |
         | POST Gmail API /modify { removeLabelIds: ["UNREAD"] }
         | (usa HTTP Request, NAO Gmail node -- perde params na importacao)
         v
  [Dashboard EllaHOS]
         |
         | NFs auto_matched: card verde, vinculacao automatica visivel
         | NFs pending_review: card laranja, botao "Vincular"
```

### Diagrama de dados

```
Email chega
  |
  v
nf_documents (source='email', status='auto_matched' ou 'pending_review')
  |
  +--- auto_matched ---> cost_items.nf_document_id = nf_documents.id
  |                       cost_items.nf_request_status = 'recebido'
  |
  +--- pending_review --> Usuario valida manualmente no frontend
                          POST /nf-processor/validate
                          cost_items.nf_request_status = 'aprovado'
                          Copia PDF para pasta fin_nf_recebimento do job
```

---

## 3. Workflow n8n: Nodes e Configuracao

### 3.1 Visao geral dos nodes

O workflow `wf-nf-processor` ja existe (ID: `VLgQcxR0fyR5Ptfy`) e foi testado E2E. A unica mudanca necessaria e **trocar o trigger manual por Gmail Trigger automatico**.

| # | Node | Tipo | Funcao |
|---|------|------|--------|
| 1 | **Gmail Trigger** | `Gmail Trigger` (n8n built-in) | Polling a cada 5 min, emails nao lidos |
| 2 | **Get Full Message** | `Gmail` (Get Message) | Busca corpo completo + attachments do email |
| 3 | **Extract PDFs** | `Code` (JavaScript) | Filtra attachments `.pdf`, gera array de items |
| 4 | **Download Attachment** | `Gmail` (Download Attachment) | Baixa o binario do PDF |
| 5 | **Compute Hash** | `Code` (JavaScript) | SHA-256 do conteudo binario do PDF |
| 6 | **Check Duplicate in DB** | `HTTP Request` | GET na REST API do Supabase verificando `file_hash` |
| 7 | **Is New?** | `IF` | Verifica se nao e duplicata |
| 8 | **Upload to Drive** | `Google Drive` (Upload) | Upload do PDF para pasta NF staging |
| 9 | **POST Ingest** | `HTTP Request` | POST para Edge Function `/nf-processor/ingest` |
| 10 | **Mark as Read** | `HTTP Request` | POST Gmail API `/modify` remove label UNREAD |
| 11 | **Error Handler** | `Error Trigger` | Captura erros e notifica (Slack/email) |

### 3.2 Node 1: Gmail Trigger — Configuracao

**Opcao recomendada: Gmail Trigger com polling**

```
Node type: Gmail Trigger
Credential: Gmail OAuth2 (conta financeiro@ellahfilmes.com)
Poll interval: 5 minutos
Filters:
  - Label: INBOX
  - Read status: Unread
  - Has attachment: sim (filtro no Code node seguinte)
```

**Por que Gmail Trigger e nao IMAP:**
- O Gmail OAuth2 ja esta configurado e testado no n8n
- IMAP requer "App Passwords" ou configuracao extra de seguranca Google
- Gmail API suporta filtragem por labels, attachment presence, etc.
- Gmail API retorna `messageId` nativo (necessario para Mark as Read)
- O n8n free nao suporta IMAP Trigger de forma confiavel (sem keep-alive)

**Alternativa descartada: Gmail Push Notifications (pub/sub)**
- Requer Google Cloud Pub/Sub configurado
- Complexidade desproporcional para o volume esperado (~5-20 NFs/dia)
- Polling de 5 min e suficiente para o caso de uso

### 3.3 Node 3: Extract PDFs (Code node)

```javascript
// Filtra apenas attachments PDF
const items = [];
for (const item of $input.all()) {
  const parts = item.json.payload?.parts || [];
  for (const part of parts) {
    if (part.filename && part.filename.toLowerCase().endsWith('.pdf')) {
      items.push({
        json: {
          messageId: item.json.id,
          threadId: item.json.threadId,
          from: item.json.payload?.headers?.find(h => h.name === 'From')?.value || '',
          subject: item.json.payload?.headers?.find(h => h.name === 'Subject')?.value || '',
          date: item.json.payload?.headers?.find(h => h.name === 'Date')?.value || '',
          attachmentId: part.body?.attachmentId,
          fileName: part.filename,
          mimeType: part.mimeType,
          fileSize: part.body?.size || 0,
        },
        pairedItem: { item: 0 },
      });
    }
  }
}

// Se nao tem PDF, retorna vazio (nao processa)
return items.length > 0 ? items : [];
```

### 3.4 Node 5: Compute Hash (Code node)

```javascript
// SHA-256 do conteudo binario do PDF
const crypto = require('crypto');
const items = [];

for (const item of $input.all()) {
  const binaryData = item.binary?.data;
  if (binaryData) {
    const buffer = await $helpers.getBinaryDataBuffer(item, 'data');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    items.push({
      json: {
        ...item.json,
        file_hash: hash,
        file_size_bytes: buffer.length,
      },
      binary: item.binary,
      pairedItem: { item: 0 },
    });
  }
}

return items;
```

### 3.5 Node 6: Check Duplicate (HTTP Request)

```
Method: GET
URL: https://etvapcxesaxhsvzgaane.supabase.co/rest/v1/nf_documents
Query Parameters:
  - tenant_id=eq.11111111-1111-1111-1111-111111111111
  - file_hash=eq.{{ $json.file_hash }}
  - deleted_at=is.null
  - select=id,status
Headers:
  - apikey: {{ SUPABASE_SERVICE_ROLE_KEY }}
  - Authorization: Bearer {{ SUPABASE_SERVICE_ROLE_KEY }}
```

**Nota:** No n8n free tier, `$env` nao funciona. O service role key deve ser hardcodado no header do node (conforme bug corrigido na sessao E2E de 26/02).

### 3.6 Node 8: Upload to Drive

```
Node type: Google Drive (Upload File)
Credential: Google Drive OAuth2
Folder ID: 16ETBO-yyqvaAI1wd1YswrCmvXxmEUBOs  (pasta NF staging)
File Name: {{ $json.fileName }}
Binary Property: data
```

### 3.7 Node 9: POST Ingest (HTTP Request)

```
Method: POST
URL: https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/nf-processor/ingest
Headers:
  - Content-Type: application/json
  - X-Cron-Secret: {{ CRON_SECRET }}
Body (JSON):
  {
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "gmail_message_id": "{{ $node['Get Full Message'].json.id }}",
    "sender_email": "{{ extraido do From header }}",
    "sender_name": "{{ extraido do From header }}",
    "subject": "{{ $node['Extract PDFs'].json.subject }}",
    "received_at": "{{ $node['Extract PDFs'].json.date }}",
    "file_name": "{{ $json.fileName }}",
    "file_hash": "{{ $json.file_hash }}",
    "file_size_bytes": {{ $json.file_size_bytes }},
    "drive_file_id": "{{ $node['Upload to Drive'].json.id }}",
    "drive_url": "https://drive.google.com/file/d/{{ $node['Upload to Drive'].json.id }}/view"
  }
```

### 3.8 Node 10: Mark as Read (HTTP Request)

```
Method: POST
URL: https://gmail.googleapis.com/gmail/v1/users/me/messages/{{ $json.messageId }}/modify
Headers:
  - Authorization: Bearer {{ Gmail OAuth2 token }}
  - Content-Type: application/json
Body:
  {
    "removeLabelIds": ["UNREAD"]
  }
```

**IMPORTANTE:** Usar HTTP Request em vez do Gmail node nativo. O Gmail node perde parametros na importacao JSON do workflow (bug conhecido, corrigido na sessao E2E).

### 3.9 Node 11: Error Handler

```
Node type: Error Trigger
Connected to: Email/Slack notification node
Payload: { workflow_name, execution_id, error_message, node_name, timestamp }
```

---

## 4. Modificacoes Necessarias no nf-processor

### 4.1 Resposta curta: NENHUMA modificacao necessaria no backend

O endpoint `POST /nf-processor/ingest` ja faz **exatamente** o que o workflow precisa:

| Requisito | Status | Como funciona |
|---|---|---|
| Recebe referencia ao PDF (NAO base64) | OK | Campos `drive_file_id` + `drive_url` |
| Deduplicacao por hash | OK | Busca por `file_hash` no banco, retorna `is_duplicate: true` |
| Auto-match por subject + email | OK | Etapa 1 (codigo no subject) e Etapa 2 (email do vendor) |
| Vinculacao automatica de cost_items | OK | Se match unico, `cost_items.nf_document_id` e atualizado |
| Permissao publica no Drive | OK | `setPublicReadPermission()` fire-and-forget |
| Notificacoes | OK | Cria notificacao para roles financeiro/admin/ceo |
| Autenticacao M2M | OK | `X-Cron-Secret` com timing-safe comparison |
| Idempotencia | OK | Duplicata retorna 200 com `is_duplicate: true` |

### 4.2 O campo `source` ja suporta email

```sql
CONSTRAINT chk_nf_documents_source CHECK (
  source IN ('email', 'manual_upload', 'ocr')
)
```

O handler `ingest.ts` ja define `source: 'email'` (linha 277 do codigo atual).

### 4.3 Melhoria OPCIONAL (nao bloqueia lancamento)

Existe uma melhoria possivel para o futuro, mas que **NAO e pre-requisito** para ativar o workflow:

**M-01: Log de execucao do workflow**

Criar uma tabela `nf_ingest_log` para rastrear cada execucao do n8n:

```sql
CREATE TABLE IF NOT EXISTS nf_ingest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  gmail_message_id TEXT,
  execution_id TEXT,  -- n8n execution ID
  status TEXT NOT NULL,  -- 'processed', 'duplicate', 'error', 'skipped_no_pdf'
  nf_document_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Isso permitiria dashboards de monitoramento ("quantas NFs processou hoje", "quantos erros") e debug mais facil. Entretanto, os logs do n8n + logs da Edge Function ja cobrem isso de forma adequada para o volume atual.

**Decisao: postergar para quando o volume justificar.** Os logs atuais (n8n executions + EF console) sao suficientes para 5-20 NFs/dia.

---

## 5. Autenticacao do n8n --> Edge Function

### Mecanismo atual (ja implementado e testado)

| Aspecto | Implementacao |
|---|---|
| **Header** | `X-Cron-Secret` |
| **Valor** | `ellahos-cron-adcb6006-c8d3-465a-b58a-28545516443d` (ja configurado no ambiente da EF) |
| **Validacao** | Timing-safe comparison (`timingSafeEqual()`) no handler `ingest.ts` |
| **Rota protegida** | `CRON_SECRET_ROUTES = ['ingest', 'request-sent-callback']` no `index.ts` |

### Por que NAO usar Service Role Key

O service role key do Supabase (`eyJhbGci...`) **ignora RLS** e da acesso total ao banco. Usar como header de autenticacao M2M e perigoso porque:

1. Se o n8n for comprometido, o atacante tem acesso a TODAS as tabelas
2. O service role key nao pode ser rotacionado sem quebrar todas as Edge Functions
3. O `CRON_SECRET` e isolado -- pode ser rotacionado independentemente

### Por que NAO usar JWT de usuario

O n8n nao e um usuario humano. Criar um "usuario de servico" no Supabase Auth:

1. Poluiria a tabela `profiles` com uma conta bot
2. Tokens JWT expiram (1h default) -- o n8n precisaria de refresh flow
3. RLS filtraria por `tenant_id` do bot, que nao faz sentido

### Fluxo de autenticacao

```
n8n                                   Edge Function
 |                                         |
 |  POST /nf-processor/ingest             |
 |  X-Cron-Secret: ellahos-cron-...       |
 |  Content-Type: application/json        |
 |--------------------------------------->|
 |                                         |
 |                  verifyCronSecret(req)  |
 |                  timingSafeEqual(       |
 |                    header, env.var)     |
 |                                         |
 |                  Se invalido: 401       |
 |                  Se valido: processa    |
 |<---------------------------------------|
 |  201 Created / 200 OK (duplicate)      |
```

### Multi-tenant

O `tenant_id` e enviado **explicitamente no payload** (nao extraido de JWT). Isso e seguro porque:

- A rota so aceita chamadas com `CRON_SECRET` valido
- O n8n e infraestrutura interna, administrada pelo mesmo time
- Nao ha risco de um tenant forjar chamadas para outro tenant

Para o cenario multi-tenant real no futuro, cada tenant teria seu proprio workflow n8n com seu proprio `tenant_id` hardcodado.

---

## 6. Tratamento de Erros

### 6.1 Email sem anexo PDF

| Cenario | Tratamento |
|---|---|
| Email sem nenhum attachment | Node "Extract PDFs" retorna array vazio. O workflow para naturalmente (nenhum item para processar). Email **permanece como nao lido** para nao perder emails legit que possam ser processados no futuro. |
| Email com attachment nao-PDF (ex: .jpg, .docx) | Filtro no Code node ignora. Mesmo comportamento: email permanece nao lido. |
| Email com multiplos PDFs | Cada PDF e processado como um item separado (loop automatico do n8n). Cada um gera um `nf_documents` independente. |

**Risco:** Emails sem PDF acumulam na inbox como nao lidos. **Mitigacao:** Adicionar um node condicional que marca como lido emails que claramente nao sao NFs (ex: sem anexo algum), mas manter nao lido emails com anexos nao-PDF (pode ser NF em formato errado que precisa atencao humana).

### 6.2 NF duplicada

| Cenario | Tratamento |
|---|---|
| Mesmo PDF processado 2x (hash identico) | Pre-check no n8n (node "Check Duplicate") intercepta antes do upload ao Drive. Se passar pelo pre-check (race condition), o handler `ingest.ts` retorna `{ is_duplicate: true, status: 'duplicate' }` com HTTP 200. Nao cria registro duplicado. |
| Mesmo email processado 2x | `gmail_message_id` identifica o email. Alem disso, o email e marcado como lido apos processamento, entao nao aparece no proximo poll. |

**Idempotencia garantida em 3 niveis:**
1. Gmail: email marcado como lido apos processamento
2. n8n: pre-check de hash no banco antes do upload
3. Edge Function: deduplicacao por `file_hash` no banco

### 6.3 Job nao encontrado (auto-match falha)

| Cenario | Tratamento |
|---|---|
| Subject nao contem codigo de job | Etapa 2 do smart-match: busca por email do vendor. NF criada com status `pending_review`. |
| Codigo no subject, mas nenhum cost_item corresponde | NF criada com `pending_review`. `metadata.extracted_job_code` salva o codigo para referencia manual. |
| Codigo no subject, multiplos cost_items correspondem | NF criada com `pending_review`. `metadata.candidate_count` indica quantos candidatos existem. |
| Vendor email desconhecido (nao esta em nenhum cost_item) | NF criada com `pending_review`, `candidate_count: 0`. Usuario vincula manualmente na tela. |

**Em todos os casos:** a NF e criada e aparece no dashboard de validacao. Nunca e descartada silenciosamente.

### 6.4 Formato invalido

| Cenario | Tratamento |
|---|---|
| PDF corrompido | Upload ao Drive funciona (Drive aceita qualquer binario). O hash e calculado normalmente. A NF aparece como `pending_review` e o usuario pode abrir o PDF e verificar. |
| Arquivo com extensao .pdf mas nao e PDF real | Mesmo tratamento: chega ao Drive, aparece na tela. OCR falharia, mas OCR e acao manual (botao no frontend). |
| Email com encoding quebrado | Node "Get Full Message" pode falhar. Error Handler captura e notifica. |

### 6.5 Falhas de infraestrutura

| Cenario | Tratamento | Retry |
|---|---|---|
| Google Drive API fora do ar | Upload falha. n8n retry policy (3x com backoff). Se persistir, Error Handler notifica. Email permanece nao lido para re-processamento no proximo ciclo. | Automatico (n8n) |
| Supabase Edge Function fora do ar | POST Ingest falha. n8n retry. PDF ja esta no Drive, entao re-processar e seguro (dedup por hash). | Automatico (n8n) |
| n8n fora do ar | Emails acumulam como nao lidos. Quando n8n volta, proximo poll processa todos. | Natural (backlog) |
| Gmail API rate limit (429) | n8n backoff exponencial. Volume de 5-20 emails/dia esta muito abaixo do limite (250 requests/segundo). | Automatico (n8n) |

### 6.6 Estrategia de retry no n8n

```
Retry on Fail: Enabled
Max Retries: 3
Wait Between Retries: 5000ms (5s)
Backoff: Exponential (5s, 10s, 20s)
Continue on Fail: false (para no erro e nao marca email como lido)
```

**Principio:** Se qualquer etapa falhar apos 3 retries, o email **NAO e marcado como lido**. No proximo ciclo de 5 min, sera re-processado. A deduplicacao por hash garante que nao crie registros duplicados.

---

## 7. Configuracao do n8n (Checklist de Deploy)

### 7.1 Pre-requisitos

- [ ] Gmail OAuth2 credential configurada no n8n (conta: financeiro@ellahfilmes.com)
- [ ] Google Drive OAuth2 credential configurada no n8n
- [ ] CRON_SECRET configurado como variavel de ambiente na EF (ja feito)
- [ ] Pasta NF staging no Drive existe (ID: `16ETBO-yyqvaAI1wd1YswrCmvXxmEUBOs`) (ja feito)

### 7.2 Mudanca no workflow existente

1. Abrir workflow `wf-nf-processor` (ID: `VLgQcxR0fyR5Ptfy`) no n8n
2. Remover o node "Manual Trigger"
3. Adicionar node "Gmail Trigger" com:
   - Polling interval: 5 minutos
   - Simple: false (retorna dados completos)
   - Label: INBOX
4. Conectar "Gmail Trigger" ao node existente "Get Full Message"
5. Ativar o workflow (toggle ON)
6. Verificar que a execucao ocorre a cada 5 min no painel

### 7.3 Configuracoes que NAO importam via JSON (manual obrigatorio)

Conforme documentado na sessao E2E de 26/02/2026:

| Item | Motivo | Acao |
|---|---|---|
| Gmail OAuth2 credential | Credenciais nao exportam em JSON | Selecionar no node |
| Google Drive OAuth2 credential | Idem | Selecionar no node |
| Folder ID do Drive Upload | Reseta para "root" na importacao | Setar `16ETBO-yyqvaAI1wd1YswrCmvXxmEUBOs` |
| SUPABASE_SERVICE_ROLE_KEY | `$env` nao funciona no n8n free | Hardcodar no header do "Check Duplicate" |
| Mark as Read node | Gmail node perde params na importacao | Manter como HTTP Request |

---

## 8. Seguranca

### 8.1 Superficie de ataque

| Vetor | Risco | Mitigacao |
|---|---|---|
| Alguem envia email com PDF malicioso | Baixo — PDF e armazenado no Drive, nao executado | O sistema so salva metadados. PDF nao e parseado server-side (OCR e manual e usa Groq, nao processamento local). |
| Forja de CRON_SECRET | Baixo — precisaria interceptar o header | Timing-safe comparison. CRON_SECRET e 256-bit hex aleatorio. Comunicacao via HTTPS. |
| Spam de NFs (volume alto) | Medio — pode gerar muitos registros pending_review | Rate limiting natural do Gmail polling (1x a cada 5 min). Se necessario, adicionar rate limit no handler. |
| Email spoofing (From header falso) | Medio — poderia gerar auto-match falso | Smart-match com confianca 0.95 (nao 1.0). Validacao humana para NFs de alto valor. SPF/DKIM verificados pelo Gmail antes de chegar na inbox. |

### 8.2 Dados sensiveis

- `CRON_SECRET`: armazenado como env var nas Edge Functions (Supabase Dashboard > Edge Functions > Secrets)
- Service Account Google: armazenado no Vault do Supabase (`{tenant_id}_gdrive_service_account`)
- Service Role Key: hardcodado no n8n (risco aceito -- n8n e infraestrutura interna na VPS com acesso restrito)

---

## 9. Monitoramento e Observabilidade

### 9.1 Logs existentes (ja funcionam)

| Fonte | O que loga | Onde |
|---|---|---|
| n8n Executions | Cada execucao do workflow com input/output de cada node | Dashboard n8n em `https://ia.ellahfilmes.com/` |
| Edge Function logs | `console.log/error` em cada etapa do ingest | Supabase Dashboard > Edge Functions > Logs |
| Notificacoes | Alertas in-app para financeiro/admin/ceo | Tabela `notifications` + frontend |

### 9.2 Metricas a acompanhar

| Metrica | Query / Como verificar |
|---|---|
| NFs processadas/dia | `SELECT count(*), date(created_at) FROM nf_documents WHERE source='email' GROUP BY 2` |
| Taxa de auto-match | `SELECT status, count(*) FROM nf_documents WHERE source='email' GROUP BY 1` |
| NFs pendentes de review | `SELECT count(*) FROM nf_documents WHERE status='pending_review'` |
| Erros do workflow | n8n Dashboard > Executions > Filter by "error" |
| Tempo medio de processamento | n8n Dashboard > Executions > duracao media |

### 9.3 Alertas recomendados (futuro)

- **Workflow parou:** Se 0 execucoes nas ultimas 2 horas durante horario comercial (9h-18h), enviar alerta Slack.
- **Muitos erros:** Se > 5 erros consecutivos, notificar admin.
- **Backlog grande:** Se > 20 NFs com `pending_review` ha mais de 48h, notificar financeiro.

Implementacao: via n8n Error Trigger + Slack/email notification node (ja existe node Error Handler no workflow).

---

## 10. Estimativa de Esforco

### Premissas
- Workflow n8n ja existe e foi testado E2E
- Endpoint ingest ja esta pronto e operacional
- Nenhuma migration ou mudanca de schema necessaria
- Nenhuma mudanca no frontend necessaria

### Breakdown

| Tarefa | Tempo | Responsavel |
|---|---|---|
| Adicionar Gmail Trigger ao workflow (substituir Manual Trigger) | 15 min | DevOps/Admin n8n |
| Configurar polling interval (5 min) e filtros | 10 min | DevOps/Admin n8n |
| Adicionar logica de "skip se nao tem PDF" (mark as read) | 30 min | DevOps/Admin n8n |
| Configurar Error Handler com notificacao Slack/email | 30 min | DevOps/Admin n8n |
| Testar E2E com email real (enviar NF de teste) | 30 min | QA |
| Verificar dedup (enviar mesmo email 2x) | 15 min | QA |
| Verificar auto-match (email com codigo de job no subject) | 15 min | QA |
| Verificar pending_review (email sem codigo de job) | 15 min | QA |
| Ativar workflow em producao | 5 min | DevOps/Admin n8n |
| Documentar runbook de operacoes | 30 min | Tech Lead |
| **Total** | **~3 horas** | |

### Dependencias externas
- Acesso ao painel n8n (`https://ia.ellahfilmes.com/`)
- Gmail OAuth2 credential configurada com permissao de leitura + modificacao

### Risco principal
- **Gmail OAuth2 token expirando:** O n8n usa refresh token, mas se o refresh token for revogado (ex: mudanca de senha, revogacao manual no Google), o workflow para silenciosamente. Mitigacao: monitorar execucoes e configurar alerta de "0 execucoes nas ultimas 2h".

---

## 11. Decisoes Arquiteturais (ADR Summary)

| Decisao | Justificativa |
|---|---|
| Gmail Trigger (polling) em vez de IMAP | OAuth2 ja configurado, messageId nativo, mais confiavel no n8n free |
| Polling 5 min em vez de push (pub/sub) | Volume baixo (5-20/dia), complexidade desproporcional |
| Upload para pasta staging fixa (nao pasta do job) | O ingest cria o registro; a copia para pasta do job e feita na validacao (handler validate.ts ja faz isso) |
| Nenhuma mudanca no backend | Endpoint ja esta 100% pronto, testado E2E, idempotente |
| Nao criar tabela de log separada | Logs do n8n + EF cobrem, volume nao justifica overhead |
| Mark as Read apos processamento (nao antes) | Se falhar, email fica nao lido e sera re-processado |
| Error = nao marca como lido | Garante reprocessamento automatico no proximo ciclo |

---

## 12. Proximos Passos (apos ativar o workflow)

1. **Monitorar por 1 semana** — verificar taxa de auto-match, erros, volume
2. **Ajustar polling interval** se necessario (ex: 2 min se volume crescer)
3. **Implementar alerta Slack** para workflow parado ou erros excessivos
4. **Avaliar OCR automatico** — hoje o OCR (Groq) e acionado manualmente pelo usuario. Se a taxa de auto-match for baixa (< 50%), considerar OCR automatico no ingest para extrair dados do PDF e melhorar o matching
5. **Multi-tenant** — se outros tenants adotarem, criar um workflow por tenant (ou parametrizar o tenant_id no workflow)
