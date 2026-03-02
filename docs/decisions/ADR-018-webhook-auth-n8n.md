# ADR-018: Autenticacao de Webhooks n8n via X-Webhook-Secret com Timing-Safe Comparison

**Data:** 02/03/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Fase 9 -- Automacoes Operacionais (comunicacao bidirecional Supabase <-> n8n)

---

## Contexto

A Fase 9 introduz automacoes operacionais onde o n8n (self-hosted na VPS Hetzner) e as Edge Functions do Supabase precisam se comunicar bidirecionalmente:

**Supabase -> n8n:** O `integration-processor` dispara webhooks para workflows do n8n (ex: envio de emails de solicitacao de NF, criacao de submissions DocuSeal, copia de templates no Drive). Esses webhooks sao configurados por tenant em `tenants.settings.integrations.n8n.webhooks`.

**n8n -> Supabase:** Workflows do n8n chamam Edge Functions como callbacks apos processar tarefas assincronas (ex: `nf-processor/ingest` quando uma NF chega por email, `nf-processor/request-sent-callback` quando o email de solicitacao foi enviado).

O problema central: **como garantir que somente chamadas legitimas (do n8n ou do pg_cron) sejam aceitas pelas Edge Functions, e que somente o Supabase legitimo acione workflows no n8n?**

Restricoes do ambiente:
- Edge Functions do Supabase rodam em Deno Deploy (sem acesso a bibliotecas Node.js nativas)
- n8n esta numa VPS com IP fixo, mas o IP pode mudar em caso de migracao de servidor
- O projeto usa `verify_jwt: false` em todas as Edge Functions (ES256 JWT incompativel com Edge Runtime), com autenticacao manual via `getAuthContext()`
- Endpoints de callback do n8n (como `ingest`) nao tem um usuario autenticado -- sao chamadas machine-to-machine
- Os secrets ja sao gerenciados via Supabase Vault (`read_secret` RPC) e `Deno.env`

---

## Decisao

### 1. n8n -> Supabase: X-Cron-Secret Header

Para callbacks do n8n chamando Edge Functions, usamos o header `X-Cron-Secret` com comparacao timing-safe:

```typescript
// Em cada handler que recebe callbacks do n8n (ex: ingest.ts, request-sent-callback.ts)
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    diff |= aBuf[i] ^ bBuf[i];
  }
  return diff === 0;
}

function verifyCronSecret(req: Request): void {
  const secret = req.headers.get('X-Cron-Secret');
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected) throw new AppError('INTERNAL_ERROR', 'Configuracao de seguranca ausente', 500);
  if (!secret || !timingSafeEqual(secret, expected)) {
    throw new AppError('UNAUTHORIZED', 'Cron Secret invalido ou ausente', 401);
  }
}
```

O `CRON_SECRET` e um segredo de 64 caracteres hex armazenado tanto como variavel de ambiente nas Edge Functions quanto como credential no n8n. O mesmo secret e usado pelo pg_cron (via pg_net) para disparar o `integration-processor`.

**Roteamento no nf-processor:** O `index.ts` separa rotas que aceitam `X-Cron-Secret` (array `CRON_SECRET_ROUTES`) das que exigem JWT de usuario:

```typescript
const CRON_SECRET_ROUTES = ['ingest', 'request-sent-callback'];
// Rotas em CRON_SECRET_ROUTES: verificam X-Cron-Secret
// Demais rotas: verificam JWT via getAuthContext()
```

### 2. Supabase -> n8n: X-Webhook-Secret Header

Quando o `integration-processor` envia eventos para webhooks do n8n, inclui o header `X-Webhook-Secret`:

```typescript
// n8n-handler.ts
const webhookSecret = (n8nConfig.webhook_secret as string) ?? null;
const headers: Record<string, string> = { 'Content-Type': 'application/json' };
if (webhookSecret) {
  headers['X-Webhook-Secret'] = webhookSecret;
}
```

O `webhook_secret` e configurado por tenant em `tenants.settings.integrations.n8n.webhook_secret`. No lado do n8n, cada workflow verifica o header antes de processar o payload.

### 3. Autenticacao Dual no integration-processor

O `integration-processor` aceita duas formas de autenticacao (para flexibilidade operacional):

1. **X-Cron-Secret** (caminho primario): Usado pelo pg_cron que dispara o processamento da fila a cada minuto
2. **Bearer JWT** (caminho secundario): Permite que admins/CEOs disparem manualmente o processamento via UI ou curl, restrito a roles `admin` e `ceo`

```
pg_cron -> pg_net HTTP POST -> integration-processor (X-Cron-Secret)
Admin UI -> fetch POST -> integration-processor (Bearer JWT)
```

### 4. Propriedades do Mecanismo

