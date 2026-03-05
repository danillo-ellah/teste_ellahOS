# Telegram Bot Integration - Arquitetura Tecnica

**Autor:** Tech Lead / Arquiteto
**Data:** 2026-03-04
**Status:** PROPOSTA

---

## 1. Visao Geral

Integrar o ELLAHOS com Telegram Bot API para oferecer um canal gratuito de comunicacao bidirecional entre o sistema e seus usuarios. O Telegram Bot sera um **terceiro provider de mensageria** ao lado do Z-API (WhatsApp) e Evolution API, com capacidades extras de comandos interativos, inline keyboards e integracao com o copilot ELLA.

### Por que Telegram?

| Aspecto | WhatsApp (Z-API) | Telegram Bot |
|---------|-------------------|--------------|
| Custo | R$ 100/mes (Z-API) | **100% gratuito** |
| Rate limit | Depende do plano Z-API | 30 msgs/s por bot, 20 msgs/min por grupo |
| Markdown | Limitado (*bold*, _italic_) | **MarkdownV2 completo** + HTML |
| Inline Keyboards | Nao suporta | **Sim** (botoes interativos) |
| Arquivos | 16MB (WhatsApp limit) | **2GB upload, 50MB download via bot** |
| Grupos | Sim, mas limitado | **Supergrupos ate 200k membros** |
| Webhooks | Via Z-API callback | **Nativo, sem custo** |
| Adocao | Universal no Brasil | Menor, mas crescente |
| API | Proprietaria (Z-API) | **Aberta, documentada, estavel** |
| Bots | Nao existe | **Ecossistema completo** |

**Conclusao:** Telegram Bot API e 100% gratuita, sem limites de mensagens praticamente (30/s e muito mais do que o ELLAHOS precisa), e oferece features superiores ao WhatsApp para automacao. A desvantagem e que o usuario precisa ter Telegram instalado.

---

## 2. Telegram Bot API - Pesquisa Tecnica

### 2.1 Custo e Limites

- **Custo: ZERO.** A Telegram Bot API e totalmente gratuita, sem planos pagos.
- **Rate limits:**
  - Mensagens individuais: **30 msgs/segundo** por bot
  - Mensagens para o mesmo chat: **1 msg/segundo** (burst de 30 permitido)
  - Mensagens em grupo: **20 msgs/minuto** por grupo
  - Sem limite de bots por conta
  - Sem limite de mensagens por mes
- **Tamanho de arquivos:**
  - Upload pelo bot: ate **50 MB** (via `sendDocument`)
  - Download pelo usuario: ate **2 GB** (via file_id)
  - Fotos: ate 10 MB
- **Webhooks:**
  - 1 webhook por bot
  - HTTPS obrigatorio (com certificado valido ou self-signed)
  - IP whitelist opcional
  - Atualizacoes pendentes: ate 100 por request (getUpdates) ou streaming (webhook)

### 2.2 Criacao do Bot

1. Abrir Telegram e iniciar conversa com `@BotFather`
2. Enviar `/newbot`
3. Escolher nome: "ELLAH OS" (display name)
4. Escolher username: `ellahos_bot` (unico, termina em `bot`)
5. BotFather retorna o **token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
6. Configurar webhook via API call:
   ```
   POST https://api.telegram.org/bot{TOKEN}/setWebhook
   Body: { "url": "https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/telegram-bot/webhook" }
   ```

### 2.3 Webhook vs Polling

| Aspecto | Webhook | Polling (getUpdates) |
|---------|---------|---------------------|
| Latencia | **Imediato** (~100ms) | Depende do intervalo |
| Infraestrutura | Precisa endpoint HTTPS | Precisa processo rodando |
| Supabase Edge Functions | **Perfeito** (serverless) | Impossivel (sem long-running) |
| Custo | 0 (serverless) | Precisa VPS dedicada |
| Complexidade | Baixa | Media |

**Decisao: WEBHOOK.** Supabase Edge Functions sao ideais para receber webhooks -- serverless, sem custo adicional, ja tem HTTPS.

---

## 3. Arquitetura Tecnica

### 3.1 Diagrama de Componentes

