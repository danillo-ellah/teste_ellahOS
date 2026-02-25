# Fase 9: Workflows n8n — Spec de Implementacao

**Data:** 25/02/2026
**Status:** Pronto para implementacao
**Autor:** n8n Workflow Architect — ELLAHOS
**Referencia:** docs/architecture/fase-9-automacoes-architecture.md (secao 5)
**Plano de execucao:** docs/architecture/fase-9-execution-plan.md

---

## Sumario

| Workflow | ID sugerido | Prioridade | Trigger | Nodes |
|----------|-------------|------------|---------|-------|
| [WF-1] NF Processor | `wf-nf-processor` | P0 | Schedule (*/5 * * * *) | ~15 |
| [WF-2] NF Request | `wf-nf-request` | P0 | Webhook POST | ~10 |
| [WF-3] Job Approved (expansao) | `wf-job-approved` | P0 | Webhook POST (existente) | +3 nodes |
| [WF-4] DocuSeal Contracts | `wf-docuseal-contracts` | P1 | Webhook POST | ~12 |

---

## Credenciais Globais (configurar uma vez no n8n)

Antes de implementar qualquer workflow, configurar as seguintes credenciais em
**Settings > Credentials** do n8n:

| Nome da Credencial | Tipo n8n | Servico | Observacao |
|-------------------|----------|---------|------------|
| `Gmail OAuth2 - financeiro` | OAuth2 API | Gmail API | Conta financeiro@ellahfilmes.com. Scopes: gmail.readonly, gmail.modify, gmail.send |
| `Google Drive - Service Account` | Google Service Account | Google Drive API | Service Account existente (reusar da integracao atual) |
| `ELLAHOS Cron Secret` | Header Auth | Supabase Edge Functions | Header: X-Cron-Secret |
| `DocuSeal API Token` | Header Auth | DocuSeal self-hosted | Header: X-Auth-Token |

---

## Variaveis de Ambiente n8n

Configurar em **Settings > Variables** (ou no arquivo .env da instancia n8n):

```
ELLAHOS_BASE_URL=https://etvapcxesaxhsvzgaane.supabase.co/functions/v1
ELLAHOS_CRON_SECRET=<mesmo valor configurado nas Edge Functions>
DOCUSEAL_BASE_URL=https://assinaturas.ellahfilmes.com
DOCUSEAL_API_TOKEN=<token da instancia DocuSeal self-hosted>
ELLAHOS_TENANT_ID=<UUID do tenant Ellah Filmes>
GMAIL_FINANCEIRO=financeiro@ellahfilmes.com
DRIVE_NF_FOLDER_ID=<ID da pasta fin_nf_recebimento no Google Drive>
```

> **IMPORTANTE:** O `ELLAHOS_CRON_SECRET` deve ser identico ao valor configurado
> na variavel de ambiente da Edge Function `nf-processor` no Supabase.

---

## [WF-1] wf-nf-processor

### 1. Identificacao

- **Nome:** `[FINANCEIRO] NF Processor - Gmail Poll`
- **ID sugerido:** `wf-nf-processor`
- **Prioridade:** P0 (critico para operacao financeira)
- **Fase:** 9.2

### 2. Trigger

- **Tipo:** Schedule Trigger
- **Cron:** `*/5 * * * *` (a cada 5 minutos)
- **Timezone:** `America/Sao_Paulo`
- **Primeira execucao:** ao ativar o workflow

### 3. Credenciais Necessarias

| Credencial | Uso no workflow |
|-----------|-----------------|
| `Gmail OAuth2 - financeiro` | Ler emails nao-lidos + marcar como lido |
| `Google Drive - Service Account` | Upload de PDFs para pasta NF |
| `ELLAHOS Cron Secret` | Autenticar chamadas para nf-processor |

### 4. Variaveis de Ambiente Usadas

```
ELLAHOS_BASE_URL
ELLAHOS_CRON_SECRET
ELLAHOS_TENANT_ID
DRIVE_NF_FOLDER_ID
```

### 5. Diagrama do Fluxo

```
[Schedule Trigger]
        |
        v
[Get Unread Emails] ← Gmail IMAP (OAuth2)
        |
        | lista de emails com PDF anexo
        v
[Filter: Has PDF?] ─── NAO ──> [Mark Read + Skip]
        |
       SIM
        |
        v
[Split In Batches] ← 1 email por vez
        |
        v
      LOOP
        |
        +─[Extract Attachment] ← pega o primeiro PDF do email
        |
        +─[Calculate SHA-256] ← Crypto node
        |
        +─[Check Duplicate] ──> GET /nf-processor/check-hash
        |           |
        |      { exists: true } ──> [Mark Email Read] ──> proximo
        |           |
        |      { exists: false }
        |           |
        +─[Upload to Drive] ← Google Drive (Service Account)
        |
        +─[POST /nf-processor/ingest] ← HTTP Request + X-Cron-Secret
        |
        +─[Mark Email Read] ← Gmail (OAuth2)
        |
        +─[IF Error?] ─── SIM ──> [Log Error + Continue]
        |
       FIM DO LOOP
        |
        v
[Error Handler] ← captura falhas do workflow inteiro
```

### 6. Lista de Nodes (numerados)

#### Node 1: Schedule Trigger

- **Tipo:** `Schedule Trigger`
- **Nome:** `Every 5 Minutes`
- **Configuracao:**
  ```
  Rule: Interval
  Every: 5
  Unit: minutes
  ```
- **Output:** trigger data (timestamp)

---

#### Node 2: Get Unread Emails with PDF

- **Tipo:** `Gmail` (operation: getAll)
- **Nome:** `Get Unread NF Emails`
- **Credencial:** `Gmail OAuth2 - financeiro`
- **Configuracao:**
  ```
  Resource: Message
  Operation: Get Many
  Return All: true (ou limit: 50)
  Filters:
    - q: "is:unread has:attachment filename:pdf"
    - includeSpamTrash: false
  ```
- **Alternativa (IMAP):** Se o node Gmail nao suportar o filtro desejado, usar
  o node `Email Read IMAP` com configuracao IMAP do Gmail. Configurar:
  ```
  Host: imap.gmail.com
  Port: 993
  SSL: true
  Mailbox: INBOX
  Action: Read Emails
  Format: Simple
  Only unseen: true
  ```
- **Output:** array de mensagens do Gmail

---

#### Node 3: Filter Has Attachment

- **Tipo:** `Filter` (ou `IF`)
- **Nome:** `Has PDF Attachment?`
- **Configuracao:**
  ```
  Condition: attachments length > 0
  OU verificar se payload.attachments contém filename terminando em .pdf
  ```
- **Notas:** Emails sem PDF sao descartados aqui. Emails com multiplos PDFs:
  processar apenas o primeiro anexo PDF encontrado nesta versao (V1).
- **Output (verdadeiro):** emails com PDF
- **Output (falso):** descartados silenciosamente

---

#### Node 4: Split In Batches

- **Tipo:** `Split In Batches`
- **Nome:** `Process One Email at a Time`
- **Configuracao:**
  ```
  Batch Size: 1
  ```
- **Notas:** Garante que cada email seja processado individualmente.
  Se um falhar, os demais continuam.
- **Output:** 1 email por iteracao

---

#### Node 5: Extract PDF Attachment

