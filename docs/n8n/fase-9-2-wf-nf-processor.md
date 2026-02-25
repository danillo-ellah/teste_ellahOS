# [FINANCEIRO] wf-nf-processor — Processamento de NFs por Email

**Data:** 25/02/2026
**Autor:** n8n Workflow Architect — ELLAHOS
**Referencia:** docs/architecture/fase-9-automacoes-architecture.md secao 5.1
**Status:** Pronto para implementacao manual no n8n UI
**Prioridade:** P0

---

## 1. Visao Geral

### 1.1 Objetivo

O `wf-nf-processor` e um workflow de polling que roda a cada 5 minutos no n8n. Ele monitora a caixa de entrada do Gmail financeiro da Ellah Filmes, detecta emails com PDF de Nota Fiscal, salva o arquivo no Google Drive e notifica a Edge Function `nf-processor` para registrar a NF no banco de dados.

O workflow substitui o processo manual de baixar PDFs do Gmail, renomear e organizar no Drive. Apos a execucao, o responsavel financeiro recebe uma notificacao no ELLAHOS e pode validar a NF pela tela `/financial/nf-validation`.

### 1.2 Posicao na arquitetura

```
Gmail (financeiro@ellahfilmes.com)
  |
  | Polling IMAP a cada 5 minutos
  v
[wf-nf-processor] (n8n, ESTE WORKFLOW)
  |
  |-- Extrai PDF do email
  |-- Calcula SHA-256 (deduplicacao)
  |-- Verifica duplicata via nf-processor/list
  |-- Salva PDF no Google Drive (pasta NF_PENDING_FOLDER_ID)
  |-- POST callback -> nf-processor/ingest
  |-- Marca email como lido
  |
  v
[nf-processor] (Edge Function Supabase)
  |
  |-- Cria registro em nf_documents (status: pending_review)
  |-- Tenta match automatico com financial_records
  |-- Cria notificacao para admin/financeiro
  |
  v
[Frontend] /financial/nf-validation
  |-- Lista NFs pendentes com preview do PDF
  |-- Botoes: Confirmar | Reclassificar | Rejeitar
```

### 1.3 Caracteristicas principais

| Atributo | Valor |
|----------|-------|
| Nome no n8n | `[FINANCEIRO] wf-nf-processor` |
| Trigger | Schedule (cron) |
| Frequencia | A cada 5 minutos |
| Nodes total | ~15 |
| Idempotente | Sim (SHA-256 previne duplicatas) |
| Continua em falha parcial | Sim (1 email com erro nao para os demais) |
| Autenticacao ELLAHOS | X-Cron-Secret header |

### 1.4 O que este workflow NAO faz

- NAO faz OCR nem extrai dados estruturados do PDF (isso e P2, Edge Function separada)
- NAO valida o conteudo da NF (feito pelo usuario no frontend)
- NAO move o PDF da pasta pending para a pasta final (feito apos validacao pelo nf-processor)
- NAO envia emails (isso e o `wf-nf-request`, workflow separado)

---

## 2. Diagrama de Nodes

```
[1] Schedule Trigger
     | (a cada 5 minutos)
     v
[2] Gmail IMAP — Buscar emails
     | (has:attachment filename:pdf is:unread label:NF)
     | Limit: 20 emails
     v
[3] IF — Email tem anexo PDF?
     |                         |
     | SIM (application/pdf)   | NAO
     v                         v
[4] Split in Batches         [FIM] (sem acao)
     | (loop por email)
     |
     | Para cada email:
     v
[5] Extract Attachment
     | (binario do PDF)
     v
[6] Crypto — SHA-256
     | (hash hex do PDF)
     v
[7] HTTP Request — Dedup Check
     | GET nf-processor/list?file_hash={hash}
     v
[8] IF — Duplicata?
     |                         |
     | NAO (hash nao existe)   | SIM (hash ja existe)
     v                         v
[9] Google Drive Upload      [12] Gmail Mark Read
     | (pasta NF pending)           (pular este email)
     v
[10] HTTP Request — Ingest Callback
     | POST nf-processor/ingest
     v
[11] Gmail Mark Read
     | + Add label ELLAHOS_PROCESSED
     v
[continua para proximo item do loop]

[12] Error Handler (Error Trigger)
     | (captura falhas de qualquer node)
     | Loga erro e continua com proximo email
     v
[FIM do loop para este item]
```

**Fluxo resumido:**

```
Schedule -> Gmail Fetch -> Filter PDFs -> Loop:
  Extract -> SHA256 -> Dedup Check -> IF Dup?
    NAO: Drive Upload -> Ingest -> Mark Read
    SIM: Mark Read (pular)
  Error: Log + continuar
```

---

## 3. Especificacao de Cada Node

### Node 1 — Schedule Trigger

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.scheduleTrigger` |
| **Modo** | Cron |
| **Cron expression** | `*/5 * * * *` |
| **Timezone** | America/Sao_Paulo |
| **Nome no n8n** | `Schedule - A cada 5 minutos` |

**Observacao:** O Schedule Trigger nao passa dados adiante — apenas inicia a execucao. O proximo node e sempre o Gmail IMAP.

---

### Node 2 — Gmail IMAP (Buscar Emails)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.gmail` |
| **Operation** | `getAll` (listar emails) |
| **Credencial** | Gmail OAuth2 — `financeiro@ellahfilmes.com` |
| **Nome no n8n** | `Gmail - Buscar NFs nao lidas` |

**Parametros de busca:**

