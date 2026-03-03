# [CRM] Email Ingest - Briefing por Forward

**Data:** 03/03/2026
**Status:** Pronto para importacao
**Arquivo:** `scripts/n8n/wf-crm-email-ingest.json`
**Dominio:** CRM
**Nomenclatura:** `[CRM] Email Ingest - Briefing por Forward`

---

## Trigger

- **Tipo:** IMAP Email Trigger (`n8n-nodes-base.emailReadImap`)
- **Caixa monitorada:** `briefings@ellahfilmes.com` — INBOX
- **Intervalo de polling:** 5 minutos
- **Protocolo:** IMAP sobre SSL/TLS porta 993

---

## O que faz (passo a passo)

### 1. IMAP - Ler Novos Emails
Polling da INBOX a cada 5 minutos. A cada execucao, o n8n entrega os emails nao processados
como itens individuais. Cada email segue o fluxo de forma independente.

### 2. Parse Email Data
No de codigo que normaliza os dados brutos do email:
- Extrai `from_email` e `from_name` do campo `from` (suporta formato `"Nome <email@dominio.com>"`)
- Remove prefixos de resposta/encaminhamento do subject: `Re:`, `Fwd:`, `Fw:`, `Enc:`, `FWD:`, `RES:`
- Extrai `body_text` (texto plano) e `body_html`
- Trunca body_text em 10.000 caracteres e body_html em 50.000 (limites da Edge Function)
- Seta `_valid: false` se o remetente nao tiver email valido

### 3. Email Valido? (IF)
- Caminho TRUE: remetente tem `@` valido -> continua para ingest
- Caminho FALSE: email invalido -> "Log e Ignorar Email Invalido" (sem notificacao, sem ruido)

### 4. POST /crm/ingest-email
Chamada HTTP POST para `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/crm/ingest-email`.

Payload enviado:
```json
{
  "from_email": "<email do PE>",
  "from_name": "<nome do PE>",
  "subject": "<assunto limpo>",
  "body_text": "<corpo do email, max 10k chars>",
  "tenant_id": "<UUID do tenant>"
}
```

Autenticacao: header `x-cron-secret` com o valor de `$env.CRON_SECRET` (padrao ADR-018).
Timeout: 30 segundos. Em caso de erro de conexao, saida vai para "Format HTTP Error".

### 5. Oportunidade Criada? (IF)
Verifica se a resposta contem `data.opportunity_id`:
- Caminho TRUE: sucesso -> "Enviar Confirmacao ao PE"
- Caminho FALSE: API retornou sem oportunidade (erro de negocio) -> "Format API Error"

### 6a. Enviar Confirmacao ao PE (sucesso)
Email HTML enviado para o `from_email` do PE com:
- Titulo da oportunidade criada
- Estagio inicial (`lead`)
- Link para `https://teste-ellah-os.vercel.app/crm/<opportunity_id>`

### 6b. Format API Error / Format HTTP Error (falha)
Nos de codigo que estruturam os dados de erro (mensagem, remetente, assunto) para a notificacao.
Ambos convergem para "Notificar Admin (Erro)".

### 7. Notificar Admin (Erro)
Email HTML para `$env.ADMIN_EMAIL` com:
- Dados do email original (remetente, assunto)
- Mensagem de erro detalhada
- Instrucao para criar oportunidade manualmente se necessario

### 8. Workflow Error Handler
No final do fluxo de erro. Loga qualquer excecao nao capturada com `console.error`.

---

## Dependencias — APIs chamadas

| API / Servico | Endpoint / Operacao | Autenticacao |
|---------------|---------------------|--------------|
| Servidor IMAP | Leitura da INBOX | user/password (credencial n8n) |
| Supabase Edge Function | `POST /crm/ingest-email` | Header `x-cron-secret` (ADR-018) |
| Servidor SMTP | Envio de emails | user/password (credencial n8n) |

### Prerequisito critico: handler `ingest-email`

O endpoint `POST /crm/ingest-email` **nao existe** na Edge Function `crm` atual. A funcao usa
`getAuthContext()` (JWT) para todas as rotas. Para este workflow funcionar, e necessario:

1. Criar `supabase/functions/crm/handlers/ingest-email.ts`
   - Autenticacao: `verifyCronSecret(req)` (sem JWT)
   - Entrada: `{ from_email, from_name, subject, body_text, tenant_id }`
   - Logica: extrair dados com AI (Groq), criar oportunidade com `service_role` client
   - Saida: `{ data: { opportunity_id, title, stage } }`

2. Registrar a rota em `supabase/functions/crm/index.ts` antes do bloco de autenticacao JWT:
   ```typescript
   if (segment1 === 'ingest-email' && !segment2 && method === 'POST') {
     verifyCronSecret(req);
     return await handleIngestEmail(req);
   }
   ```

3. Adicionar `ingest-email` ao array `CRON_SECRET_ROUTES` se o index usar roteamento por array.

---

## Cenarios de Erro e o que acontece

| Cenario | No onde ocorre | O que acontece |
|---------|---------------|----------------|
| Email com remetente sem `@` | Parse Email Data | `_valid: false` -> ignorado silenciosamente |
| Handler `ingest-email` nao existe (404/405) | POST /crm/ingest-email | Resposta sem `opportunity_id` -> admin notificado |
| Supabase retorna erro 5xx | POST /crm/ingest-email | Saida de erro HTTP -> admin notificado |
| Timeout (>30s) na chamada Supabase | POST /crm/ingest-email | Saida de erro HTTP -> admin notificado |
| Groq AI falha ao extrair dados no handler | Supabase (interno) | Oportunidade criada com dados basicos (sem enriquecimento AI) |
| SMTP de confirmacao falha | Enviar Confirmacao ao PE | Erro logado; oportunidade ja foi criada no CRM |
| IMAP fora do ar | IMAP - Ler Novos Emails | Execucao falha; n8n reintenta no proximo ciclo (5 min) |

---

## Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|----------|------------|-----------|
| `CRON_SECRET` | Sim | Compartilhado com as Edge Functions (ADR-018) |
| `TENANT_ID` | Sim | UUID do tenant Ellah Filmes |
| `BRIEFING_EMAIL` | Sim | Email monitorado e usado como remetente das respostas |
| `ADMIN_EMAIL` | Sim | Destinatario dos alertas de erro |
| `IMAP_HOST` | Configurado na credencial | Hostname do servidor IMAP |

---

## Idempotencia

O workflow e parcialmente idempotente:
- O no IMAP entrega cada email uma vez (controle interno do n8n por UID IMAP)
- O handler `ingest-email` no Supabase deve implementar dedup por `from_email + subject + 24h`
  para proteger contra reentregas eventuais do protocolo IMAP

---

## Observacoes de Seguranca

- O header `x-cron-secret` nunca e exposto no frontend (flui apenas no n8n -> Supabase)
- A comparacao do secret no Supabase usa timing-safe XOR (ADR-018)
- O workflow nao armazena o conteudo do email em nenhuma tabela intermediaria
- O body_text e truncado em 10.000 chars para prevenir payloads excessivos