- **Tipo:** `Code` (JavaScript)
- **Nome:** `Extract First PDF`
- **Codigo:**
  ```javascript
  const item = $input.item.json;

  // Suporte para formato do node Gmail ou IMAP
  let pdfAttachment = null;

  if (item.attachments && Array.isArray(item.attachments)) {
    pdfAttachment = item.attachments.find(att =>
      att.filename?.toLowerCase().endsWith('.pdf') ||
      att.mimeType === 'application/pdf'
    );
  }

  if (!pdfAttachment) {
    throw new Error('No PDF attachment found in email');
  }

  return [{
    json: {
      emailId: item.id || item.messageId,
      senderEmail: item.from?.value?.[0]?.address || item.from,
      senderName: item.from?.value?.[0]?.name || '',
      subject: item.subject || '',
      receivedAt: item.date || new Date().toISOString(),
      attachment: {
        filename: pdfAttachment.filename || pdfAttachment.fileName,
        mimeType: pdfAttachment.mimeType || 'application/pdf',
        data: pdfAttachment.data || pdfAttachment.content,  // base64
        size: pdfAttachment.size || pdfAttachment.length || 0,
      }
    }
  }];
  ```
- **Output:** objeto com dados do email + PDF em base64

---

#### Node 6: Calculate SHA-256

- **Tipo:** `Crypto`
- **Nome:** `Calculate File Hash`
- **Configuracao:**
  ```
  Action: Hash
  Type: SHA256
  Value: {{ $json.attachment.data }}  (base64 do PDF)
  Property Name: fileHash
  Encoding: hex
  ```
- **Notas:** O hash e calculado sobre o conteudo binario do PDF (base64 decoded).
  Garante que o mesmo arquivo enviado por emails diferentes nao seja processado duas vezes.
- **Output:** adiciona campo `fileHash` ao objeto

---

#### Node 7-8: Deduplicacao (REMOVIDO)

> **NOTA:** O endpoint `check-hash` NAO existe como rota separada.
> A deduplicacao por hash e feita internamente pelo endpoint `ingest` (Node 11).
> Se o hash ja existir, `ingest` retorna `{ "data": { "is_duplicate": true } }` com status 200.
> O workflow deve pular os Nodes 7-8 e ir direto do Node 6 (Calculate Hash)
> para o Node 10 (Upload to Drive) e depois Node 11 (Ingest).
> O `ingest` handler cuida da deduplicacao automaticamente.

---

#### Node 9: Mark Email Read (Duplicate Path)

- **Tipo:** `Gmail`
- **Nome:** `Mark Duplicate as Read`
- **Credencial:** `Gmail OAuth2 - financeiro`
- **Configuracao:**
  ```
  Resource: Message
  Operation: Mark As Read
  Message ID: {{ $('Extract First PDF').item.json.emailId }}
  ```
- **Notas:** Para o loop e continua com o proximo email. Nao gera erro.

---

#### Node 10: Upload PDF to Drive

- **Tipo:** `Google Drive`
- **Nome:** `Upload NF to Drive`
- **Credencial:** `Google Drive - Service Account`
- **Configuracao:**
  ```
  Resource: File
  Operation: Upload

  File Name: NF_{{ $('Extract First PDF').item.json.senderName | replace(' ', '_') }}_{{ $now.format('YYYYMMDD_HHmmss') }}_{{ $('Extract First PDF').item.json.attachment.filename }}

  Parent Folder ID: {{ $env.DRIVE_NF_FOLDER_ID }}

  MIME Type: application/pdf
  Binary Data: true
  Binary Property: data (apontando para o base64 do PDF)
  ```
- **Notas:**
  - O nome do arquivo deve ser unico. Usar timestamp + nome original.
  - A pasta `DRIVE_NF_FOLDER_ID` e a pasta `fin_nf_recebimento` configurada no Drive.
  - Permissoes: Service Account deve ter acesso Editor na pasta.
- **Output:** `{ id: "drive-file-id", webViewLink: "https://drive.google.com/..." }`

---

#### Node 11: POST Ingest Callback

- **Tipo:** `HTTP Request`
- **Nome:** `Ingest NF in ELLAHOS`
- **Configuracao:**
  ```
  Method: POST
  URL: {{ $env.ELLAHOS_BASE_URL }}/nf-processor/ingest
  Headers:
    Content-Type: application/json
    X-Cron-Secret: {{ $env.ELLAHOS_CRON_SECRET }}
  Body (JSON):
  {
    "tenant_id": "{{ $env.ELLAHOS_TENANT_ID }}",
    "gmail_message_id": "{{ $('Extract First PDF').item.json.emailId }}",
    "sender_email": "{{ $('Extract First PDF').item.json.senderEmail }}",
    "sender_name": "{{ $('Extract First PDF').item.json.senderName }}",
    "subject": "{{ $('Extract First PDF').item.json.subject }}",
    "received_at": "{{ $('Extract First PDF').item.json.receivedAt }}",
    "file_name": "{{ $('Extract First PDF').item.json.attachment.filename }}",
    "file_hash": "{{ $('Calculate File Hash').item.json.fileHash }}",
    "file_size_bytes": {{ $('Extract First PDF').item.json.attachment.size }},
    "drive_file_id": "{{ $('Upload NF to Drive').item.json.id }}",
    "drive_url": "{{ $('Upload NF to Drive').item.json.webViewLink }}"
  }
  ```
- **Output esperado:**
  ```json
  {
    "data": {
      "nf_document_id": "uuid",
      "status": "pending_review",
      "is_duplicate": false,
      "match": {
        "financial_record_id": "uuid",
        "description": "Uber equipe",
        "amount": 350.00,
        "confidence": 0.95
      }
    }
  }
  ```

---

#### Node 12: Mark Email Read (Success Path)

- **Tipo:** `Gmail`
- **Nome:** `Mark Email as Read`
- **Credencial:** `Gmail OAuth2 - financeiro`
- **Configuracao:**
  ```
  Resource: Message
  Operation: Mark As Read
  Message ID: {{ $('Extract First PDF').item.json.emailId }}
  ```

---

#### Node 13: IF Ingest Error

- **Tipo:** `IF`
- **Nome:** `Ingest Succeeded?`
- **Configuracao:**
  ```
  Condition: HTTP status code do Node 11 === 200 (ou 201)
  Alternativa: verificar se $json.data.nf_document_id existe
  ```
- **Output (true):** fim do loop para este email, proximo
- **Output (false):** vai para Node 14 (Log Error)

---

#### Node 14: Log Error (per email)

- **Tipo:** `Code`
- **Nome:** `Log Ingest Error`
- **Codigo:**
  ```javascript
  const emailId = $('Extract First PDF').item.json.emailId;
  const error = $input.item.json;

  console.error(`[wf-nf-processor] Falha ao ingerir email ${emailId}:`, JSON.stringify(error));

  // Continua sem falhar o workflow inteiro
  return [{ json: { skipped: true, emailId, reason: 'ingest_failed' } }];
  ```
- **Notas:** Nao relanca o erro. O loop continua com o proximo email.

---

#### Node 15: Error Handler (Workflow)

- **Tipo:** `Error Trigger` (separado, conectado como Error Workflow)
- **Nome:** `NF Processor Error Handler`
- **Configuracao no workflow principal:**
  ```
  Settings > Error Workflow: selecionar este workflow de erro
  ```
- **O que faz:**
  - Recebe dados do erro fatal do workflow
  - Envia notificacao (pode ser via HTTP para endpoint de notificacoes do ELLAHOS)
  - Loga timestamp, node que falhou, mensagem de erro

---

### 7. Payload de Entrada

Nao se aplica (trigger e schedule, nao webhook).

### 8. Payload de Callback (enviado ao ELLAHOS)

POST `{{ ELLAHOS_BASE_URL }}/nf-processor/ingest`:

```json
{
  "tenant_id": "uuid-do-tenant",
  "gmail_message_id": "18d3a7b2c1e4f890",
  "sender_email": "fornecedor@empresa.com.br",
  "sender_name": "EMPRESA LTDA",
  "subject": "Nota Fiscal - Servicos Prestados - Fevereiro/2026",
  "received_at": "2026-02-25T14:30:00.000Z",
  "file_name": "NF_1234.pdf",
  "file_hash": "a3b4c5d6e7f8...(SHA-256 hex)",
  "file_size_bytes": 125340,
  "drive_file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "drive_url": "https://drive.google.com/file/d/1BxiMVs0.../view"
}
```

### 9. Cenarios de Erro e Comportamento

| Cenario | Comportamento |
|---------|---------------|
| Gmail API indisponivel | Workflow falha no Node 2. Error Handler notifica. Proxima execucao em 5 min tenta novamente. |
| Drive upload falha | Node 10 falha. Email NAO e marcado como lido. Na proxima execucao, o email sera processado novamente (idempotente via hash check). |
| ELLAHOS ingest falha (500) | Node 13 detecta erro. Email NAO e marcado como lido. Arquivo ja esta no Drive. Na proxima execucao, hash check detecta duplicata e pula o upload, mas tenta o ingest novamente. |
| PDF corrompido / ilegivel | SHA-256 ainda funciona. Drive aceita. ELLAHOS registra com status `pending_review`. |
| Email com multiplos PDFs | Apenas o primeiro PDF e processado (V1). Melhorar em V2 para processar todos. |
| ELLAHOS retorna `is_duplicate: true` | Edge Function nao cria novo registro. Workflow marca email como lido e segue. |

### 10. Notas de Implementacao

1. **Ordem das credenciais Gmail:** A credencial OAuth2 precisa ser autorizada com a conta
   `financeiro@ellahfilmes.com`. Acessar Settings > Credentials > Gmail OAuth2 > conectar conta.

2. **Filtro Gmail:** O filtro `has:attachment filename:pdf` pode ser refinado com uma label
   especifica. Recomendado criar a label `NF-Pendente` no Gmail e configurar um filtro automatico
   no Gmail para emails com PDF de determinados dominios receberem essa label. Assim o n8n
   usa `label:NF-Pendente` para ser mais preciso.

3. **Rate limiting Gmail:** A Gmail API tem limite de 1 bilhao de unidades por dia e 250 unidades
   por usuario por segundo. Com execucao a cada 5 min e ~50 emails max, e seguro.

4. **Pasta Drive:** A pasta `fin_nf_recebimento` deve ser criada manualmente no Drive e o ID
   configurado em `DRIVE_NF_FOLDER_ID`. O Service Account deve ter permissao de Editor nessa pasta.

5. **Idempotencia garantida:** O hash SHA-256 do PDF garante que o mesmo arquivo enviado duas
   vezes (ou o workflow reprocessando o mesmo email) nao gera duplicata no banco. O endpoint
   `check-hash` e consultado ANTES do upload para evitar uploads desnecessarios.

6. **Multi-tenant:** Nesta versao, o workflow e configurado para um tenant especifico via
   `ELLAHOS_TENANT_ID`. Para multi-tenant, seria necessario um workflow por tenant ou logica
   adicional de roteamento.

---

## [WF-2] wf-nf-request

### 1. Identificacao

- **Nome:** `[FINANCEIRO] NF Request - Enviar Email Fornecedor`
- **ID sugerido:** `wf-nf-request`
- **Prioridade:** P0
- **Fase:** 9.3

### 2. Trigger

- **Tipo:** Webhook
- **Metodo:** POST
- **Path:** `/webhook/nf-request`
- **Autenticacao:** Header `X-Cron-Secret` (validado manualmente no Node 2)
- **Chamado por:** `integration-processor` Edge Function quando processa evento `nf_email_send`

### 3. Credenciais Necessarias

| Credencial | Uso no workflow |
|-----------|-----------------|
| `Gmail OAuth2 - financeiro` | Enviar email via Gmail API |
| `ELLAHOS Cron Secret` | Validar chamadas de entrada do integration-processor |

### 4. Variaveis de Ambiente Usadas

```
ELLAHOS_BASE_URL
ELLAHOS_CRON_SECRET
GMAIL_FINANCEIRO
```

### 5. Diagrama do Fluxo

```
[Webhook POST /webhook/nf-request]
        |
        v
[Validate Secret + Payload]
        |
        | campos obrigatorios OK?
        v
[Validate Required Fields] ─── INVALIDO ──> [Return 400 Error]
        |
       OK
        |
        v
[Build HTML Email] ← Code node (template HTML)
        |
        v
[Send via Gmail API]
        |
        +── SUCESSO ──> [POST /nf-processor/request-sent-callback (success)]
        |                           |
        |                           v
        |                     [Return 200 OK]
        |
        +── FALHA ──> [POST /nf-processor/request-sent-callback (error)]
                                    |
                                    v
                              [Return 500 Error]
        |
        v
[Error Handler]
```

### 6. Lista de Nodes (numerados)

#### Node 1: Webhook Trigger

- **Tipo:** `Webhook`
- **Nome:** `NF Request Webhook`
- **Configuracao:**
  ```
  HTTP Method: POST
  Path: nf-request
  Authentication: None (validacao manual no proximo node)
  Response Mode: Last Node (retorna resposta do ultimo node)
  ```
- **Output:** payload completo do POST

---

#### Node 2: Validate Secret and Payload

- **Tipo:** `Code`
- **Nome:** `Validate Request`
- **Codigo:**
  ```javascript
  const headers = $input.item.json.headers;
  const body = $input.item.json.body;

  // Validar X-Cron-Secret
  const secret = headers['x-cron-secret'] || headers['X-Cron-Secret'];
  if (secret !== $env.ELLAHOS_CRON_SECRET) {
    throw new Error('Unauthorized: invalid cron secret');
  }

  // Validar campos obrigatorios
  const required = ['tenant_id', 'supplier_email', 'supplier_name', 'items', 'company_info', 'job_code', 'financial_record_ids'];
  const missing = required.filter(f => !body[f]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validar itens
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('items must be a non-empty array');
  }

  // Validar email do fornecedor
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.supplier_email)) {
    throw new Error(`Invalid supplier email: ${body.supplier_email}`);
  }

  return [{ json: body }];
  ```
- **Notas:** Se a validacao falhar, o node lanca um erro que e capturado pelo Error Handler.

---

#### Node 3: Build HTML Email