| Campo | Valor | Observacao |
|-------|-------|------------|
| `Query` | `has:attachment filename:pdf is:unread label:NF` | Configuravel — ver secao 6 |
| `Limit` | `20` | Maximo por execucao para evitar timeout |
| `Include Attachments` | `true` | Necessario para extrair PDFs |
| `Format` | `full` | Retorna metadados completos do email |
| `Only Unread` | `true` | Evitar reprocessar emails ja marcados |

**Dados retornados por email:**

```json
{
  "id": "18c4f2a1b3d...",
  "threadId": "18c4f2a1b3d...",
  "subject": "NF - Servicos de Fotografo",
  "date": "2026-02-25T14:30:00Z",
  "from": {
    "value": [
      {
        "address": "fotografo@exemplo.com",
        "name": "Joao Silva"
      }
    ]
  },
  "attachments": [
    {
      "filename": "NF_001_2026.pdf",
      "contentType": "application/pdf",
      "size": 102400,
      "content": "[base64 do PDF]"
    }
  ]
}
```

**Configuracao por tenant:** A query de busca pode ser customizada via `tenant.settings.nf_processor.gmail_query`. O valor padrao e `has:attachment filename:pdf is:unread label:NF`. Ver secao 6.

---

### Node 3 — IF (Filtrar emails com PDF)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.if` |
| **Nome no n8n** | `IF - Tem anexo PDF?` |

**Condicao:**

| Campo | Operador | Valor |
|-------|----------|-------|
| `{{ $json.attachments[0].contentType }}` | `contains` | `application/pdf` |

**Branch TRUE:** Email tem PDF — continuar para o loop
**Branch FALSE:** Email sem PDF — encerrar (no-op)

**Nota sobre multiplos anexos:** Este node verifica apenas o primeiro anexo. Se o email tiver multiplos PDFs, o Node 4 (Split in Batches) precisa ser ajustado para iterar sobre `attachments` em vez de sobre emails. Ver observacao no Node 4.

---

### Node 4 — Split in Batches (Loop por email)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.splitInBatches` |
| **Batch Size** | `1` |
| **Nome no n8n** | `Loop - Para cada email` |

**Comportamento:** Processa um email por vez. Para cada email com PDF, executa os nodes 5 a 11. Ao final de cada iteracao, retorna ao inicio do loop para o proximo email.

**Observacao sobre multiplos PDFs por email:** Se um email puder conter mais de 1 PDF, e necessario adicionar um node `Split` antes do Node 5 para iterar sobre `{{ $json.attachments }}` e filtrar apenas `contentType: application/pdf`. Simplificacao V1: processar apenas o primeiro PDF por email (cobrir 95% dos casos reais).

---

### Node 5 — Extract Attachment (Extrair binario do PDF)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.set` (ou `Code`) |
| **Nome no n8n** | `Set - Extrair PDF` |

**Funcao:** Isola os dados do anexo PDF para uso nos proximos nodes.

**Campos extraidos (expressoes n8n):**

```
pdfContent:   {{ $json.attachments[0].content }}
pdfFileName:  {{ $json.attachments[0].filename }}
pdfSize:      {{ $json.attachments[0].size }}
pdfMimeType:  {{ $json.attachments[0].contentType }}
emailId:      {{ $json.id }}
emailSubject: {{ $json.subject }}
emailDate:    {{ $json.date }}
senderEmail:  {{ $json.from.value[0].address }}
senderName:   {{ $json.from.value[0].name }}
```

---

### Node 6 — Crypto (SHA-256 do PDF)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.crypto` |
| **Operation** | `Hash` |
| **Tipo de hash** | `SHA256` |
| **Encoding** | `hex` |
| **Nome no n8n** | `Crypto - SHA256 do PDF` |

**Parametros:**

| Campo | Valor |
|-------|-------|
| `Type` | `Hash` |
| `Value` | `{{ $json.pdfContent }}` (base64 do PDF) |
| `Algorithm` | `SHA256` |
| `Encoding` | `hex` |
| `Property Name` | `fileHash` |

**Output esperado:**

```json
{
  "fileHash": "a3f8c2d1e4b9..."
}
```

O hash e usado como chave de deduplicacao. O mesmo PDF enviado duas vezes gera o mesmo hash, independente do nome do arquivo ou data de envio.

---

### Node 7 — HTTP Request (Dedup Check)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.httpRequest` |
| **Metodo** | `GET` |
| **Nome no n8n** | `HTTP - Checar duplicata` |

**Configuracao:**

| Campo | Valor |
|-------|-------|
| **URL** | `{{ $vars.ELLAHOS_BASE_URL }}/nf-processor/list?file_hash={{ $json.fileHash }}` |
| **Header: X-Cron-Secret** | `{{ $vars.ELLAHOS_CRON_SECRET }}` |
| **Header: Content-Type** | `application/json` |
| **Continue on fail** | `true` |
| **Timeout** | `10000` ms |

**Resposta esperada — hash nao existe (novo):**

```json
{
  "data": [],
  "meta": { "total": 0 }
}
```

**Resposta esperada — hash existe (duplicata):**

```json
{
  "data": [
    {
      "id": "uuid-existente",
      "file_hash": "a3f8c2d1e4b9...",
      "status": "confirmed",
      "created_at": "2026-02-20T10:00:00Z"
    }
  ],
  "meta": { "total": 1 }
}
```

---

### Node 8 — IF (Duplicata?)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.if` |
| **Nome no n8n** | `IF - Duplicata?` |

**Condicao:**

| Campo | Operador | Valor |
|-------|----------|-------|
| `{{ $json.meta.total }}` | `greater than` | `0` |