- **Timing-safe comparison**: XOR byte-a-byte para prevenir timing attacks (sem early return em caso de mismatch parcial)
- **Fail-closed**: Se `CRON_SECRET` nao esta configurado, retorna 500 (nao permite bypass)
- **Idempotencia**: Usa `idempotency_key` no `integration_events` para evitar reprocessamento (ON CONFLICT retorna o evento existente)
- **Locking atomico**: `lock_integration_events` RPC usa `FOR UPDATE SKIP LOCKED` para evitar processamento concorrente
- **Retry com backoff**: Falhas transitorias sao retentadas ate 7 vezes com delays exponenciais [0s, 60s, 300s, 900s, 3600s, 14400s] + jitter de +/-20%

---

## Consequencias

### Positivas
- Implementacao simples e auditavel (~30 linhas de codigo para a verificacao completa)
- Zero dependencias externas (sem SDK de autenticacao, sem servico de API gateway)
- O mesmo secret (`CRON_SECRET`) serve para pg_cron e n8n, simplificando o gerenciamento
- Timing-safe comparison previne ataques de canal lateral (timing attacks)
- Fail-closed por design: secret ausente = erro 500, nunca bypass silencioso
- Autenticacao dual permite operacao manual sem comprometer a seguranca do caminho automatizado
- Configuravel por tenant: cada tenant pode ter seu proprio `webhook_secret` para n8n

### Negativas
- Shared secret (nao HMAC): se o secret vazar, qualquer chamador pode se autenticar ate o secret ser rotacionado
- Sem rotacao automatica de secrets: exige atualizacao manual em 3 lugares (Deno env, n8n credential, pg_cron config)
- O header `X-Cron-Secret` viaja em texto plano no HTTP body -- depende de HTTPS para protecao em transito
- A verificacao `aBuf.byteLength !== bBuf.byteLength` revela se o comprimento do secret esta correto (mitigado: secrets de comprimento fixo de 64 chars)
- Nao ha logging de tentativas de autenticacao falhas para alertas (apenas `console.warn` nos logs do Deno)

---

## Alternativas Consideradas

### A1: HMAC Signature (como GitHub Webhooks)

**Rejeitada para v1.** No modelo HMAC, o emissor assina o payload inteiro com `HMAC-SHA256(secret, body)` e envia a assinatura no header. O receptor recalcula o HMAC e compara.

Vantagens: o secret nunca trafega na rede, protege integridade do payload (tamper-proof).

Rejeitada porque:
- Adiciona complexidade significativa: precisa serializar o body de forma deterministica antes de assinar (JSON.stringify com keys ordenadas)
- O n8n nao tem suporte nativo a HMAC signing em webhook nodes (exigiria Function node customizado em cada workflow)
- HTTPS ja protege integridade e confidencialidade em transito
- Para nosso volume (<1000 webhooks/dia) e rede controlada (VPS->Supabase), o custo-beneficio nao se justifica
- Pode ser adotado futuramente se escalarmos para cenarios com intermediarios nao confiaveis

### A2: IP Allowlist (restringir por IP da VPS)

**Rejeitada.** A Edge Function do Supabase nao tem acesso direto ao IP do caller (camadas de proxy/CDN do Supabase podem mascarar). Alem disso:
- O IP da VPS pode mudar em migracoes
- Supabase Edge Functions nao oferecem firewall de IP nativo
- Impediria chamadas manuais de admins (que vem de IPs dinamicos)

### A3: Mutual TLS (mTLS)

**Rejeitada.** Supabase Edge Functions nao suportam mTLS. Exigiria um reverse proxy intermediario (ex: Nginx com client certificates). Complexidade operacional desproporcional para o cenario.

### A4: JWT Machine-to-Machine (como service accounts)

**Rejeitada.** Criar um "service account" no Supabase Auth para o n8n geraria um JWT que precisa ser renovado periodicamente. Supabase Auth nao tem conceito nativo de service accounts com refresh automatico. O JWT expiraria e o n8n precisaria de logica de renovacao, adicionando fragilidade.

Alem disso, o `integration-processor` ja roda com `service_role` key para bypass de RLS. Adicionar outro JWT para machine-to-machine criaria confusao sobre qual token usar para qual operacao.

### A5: OAuth 2.0 Client Credentials

**Rejeitada.** Over-engineering para comunicacao entre dois servicos controlados pela mesma equipe na mesma infraestrutura. OAuth Client Credentials exige um authorization server, gerenciamento de tokens, e logica de renovacao. Nao ha necessidade de granularidade de scopes neste estagio.

---

## Referencias

- `supabase/functions/nf-processor/handlers/ingest.ts` (implementacao de verifyCronSecret + timingSafeEqual)
- `supabase/functions/nf-processor/handlers/request-sent-callback.ts` (mesmo padrao)
- `supabase/functions/integration-processor/index.ts` (autenticacao dual: X-Cron-Secret ou JWT)
- `supabase/functions/integration-processor/handlers/n8n-handler.ts` (envio de X-Webhook-Secret)
- `supabase/functions/_shared/auth.ts` (getAuthContext para rotas com JWT)
- docs/architecture/fase-9-automacoes-architecture.md