```
Telegram Cloud                    Supabase
+----------------+               +----------------------------------+
|                |  webhook POST  |  Edge Function: telegram-bot     |
|  Telegram Bot  | ------------> |  /webhook  (recebe updates)      |
|  API Server    | <------------ |  /send     (envia mensagens)     |
|                |  HTTP response |  /setup    (configura webhook)   |
+----------------+               +----------------------------------+
                                          |
                                          v
                                 +------------------+
                                 |  PostgreSQL       |
                                 |  - telegram_chats |
                                 |  - telegram_msgs  |
                                 +------------------+
                                          |
                                  +-------+-------+
                                  |               |
                            +-----v-----+   +----v------+
                            | _shared/  |   | Existing  |
                            | telegram- |   | EFs (jobs,|
                            | client.ts |   | NF, etc)  |
                            +-----------+   +-----------+
```

### 3.2 Nova Edge Function: `telegram-bot`

Estrutura de handlers seguindo o padrao existente do projeto:

```
supabase/functions/telegram-bot/
  index.ts                    -- Router principal
  handlers/
    webhook.ts                -- Recebe updates do Telegram (POST /webhook)
    send.ts                   -- Envia mensagem (POST /send) - uso interno/admin
    setup.ts                  -- Configura webhook no Telegram (POST /setup)
    status.ts                 -- Status do bot (GET /status)
```

### 3.3 Shared Client: `_shared/telegram-client.ts`

```typescript
// ========================================================
// Telegram Bot API Client
// Docs: https://core.telegram.org/bots/api
// 100% gratuito, sem dependencias externas
// ========================================================

export interface TelegramConfig {
  botToken: string; // Token do BotFather
}

export interface SendMessageOptions {
  chatId: number | string;
  text: string;
  parseMode?: 'MarkdownV2' | 'HTML';
  replyMarkup?: InlineKeyboardMarkup;
  disableWebPagePreview?: boolean;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId: number | null;
  error?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  document?: TelegramDocument;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

// --- Base API call ---
async function callTelegramApi<T>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `https://api.telegram.org/bot${token}/${method}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  const data = await resp.json();

  if (!data.ok) {
    throw new Error(
      `Telegram API error [${method}]: ${data.description ?? 'unknown'} (code: ${data.error_code ?? resp.status})`,
    );
  }

  return data.result as T;
}

// --- sendMessage ---
export async function sendMessage(
  config: TelegramConfig,
  opts: SendMessageOptions,
): Promise<SendMessageResult> {
  try {
    const result = await callTelegramApi<{ message_id: number }>(
      config.botToken,
      'sendMessage',
      {
        chat_id: opts.chatId,
        text: opts.text,
        parse_mode: opts.parseMode ?? 'HTML',
        reply_markup: opts.replyMarkup,
        disable_web_page_preview: opts.disableWebPagePreview ?? true,
      },
    );

    return { success: true, messageId: result.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[telegram-client] sendMessage error:', msg);
    return { success: false, messageId: null, error: msg };
  }
}

// --- sendDocument ---
export async function sendDocument(
  config: TelegramConfig,
  chatId: number | string,
  documentUrl: string,
  caption?: string,
): Promise<SendMessageResult> {
  try {
    const result = await callTelegramApi<{ message_id: number }>(
      config.botToken,
      'sendDocument',
      {
        chat_id: chatId,
        document: documentUrl,
        caption: caption ?? '',
        parse_mode: 'HTML',
      },
    );
    return { success: true, messageId: result.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, messageId: null, error: msg };
  }
}

// --- setWebhook ---
export async function setWebhook(
  config: TelegramConfig,
  webhookUrl: string,
  secretToken?: string,
): Promise<boolean> {
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ['message', 'callback_query'],
    max_connections: 40,
  };

  if (secretToken) {
    body.secret_token = secretToken;
  }

  const result = await callTelegramApi<boolean>(
    config.botToken,
    'setWebhook',
    body,
  );

  return result;
}

// --- answerCallbackQuery ---
export async function answerCallbackQuery(
  config: TelegramConfig,
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await callTelegramApi(config.botToken, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text: text ?? '',
  });
}

// --- getMe ---
export async function getMe(
  config: TelegramConfig,
): Promise<TelegramUser> {
  return callTelegramApi<TelegramUser>(config.botToken, 'getMe');
}

// --- Escape helpers ---
// MarkdownV2 requer escape de caracteres especiais
export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

// HTML e mais simples - basta escapar &, <, >
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

### 3.4 Tabela: `telegram_chats`

Vincula um chat_id do Telegram a um usuario do ELLAHOS.