**Branch TRUE** (total > 0, duplicata): ir para Node 12 (Gmail Mark Read — pular PDF duplicado)
**Branch FALSE** (total = 0, novo): continuar para Node 9 (Drive Upload)

**Comportamento em caso de erro no dedup check:** Se o Node 7 falhar (ELLAHOS indisponivel), o campo `meta` nao existira. O IF retornara FALSE (branch de nao-duplicata) e o workflow tentara fazer o upload e o ingest. O Node 10 (Ingest) tem logica de deduplicacao propria no banco, entao duplicatas serao rejeitadas la com `is_duplicate: true`.

---

### Node 9 — Google Drive Upload

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.googleDrive` |
| **Operation** | `upload` |
| **Credencial** | Google Drive Service Account (reusar existente) |
| **Nome no n8n** | `Drive - Upload NF` |

**Parametros:**

| Campo | Valor |
|-------|-------|
| **Pasta destino (Folder ID)** | `{{ $vars.NF_PENDING_FOLDER_ID }}` |
| **Nome do arquivo** | `NF_{{ $('Set - Extrair PDF').item.json.senderName }}_{{ $now.format('YYYYMMDD') }}_{{ $('Set - Extrair PDF').item.json.pdfFileName }}` |
| **Conteudo** | `{{ $('Set - Extrair PDF').item.json.pdfContent }}` (base64) |
| **MIME Type** | `application/pdf` |
| **Retornar campos** | `id, name, webViewLink, webContentLink, size` |

**Exemplo de nome gerado:**

```
NF_Joao_Silva_20260225_NF_001_2026.pdf
```

**Credencial necessaria:** Google Drive Service Account configurada no n8n. E a mesma credencial usada pelo `wf-job-approved` para criar pastas no Drive. Nao e necessario criar nova credencial.

**Output esperado:**

```json
{
  "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "name": "NF_Joao_Silva_20260225_NF_001_2026.pdf",
  "webViewLink": "https://drive.google.com/file/d/1BxiMVs0.../view",
  "webContentLink": "https://drive.google.com/uc?id=1BxiMVs0...",
  "size": "102400"
}
```

---

### Node 10 — HTTP Request (Ingest Callback)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.httpRequest` |
| **Metodo** | `POST` |
| **Nome no n8n** | `HTTP - Ingest NF` |

**Configuracao:**

| Campo | Valor |
|-------|-------|
| **URL** | `{{ $vars.ELLAHOS_BASE_URL }}/nf-processor/ingest` |
| **Header: X-Cron-Secret** | `{{ $vars.ELLAHOS_CRON_SECRET }}` |
| **Header: Content-Type** | `application/json` |
| **Body Type** | `JSON` |
| **Continue on fail** | `true` |
| **Timeout** | `30000` ms |

**Body JSON (expressoes n8n):**

```json
{
  "tenant_id": "{{ $vars.TENANT_ID }}",
  "gmail_message_id": "{{ $('Set - Extrair PDF').item.json.emailId }}",
  "sender_email": "{{ $('Set - Extrair PDF').item.json.senderEmail }}",
  "sender_name": "{{ $('Set - Extrair PDF').item.json.senderName }}",
  "subject": "{{ $('Set - Extrair PDF').item.json.emailSubject }}",
  "received_at": "{{ $('Set - Extrair PDF').item.json.emailDate }}",
  "file_name": "{{ $('Set - Extrair PDF').item.json.pdfFileName }}",
  "file_hash": "{{ $('Crypto - SHA256 do PDF').item.json.fileHash }}",
  "file_size_bytes": "{{ $('Set - Extrair PDF').item.json.pdfSize }}",
  "drive_file_id": "{{ $('Drive - Upload NF').item.json.id }}",
  "drive_url": "{{ $('Drive - Upload NF').item.json.webViewLink }}"
}
```

**Resposta esperada (sucesso):**

```json
{
  "data": {
    "nf_document_id": "uuid-gerado",
    "status": "pending_review",
    "match": {
      "financial_record_id": "uuid-do-registro",
      "description": "Uber equipe - set 38",
      "amount": 350.00,
      "confidence": 0.95
    },
    "is_duplicate": false
  }
}
```

**Resposta esperada (duplicata detectada pela Edge Function):**

```json
{
  "data": {
    "nf_document_id": null,
    "status": "duplicate",
    "is_duplicate": true
  }
}
```

---

### Node 11 — Gmail Mark Read (email processado)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.gmail` |
| **Operation** | `markAsRead` |
| **Credencial** | Gmail OAuth2 — `financeiro@ellahfilmes.com` |
| **Nome no n8n** | `Gmail - Marcar como lido (processado)` |

**Parametros:**

| Campo | Valor |
|-------|-------|
| **Message ID** | `{{ $('Set - Extrair PDF').item.json.emailId }}` |
| **Add Labels** | `ELLAHOS_PROCESSED` |

**Observacao sobre a label:** A label `ELLAHOS_PROCESSED` deve ser criada manualmente no Gmail antes de usar o workflow. Isso diferencia emails que o ELLAHOS processou de emails simplesmente marcados como lidos por outro motivo.

**Para criar a label no Gmail:**
1. Abrir Gmail > Configuracoes > Todos os Ajustes > Labels
2. Criar nova label: `ELLAHOS_PROCESSED`
3. Anotar o ID da label (necessario para configurar o node)

---