- **Tipo:** `Code`
- **Nome:** `Build Email HTML`
- **Codigo:**
  ```javascript
  const {
    supplier_name,
    supplier_email,
    items,
    company_info,
    job_code,
    custom_message,
    financial_record_ids
  } = $input.item.json;

  // Formatar valores em Real brasileiro
  const formatBRL = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Gerar linhas da tabela de itens
  const itemRows = items.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
      <td style="padding: 8px 12px; border: 1px solid #e0e0e0;">${index + 1}</td>
      <td style="padding: 8px 12px; border: 1px solid #e0e0e0;">${item.description}</td>
      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; text-align: right; font-weight: bold;">${formatBRL(item.value)}</td>
    </tr>
  `).join('');

  // Total dos itens
  const total = items.reduce((sum, item) => sum + (item.value || 0), 0);

  // Data formatada
  const hoje = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date());

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">

    <div style="border-bottom: 3px solid #09090B; padding-bottom: 16px; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #09090B; font-size: 18px;">ELLAH FILMES</h2>
      <p style="margin: 4px 0 0; color: #666; font-size: 13px;">Pedido de Emissao de Nota Fiscal</p>
    </div>

    <p>Sao Paulo, ${hoje}</p>

    <p>Prezado(a) <strong>${supplier_name}</strong>,</p>

    <p>
      Solicitamos o envio da(s) Nota(s) Fiscal(is) referente(s) aos servicos prestados
      para a produtora <strong>Ellah Filmes</strong>, conforme discriminado abaixo:
    </p>

    ${custom_message ? `<p style="background: #f5f5f5; padding: 12px; border-left: 3px solid #09090B; margin: 16px 0;">${custom_message}</p>` : ''}

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #09090B; color: white;">
          <th style="padding: 10px 12px; border: 1px solid #333; text-align: left; width: 40px;">#</th>
          <th style="padding: 10px 12px; border: 1px solid #333; text-align: left;">Descricao do Servico</th>
          <th style="padding: 10px 12px; border: 1px solid #333; text-align: right; width: 120px;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
      <tfoot>
        <tr style="background-color: #09090B; color: white;">
          <td colspan="2" style="padding: 10px 12px; border: 1px solid #333; font-weight: bold;">TOTAL</td>
          <td style="padding: 10px 12px; border: 1px solid #333; text-align: right; font-weight: bold;">${formatBRL(total)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; font-size: 14px; color: #09090B;">Dados para Emissao da Nota Fiscal:</h3>
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="padding: 3px 0; color: #666; width: 140px;">Razao Social:</td><td><strong>${company_info.name}</strong></td></tr>
        <tr><td style="padding: 3px 0; color: #666;">CNPJ:</td><td>${company_info.cnpj}</td></tr>
        <tr><td style="padding: 3px 0; color: #666;">Endereco:</td><td>${company_info.address || 'a confirmar'}</td></tr>
        <tr><td style="padding: 3px 0; color: #666;">Municipio:</td><td>${company_info.city || 'Sao Paulo'}</td></tr>
        <tr><td style="padding: 3px 0; color: #666;">Job:</td><td>${job_code}</td></tr>
      </table>
    </div>

    <p style="background: #fff8e1; border: 1px solid #f9a825; border-radius: 4px; padding: 12px; font-size: 13px;">
      Por favor, envie a nota fiscal (PDF) como <strong>resposta a este email</strong> ou
      diretamente para: <strong>financeiro@ellahfilmes.com</strong>
    </p>

    <p style="margin-top: 24px;">Atenciosamente,</p>
    <p style="margin: 4px 0;"><strong>Equipe Financeiro — Ellah Filmes</strong></p>
    <p style="margin: 4px 0; color: #666; font-size: 12px;">financeiro@ellahfilmes.com</p>

  </body>
  </html>
  `;

  const subject = `Ellah Filmes - Pedido de NF - Job ${job_code}`;

  return [{
    json: {
      ...$input.item.json,
      emailHtml: html,
      emailSubject: subject,
    }
  }];
  ```
- **Output:** objeto com `emailHtml` e `emailSubject` adicionados

---

#### Node 4: Send Email via Gmail

- **Tipo:** `Gmail`
- **Nome:** `Send NF Request Email`
- **Credencial:** `Gmail OAuth2 - financeiro`
- **Configuracao:**
  ```
  Resource: Message
  Operation: Send

  To: {{ $json.supplier_email }}
  Subject: {{ $json.emailSubject }}
  Message: {{ $json.emailHtml }}
  Message Type: HTML

  Reply To: financeiro@ellahfilmes.com

  Options:
    From: ELLAH FILMES <financeiro@ellahfilmes.com>
  ```
- **Output:** `{ id: "gmail-message-id", threadId: "..." }`

---

#### Node 5: POST Success Callback

- **Tipo:** `HTTP Request`
- **Nome:** `Notify ELLAHOS - Success`
- **Configuracao:**
  ```
  Method: POST
  URL: {{ $env.ELLAHOS_BASE_URL }}/nf-processor/request-sent-callback
  Headers:
    Content-Type: application/json
    X-Cron-Secret: {{ $env.ELLAHOS_CRON_SECRET }}
  Body (JSON):
  {
    "financial_record_ids": {{ $('Validate Request').item.json.financial_record_ids }},
    "gmail_message_id": "{{ $('Send NF Request Email').item.json.id }}",
    "sent_at": "{{ $now.toISO() }}",
    "status": "sent"
  }
  ```
- **Output esperado:**
  ```json
  { "data": { "updated": 3, "nf_request_status": "enviado_confirmado" } }
  ```

---

#### Node 6: Respond to Webhook (Success)

- **Tipo:** `Respond to Webhook`
- **Nome:** `Return 200 OK`
- **Configuracao:**
  ```
  Respond With: JSON
  Response Code: 200
  Response Body:
  {
    "success": true,
    "gmail_message_id": "{{ $('Send NF Request Email').item.json.id }}",
    "sent_to": "{{ $('Validate Request').item.json.supplier_email }}"
  }
  ```

---

#### Node 7: Error Handler (Gmail Failed)

- **Tipo:** `Code` (chamado quando Node 4 falha)
- **Nome:** `Handle Gmail Error`
- **Codigo:**
  ```javascript
  const payload = $('Validate Request').item.json;
  const errorMsg = $input.item.json.error || 'Unknown error sending email';

  console.error('[wf-nf-request] Gmail send failed:', errorMsg);

  // Enviar callback de erro para ELLAHOS
  const callbackPayload = {
    financial_record_ids: payload.financial_record_ids,
    gmail_message_id: null,
    sent_at: new Date().toISOString(),
    status: 'error',
    error_message: errorMsg,
  };

  return [{ json: callbackPayload }];
  ```

---

#### Node 8: POST Error Callback

- **Tipo:** `HTTP Request`
- **Nome:** `Notify ELLAHOS - Error`
- **Configuracao:**
  ```
  Method: POST
  URL: {{ $env.ELLAHOS_BASE_URL }}/nf-processor/request-sent-callback
  Headers:
    Content-Type: application/json
    X-Cron-Secret: {{ $env.ELLAHOS_CRON_SECRET }}
  Body: {{ $json }}  (usa o output do Node 7)
  ```

---

#### Node 9: Respond to Webhook (Error)

- **Tipo:** `Respond to Webhook`
- **Nome:** `Return 500 Error`
- **Configuracao:**
  ```
  Respond With: JSON
  Response Code: 500
  Response Body:
  {
    "success": false,
    "error": "Failed to send email via Gmail"
  }
  ```

---

#### Node 10: Error Handler (Workflow)

- **Tipo:** `Error Trigger` (workflow separado de erro)
- **Nome:** `NF Request Error Handler`
- **O que faz:**
  - Captura falhas fatais (ex: validacao de secret, payload invalido)
  - Loga o erro
  - Pode notificar via webhook para ELLAHOS

---

### 7. Payload de Entrada (Webhook)

Enviado pelo `integration-processor` Edge Function quando processa evento `nf_email_send`:

```json
{
  "tenant_id": "uuid-do-tenant",
  "supplier_email": "fornecedor@empresa.com.br",
  "supplier_name": "EMPRESA PRESTADORA LTDA",
  "items": [
    {
      "description": "Servico de transporte equipe - Job 038",
      "value": 1500.00
    },
    {
      "description": "Alimentacao equipe - diaria 1",
      "value": 350.00
    }
  ],
  "company_info": {
    "name": "ELLAH FILMES PRODUCOES LTDA",
    "cnpj": "XX.XXX.XXX/0001-XX",
    "address": "Rua Exemplo, 123 - Vila Madalena",
    "city": "Sao Paulo - SP",
    "cep": "05000-000"
  },
  "job_code": "038_Senac",
  "financial_record_ids": ["uuid-1", "uuid-2"],
  "custom_message": "Prazo para envio: 5 dias uteis."
}
```

### 8. Payload de Callback (enviado ao ELLAHOS)

POST `{{ ELLAHOS_BASE_URL }}/nf-processor/request-sent-callback`:

**Sucesso:**
```json
{
  "financial_record_ids": ["uuid-1", "uuid-2"],
  "gmail_message_id": "18d3a7b2c1e4f890",
  "sent_at": "2026-02-25T15:00:00.000Z",
  "status": "sent"
}
```

**Erro:**
```json
{
  "financial_record_ids": ["uuid-1", "uuid-2"],
  "gmail_message_id": null,
  "sent_at": "2026-02-25T15:00:00.000Z",
  "status": "error",
  "error_message": "Gmail API: Daily sending limit exceeded"
}
```

### 9. Cenarios de Erro e Comportamento

| Cenario | Comportamento |
|---------|---------------|
| Secret invalido (Node 2) | Retorna 401. Workflow para. Integration-processor recebe erro e loga. |
| Payload invalido / email vazio (Node 2) | Retorna 400. Workflow para. |
| Gmail API indisponivel | Node 4 falha. Error handler (Node 7) chama callback com status `error`. ELLAHOS mantem `nf_request_status = 'enviado'` (nao confirmado). |
| Email nao entrega (bounce) | Gmail API retorna sucesso. O bounce chegara ao inbox financeiro@ellahfilmes.com. Fora do escopo desta versao. |
| Fornecedor sem email | A Edge Function `nf-processor/request-send` deve rejeitar antes de criar o evento. O payload nao chegara ao n8n. |

### 10. Notas de Implementacao

1. **Agrupamento por fornecedor:** A Edge Function `request-send` deve agrupar os
   `financial_record_ids` por `supplier_email` e criar um evento por fornecedor. Cada evento
   gera uma chamada separada ao webhook n8n. O n8n nao precisa agrupar.

2. **Encoding do HTML:** O Gmail node do n8n exige que o HTML seja passado como string.
   Verificar se ha escape de aspas necessario no Code node ao compor o JSON.

3. **Reply-To:** O campo `Reply-To` e importante para que a resposta do fornecedor (com a NF
   em anexo) chegue ao inbox correto e seja capturada pelo wf-nf-processor.

4. **company_info:** Os dados da Ellah Filmes (CNPJ, endereco) devem ser mantidos atualizados.
   Podem vir do payload do evento (mais flexivel) ou de variaveis de ambiente do n8n.

---

## [WF-3] wf-job-approved (Expansao)

### 1. Identificacao

- **Nome:** `[JOBS] Job Approved - Drive + Notificacoes + JOB_FECHADO` (nome atualizado)
- **ID:** `wf-job-approved` (EXISTENTE — adicionar nodes ao final)
- **Prioridade:** P0
- **Fase:** 9.4
- **Natureza:** EXPANSAO de workflow existente. NAO criar novo workflow.

### 2. Trigger

Manter o trigger existente (Webhook POST). Este documento descreve apenas os 3 nodes
a serem adicionados ao final do workflow atual.

### 3. Credenciais Necessarias

Nenhuma nova credencial. O sub-workflow `JOB_FECHADO_CRIACAO` ja tem suas proprias
credenciais configuradas (Z-API para WhatsApp).

### 4. Variaveis de Ambiente Usadas

Nenhuma nova. O sub-workflow `JOB_FECHADO_CRIACAO` usa suas proprias variaveis.

### 5. Diagrama do Fluxo

```
[... NODES EXISTENTES DO wf-job-approved ...]
        |
        | (ultimo node atual — ex: notificacao de sucesso)
        v
[Node A: Map Payload] ← Set node — mapear campos ELLAHOS -> JOB_FECHADO_CRIACAO
        |
        v
[Node B: Execute Sub-Workflow] ← JOB_FECHADO_CRIACAO
        |
        +── SUCESSO ──> [FIM — nao bloqueia]
        |
        +── FALHA ────> [Node C: Log Sub-Workflow Error]
                               |
                               v
                        [FIM — nao bloqueia wf-job-approved]
```

### 6. Nodes a Adicionar

#### Node A: Map Payload to JOB_FECHADO_CRIACAO Format

- **Tipo:** `Set`
- **Nome:** `Map to JOB_FECHADO_CRIACAO Payload`
- **Posicao no fluxo:** Imediatamente apos o ultimo node de sucesso atual do wf-job-approved
- **Configuracao (campos mapeados):**

  O formato exato dos campos depende do que o `JOB_FECHADO_CRIACAO` espera. Os campos abaixo
  sao os mais provaveis baseados na analise do ecossistema:

  ```
  Modo: Manual Mapping

  numero      = {{ $('...').item.json.job_code }}         (code do job, ex: "038")
  job_aba     = {{ $('...').item.json.job_aba }}          (slug, ex: "038_Senac")
  nome        = {{ $('...').item.json.title }}            (titulo do job)
  cliente     = {{ $('...').item.json.client_name }}      (nome do cliente)
  agencia     = {{ $('...').item.json.agency_name }}      (nome da agencia, pode ser null)
  diretor     = {{ $('...').item.json.director }}
  pe          = {{ $('...').item.json.executive_producer }}
  valor       = {{ $('...').item.json.closed_value }}
  pasta_url   = {{ $('...').item.json.drive_folder_url }} (URL raiz da pasta Drive)
  status      = "aprovado"
  data_aprovacao = {{ $now.toISO() }}
  ```

  > **ATENCAO:** Verificar o workflow `JOB_FECHADO_CRIACAO` para confirmar os nomes
  > exatos dos campos esperados. Ajustar este mapeamento conforme necessario antes
  > de ativar.

- **Output:** objeto com campos no formato do JOB_FECHADO_CRIACAO

---

#### Node B: Execute JOB_FECHADO_CRIACAO Sub-Workflow

- **Tipo:** `Execute Sub-Workflow`
- **Nome:** `Trigger JOB_FECHADO_CRIACAO`
- **Configuracao:**
  ```
  Workflow: JOB_FECHADO_CRIACAO  (selecionar pelo nome/ID)
  Wait for sub-workflow: true (aguardar resultado para tratar erros)
  Input Data: usar output do Node A (payload mapeado)
  ```
- **Notas:**
  - O sub-workflow `JOB_FECHADO_CRIACAO` usa Z-API para criar 4 grupos WhatsApp.
  - Nao alterar o JOB_FECHADO_CRIACAO. Ele continua funcionando como esta.
  - Se o JOB_FECHADO_CRIACAO falhar internamente (ex: Z-API fora), ele pode retornar erro
    ou ficar em timeout. O Node C trata isso.

---

#### Node C: Log Sub-Workflow Error

- **Tipo:** `Code`
- **Nome:** `Log JOB_FECHADO Error`
- **Conexao:** deve ser conectado como handler de erro do Node B (seta vermelha "on error")
- **Codigo:**
  ```javascript
  const jobCode = $('Map to JOB_FECHADO_CRIACAO Payload').item.json.numero;
  const error = $input.item.json;

  console.warn(
    `[wf-job-approved] JOB_FECHADO_CRIACAO falhou para job ${jobCode}.`,
    'O wf-job-approved foi concluido com sucesso. Apenas a criacao de grupos WhatsApp falhou.',
    JSON.stringify(error)
  );

  // NAO relanca o erro — o wf-job-approved deve ser considerado bem-sucedido
  // mesmo que o JOB_FECHADO_CRIACAO tenha falhado
  return [{ json: { subworkflow_status: 'failed', jobCode, logged: true } }];
  ```
- **Notas:**
  - Este node captura a falha do sub-workflow e a trata como aviso, nao como erro fatal.
  - O wf-job-approved continua e retorna sucesso para o integration-processor.
  - A falha e logada para analise posterior.
  - Futuramente, pode-se adicionar uma notificacao ao admin via ELLAHOS neste node.

---

### 7. Payload de Entrada

Manter o payload existente do wf-job-approved. Os 3 novos nodes usam os dados
que ja estao disponiveis no contexto do workflow.

### 8. Mapeamento de Campos ELLAHOS → JOB_FECHADO_CRIACAO

| Campo ELLAHOS (Edge Function) | Campo JOB_FECHADO_CRIACAO | Observacao |
|-------------------------------|--------------------------|------------|
| `code` (ex: "038") | `numero` | Numero do job |
| `job_aba` (ex: "038_Senac") | `job_aba` | Slug usado em nomes de arquivos |
| `title` | `nome` | Nome/titulo do job |
| `client_name` | `cliente` | Nome do cliente |
| `agency_name` | `agencia` | Pode ser null |
| `director` | `diretor` | |
| `executive_producer` | `pe` | Produtor executivo |
| `closed_value` | `valor` | Valor fechado |
| `drive_folder_url` | `pasta_url` | URL da pasta raiz no Drive |

> Este mapeamento deve ser confirmado analisando o workflow `JOB_FECHADO_CRIACAO`
> diretamente no n8n antes de implementar.

### 9. Cenarios de Erro e Comportamento

| Cenario | Comportamento |
|---------|---------------|
| Z-API fora do ar | JOB_FECHADO_CRIACAO falha. Node C loga aviso. wf-job-approved retorna sucesso. Grupos nao sao criados — tarefa manual. |
| JOB_FECHADO_CRIACAO timeout | Node B espera pelo tempo configurado. Se timeout, Node C captura e loga. |
| Campos de mapeamento diferentes | O Node A precisa ser ajustado para os campos corretos antes de ativar. |
| wf-job-approved ja tinha erro antes do Node A | Os novos nodes nao sao executados. Comportamento atual mantido. |

### 10. Notas de Implementacao

1. **Localizar o ultimo node do wf-job-approved:** Antes de adicionar os novos nodes,
   mapear o fluxo atual para identificar qual e o ultimo node de sucesso. Os 3 novos nodes
   devem ser conectados apos ele.

2. **Nao alterar JOB_FECHADO_CRIACAO:** O workflow existente usa Z-API (nao Evolution API).
   A migracao para Evolution API e escopo da Fase 10. Por ora, chamar como sub-workflow e
   suficiente.

3. **Modo fail-safe:** A conexao de erro do Node B (Execute Sub-Workflow) deve ir para o
   Node C. Isso garante que mesmo que o sub-workflow falhe, o wf-job-approved completa
   com sucesso (retorna 200 para o integration-processor).

4. **Teste manual antes de ativar:** Executar o wf-job-approved manualmente com um job
   de teste para verificar que o mapeamento esta correto e que o JOB_FECHADO_CRIACAO
   e chamado corretamente.

---

## [WF-4] wf-docuseal-contracts

### 1. Identificacao

- **Nome:** `[CONTRATOS] DocuSeal - Criar Submissions em Lote`
- **ID sugerido:** `wf-docuseal-contracts`
- **Prioridade:** P1
- **Fase:** 9.5

### 2. Trigger

- **Tipo:** Webhook
- **Metodo:** POST
- **Path:** `/webhook/docuseal-contracts`
- **Autenticacao:** Header `X-Cron-Secret` (validado manualmente no Node 2)
- **Chamado por:** `integration-processor` Edge Function quando processa evento `docuseal_create_batch`

### 3. Credenciais Necessarias

| Credencial | Uso no workflow |
|-----------|-----------------|
| `DocuSeal API Token` | Criar submissions na API do DocuSeal |
| `ELLAHOS Cron Secret` | Validar chamadas de entrada do integration-processor |

### 4. Variaveis de Ambiente Usadas

```
ELLAHOS_BASE_URL
ELLAHOS_CRON_SECRET
DOCUSEAL_BASE_URL
DOCUSEAL_API_TOKEN
```

### 5. Diagrama do Fluxo

```
[Webhook POST /webhook/docuseal-contracts]
        |
        v
[Validate Secret + Payload]
        |
        v
[Split Submissions Array] ← dividir array de submissions
        |
        v
      LOOP (para cada submission)
        |
        +─[Validate Submission Data] ─── INVALIDO ──> [Callback Error (item)]
        |                                                       |
        |                                               proximo item
        |
        +─[POST DocuSeal API] ← /api/submissions
        |           |
        |      SUCESSO ──> [POST /submission-created-callback (success)]
        |           |
        |      FALHA ───> [Log DocuSeal Error] ──> [POST /submission-created-callback (error)]
        |
       FIM DO LOOP
        |
        v
[Aggregate Results]
        |
        v
[Respond to Webhook] ← retornar resumo do batch
        |
        v
[Error Handler]
```

### 6. Lista de Nodes (numerados)

#### Node 1: Webhook Trigger

- **Tipo:** `Webhook`
- **Nome:** `DocuSeal Contracts Webhook`
- **Configuracao:**
  ```
  HTTP Method: POST
  Path: docuseal-contracts
  Authentication: None (validacao manual no Node 2)
  Response Mode: Last Node
  ```

---

#### Node 2: Validate Secret and Payload

- **Tipo:** `Code`
- **Nome:** `Validate Request`
- **Codigo:**
  ```javascript
  const headers = $input.item.json.headers;
  const body = $input.item.json.body;

  // Validar X-Cron-Secret
  const secret = headers['x-cron-secret'] || headers['X-Cron-Secret'];
  if (secret !== $env.ELLAHOS_CRON_SECRET) {
    throw new Error('Unauthorized: invalid cron secret');
  }

  // Validar estrutura
  if (!body.job_id || !body.submissions || !Array.isArray(body.submissions)) {
    throw new Error('Invalid payload: job_id and submissions array are required');
  }

  if (body.submissions.length === 0) {
    throw new Error('submissions array must not be empty');
  }

  if (body.submissions.length > 20) {
    throw new Error('Too many submissions in a single batch (max: 20)');
  }

  return [{ json: body }];
  ```

---

#### Node 3: Split Submissions

- **Tipo:** `Split Out` (ou `Split In Batches` com batch size 1)
- **Nome:** `Split Submissions Array`
- **Configuracao:**
  ```
  Field To Split: submissions
  ```
- **Output:** um item por submission

---

#### Node 4: Validate Submission Item

- **Tipo:** `Code`
- **Nome:** `Validate Submission Item`
- **Codigo:**
  ```javascript
  const submission = $input.item.json;
  const jobId = $('Validate Request').item.json.job_id;

  // Campos obrigatorios por submission
  const required = ['ellahos_submission_id', 'person_name', 'person_email', 'template_id', 'contract_data'];
  const missing = required.filter(f => !submission[f]);

  if (missing.length > 0) {
    // Marcar como invalido mas NAO lancar erro (para nao parar o loop)
    return [{
      json: {
        ...submission,
        job_id: jobId,
        _valid: false,
        _error: `Missing required fields: ${missing.join(', ')}`
      }
    }];
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(submission.person_email)) {
    return [{
      json: {
        ...submission,
        job_id: jobId,
        _valid: false,
        _error: `Invalid email: ${submission.person_email}`
      }
    }];
  }

  return [{
    json: {
      ...submission,
      job_id: jobId,
      _valid: true,
    }
  }];
  ```
- **Output:** objeto com `_valid: true/false` e `_error` (se invalido)

---

#### Node 5: IF Item is Valid

- **Tipo:** `IF`
- **Nome:** `Is Valid Submission?`
- **Configuracao:**
  ```
  Condition: {{ $json._valid }} === true
  ```
- **Output (true):** vai para Node 6 (POST DocuSeal)
- **Output (false):** vai para Node 8 (Error Callback)

---

#### Node 6: POST DocuSeal API

- **Tipo:** `HTTP Request`
- **Nome:** `Create DocuSeal Submission`
- **Configuracao:**
  ```
  Method: POST
  URL: {{ $env.DOCUSEAL_BASE_URL }}/api/submissions
  Headers:
    Content-Type: application/json
    X-Auth-Token: {{ $env.DOCUSEAL_API_TOKEN }}
  Body (JSON):
  {
    "template_id": {{ $json.template_id }},
    "send_email": {{ $json.send_email ?? true }},
    "submitters": [
      {
        "role": "Modelo(a)/Ator(triz)",
        "name": "{{ $json.person_name }}",
        "email": "{{ $json.person_email }}",
        "fields": [
          { "name": "nome_completo", "default_value": "{{ $json.person_name }}" },
          { "name": "cpf", "default_value": "{{ $json.person_cpf ?? '' }}" },
          { "name": "valor_prestacao", "default_value": "{{ $json.contract_data.valor_prestacao }}" },
          { "name": "valor_imagem", "default_value": "{{ $json.contract_data.valor_imagem ?? '' }}" },
          { "name": "valor_agenciamento", "default_value": "{{ $json.contract_data.valor_agenciamento ?? '' }}" },
          { "name": "diarias", "default_value": "{{ $json.contract_data.diarias }}" },
          { "name": "periodo_veiculacao", "default_value": "{{ $json.contract_data.periodo_veiculacao ?? '' }}" },
          { "name": "midias", "default_value": "{{ $json.contract_data.midias ?? '' }}" },
          { "name": "observacoes", "default_value": "{{ $json.contract_data.observacoes ?? '' }}" }
        ]
      }
    ],
    "metadata": {
      "ellahos_submission_id": "{{ $json.ellahos_submission_id }}",
      "job_id": "{{ $json.job_id }}"
    }
  }
  ```
- **Notas:**
  - O `template_id` padrao para contratos de elenco e `3` (configuravel por tenant).
  - O campo `role` deve corresponder EXATAMENTE ao nome do role configurado no template DocuSeal.
  - O DocuSeal envia o email de assinatura automaticamente quando `send_email: true`.
  - Os nomes dos campos (`nome_completo`, `cpf`, etc.) devem corresponder aos campos do template.
- **Output esperado (DocuSeal API):**
  ```json
  {
    "id": 12345,
    "template": { "id": 3, "name": "Contrato Elenco" },
    "submitters": [
      {
        "id": 67890,
        "slug": "abc123",
        "email": "ator@email.com",
        "sent_at": "2026-02-25T15:00:00.000Z"
      }
    ]
  }
  ```

---

#### Node 7: POST Success Callback

> **NOTA:** O endpoint `submission-created-callback` NAO existe como rota separada.
> O handler `create-submission` do ELLAHOS ja chama a DocuSeal API e persiste os dados
> internamente (ver `docuseal-integration/handlers/create-submission.ts`).
> Se o workflow n8n estiver criando submissions diretamente via DocuSeal API
> (sem passar pelo ELLAHOS), use o endpoint `docuseal-integration/webhook`
> que ja processa eventos de status (sent, opened, signed, etc).

- **Tipo:** `HTTP Request`
- **Nome:** `Callback - Submission Created`
- **Configuracao:**
  ```
  Method: POST
  URL: {{ $env.ELLAHOS_BASE_URL }}/docuseal-integration/webhook
  Headers:
    Content-Type: application/json
    X-Webhook-Secret: {{ $env.DOCUSEAL_WEBHOOK_SECRET }}
  Body (JSON):
  {
    "event_type": "form.sent",
    "data": {
      "submission_id": {{ $('Create DocuSeal Submission').item.json.id }},
      "submitters": {{ JSON.stringify($('Create DocuSeal Submission').item.json.submitters) }}
    }
  }
  ```
- **Output esperado:**
  ```json
  { "data": { "processed": true } }
  ```

---

#### Node 8: Log Validation Error

- **Tipo:** `Code`
- **Nome:** `Log Validation Error`
- **Conexao:** saida "false" do Node 5 (item invalido) E saida de erro do Node 6 (DocuSeal falhou)
- **Codigo:**
  ```javascript
  const submission = $('Validate Submission Item').item.json;
  const isValidationError = submission._valid === false;

  const errorMsg = isValidationError
    ? submission._error
    : ($input.item.json.error || 'DocuSeal API error');

  console.error(`[wf-docuseal-contracts] Error for submission ${submission.ellahos_submission_id}:`, errorMsg);

  return [{
    json: {
      ellahos_submission_id: submission.ellahos_submission_id,
      error: errorMsg,
      docuseal_submission_id: null,
      status: 'error',
    }
  }];
  ```

---

#### Node 9: POST Error Callback

- **Tipo:** `HTTP Request`
- **Nome:** `Callback - Submission Error`
- **Configuracao:**
  ```
  Method: POST
  URL: {{ $env.ELLAHOS_BASE_URL }}/docuseal-integration/webhook
  Headers:
    Content-Type: application/json
    X-Webhook-Secret: {{ $env.DOCUSEAL_WEBHOOK_SECRET }}
  Body (JSON):
  {
    "event_type": "form.declined",
    "data": {
      "submission_id": {{ $json.docuseal_submission_id || 0 }},
      "decline_reason": "{{ $json.error }}"
    }
  }
  ```

---

#### Node 10: Aggregate Results

- **Tipo:** `Code`
- **Nome:** `Aggregate Batch Results`
- **Codigo:**
  ```javascript
  const allItems = $input.all();

  let created = 0;
  let errors = 0;
  const results = [];

  for (const item of allItems) {
    const data = item.json;
    if (data.status === 'sent') {
      created++;
      results.push({
        ellahos_submission_id: data.ellahos_submission_id,
        docuseal_submission_id: data.docuseal_submission_id,
        status: 'sent',
      });
    } else {
      errors++;
      results.push({
        ellahos_submission_id: data.ellahos_submission_id,
        status: 'error',
        error: data.error || data.error_message,
      });
    }
  }

  return [{
    json: {
      total: allItems.length,
      created,
      errors,
      results,
    }
  }];
  ```

---

#### Node 11: Respond to Webhook

- **Tipo:** `Respond to Webhook`
- **Nome:** `Return Batch Summary`
- **Configuracao:**
  ```
  Respond With: JSON
  Response Code: 200
  Response Body: {{ $json }}  (output do Node 10)
  ```

---

#### Node 12: Error Handler (Workflow)

- **Tipo:** `Error Trigger` (workflow separado)
- **Nome:** `DocuSeal Contracts Error Handler`
- **O que faz:**
  - Captura erros fatais do workflow (secret invalido, payload malformado)
  - Loga o erro com detalhes
  - Pode notificar admin via ELLAHOS

---

### 7. Payload de Entrada (Webhook)

Enviado pelo `integration-processor` quando processa evento `docuseal_create_batch`:

```json
{
  "job_id": "uuid-do-job",
  "job_code": "038",
  "submissions": [
    {
      "ellahos_submission_id": "uuid-do-docuseal-submission-no-ellahos",
      "person_id": "uuid-da-pessoa-no-ellahos",
      "person_name": "Maria Silva",
      "person_email": "maria.silva@email.com",
      "person_cpf": "123.456.789-00",
      "template_id": 3,
      "send_email": true,
      "contract_data": {
        "valor_prestacao": 5000.00,
        "valor_imagem": 2000.00,
        "valor_agenciamento": 500.00,
        "diarias": 2,
        "periodo_veiculacao": "12 meses",
        "midias": "TV aberta, digital",
        "observacoes": ""
      }
    },
    {
      "ellahos_submission_id": "uuid-outro-docuseal-submission",
      "person_id": "uuid-outra-pessoa",
      "person_name": "Joao Santos",
      "person_email": "joao.santos@email.com",
      "person_cpf": "987.654.321-00",
      "template_id": 3,
      "send_email": true,
      "contract_data": {
        "valor_prestacao": 3000.00,
        "diarias": 1,
        "periodo_veiculacao": "6 meses",
        "midias": "Digital"
      }
    }
  ]
}
```

### 8. Payload de Callback (enviado ao ELLAHOS)

POST `{{ ELLAHOS_BASE_URL }}/docuseal-integration/submission-created-callback` (por submission):

**Sucesso:**
```json
{
  "ellahos_submission_id": "uuid-do-docuseal-submission-no-ellahos",
  "docuseal_submission_id": 12345,
  "docuseal_slug": "abc123xyz",
  "status": "sent",
  "sent_at": "2026-02-25T15:30:00.000Z"
}
```

**Erro:**
```json
{
  "ellahos_submission_id": "uuid-do-docuseal-submission-no-ellahos",
  "docuseal_submission_id": null,
  "status": "error",
  "error_message": "DocuSeal API: template_id 3 not found"
}
```

### 9. Cenarios de Erro e Comportamento

| Cenario | Comportamento |
|---------|---------------|
| Secret invalido | Node 2 lanca erro. Workflow para. Retorna 401. |
| Submission sem email | Node 4 marca `_valid: false`. Node 8 loga. Node 9 envia callback com status error. Loop continua. |
| DocuSeal API fora do ar | Node 6 falha. Node 8 captura. Node 9 envia callback com status error. Loop continua para proximo. |
| Template ID invalido (nao existe) | DocuSeal retorna 404. Node 6 falha. Tratado como erro acima. |
| Role do template nao corresponde | DocuSeal pode retornar 422. Tratado como erro acima. |
| Batch > 20 submissions | Node 2 rejeita com erro. Retorna 400. A Edge Function deve dividir em batches antes de enfileirar. |
| Callback ELLAHOS indisponivel (Node 7 ou 9) | HTTP Request falha. O resultado do loop inclui o erro mas o workflow continua. O status no banco pode ficar desatualizado — a Edge Function deve ter logica de reconciliacao (P2). |

### 10. Notas de Implementacao

1. **Nomes dos roles DocuSeal:** Os roles configurados no template DocuSeal devem ser
   exatamente iguais aos usados no Node 6. Se o template usa "Ator/Atriz", o campo `role`
   no JSON deve ser `"Ator/Atriz"`. Verificar o template no DocuSeal antes de implementar.

2. **Nomes dos campos DocuSeal:** O array `fields` do Node 6 usa nomes como `nome_completo`,
   `cpf`, etc. Esses nomes devem ser identicos aos campos configurados no template DocuSeal.
   Exportar o template e verificar os field names exatos.

3. **Tamanho do batch:** A Edge Function `docuseal-integration/create-submissions` deve
   dividir lotes grandes em batches de no maximo 20 submissions antes de criar os eventos.
   O Node 2 valida esse limite.

4. **Idempotencia:** Se o webhook for chamado duas vezes para o mesmo `ellahos_submission_id`
   (retry do integration-processor), o DocuSeal pode criar uma submission duplicada. Para evitar:
   a Edge Function `docuseal-integration/submission-created-callback` deve verificar se o
   `ellahos_submission_id` ja tem um `docuseal_submission_id` antes de atualizar.

5. **Template configuravel:** O `template_id` vem no payload por submission. Isso permite
   usar diferentes templates (contrato de ator principal vs figurante) em um mesmo batch.
   O default configurado no ELLAHOS e `3` (contrato elenco padrao).

6. **Webhook de retorno do DocuSeal:** Quando o contrato for assinado, o DocuSeal envia
   um webhook diretamente para `ELLAHOS_BASE_URL/docuseal-integration/webhook`. Isso e
   tratado pela Edge Function, nao pelo n8n. Ver documentacao da Edge Function.

---

## Configuracao de Error Workflows

Para todos os workflows, configurar um Error Workflow global ou individual:

### Workflow de Erro Global (Recomendado)

Criar um workflow separado chamado `[SISTEMA] Error Handler Global`:

```
[Error Trigger]
       |
       v
[Code: Format Error]
  - extrair: workflowName, nodeName, errorMessage, timestamp
       |
       v
[HTTP Request: Log to ELLAHOS]
  POST {{ ELLAHOS_BASE_URL }}/notifications
  Headers: X-Cron-Secret
  Body: { type: 'n8n_workflow_error', message: errorDetails }
```

Conectar todos os workflows ao Error Workflow Global em:
**Workflow Settings > Error Workflow > selecionar [SISTEMA] Error Handler Global**

---

## Checklist de Configuracao

Antes de ativar qualquer workflow em producao:

### Credenciais

- [ ] Gmail OAuth2 (`financeiro@ellahfilmes.com`) — autorizar com conta Google correta
- [ ] Google Drive Service Account — verificar que tem acesso a pasta `fin_nf_recebimento`
- [ ] DocuSeal API Token — testar com GET `/api/templates` no Postman antes
- [ ] ELLAHOS Cron Secret — verificar que e o mesmo valor configurado nas Edge Functions

### Variaveis de Ambiente

- [ ] `ELLAHOS_BASE_URL` — confirmar URL da instancia Supabase
- [ ] `ELLAHOS_CRON_SECRET` — copiar do Supabase Vault / .env da Edge Function
- [ ] `ELLAHOS_TENANT_ID` — UUID do tenant Ellah Filmes (buscar em `SELECT id FROM tenants`)
- [ ] `DOCUSEAL_BASE_URL` — `https://assinaturas.ellahfilmes.com`
- [ ] `DOCUSEAL_API_TOKEN` — token configurado no DocuSeal self-hosted
- [ ] `DRIVE_NF_FOLDER_ID` — ID da pasta `fin_nf_recebimento` (extrair da URL do Drive)
- [ ] `GMAIL_FINANCEIRO` — `financeiro@ellahfilmes.com`

### Testes (por workflow)

- [ ] **wf-nf-processor:** Enviar email de teste com PDF para `financeiro@ellahfilmes.com` e verificar registro em `nf_documents`
- [ ] **wf-nf-request:** Acionar via Postman com payload de teste e verificar email enviado + callback
- [ ] **wf-job-approved:** Aprovar um job de teste no ELLAHOS e verificar que JOB_FECHADO_CRIACAO e chamado
- [ ] **wf-docuseal-contracts:** Enviar payload de teste e verificar submission criada no DocuSeal + callback

### Verificacoes de Seguranca

- [ ] Endpoints do n8n (webhooks) devem estar acessiveis somente pela VPS Hetzner ou via autenticacao
- [ ] Secrets nao devem aparecer em logs do n8n
- [ ] Error workflows nao expoe dados sensiveis em notificacoes

---

## Referencias

- Arquitetura Fase 9: `docs/architecture/fase-9-automacoes-architecture.md` (secao 5)
- Plano de execucao: `docs/architecture/fase-9-execution-plan.md`
- Spec funcional: `docs/specs/fase-9-automacoes-spec.md`
- Analise do ecossistema Google/Apps Script: `docs/specs/analise-ecossistema-ellah.md`
- DocuSeal API docs: `https://www.docuseal.com/docs/api`
- Endpoints ELLAHOS base: `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/`