```sql
CREATE TABLE telegram_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  chat_id BIGINT NOT NULL,             -- Telegram chat ID (pode ser negativo para grupos)
  chat_type TEXT NOT NULL DEFAULT 'private',  -- private, group, supergroup
  username TEXT,                        -- @username do Telegram
  first_name TEXT,
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, chat_id),
  UNIQUE(tenant_id, profile_id)        -- 1 profile = 1 chat por tenant
);

-- RLS
ALTER TABLE telegram_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telegram_chats_tenant_isolation" ON telegram_chats
  USING (tenant_id = get_tenant_id());

-- Index
CREATE INDEX idx_telegram_chats_chat_id ON telegram_chats(chat_id);
CREATE INDEX idx_telegram_chats_profile ON telegram_chats(tenant_id, profile_id);
```

### 3.5 Vinculacao de Usuario (Linking)

Fluxo para vincular o chat_id do Telegram ao profile do usuario:

```
1. Usuario acessa ELLAHOS frontend: Settings > Integracoes > Telegram
2. Sistema gera um token temporario (UUID, expira em 10 min)
3. Exibe deep link: https://t.me/ellahos_bot?start={token}
4. Usuario clica → abre Telegram → envia /start {token}
5. Webhook recebe o /start, valida token, salva chat_id + profile_id
6. Confirma no Telegram: "Vinculado com sucesso! Voce recebera notificacoes aqui."
7. Frontend poll ou Realtime detecta que telegram_chats foi criado
```

Tabela auxiliar para tokens temporarios:

```sql
CREATE TABLE telegram_link_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  profile_id UUID NOT NULL REFERENCES profiles(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Limpar tokens expirados automaticamente (ou via CRON)
-- DELETE FROM telegram_link_tokens WHERE expires_at < now() - interval '1 hour';
```

### 3.6 Fluxo do Webhook Handler

```typescript
// handlers/webhook.ts (pseudocodigo)

export async function handleWebhook(req: Request): Promise<Response> {
  // 1. Validar secret_token (header X-Telegram-Bot-Api-Secret-Token)
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  const provided = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if (secret && provided !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Parse update
  const update: TelegramUpdate = await req.json();

  // 3. Processar mensagem de texto
  if (update.message?.text) {
    await handleTextMessage(update.message);
  }

  // 4. Processar callback de inline keyboard
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }

  // Telegram espera 200 OK rapido (< 60s)
  return new Response('OK', { status: 200 });
}

async function handleTextMessage(msg: TelegramMessage) {
  const text = msg.text!.trim();
  const chatId = msg.chat.id;

  // Comandos
  if (text.startsWith('/start')) return handleStart(msg);
  if (text.startsWith('/jobs'))  return handleJobs(chatId);
  if (text.startsWith('/status')) return handleStatus(chatId, text);
  if (text.startsWith('/aprovar')) return handleAprovar(chatId, text);
  if (text.startsWith('/resumo')) return handleResumo(chatId);
  if (text.startsWith('/help'))  return handleHelp(chatId);

  // Texto livre → encaminha para copilot ELLA (Groq)
  return handleCopilotMessage(chatId, text);
}
```

---

## 4. Comandos e Features Propostos

### 4.1 Comandos do Bot

| Comando | Descricao | Role |
|---------|-----------|------|
| `/start {token}` | Vincula conta Telegram ao ELLAHOS | todos |
| `/help` | Lista comandos disponiveis | todos |
| `/jobs` | Lista jobs ativos (ultimos 10) | todos |
| `/status JOB-038` | Detalhes de um job especifico | todos |
| `/aprovar NF-123` | Aprova uma NF pendente | admin/ceo/financeiro |
| `/rejeitar NF-123 motivo` | Rejeita NF com motivo | admin/ceo/financeiro |
| `/resumo` | Resumo do dia (jobs, NFs, pagamentos) | admin/ceo |
| `/financeiro` | Resumo financeiro da semana | admin/ceo/financeiro |
| `/clima JOB-038` | Previsao do tempo para filmagem | todos |
| `/equipe JOB-038` | Lista equipe do job | todos |
| `/ella pergunta livre` | Conversa com copilot ELLA via Groq | todos |
| `/desvincular` | Remove vinculacao Telegram | todos |

### 4.2 Notificacoes Push (Sistema -> Usuario)

Reutiliza os mesmos eventos que ja existem no WhatsApp, mas envia via Telegram:

| Evento | Mensagem | Inline Keyboard |
|--------|----------|-----------------|
| Job aprovado | "Job JOB-038 aprovado! Cliente: XYZ" | [Ver no ELLAHOS] |
| NF recebida | "NF #123 recebida - R$ 5.000" | [Aprovar] [Rejeitar] [Ver] |
| Contrato assinado | "Contrato de Joao assinado via DocuSeal" | [Ver contrato] |
| Filmagem amanha | "Filmagem amanha: JOB-038, Local XYZ, 7h" | [Ver OD] [Clima] |
| Alerta clima | "Chuva prevista para filmagem JOB-038" | [Detalhes] |
| Pagamento vencendo | "Pagamento de R$ 10k vence em 3 dias" | [Ver] |
| Deadline entrega | "Entrega de JOB-038 vence em 2 dias" | [Ver] |

### 4.3 Inline Keyboards (Botoes Interativos)

A feature mais poderosa do Telegram vs WhatsApp. Exemplo de aprovacao de NF:

```typescript
// Notificacao com botoes
await sendMessage(config, {
  chatId: userChatId,
  text: `<b>NF Pendente de Aprovacao</b>\n\nJob: JOB-038\nFornecedor: Studio ABC\nValor: R$ 5.000,00\nVencimento: 15/03/2026`,
  parseMode: 'HTML',
  replyMarkup: {
    inline_keyboard: [
      [
        { text: 'Aprovar', callback_data: 'nf_approve:NF-123' },
        { text: 'Rejeitar', callback_data: 'nf_reject:NF-123' },
      ],
      [
        { text: 'Ver detalhes', url: 'https://ellahos.vercel.app/financeiro/nf/NF-123' },
      ],
    ],
  },
});
```

Quando o usuario clica "Aprovar", o webhook recebe um `callback_query` com `data: "nf_approve:NF-123"`. O handler processa a aprovacao no banco e responde com confirmacao.

### 4.4 Copilot ELLA via Telegram

Qualquer mensagem que nao comece com `/` e encaminhada para o copilot ELLA (Groq API - Llama 3.3 70B):

```
Usuario: "quais jobs estao atrasados?"
ELLA: "Voce tem 3 jobs com entregas atrasadas:
- JOB-035: Video institucional (2 dias)
- JOB-038: Comercial TV (1 dia)
- JOB-041: Social media pack (5 dias)"
```

A integracao reutiliza o endpoint `copilot` existente, passando o contexto do usuario.

---

## 5. Integracao com Sistema de Notificacoes Existente

### 5.1 Provider Abstraction

O `send-manual.ts` ja suporta multiplos providers (Z-API, Evolution API). Telegram sera o terceiro:

```typescript
// Em send-manual.ts, adicionar:
const provider = determineProvider(waConfig); // 'zapi' | 'evolution' | 'telegram'

if (provider === 'telegram') {
  const chatRecord = await serviceClient
    .from('telegram_chats')
    .select('chat_id')
    .eq('tenant_id', auth.tenantId)
    .eq('profile_id', targetProfileId)
    .eq('is_active', true)
    .single();

  if (!chatRecord.data) {
    throw new AppError('NOT_FOUND', 'Usuario nao tem Telegram vinculado', 404);
  }

  const botToken = await getSecret(serviceClient, `${auth.tenantId}_telegram_bot_token`);
  const result = await sendMessage(
    { botToken },
    { chatId: chatRecord.data.chat_id, text: message },
  );

  externalMessageId = result.messageId?.toString() ?? null;
  if (!result.success) {
    sendError = result.error;
    finalStatus = 'failed';
  }
}
```

### 5.2 Preferencia de Canal por Usuario

Adicionar campo `notification_channel` ao profile:

```sql
ALTER TABLE profiles ADD COLUMN notification_channel TEXT DEFAULT 'whatsapp';
-- Valores: 'whatsapp', 'telegram', 'both', 'none'
```

O sistema de notificacoes consulta a preferencia antes de enviar:

```typescript
async function notifyUser(profileId: string, tenantId: string, message: string, keyboard?: InlineKeyboardMarkup) {
  const profile = await getProfile(profileId);

  if (['whatsapp', 'both'].includes(profile.notification_channel)) {
    await sendWhatsApp(profile.phone, message);
  }

  if (['telegram', 'both'].includes(profile.notification_channel)) {
    const chat = await getTelegramChat(tenantId, profileId);
    if (chat) {
      await sendTelegramMessage(chat.chat_id, message, keyboard);
    }
  }
}
```

---

## 6. Seguranca

### 6.1 Autenticacao do Webhook

O Telegram suporta `secret_token` no `setWebhook`. Quando configurado, toda request do Telegram inclui o header `X-Telegram-Bot-Api-Secret-Token`. O webhook handler DEVE validar esse header.