### Node 12 — Gmail Mark Read (email duplicado)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.gmail` |
| **Operation** | `markAsRead` |
| **Credencial** | Gmail OAuth2 — `financeiro@ellahfilmes.com` |
| **Nome no n8n** | `Gmail - Marcar como lido (duplicata)` |

**Parametros:**

| Campo | Valor |
|-------|-------|
| **Message ID** | `{{ $('Set - Extrair PDF').item.json.emailId }}` |
| **Add Labels** | `ELLAHOS_DUPLICATE` |

**Comportamento:** Mesmo para emails duplicados, marcamos como lido e adicionamos a label `ELLAHOS_DUPLICATE` para rastreabilidade. O email nao e reprocessado na proxima execucao do cron.

---

### Node 13 — Error Handler (Error Trigger)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | `n8n-nodes-base.errorTrigger` |
| **Nome no n8n** | `Error - Handler` |

**Descricao:** Node especial que captura erros de qualquer node do workflow. Quando um node falha e tem `Continue on fail = false`, o Error Handler e acionado.

**Configuracao do Error Handler:**

O Error Trigger e configurado como workflow de erro separado no n8n, ou como node dentro do mesmo workflow usando a opcao "Workflow Error Trigger". A abordagem recomendada e:

1. Habilitar `Continue on fail = true` em todos os nodes criticos (Nodes 7, 9, 10, 11, 12)
2. Adicionar um node `IF` apos cada node critico para checar `{{ $json.error }}`
3. Se erro: logar e continuar o loop para o proximo email

**Alternativa simplificada:** Habilitar `Continue on fail = true` em todos os nodes dentro do loop. Quando um node falha, o item com erro e passado adiante com o campo `error` populado. O loop continua para o proximo email normalmente.

**Log de erros:** Os erros ficam visiveis no n8n Execution Log. Para alertas proativos, e possivel adicionar um node `HTTP Request` no branch de erro que chama a Edge Function de notificacoes.

---

## 4. Variaveis Necessarias no n8n

Configurar em **Settings > Variables** (ou via `.env` do n8n self-hosted):

| Variavel | Exemplo de Valor | Descricao | Obrigatoria |
|----------|-----------------|-----------|-------------|
| `ELLAHOS_BASE_URL` | `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1` | URL base das Edge Functions | Sim |
| `ELLAHOS_CRON_SECRET` | `cron_secret_xxxxx` | Secret para autenticacao do n8n na Edge Function | Sim |
| `TENANT_ID` | `uuid-do-tenant-ellah` | UUID do tenant principal da Ellah Filmes | Sim |
| `NF_PENDING_FOLDER_ID` | `1BxiMVs0XRA5nFMdk...` | ID da pasta no Drive para NFs pendentes | Sim |

**Como encontrar o NF_PENDING_FOLDER_ID:**
1. Abrir Google Drive logado com a Service Account ou com a conta financeiro@ellahfilmes.com
2. Navegar ate a pasta `fin_nf_recebimento` (ou criar se nao existir)
3. Copiar o ID da URL: `drive.google.com/drive/folders/AQUI_ESTA_O_ID`

**Como encontrar o TENANT_ID:**
```sql
SELECT id FROM tenants WHERE name = 'Ellah Filmes' LIMIT 1;
```
Ou via Supabase Dashboard > Table Editor > tenants.

**Como obter o ELLAHOS_CRON_SECRET:**
O mesmo secret ja configurado para o `integration-processor`. Buscar em:
- Supabase Dashboard > Edge Functions > `integration-processor` > Secrets
- Ou via Vault: `SELECT read_secret('CRON_SECRET');`

---

## 5. Credenciais Necessarias

### 5.1 Gmail OAuth2

| Atributo | Valor |
|----------|-------|
| **Nome no n8n** | `Gmail OAuth2 - financeiro@ellahfilmes.com` |
| **Conta** | `financeiro@ellahfilmes.com` |
| **Scopes necessarios** | `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.modify` |
| **Como criar** | Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client ID |

**Passos para criar a credencial no n8n:**

1. Acessar n8n UI em `ia.ellahfilmes.com`
2. Ir em **Settings > Credentials > Add Credential**
3. Selecionar **Gmail OAuth2 API**
4. Preencher Client ID e Client Secret (do Google Cloud Console)
5. Clicar em **Connect** e autorizar com a conta `financeiro@ellahfilmes.com`
6. Verificar que os scopes incluem `gmail.readonly` e `gmail.modify`

**Nota sobre Gmail API:** A conta financeiro@ellahfilmes.com precisa ter a Gmail API habilitada no Google Cloud Project associado. Se o projeto ja tem a Drive API habilitada (para o wf-job-approved), verificar se a Gmail API tambem esta habilitada no mesmo projeto.

### 5.2 Google Drive Service Account

| Atributo | Valor |
|----------|-------|
| **Nome no n8n** | `Google Drive Service Account` (existente) |
| **Tipo** | Service Account JSON |
| **Permissoes na pasta** | A Service Account deve ter permissao de Editor na pasta `NF_PENDING_FOLDER_ID` |

**Esta credencial ja deve existir no n8n** (usada pelo `wf-job-approved` para criar estrutura de pastas). Verificar se tem acesso de escrita a pasta de NFs:

1. Abrir Google Drive com uma conta admin
2. Clicar com botao direito na pasta `fin_nf_recebimento`
3. Compartilhar > Adicionar o email da Service Account com permissao de Editor

---

## 6. Configuracao por Tenant

O workflow usa variaveis fixas (secao 4), mas a query de busca no Gmail pode ser personalizada por tenant via `tenant.settings`:

```json
{
  "nf_processor": {
    "enabled": true,
    "gmail_query": "has:attachment filename:pdf is:unread label:NF",
    "gmail_label_processed": "ELLAHOS_PROCESSED",
    "gmail_label_duplicate": "ELLAHOS_DUPLICATE",
    "drive_folder_id": "1BxiMVs0XRA5nFMdk...",
    "max_emails_per_run": 20
  }
}
```

**Campos configurados:**

| Campo | Padrao | Descricao |
|-------|--------|-----------|
| `enabled` | `true` | Toggle para ativar/desativar o processamento automatico |
| `gmail_query` | `has:attachment filename:pdf is:unread label:NF` | Query de busca no Gmail |
| `gmail_label_processed` | `ELLAHOS_PROCESSED` | Label adicionada em emails processados |
| `gmail_label_duplicate` | `ELLAHOS_DUPLICATE` | Label adicionada em emails duplicados |
| `drive_folder_id` | — | ID da pasta no Drive (sobrescreve a variavel global) |
| `max_emails_per_run` | `20` | Limite de emails por execucao |

**Observacao V1:** Na primeira versao, as configuracoes sao fixas via variaveis do n8n. A leitura dinamica de `tenant.settings` pode ser adicionada como Node 1.5 (HTTP Request para buscar config do tenant) em uma versao futura.

**Toggle enabled:** Se `tenant.settings.nf_processor.enabled = false`, o Node 2 deve retornar 0 emails (nao buscar no Gmail). Implementacao V1: o toggle e controlado ativando/desativando o workflow inteiro no n8n UI.

---

## 7. Passo a Passo de Implementacao no n8n UI

### Pre-requisitos

- [ ] Acesso ao n8n UI em `ia.ellahfilmes.com`
- [ ] Credencial Gmail OAuth2 criada e autorizada com `financeiro@ellahfilmes.com`
- [ ] Credencial Google Drive Service Account configurada (reusar existente)
- [ ] Pasta `fin_nf_recebimento` criada no Drive e compartilhada com a Service Account
- [ ] Labels `ELLAHOS_PROCESSED` e `ELLAHOS_DUPLICATE` criadas no Gmail
- [ ] Variaveis `ELLAHOS_BASE_URL`, `ELLAHOS_CRON_SECRET`, `TENANT_ID`, `NF_PENDING_FOLDER_ID` configuradas no n8n
- [ ] Edge Function `nf-processor` deployada e respondendo (testar com curl)

### Passo 1 — Criar o workflow

1. Acessar n8n UI em `ia.ellahfilmes.com`
2. Clicar em **+ New Workflow**
3. Nomear: `[FINANCEIRO] wf-nf-processor`
4. Salvar (sem nodes ainda)

### Passo 2 — Adicionar Node 1 (Schedule Trigger)

1. Clicar no `+` no canvas vazio
2. Buscar e selecionar **Schedule Trigger**
3. Em **Trigger Interval**: selecionar `Cron`
4. Em **Cron Expression**: digitar `*/5 * * * *`
5. Em **Timezone**: selecionar `America/Sao_Paulo`
6. Nomear o node: `Schedule - A cada 5 minutos`
7. Salvar o node

### Passo 3 — Adicionar Node 2 (Gmail IMAP)

1. Clicar no `+` apos o Schedule Trigger
2. Buscar e selecionar **Gmail**
3. Em **Operation**: selecionar `Get Many` (ou `getAll`)
4. Em **Credential**: selecionar `Gmail OAuth2 - financeiro@ellahfilmes.com`
5. Em **Filters > Query**: digitar `has:attachment filename:pdf is:unread label:NF`
6. Em **Limit**: digitar `20`
7. Em **Options > Include Attachments**: ativar `true`
8. Em **Options > Format**: selecionar `Full`
9. Nomear o node: `Gmail - Buscar NFs nao lidas`
10. Salvar o node

### Passo 4 — Adicionar Node 3 (IF — Tem PDF?)

1. Clicar no `+` apos o Gmail node
2. Buscar e selecionar **IF**
3. Em **Condition**:
   - Value 1: `{{ $json.attachments[0].contentType }}`
   - Operation: `contains`
   - Value 2: `application/pdf`
4. Nomear: `IF - Tem anexo PDF?`
5. Salvar o node

### Passo 5 — Adicionar Node 4 (Split in Batches)

1. Conectar ao output `true` (branch SIM) do Node 3
2. Buscar e selecionar **Split In Batches**
3. Em **Batch Size**: digitar `1`
4. Nomear: `Loop - Para cada email`
5. Salvar o node

### Passo 6 — Adicionar Node 5 (Set — Extrair PDF)

1. Clicar no `+` apos o Loop node (output "loop" — cada item)
2. Buscar e selecionar **Set**
3. Adicionar os campos conforme a secao 3 (Node 5):
   - `pdfContent` = `{{ $json.attachments[0].content }}`
   - `pdfFileName` = `{{ $json.attachments[0].filename }}`
   - `pdfSize` = `{{ $json.attachments[0].size }}`
   - `emailId` = `{{ $json.id }}`
   - `emailSubject` = `{{ $json.subject }}`
   - `emailDate` = `{{ $json.date }}`
   - `senderEmail` = `{{ $json.from.value[0].address }}`
   - `senderName` = `{{ $json.from.value[0].name }}`
4. Nomear: `Set - Extrair PDF`
5. Salvar o node

### Passo 7 — Adicionar Node 6 (Crypto — SHA-256)

