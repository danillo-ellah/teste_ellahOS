# Sprint 3-VPS — Guia de Setup n8n + DocuSeal

URL n8n: https://ia.ellahfilmes.com/
Supabase URL: https://etvapcxesaxhsvzgaane.supabase.co

---

## 1. Variaveis de Ambiente (n8n Settings > Variables)

| Variavel | Valor | Descricao |
|----------|-------|-----------|
| `ELLAHOS_BASE_URL` | `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1` | Base URL das Edge Functions |
| `ELLAHOS_CRON_SECRET` | *(gerar e salvar no Vault do Supabase)* | Secret compartilhado para endpoints M2M |
| `ELLAHOS_TENANT_ID` | *(UUID do tenant principal)* | Tenant ID da Ellah Filmes |
| `ELLAHOS_WEBHOOK_SECRET` | *(gerar)* | Secret para webhooks n8n → ELLAHOS |
| `DRIVE_NF_FOLDER_ID` | *(ID da pasta "NFs Recebidas" no Drive)* | Pasta do Google Drive para upload NFs |
| `DOCUSEAL_BASE_URL` | *(URL do DocuSeal self-hosted)* | URL da instancia DocuSeal |
| `DOCUSEAL_API_TOKEN` | *(token da API DocuSeal)* | Token de autenticacao DocuSeal |
| `DOCUSEAL_WEBHOOK_SECRET` | *(gerar)* | Secret para webhooks DocuSeal |
| `GMAIL_FINANCEIRO` | `financeiro@ellahfilmes.com.br` | Email que recebe/envia NFs |

---

## 2. Credenciais (n8n Settings > Credentials)

### 2.1 Gmail OAuth2 (financeiro@ellahfilmes.com.br)

1. Ir em n8n > Credentials > New > Gmail OAuth2
2. Conectar com a conta `financeiro@ellahfilmes.com.br`
3. Scopes necessarios:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify` (para marcar como lido)
4. Salvar — anotar o ID da credencial
5. Substituir `GMAIL_CREDENTIAL_ID` nos JSONs de importacao pelo ID real

### 2.2 Google Drive Service Account

1. Ir em n8n > Credentials > New > Google Drive OAuth2
2. Conectar com a Service Account que ja tem acesso ao Drive
3. Salvar — anotar o ID
4. Substituir `DRIVE_CREDENTIAL_ID` no JSON do wf-nf-processor

---

## 3. Importar Workflows

### 3.1 wf-nf-processor (P0 — Gmail polling)

1. n8n > Workflows > Import from File
2. Selecionar: `docs/n8n/wf-nf-processor-import.json`
3. Atualizar credenciais nos nodes Gmail e Drive (clicar em cada node e selecionar a credencial)
4. Testar: enviar um email com PDF para financeiro@ellahfilmes.com.br
5. Verificar: NF aparece na tela de Validacao do ELLAHOS
6. Ativar o workflow

### 3.2 wf-nf-request (P0 — envio email NF)

1. n8n > Workflows > Import from File
2. Selecionar: `docs/n8n/wf-nf-request-import.json`
3. Atualizar credencial Gmail
4. Anotar a URL do webhook: `https://ia.ellahfilmes.com/webhook/wf-nf-request`
5. Configurar no tenant (ver secao 5 abaixo)
6. Testar: fazer um pedido de NF pelo frontend e verificar se o email chega
7. Ativar o workflow

### 3.3 wf-docuseal-contracts (P1 — contratos)

1. n8n > Workflows > Import from File
2. Selecionar: `docs/n8n/wf-docuseal-contracts-import.json`
3. Anotar a URL do webhook: `https://ia.ellahfilmes.com/webhook/wf-docuseal-contracts`
4. Testar com payload manual
5. Ativar o workflow

---

## 4. Expandir JOB_FECHADO_CRIACAO (wf-job-approved)

O workflow `JOB_FECHADO_CRIACAO` (ID: DAdGoKKkNkgizCL5) ja existe e cria 4 grupos WhatsApp.
Ele ja e chamado pelo ELLAHOS via integration_event `job_approved`.