```typescript
// No setWebhook:
await setWebhook(config, webhookUrl, 'meu-secret-token-aleatorio');

// No webhook handler:
const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
const provided = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
if (provided !== secret) return new Response('', { status: 401 });
```

### 6.2 Rate Limiting

- Comandos: max 10 comandos/minuto por chat_id (anti-abuse)
- Copilot ELLA: max 20 msgs/hora por usuario (controle de custo Groq)
- Implementar via contador em memoria (Map) ou Redis se necessario

### 6.3 Autorizacao de Comandos

Cada comando verifica o role do usuario vinculado ao chat_id:

```typescript
async function getAuthFromChatId(chatId: number): Promise<{ profileId: string; tenantId: string; role: string } | null> {
  const { data } = await serviceClient
    .from('telegram_chats')
    .select('profile_id, tenant_id, profiles(role)')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  return {
    profileId: data.profile_id,
    tenantId: data.tenant_id,
    role: (data.profiles as any)?.role ?? 'viewer',
  };
}
```

### 6.4 Multi-Tenant

- Cada tenant configura SEU PROPRIO bot (token no Vault)
- Ou usa um bot compartilhado com routing por tenant via `telegram_chats.tenant_id`
- **Recomendacao:** Bot unico compartilhado para simplificar (um webhook, um token). O tenant e determinado pelo chat_id vinculado.

---

## 7. Comparacao Detalhada: Telegram vs WhatsApp

| Criterio | Telegram Bot | WhatsApp (Z-API) | Vencedor |
|----------|-------------|-------------------|----------|
| **Custo mensal** | R$ 0 | R$ 100 | Telegram |
| **Setup** | 2 min (BotFather) | Config Z-API + instancia | Telegram |
| **Adocao no Brasil** | ~30% usuarios | ~99% usuarios | WhatsApp |
| **Bidirecional** | Sim (comandos + texto livre) | Limitado (precisa template) | Telegram |
| **Inline keyboards** | Sim (botoes clicaveis) | Nao | Telegram |
| **Markdown/HTML** | Completo | Basico (*bold* _italic_) | Telegram |
| **Envio de arquivos** | 50MB bot / 2GB user | 16MB | Telegram |
| **Grupos** | Supergrupos 200k membros | Grupos 256 membros | Telegram |
| **Rate limits** | 30 msgs/s | Depende do plano | Telegram |
| **Webhooks** | Nativo, gratuito | Via Z-API (pago) | Telegram |
| **Estabilidade API** | Muito alta, backward compat | Depende do Z-API | Telegram |
| **Notificacoes push** | Otimas (silenciosas opcionais) | Otimas | Empate |
| **UX para usuario final** | Precisa instalar app | Ja tem instalado | WhatsApp |
| **Aprovacoes inline** | Sim (callback_query) | Nao (precisa link externo) | Telegram |
| **Copilot IA** | Perfeito (chat nativo) | Possivel mas limitado | Telegram |

### Recomendacao

**Manter AMBOS os canais.** O WhatsApp cobre 99% dos usuarios brasileiros e ja esta funcionando. O Telegram adiciona features superiores (inline keyboards, copilot, comandos) com custo zero. O usuario escolhe nas configuracoes qual canal prefere.

---

## 8. Plano de Implementacao

### Sprint 1: Core (1-2 dias)

| Item | Estimativa | Descricao |
|------|-----------|-----------|
| `_shared/telegram-client.ts` | 2h | Client completo (sendMessage, sendDocument, setWebhook, answerCallbackQuery) |
| Migration: `telegram_chats` + `telegram_link_tokens` | 1h | Tabelas + RLS + indexes |
| EF `telegram-bot/webhook` | 3h | Recebe updates, roteia para handlers |
| EF `telegram-bot/setup` | 1h | Configura webhook no Telegram |
| Handler `/start` (linking) | 2h | Vincula chat_id ao profile via token |
| Frontend: Settings > Telegram | 2h | Gerar link, mostrar status vinculado |
| **Subtotal Sprint 1** | **~11h** | |

### Sprint 2: Comandos (1 dia)

| Item | Estimativa | Descricao |
|------|-----------|-----------|
| `/jobs` handler | 1h | Lista jobs ativos do usuario |
| `/status JOB-XXX` handler | 1h | Detalhes de um job |
| `/resumo` handler | 2h | Resumo do dia (agregar dados) |
| `/clima JOB-XXX` handler | 1h | Reutiliza weather-alerts EF |
| `/help` handler | 0.5h | Lista comandos |
| `/equipe JOB-XXX` handler | 1h | Lista equipe do job |
| **Subtotal Sprint 2** | **~6.5h** | |