1. Clicar no `+` apos o Set node
2. Buscar e selecionar **Crypto**
3. Em **Action**: selecionar `Hash`
4. Em **Type**: selecionar `SHA256`
5. Em **Value**: digitar `{{ $json.pdfContent }}`
6. Em **Encoding**: selecionar `hex`
7. Em **Property Name**: digitar `fileHash`
8. Nomear: `Crypto - SHA256 do PDF`
9. Salvar o node

### Passo 8 — Adicionar Node 7 (HTTP — Dedup Check)

1. Clicar no `+` apos o Crypto node
2. Buscar e selecionar **HTTP Request**
3. Configurar:
   - **Method**: `GET`
   - **URL**: `{{ $vars.ELLAHOS_BASE_URL }}/nf-processor/list?file_hash={{ $json.fileHash }}`
   - **Headers**: adicionar `X-Cron-Secret` = `{{ $vars.ELLAHOS_CRON_SECRET }}`
   - **Timeout**: `10000`
4. Em **Settings** (engrenagem): habilitar **Continue on fail** = `true`
5. Nomear: `HTTP - Checar duplicata`
6. Salvar o node

### Passo 9 — Adicionar Node 8 (IF — Duplicata?)

1. Clicar no `+` apos o HTTP Dedup node
2. Buscar e selecionar **IF**
3. Em **Condition**:
   - Value 1: `{{ $json.meta.total }}`
   - Operation: `greater than`
   - Value 2: `0`
4. Nomear: `IF - Duplicata?`
5. Salvar o node

### Passo 10 — Adicionar Node 9 (Google Drive Upload)

1. Conectar ao output `false` (branch NAO duplicata) do Node 8
2. Buscar e selecionar **Google Drive**
3. Em **Operation**: selecionar `Upload`
4. Em **Credential**: selecionar `Google Drive Service Account`
5. Em **Parent Folder**: selecionar **By ID** e digitar `{{ $vars.NF_PENDING_FOLDER_ID }}`
6. Em **File Name**: digitar:
   `NF_{{ $('Set - Extrair PDF').item.json.senderName }}_{{ $now.format('YYYYMMDD') }}_{{ $('Set - Extrair PDF').item.json.pdfFileName }}`
7. Em **Binary Data**: selecionar `{{ $('Set - Extrair PDF').item.json.pdfContent }}`
8. Em **MIME Type**: digitar `application/pdf`
9. Em **Fields to Return**: selecionar `id, name, webViewLink, webContentLink`
10. Em **Settings** (engrenagem): habilitar **Continue on fail** = `true`
11. Nomear: `Drive - Upload NF`
12. Salvar o node

### Passo 11 — Adicionar Node 10 (HTTP — Ingest)

1. Clicar no `+` apos o Drive Upload node
2. Buscar e selecionar **HTTP Request**
3. Configurar:
   - **Method**: `POST`
   - **URL**: `{{ $vars.ELLAHOS_BASE_URL }}/nf-processor/ingest`
   - **Headers**: `X-Cron-Secret` = `{{ $vars.ELLAHOS_CRON_SECRET }}`, `Content-Type` = `application/json`
   - **Body Type**: `JSON`
   - **Body**: colar o JSON da secao 3 (Node 10) com as expressoes
4. Em **Settings** (engrenagem): habilitar **Continue on fail** = `true`
5. **Timeout**: `30000`
6. Nomear: `HTTP - Ingest NF`
7. Salvar o node

### Passo 12 — Adicionar Node 11 (Gmail Mark Read — processado)

1. Clicar no `+` apos o HTTP Ingest node
2. Buscar e selecionar **Gmail**
3. Em **Operation**: selecionar `Mark as Read`
4. Em **Credential**: selecionar `Gmail OAuth2 - financeiro@ellahfilmes.com`
5. Em **Message ID**: digitar `{{ $('Set - Extrair PDF').item.json.emailId }}`
6. Em **Add Labels**: digitar o ID da label `ELLAHOS_PROCESSED`
7. Nomear: `Gmail - Marcar como lido (processado)`
8. Salvar o node
9. **Conectar o output deste node de volta ao input do Node 4 (Loop)** — isso cria o ciclo do loop

### Passo 13 — Adicionar Node 12 (Gmail Mark Read — duplicata)

1. Conectar ao output `true` (branch SIM duplicata) do Node 8
2. Buscar e selecionar **Gmail**
3. Em **Operation**: selecionar `Mark as Read`
4. Em **Credential**: selecionar `Gmail OAuth2 - financeiro@ellahfilmes.com`
5. Em **Message ID**: digitar `{{ $('Set - Extrair PDF').item.json.emailId }}`
6. Em **Add Labels**: digitar o ID da label `ELLAHOS_DUPLICATE`
7. Nomear: `Gmail - Marcar como lido (duplicata)`
8. Salvar o node
9. **Conectar o output deste node de volta ao input do Node 4 (Loop)** — loop continua

### Passo 14 — Configurar Error Handler

1. Selecionar o workflow (canvas vazio fora dos nodes)
2. Em **Workflow Settings**: habilitar **Error Workflow** (selecionar ou criar workflow de erro)
3. Alternativa inline:
   - Selecionar cada node critico (7, 9, 10, 11, 12)
   - Em **Settings > On Error**: selecionar `Continue` (ou `Continue (using error output)`)
   - Isso garante que o loop continue mesmo com erro

### Passo 15 — Ativar e testar

1. Salvar o workflow completo
2. Clicar em **Activate** para ativar o Schedule Trigger
3. Clicar em **Test Workflow** para executar manualmente (ver secao 8)
4. Verificar no **Execution Log** que todos os nodes executaram corretamente

