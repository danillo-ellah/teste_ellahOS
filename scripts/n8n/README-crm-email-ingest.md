# [CRM] Email Ingest - Briefing por Forward

## Descricao

Quando um Producer Executivo (PE) recebe um briefing de cliente por email e faz forward para `briefings@ellahfilmes.com`, este workflow:

1. Detecta o novo email via polling IMAP (a cada 5 minutos)
2. Extrai e normaliza os dados: remetente, assunto limpo, corpo do texto
3. Chama `POST /crm/ingest-email` na Edge Function do Supabase para criar a oportunidade
4. Envia email de confirmacao ao PE com link para a oportunidade no CRM
5. Em caso de falha, notifica o admin por email para tratamento manual

## Arquivo

`scripts/n8n/wf-crm-email-ingest.json`

## Nos do Workflow

| No | Tipo | Funcao |
|----|------|--------|
| IMAP - Ler Novos Emails | `emailReadImap` v2 | Polling INBOX a cada 5 minutos |
| Parse Email Data | `code` v2 | Extrai from_email, from_name, clean_subject, body_text |
| Email Valido? | `if` v2 | Valida que o remetente tem email valido |
| POST /crm/ingest-email | `httpRequest` v4.2 | Chama Supabase Edge Function |
| Oportunidade Criada? | `if` v2 | Verifica se `data.opportunity_id` existe na resposta |
| Enviar Confirmacao ao PE | `emailSend` v2.1 | Email HTML ao PE com link para o CRM |
| Log Sucesso | `code` v2 | Log estruturado de execucao bem-sucedida |
| Format API Error | `code` v2 | Prepara dados de erro da resposta da API |
| Format HTTP Error | `code` v2 | Captura erro de conexao/timeout do HTTP Request |
| Notificar Admin (Erro) | `emailSend` v2.1 | Alerta ao admin com detalhes do email e do erro |
| Log e Ignorar Email Invalido | `code` v2 | Loga e descarta emails com remetente invalido |
| Workflow Error Handler | `code` v2 | No de erro global (ultimo no do fluxo de erro) |

## Variaveis de Ambiente Necessarias

Configurar em **Settings > Variables** na instancia n8n:

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `IMAP_HOST` | Hostname do servidor IMAP | `imap.gmail.com` ou `mail.ellahfilmes.com` |
| `BRIEFING_EMAIL` | Endereco monitorado e usado como remetente das respostas | `briefings@ellahfilmes.com` |
| `BRIEFING_EMAIL_PASSWORD` | Senha do email (ou App Password se 2FA ativo) | `app-password-gerado` |
| `CRON_SECRET` | Mesmo valor configurado nas Edge Functions do Supabase | `64-char-hex-string` |
| `TENANT_ID` | UUID do tenant Ellah Filmes no banco | `xxxxxxxx-xxxx-...` |
| `ADMIN_EMAIL` | Email do admin que recebe alertas de erro | `admin@ellahfilmes.com` |

## Credenciais Necessarias (configurar uma vez no n8n)

### Credencial IMAP

- **Tipo:** IMAP
- **Nome sugerido:** `IMAP briefings@ellahfilmes.com`
- **Configuracao:**
  - Host: valor de `IMAP_HOST` (ex: `imap.gmail.com`)
  - Port: `993`
  - SSL/TLS: ativado
  - User: valor de `BRIEFING_EMAIL`
  - Password: valor de `BRIEFING_EMAIL_PASSWORD`

### Credencial SMTP (para envio de emails)

- **Tipo:** SMTP
- **Nome sugerido:** `SMTP briefings@ellahfilmes.com`
- **Configuracao:**
  - Host: servidor SMTP correspondente (ex: `smtp.gmail.com`)
  - Port: `587` (TLS) ou `465` (SSL)
  - User: valor de `BRIEFING_EMAIL`
  - Password: valor de `BRIEFING_EMAIL_PASSWORD`

> Se usar Gmail, gere um **App Password** em myaccount.google.com/apppasswords (requer 2FA ativo).

## Dependencias — APIs e Servicos

| Servico | Uso | Autenticacao |
|---------|-----|-------------|
| IMAP Server | Leitura da INBOX | Credencial IMAP (user/password) |
| Supabase Edge Function `crm/ingest-email` | Criacao da oportunidade no CRM | Header `x-cron-secret` |
| SMTP Server | Envio de confirmacao ao PE e alerta ao admin | Credencial SMTP |

## Prerequisito: Handler `ingest-email` na Edge Function CRM

O endpoint `POST /crm/ingest-email` precisa existir na Edge Function `crm`. Ele nao existe ainda
(a funcao atual exige JWT de usuario). Para adicionar:

1. Criar `supabase/functions/crm/handlers/ingest-email.ts` com autenticacao por `X-Cron-Secret`
   (padrao machine-to-machine, ver ADR-018)
2. Registrar a rota no `supabase/functions/crm/index.ts`:
   ```typescript
   // POST /crm/ingest-email (machine-to-machine via CRON_SECRET)
   if (segment1 === 'ingest-email' && !segment2 && method === 'POST') {
     verifyCronSecret(req);
     return await handleIngestEmail(req);
   }
   ```
3. O handler deve:
   - Receber `{ from_email, from_name, subject, body_text, tenant_id }`
   - Chamar a AI (Groq) para extrair titulo, tipo de projeto e valor estimado do `body_text`
   - Criar a oportunidade via `handleCreateOpportunity` (ou insert direto com service role)
   - Retornar `{ data: { opportunity_id, title, stage } }`

Enquanto o handler nao existe, o no "POST /crm/ingest-email" retornara 404/405 e o fluxo de erro
sera acionado (notificando o admin).

## Instrucoes de Importacao no n8n

1. Acesse a instancia n8n na VPS: `http://<VPS_IP>:5678`
2. No menu lateral, clique em **Workflows**
3. Clique em **Import from File**
4. Selecione o arquivo `scripts/n8n/wf-crm-email-ingest.json`
5. Apos importar, o workflow abrira em modo edicao

### Configurar Credenciais

6. Clique no no **IMAP - Ler Novos Emails** e selecione (ou crie) a credencial IMAP
7. Clique no no **Enviar Confirmacao ao PE** e selecione (ou crie) a credencial SMTP
8. Clique no no **Notificar Admin (Erro)** e selecione a mesma credencial SMTP

### Verificar Variaveis de Ambiente

9. Confirme que as variaveis `CRON_SECRET`, `TENANT_ID`, `BRIEFING_EMAIL` e `ADMIN_EMAIL`
   estao configuradas em **Settings > Variables**

### Ativar o Workflow

10. Clique em **Save** e depois em **Activate** (toggle no canto superior direito)

## Como Testar Manualmente

### Teste 1: Email de teste via cliente IMAP

1. Envie um email para `briefings@ellahfilmes.com` com assunto e corpo descrevendo um briefing ficticio
2. Aguarde ate 5 minutos (proximo ciclo de polling) ou clique em **Execute Workflow** manualmente
3. Verifique:
   - No n8n: execucao bem-sucedida nos logs de **Executions**
   - No Supabase: nova linha na tabela `opportunities`
   - No email do PE: confirmacao recebida com link para o CRM

### Teste 2: Execucao manual pelo n8n

1. Abra o workflow no editor
2. Clique em **Test workflow**
3. No no IMAP, clique em **Fetch Test Event** para buscar o email mais recente da INBOX
4. Execute os nos seguintes um a um para verificar cada etapa

### Teste 3: Verificar fluxo de erro

1. Temporariamente, altere a URL do no "POST /crm/ingest-email" para uma URL invalida
2. Execute o workflow
3. Verifique se o email de erro chegou no endereco de `ADMIN_EMAIL`
4. Restaure a URL original

### Verificar logs no n8n

- Menu lateral: **Executions**
- Filtrar por workflow `[CRM] Email Ingest - Briefing por Forward`
- Cada execucao mostra o status de cada no e os dados trafegados

## Cenarios de Erro e Comportamento

| Cenario | Comportamento |
|---------|---------------|
| Email sem remetente valido | No "Email Valido?" desvia para "Log e Ignorar Email Invalido" — sem ruido para o admin |
| Supabase retorna erro 4xx/5xx | No "Format API Error" prepara dados -> "Notificar Admin (Erro)" envia alerta |
| Timeout ou falha de conexao com Supabase | Saida de erro do HTTP Request -> "Format HTTP Error" -> "Notificar Admin (Erro)" |
| SMTP de confirmacao falha | n8n registra o erro; o fluxo continua para "Log Sucesso" (a oportunidade ja foi criada) |
| Handler `ingest-email` nao existe (404) | A resposta nao contem `data.opportunity_id` -> fluxo de erro -> admin notificado |
| Email de forward com prefixos (Fwd:, Enc:) | "Parse Email Data" remove prefixos — assunto limpo enviado ao Supabase |

## Idempotencia

O workflow nao implementa dedup por si so. O handler `ingest-email` no Supabase deve verificar
se ja existe uma oportunidade com o mesmo `from_email` + `subject` nas ultimas 24h para evitar
duplicatas caso o IMAP entregue o mesmo email multiplas vezes.