### Sprint 3: Notificacoes + Keyboards (1 dia)

| Item | Estimativa | Descricao |
|------|-----------|-----------|
| Migration: `notification_channel` em profiles | 0.5h | Preferencia de canal |
| Notificacao provider abstraction | 2h | Unificar envio WA + Telegram |
| Inline keyboards para NF aprovacao | 2h | Botoes Aprovar/Rejeitar |
| Callback query handler | 2h | Processa cliques nos botoes |
| Frontend: preferencia de canal | 1h | Dropdown WA/Telegram/Ambos |
| **Subtotal Sprint 3** | **~7.5h** | |

### Sprint 4: Copilot + Extras (1 dia)

| Item | Estimativa | Descricao |
|------|-----------|-----------|
| Copilot ELLA via Telegram | 3h | Integra Groq, contexto do usuario |
| `/financeiro` handler | 1.5h | Resumo financeiro semanal |
| `/aprovar` + `/rejeitar` handlers | 2h | Aprovacao via comando texto |
| Rate limiting | 1h | Anti-abuse por chat_id |
| **Subtotal Sprint 4** | **~7.5h** | |

### Total Estimado: ~32.5 horas (4-5 dias de trabalho)

---

## 9. Configuracao Necessaria

### Variaveis de Ambiente (Supabase Vault / .env)

```
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_SECRET=random-secret-string-here

# Webhook URL (gerada automaticamente)
# https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/telegram-bot/webhook
```

### Setup Inicial (uma vez)

```bash
# 1. Criar bot via @BotFather no Telegram
# 2. Copiar token
# 3. Configurar webhook:
curl -X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/telegram-bot/webhook",
    "secret_token": "random-secret-string-here",
    "allowed_updates": ["message", "callback_query"]
  }'

# 4. Verificar:
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"
```

### Configuracoes do Bot (via BotFather)

```
/setdescription - Sistema de gestao para produtoras audiovisuais
/setabouttext - ELLAH OS - Gestao de producao audiovisual
/setcommands - Define menu de comandos:
  jobs - Lista jobs ativos
  status - Detalhes de um job (ex: /status JOB-038)
  resumo - Resumo do dia
  financeiro - Resumo financeiro da semana
  clima - Previsao do tempo para filmagem
  equipe - Equipe do job
  ella - Conversa com copilot ELLA
  help - Lista de comandos
  desvincular - Remove vinculacao
```

---

## 10. Codigo Exemplo: Webhook Handler Completo