---

## 8. Cenarios de Teste

### Cenario 1 — Email com 1 PDF (caminho feliz)

**Setup:**
- Enviar email para `financeiro@ellahfilmes.com` com assunto "NF - Teste" e 1 PDF anexado
- Adicionar label `NF` ao email no Gmail

**Execucao:**
- Aguardar ate 5 minutos (ou executar manualmente no n8n)

**Resultado esperado:**
- Node 2: 1 email encontrado
- Node 3: branch TRUE (tem PDF)
- Node 6: hash calculado
- Node 7: retorna `{"data":[],"meta":{"total":0}}` (nao e duplicata)
- Node 8: branch FALSE (nao duplicata)
- Node 9: arquivo enviado ao Drive (verificar no Drive)
- Node 10: retorno `{"data":{"nf_document_id":"uuid","status":"pending_review"}}`
- Node 11: email marcado como lido no Gmail com label `ELLAHOS_PROCESSED`
- Banco: registro criado em `nf_documents` com status `pending_review`
- Frontend: NF visivel em `/financial/nf-validation`

### Cenario 2 — Email sem PDF

**Setup:**
- Enviar email para `financeiro@ellahfilmes.com` com label `NF` mas SEM anexo PDF

**Resultado esperado:**
- Node 2: email encontrado
- Node 3: branch FALSE (sem PDF)
- Workflow encerra sem acao
- Email nao marcado como lido (permanece na caixa)

**Observacao:** Este comportamento e intencional — emails sem PDF ficam na caixa ate serem tratados manualmente.

### Cenario 3 — Email duplicado (mesmo PDF enviado duas vezes)

**Setup:**
- Reenviar o mesmo PDF do Cenario 1 em um novo email com label `NF`

**Resultado esperado:**
- Node 7: retorna `{"data":[{...}],"meta":{"total":1}}` (hash existe)
- Node 8: branch TRUE (e duplicata)
- Node 12: email marcado como lido com label `ELLAHOS_DUPLICATE`
- Banco: nenhum novo registro criado em `nf_documents`
- Drive: nenhum novo arquivo enviado

### Cenario 4 — Email com multiplos PDFs

**Setup:**
- Enviar email com 2 PDFs anexados (ex: NF e boleto)

**Resultado esperado (comportamento V1):**
- Apenas o primeiro PDF (`attachments[0]`) e processado
- Segundo PDF e ignorado

**Acao recomendada:** Documentar esta limitacao para o usuario financeiro. Orientar a enviar 1 NF por email. Ajuste para multiplos PDFs por email pode ser feito em V2 do workflow.

### Cenario 5 — Google Drive API fora do ar

**Setup:**
- Simular falha no Drive (desabilitar credencial temporariamente)

**Resultado esperado:**
- Node 9 falha com erro de API
- Se `Continue on fail = true`: Node 10 recebe item com `error`
- Node 10 nao executa o ingest (nao tem `drive_file_id`)
- Email nao marcado como lido (ficara na caixa para retry na proxima execucao)
- Execution Log do n8n registra o erro

**Validacao:** O email deve permanecer nao-lido para ser reprocessado na proxima execucao (5 minutos depois).

### Cenario 6 — Edge Function nf-processor/ingest fora do ar

**Setup:**
- Desabilitar a Edge Function `nf-processor` temporariamente

**Resultado esperado:**
- Nodes 2-9 executam normalmente
- PDF ja foi salvo no Drive
- Node 10 falha com erro de HTTP (timeout ou 500)
- Se `Continue on fail = true`: Node 11 (Mark Read) pode ou nao executar dependendo da configuracao

**Decisao de design:** Para este cenario, recomenda-se NAO marcar o email como lido se o ingest falhar. Isso requer adicionar um `IF` entre Node 10 e Node 11 que verifica se o ingest retornou sucesso.

**Implementacao do IF pos-ingest:**

```
Condicao: {{ $json.data.nf_document_id }} exists (nao e null/undefined)
Branch TRUE:  Gmail Mark Read (Node 11)
Branch FALSE: Set - Log erro (nao marcar como lido)
```

### Cenario 7 — 20 emails na caixa de entrada (limite maximo)

**Setup:**
- 20 emails nao-lidos com PDF e label NF na caixa

**Resultado esperado:**
- Node 2 retorna exatamente 20 emails
- Loop processa todos os 20 sequencialmente
- Todos os PDFs enviados ao Drive e registrados no banco
- Execucao total estimada: ~2-3 minutos (dentro da janela de 5 min do cron)

**Se houver mais de 20 emails:** Os emails restantes serao processados na proxima execucao (5 minutos depois). O limite de 20 por execucao e uma protecao contra timeout.

### Cenario 8 — PDF de NF automaticamente vinculado (auto-match)

**Setup:**
- Existe um `financial_record` com `supplier_email = fotografo@exemplo.com` e `nf_request_status = 'enviado'`
- Email chega de `fotografo@exemplo.com` com PDF de NF

**Resultado esperado:**
- Node 10: ingest retorna `{"status":"auto_matched","match":{"confidence":0.95,...}}`
- Banco: `nf_documents.status = 'auto_matched'`
- Frontend: NF aparece em `/financial/nf-validation` com match sugerido em destaque
- Notificacao criada para o responsavel financeiro

---

## 9. Dependencias

### 9.1 Edge Functions (Supabase)