**Expansao necessaria:** adicionar callback de sucesso/erro para o ELLAHOS.

### Nodes para adicionar:

1. **Apos MUDANDO_DESCRICAO_GRUPO_ATENDIMENTO** (ultimo node atual):
   - Adicionar node **Code** "Aggregate Results":
   ```javascript
   // Coletar IDs dos grupos criados
   const groups = {
     cliente: $('CRIAR GRUPO CLIENTE WHATSAPP').first().json.phone,
     producao: $('CRIAR GRUPO PRODUCAO WHATSAPP').first().json.phone,
     pos_producao: $('CRIAR GRUPO POS PRODUCAO WHATSAPP').first().json.phone,
     atendimento: $('CRIAR GRUPO ATENDIMENTO WHATSAPP').first().json.phone,
   };
   return [{ json: { groups, status: 'success' } }];
   ```

2. **Callback HTTP** apos Aggregate:
   - Method: POST
   - URL: `{{ $env.ELLAHOS_BASE_URL }}/integration-processor`
   - Headers: `X-Cron-Secret: {{ $env.ELLAHOS_CRON_SECRET }}`
   - Body: resultado com IDs dos grupos

**NOTA:** Isso e opcional — o workflow ja funciona sem callback.
O ELLAHOS registra o evento como processado quando o integration-processor dispara o webhook.

---

## 5. Configurar Webhooks no Tenant Settings

Apos importar os workflows e anotar as URLs dos webhooks, configurar no ELLAHOS:

### Via frontend (Settings > Integracoes > n8n):

```
Webhook NF Request: https://ia.ellahfilmes.com/webhook/wf-nf-request
Webhook Secret: <mesmo valor de ELLAHOS_WEBHOOK_SECRET>
```

### Via Supabase SQL (se preferir direto):

```sql
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{integrations,n8n}',
  '{
    "enabled": true,
    "webhook_secret": "<ELLAHOS_WEBHOOK_SECRET>",
    "webhooks": {
      "nf_request": "https://ia.ellahfilmes.com/webhook/wf-nf-request",
      "job_approved": "https://ia.ellahfilmes.com/webhook/4154ad0b-d8eb-4a3a-95d8-fa6fca626066",
      "docuseal_contracts": "https://ia.ellahfilmes.com/webhook/wf-docuseal-contracts"
    }
  }'::jsonb
)
WHERE id = '<TENANT_ID>';
```

---

## 6. DocuSeal Webhook

Configurar no painel admin do DocuSeal:

1. Acessar DocuSeal admin > Settings > Webhooks
2. Adicionar webhook:
   - URL: `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/docuseal-integration/webhook`
   - Secret: valor de `DOCUSEAL_WEBHOOK_SECRET`
   - Eventos: `form.sent`, `form.viewed`, `form.signed`, `form.completed`, `form.declined`
3. Testar: criar um contrato de teste e verificar se o status atualiza no ELLAHOS

---

## 7. Checklist de Validacao

- [ ] Gmail OAuth2 autorizado e funcionando
- [ ] wf-nf-processor: email com PDF → NF aparece no ELLAHOS
- [ ] wf-nf-request: pedido de NF → email enviado ao fornecedor
- [ ] wf-docuseal-contracts: contrato criado → DocuSeal submission ativa
- [ ] DocuSeal webhook: assinatura → status atualizado no ELLAHOS
- [ ] JOB_FECHADO_CRIACAO: job aprovado → 4 grupos WhatsApp criados
- [ ] Tenant settings: webhooks configurados corretamente

---

## Nota: Z-API vs Evolution API

O workflow existente (WORKFLOW_PRINCIPAL e JOB_FECHADO_CRIACAO) usa **Z-API** para WhatsApp,
NAO Evolution API. A instancia Z-API:
- Instance: `3E33551BEC04F0629AB066C1D567C532`
- Client-Token: `F18054bafa78840a3b1c6028f8a63bfb3S`

Os novos workflows NAO precisam de WhatsApp, entao nao ha conflito.
A migracao de Z-API para Evolution API pode ser feita em fase futura se necessario.