```typescript
// supabase/functions/telegram-bot/handlers/webhook.ts

import { getServiceClient } from '../../_shared/supabase-client.ts';
import {
  sendMessage,
  answerCallbackQuery,
  escapeHtml,
  type TelegramConfig,
  type TelegramUpdate,
  type TelegramMessage,
  type CallbackQuery,
} from '../../_shared/telegram-client.ts';

// Rate limiter simples em memoria (reset no cold start)
const rateLimiter = new Map<number, { count: number; resetAt: number }>();

function checkRateLimit(chatId: number, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(chatId);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(chatId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

export async function handleWebhook(req: Request): Promise<Response> {
  // 1. Validar secret
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  if (secret) {
    const provided = req.headers.get('X-Telegram-Bot-Api-Secret-Token');
    if (provided !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  // 2. Parse update
  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!botToken) {
    console.error('[telegram-bot] TELEGRAM_BOT_TOKEN nao configurado');
    return new Response('OK', { status: 200 });
  }

  const config: TelegramConfig = { botToken };
  const serviceClient = getServiceClient();

  try {
    // 3. Mensagem de texto
    if (update.message?.text) {
      const msg = update.message;
      const chatId = msg.chat.id;

      // Rate limit: 10 msgs/min
      if (!checkRateLimit(chatId, 10)) {
        await sendMessage(config, {
          chatId,
          text: 'Voce esta enviando mensagens rapido demais. Aguarde um momento.',
        });
        return new Response('OK', { status: 200 });
      }

      const text = msg.text.trim();

      // --- /start {token} ---
      if (text.startsWith('/start')) {
        const token = text.split(' ')[1];
        if (!token) {
          await sendMessage(config, {
            chatId,
            text: 'Bem-vindo ao <b>ELLAH OS</b>!\n\nPara vincular sua conta, acesse o ELLAHOS e gere um link de vinculacao em Configuracoes > Telegram.',
          });
          return new Response('OK', { status: 200 });
        }

        // Validar token
        const { data: linkToken } = await serviceClient
          .from('telegram_link_tokens')
          .select('*')
          .eq('token', token)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!linkToken) {
          await sendMessage(config, {
            chatId,
            text: 'Link expirado ou invalido. Gere um novo link no ELLAHOS.',
          });
          return new Response('OK', { status: 200 });
        }

        // Upsert telegram_chats
        const { error: upsertError } = await serviceClient
          .from('telegram_chats')
          .upsert({
            tenant_id: linkToken.tenant_id,
            profile_id: linkToken.profile_id,
            chat_id: chatId,
            chat_type: msg.chat.type,
            username: msg.from?.username ?? null,
            first_name: msg.from?.first_name ?? null,
            is_active: true,
            linked_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id,profile_id' });

        if (upsertError) {
          console.error('[telegram-bot] upsert error:', upsertError.message);
          await sendMessage(config, { chatId, text: 'Erro ao vincular. Tente novamente.' });
          return new Response('OK', { status: 200 });
        }

        // Marcar token como usado
        await serviceClient
          .from('telegram_link_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', linkToken.id);

        await sendMessage(config, {
          chatId,
          text: 'Conta vinculada com sucesso!\n\nVoce recebera notificacoes do ELLAHOS aqui.\n\nDigite /help para ver os comandos disponiveis.',
        });

        return new Response('OK', { status: 200 });
      }

      // --- Verificar vinculacao para todos os outros comandos ---
      const { data: chat } = await serviceClient
        .from('telegram_chats')
        .select('profile_id, tenant_id, profiles(role, full_name)')
        .eq('chat_id', chatId)
        .eq('is_active', true)
        .single();

      if (!chat) {
        await sendMessage(config, {
          chatId,
          text: 'Sua conta nao esta vinculada. Acesse o ELLAHOS e gere um link em Configuracoes > Telegram.',
        });
        return new Response('OK', { status: 200 });
      }

      const userRole = (chat.profiles as any)?.role ?? 'viewer';
      const userName = (chat.profiles as any)?.full_name ?? 'Usuario';

      // --- /help ---
      if (text === '/help') {
        const helpText = `<b>Comandos disponiveis:</b>\n