| Edge Function | Endpoint usado | Descricao |
|---------------|---------------|-----------|
| `nf-processor` | `GET /list?file_hash=` | Verificar duplicata |
| `nf-processor` | `POST /ingest` | Registrar NF no banco |

### 9.2 APIs externas

| API | Uso | Credencial |
|-----|-----|-----------|
| Gmail API | Buscar emails, marcar como lido, adicionar labels | OAuth2 — financeiro@ellahfilmes.com |
| Google Drive API | Upload de PDF | Service Account |

### 9.3 Banco de dados (tabelas lidas/escritas pelo ingest)

| Tabela | Operacao | Descricao |
|--------|----------|-----------|
| `nf_documents` | INSERT | Registro da NF recebida |
| `financial_records` | SELECT | Match automatico por fornecedor/valor |
| `notifications` | INSERT | Notificacao para responsavel financeiro |

### 9.4 Workflows relacionados

| Workflow | Relacao |
|----------|---------|
| `wf-nf-request` | Workflow irma — envia pedidos de NF por email (direcao oposta) |
| `wf-job-approved` | Sem dependencia direta, mas usa mesma credencial Drive |

---

## 10. Cenarios de Erro e Comportamento Esperado

| Cenario | Comportamento esperado | Acao recomendada |
|---------|----------------------|-----------------|
| Gmail API indisponivel | Node 2 falha, execucao encerrada | Retry na proxima execucao (5 min) |
| Email sem label NF | Nao encontrado pela query | Sem impacto — email ignorado |
| Crypto falha (binario invalido) | Node 6 falha, Continue on fail | Email nao marcado como lido — retry |
| ELLAHOS_BASE_URL incorreta | Node 7 retorna 404/timeout | Continue on fail — trata como nao-duplicata |
| Drive sem permissao na pasta | Node 9 retorna 403 | Falha critica — verificar Service Account |
| Drive quota excedida | Node 9 retorna 429 | Email nao marcado — retry automatico |
| Ingest retorna 409 (duplicata no banco) | Node 10 recebe resposta | Log + marcar email como lido normalmente |
| Ingest retorna 500 | Node 10 falha | NAO marcar email como lido — retry |
| Gmail mark read falha | Node 11 falha | Email reprocessado na proxima execucao (idempotente) |
| Mais de 20 emails na caixa | 20 processados agora | Resto processado nas proximas execucoes |

**Principio geral:** Falhas em automacoes NAO bloqueiam o usuario. Se o workflow nao processar uma NF, o usuario pode fazer upload manual em `/financial/nf-validation` ou aguardar a proxima execucao do cron.

---

## 11. Idempotencia

O workflow e idempotente por design:

1. **Dedup por hash (primario):** O SHA-256 do PDF e verificado antes do upload. O mesmo arquivo enviado duas vezes gera o mesmo hash e e detectado como duplicata no Node 7.

2. **Dedup por message_id (secundario):** A Edge Function `nf-processor/ingest` verifica `gmail_message_id` na tabela `nf_documents`. Se o mesmo `message_id` ja existe, retorna `is_duplicate: true` sem criar novo registro.

3. **Dedup no Drive:** Se o mesmo arquivo for enviado duas vezes ao Drive (por falha no dedup check), a tabela `nf_documents` ainda previne duplicatas no banco. O arquivo duplicado no Drive pode ser limpo manualmente ou via job de limpeza.

4. **Emails marcados como lidos:** Ao marcar um email como lido e adicionar a label `ELLAHOS_PROCESSED`, ele nao aparece na query `is:unread` na proxima execucao.

---

## 12. Documentacao de Referencia

| Documento | Localizacao |
|-----------|------------|
| Arquitetura Fase 9 (secao 5.1) | `docs/architecture/fase-9-automacoes-architecture.md` |
| Schema nf_documents | `docs/architecture/fase-9-automacoes-architecture.md` (secao 3.1) |
| Edge Function nf-processor | `supabase/functions/nf-processor/index.ts` (a criar) |
| Spec Fase 9 | `docs/specs/fase-9-automacoes-spec.md` |
| Plano de execucao | `docs/architecture/fase-9-execution-plan.md` |
| Workflow wf-job-approved (referencia de formato) | `docs/n8n/fase-9-4-wf-job-approved-expansion.md` |

---

## 13. Checklist de Conclusao

- [ ] Label `ELLAHOS_PROCESSED` criada no Gmail
- [ ] Label `ELLAHOS_DUPLICATE` criada no Gmail
- [ ] Pasta `fin_nf_recebimento` criada no Google Drive
- [ ] Service Account com acesso de Editor na pasta de NFs
- [ ] Credencial Gmail OAuth2 criada no n8n com `financeiro@ellahfilmes.com`
- [ ] Credencial Google Drive Service Account verificada (reusar existente)
- [ ] Variaveis configuradas no n8n: `ELLAHOS_BASE_URL`, `ELLAHOS_CRON_SECRET`, `TENANT_ID`, `NF_PENDING_FOLDER_ID`
- [ ] Edge Function `nf-processor` deployada e testada (endpoint `/ingest` respondendo)
- [ ] Workflow criado no n8n com todos os 13 nodes
- [ ] Todos os nodes com `Continue on fail = true` nos nodes criticos
- [ ] Workflow ativo (Schedule Trigger habilitado)
- [ ] Cenario 1 testado: email com PDF processado corretamente
- [ ] Cenario 3 testado: duplicata detectada e ignorada
- [ ] Cenario 5 testado: Drive fora nao quebra o workflow
- [ ] Registro visivel em `/financial/nf-validation` no frontend