/jobs - Lista jobs ativos
/status JOB-038 - Detalhes de um job
/resumo - Resumo do dia
/clima JOB-038 - Clima para filmagem
/equipe JOB-038 - Equipe do job
/ella sua pergunta - Copilot IA
/desvincular - Remover vinculacao
${['admin', 'ceo', 'financeiro'].includes(userRole) ? '\n<b>Admin:</b>\n/financeiro - Resumo financeiro\n/aprovar NF-123 - Aprovar NF\n/rejeitar NF-123 motivo - Rejeitar NF' : ''}`;

        await sendMessage(config, { chatId, text: helpText });
        return new Response('OK', { status: 200 });
      }

      // --- /jobs ---
      if (text === '/jobs') {
        const { data: jobs } = await serviceClient
          .from('jobs')
          .select('id, code, title, status, client:clients(trade_name)')
          .eq('tenant_id', chat.tenant_id)
          .in('status', ['em_andamento', 'pre_producao', 'producao', 'pos_producao'])
          .order('updated_at', { ascending: false })
          .limit(10);

        if (!jobs || jobs.length === 0) {
          await sendMessage(config, { chatId, text: 'Nenhum job ativo encontrado.' });
          return new Response('OK', { status: 200 });
        }

        const lines = jobs.map((j: any) =>
          `- <b>${escapeHtml(j.code ?? '---')}</b> ${escapeHtml(j.title ?? 'Sem titulo')}\n  Cliente: ${escapeHtml((j.client as any)?.trade_name ?? '---')} | Status: ${j.status}`
        );

        await sendMessage(config, {
          chatId,
          text: `<b>Jobs Ativos (${jobs.length})</b>\n\n${lines.join('\n\n')}`,
        });
        return new Response('OK', { status: 200 });
      }

      // --- /desvincular ---
      if (text === '/desvincular') {
        await serviceClient
          .from('telegram_chats')
          .update({ is_active: false })
          .eq('chat_id', chatId);

        await sendMessage(config, {
          chatId,
          text: 'Conta desvinculada. Voce nao recebera mais notificacoes.\n\nPara vincular novamente, gere um novo link no ELLAHOS.',
        });
        return new Response('OK', { status: 200 });
      }

      // --- Texto livre → Copilot ELLA ---
      // (implementacao futura - Sprint 4)
      if (text.startsWith('/ella ') || (!text.startsWith('/') && text.length > 2)) {
        const question = text.startsWith('/ella ') ? text.slice(6) : text;
        // TODO: Integrar com Groq API
        await sendMessage(config, {
          chatId,
          text: `Ola ${escapeHtml(userName)}! O copilot ELLA via Telegram sera ativado em breve. Por enquanto, use os comandos (/help).`,
        });
        return new Response('OK', { status: 200 });
      }

      // Comando desconhecido
      await sendMessage(config, {
        chatId,
        text: 'Comando nao reconhecido. Digite /help para ver os comandos.',
      });
    }

    // 4. Callback query (inline keyboard clicks)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data = cq.data ?? '';
      const chatId = cq.message?.chat.id;

      if (!chatId) {
        await answerCallbackQuery(config, cq.id, 'Erro: chat nao encontrado');
        return new Response('OK', { status: 200 });
      }

      // Verificar vinculacao
      const { data: chat } = await serviceClient
        .from('telegram_chats')
        .select('profile_id, tenant_id, profiles(role)')
        .eq('chat_id', chatId)
        .eq('is_active', true)
        .single();

      if (!chat) {
        await answerCallbackQuery(config, cq.id, 'Conta nao vinculada');
        return new Response('OK', { status: 200 });
      }

      // Parse callback_data: "action:entity_id"
      const [action, entityId] = data.split(':');

      if (action === 'nf_approve' && entityId) {
        // TODO: Chamar nf-processor/approve
        await answerCallbackQuery(config, cq.id, 'NF aprovada!');
        await sendMessage(config, {
          chatId,
          text: `NF <b>${escapeHtml(entityId)}</b> aprovada com sucesso.`,
        });
      } else if (action === 'nf_reject' && entityId) {
        await answerCallbackQuery(config, cq.id);
        await sendMessage(config, {
          chatId,
          text: `Para rejeitar, envie:\n<code>/rejeitar ${escapeHtml(entityId)} motivo da rejeicao</code>`,
        });
      } else {
        await answerCallbackQuery(config, cq.id, 'Acao nao reconhecida');
      }
    }
  } catch (err) {
    console.error('[telegram-bot] webhook error:', err);
    // Sempre retorna 200 para o Telegram nao fazer retry
  }

  return new Response('OK', { status: 200 });
}
```

---

## 11. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Usuario nao tem Telegram | Alta (Brasil) | Medio | Manter WhatsApp como canal principal |
| Token do bot exposto | Baixa | Alto | Vault do Supabase, nunca em codigo |
| Spam/abuse via bot | Media | Medio | Rate limiting por chat_id |
| Telegram offline | Muito baixa | Baixo | Retry + fallback para WhatsApp |
| Cold start da Edge Function | Media | Baixo | Telegram tolera ate 60s de resposta |

---

## 12. Decisoes Arquiteturais

1. **Bot unico vs bot por tenant:** Bot unico compartilhado. Mais simples de operar, o tenant e determinado pelo chat_id vinculado. Se um tenant quiser bot customizado no futuro, basta configurar token proprio.

2. **Webhook vs Polling:** Webhook, pois Edge Functions sao serverless e nao suportam long-polling.

3. **HTML vs MarkdownV2:** HTML como default. MarkdownV2 tem muitos caracteres que precisam escape e e fragil. HTML e mais previsivel.

4. **Persistencia de mensagens:** Reutilizar tabela `whatsapp_messages` renomeando para `notification_messages`? **Nao.** Manter separado ou adicionar coluna `provider` a tabela existente. Ja tem coluna `provider` na `whatsapp_messages`, entao basta adicionar valor 'telegram'.

5. **Copilot ELLA:** Reutilizar o endpoint `copilot` existente (Groq API), passando contexto do usuario. Nao criar logica duplicada.

---

## 13. Proximos Passos

1. **Criar bot** via @BotFather e obter token
2. **Aprovar este documento** (review do time)
3. **Criar ADR-025** registrando a decisao
4. **Implementar Sprint 1** (core: client, migration, webhook, linking)
5. **Testar E2E** com usuario real
6. **Iterar** nos sprints 2-4 conforme prioridade
