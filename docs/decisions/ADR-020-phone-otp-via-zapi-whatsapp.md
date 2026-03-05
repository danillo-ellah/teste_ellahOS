# ADR-020: Phone OTP Login via Z-API (WhatsApp)

**Status:** Proposto
**Data:** 2026-03-04
**Autor:** Tech Lead / Arquiteto

---

## Contexto

O ELLAHOS precisa de login por numero de celular (Phone OTP). O frontend ja possui a UI implementada (tab Email/Celular na pagina de login) usando `signInWithOtp({ phone })` e `verifyOtp({ phone, token, type: 'sms' })` do Supabase JS client.

**Estado atual:**
- A UI de Phone OTP esta pronta em `frontend/src/app/(auth)/login/page.tsx` (PhoneForm)
- O Z-API ja esta configurado e pago (R$100/mes) para envio de mensagens WhatsApp
- O `zapi-client.ts` esta funcional com `sendText()` e `sendImage()`
- O `whatsapp-notify.ts` ja abstrai envio multi-provider (Z-API / Evolution)
- Supabase Auth Phone OTP nativo **exige** um SMS provider configurado (Twilio, MessageBird, Vonage ou TextLocal)
- Nao ha Twilio/MessageBird configurado e o usuario nao quer pagar por isso

**Problema central:** Supabase Phone Auth nativo precisa de um SMS provider pago. O usuario ja paga Z-API para WhatsApp e quer usar esse canal para OTP.

## Opcoes Avaliadas

### Opcao A: Supabase Phone Auth Nativo (Twilio/MessageBird)

**Como funciona:**
- Configurar Twilio/MessageBird no dashboard Supabase (Authentication > Providers > Phone)
- O `signInWithOtp({ phone })` do frontend ja funciona automaticamente
- Supabase gera, envia e valida o OTP internamente

**Pros:**
- Zero codigo backend extra
- Frontend ja esta 100% pronto (nada muda)
- Seguranca gerenciada pelo Supabase (rate limiting, expiracao, tentativas)
- Sessao Supabase criada automaticamente com phone como identidade

**Contras:**
- Custo adicional: Twilio SMS Brasil ~R$0.40/SMS (sem contrato) + numero ~R$5/mes
- Duplica custo de comunicacao (ja paga Z-API R$100/mes)
- SMS tem taxa de entrega inferior a WhatsApp no Brasil (~85% vs ~98%)
- UX inferior: SMS chega mais lento e pode ser filtrado por operadoras

### Opcao B: Custom Auth Flow Completo (sem Supabase Phone Auth)

**Como funciona:**
1. Edge Function `phone-otp` gera OTP de 6 digitos + armazena hash em tabela `phone_otps`
2. Envia OTP via Z-API (WhatsApp)
3. Outra Edge Function valida o OTP e chama `supabase.auth.admin.createUser()` ou `generateLink()`
4. Retorna sessao customizada ao frontend

**Pros:**
- Usa Z-API ja pago (custo zero adicional)
- Entrega via WhatsApp (melhor UX no Brasil)
- Controle total sobre o fluxo

**Contras:**
- Reinventa seguranca: rate limiting, expiracao, brute force, replay attacks
- Precisa gerenciar sessoes/tokens manualmente ou usar admin API com cuidado
- O frontend precisa de alteracoes significativas (nao usa mais `signInWithOtp` nativo)
- Risco de seguranca alto: qualquer bug no fluxo custom abre brecha
- Manutencao continua do fluxo de autenticacao

### Opcao C: Supabase Auth Hook "Custom SMS Provider" (RECOMENDADA)

**Como funciona:**
- Supabase Auth (desde v2.92+) suporta **Auth Hooks** do tipo `send_sms`
- Quando `signInWithOtp({ phone })` e chamado, em vez de enviar via Twilio, o Supabase chama um webhook (Edge Function ou Postgres function)
- O hook recebe `{ user, sms: { otp } }` e e responsavel por entregar o OTP ao usuario
- O Supabase continua gerenciando geracao, expiracao e validacao do OTP
- O frontend **nao muda nada** — continua usando `signInWithOtp()` e `verifyOtp()`

**Pros:**
- Usa Z-API ja pago (custo zero adicional)
- Entrega via WhatsApp (melhor UX no Brasil)
- **Seguranca 100% gerenciada pelo Supabase** (geracao, rate limiting, expiracao, validacao)
- **Frontend nao precisa mudar nada** — ja esta pronto
- Padrao oficial do Supabase (nao e gambiarra)
- Sessao Supabase nativa com phone como identidade
- Fallback facil: se quiser adicionar Twilio depois, basta desativar o hook

**Contras:**
- Precisa habilitar o hook no dashboard Supabase (ou via SQL)
- A Edge Function do hook roda com permissao elevada (service_role)
- Se Z-API cair, OTP nao e entregue (mas isso vale pra qualquer provider)

## Decisao

**Opcao C: Supabase Auth Hook "Custom SMS Provider"** via Edge Function que envia OTP pelo Z-API/WhatsApp.

Essa e a unica opcao que combina:
1. Custo zero adicional (reutiliza Z-API)
2. Seguranca completa do Supabase Auth (OTP lifecycle)
3. Zero mudanca no frontend existente
4. UX superior (WhatsApp > SMS no Brasil)

## Arquitetura Tecnica Detalhada

### Diagrama de Fluxo

```
Usuario          Frontend              Supabase Auth         Auth Hook EF          Z-API         WhatsApp
  |                  |                      |                     |                   |              |
  |--digita phone-->|                      |                     |                   |              |
  |                  |--signInWithOtp({    |                     |                   |              |
  |                  |    phone: "+55..." })|                     |                   |              |
  |                  |                      |--gera OTP 6 dig--->|                   |              |
  |                  |                      |--POST hook-------->|                   |              |
  |                  |                      |                     |--sendText-------->|              |
  |                  |                      |                     |   {phone, otp}    |--msg-------->|
  |                  |                      |                     |<--200 OK----------|              |
  |                  |                      |<--200 OK-----------|                   |              |
  |                  |<--{ messageId }------|                     |                   |              |
  |<--tela de OTP---|                      |                     |                   |              |
  |                  |                      |                     |                   |              |
  |--digita OTP---->|                      |                     |                   |              |
  |                  |--verifyOtp({        |                     |                   |              |
  |                  |    phone, token,    |                     |                   |              |
  |                  |    type: 'sms'      |                     |                   |              |
  |                  |  })                  |                     |                   |              |
  |                  |                      |--valida OTP-------->|                   |              |
  |                  |                      |--cria sessao        |                   |              |
  |                  |<--{ session }--------|                     |                   |              |
  |<--redirect /-----|                      |                     |                   |              |
```

### 1. Edge Function: `auth-sms-hook`

**Path:** `supabase/functions/auth-sms-hook/index.ts`

**Responsabilidade:** Receber o webhook do Supabase Auth e enviar o OTP via Z-API WhatsApp.

**Request do Supabase Auth Hook (POST):**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+5511999999999",
    "email": null
  },
  "sms": {
    "otp": "123456"
  }
}
```

**Logica:**
```typescript
// 1. Validar que o request vem do Supabase Auth (header Authorization com secret)
// 2. Extrair phone e otp do payload
// 3. Determinar tenant do usuario (lookup por user.id ou phone)
//    - Se usuario novo (primeiro login), usar tenant default ou config global
//    - Se usuario existente, buscar tenant_id do profile
// 4. Carregar config Z-API do tenant (ou global fallback)
// 5. Enviar mensagem via Z-API:
//    "Seu codigo ELLAHOS: 123456. Valido por 5 minutos. Nao compartilhe."
// 6. Retornar 200 OK (Supabase espera 2xx para considerar enviado)
```

**Seguranca:**
- Autenticacao via secret compartilhado no header (configurado no Supabase Auth Hook)
- A Edge Function roda com `verify_jwt: false` (e um webhook interno)
- O OTP nunca e logado (apenas o phone sanitizado)
- Rate limiting gerenciado pelo Supabase Auth (nao precisa implementar)

**Tratamento de tenant para OTP:**
- O hook recebe `user.id` mas no primeiro login o usuario pode nao ter profile/tenant ainda
- Solucao: usar config Z-API global (env vars) para envio de OTP, independente de tenant
- Apos login, o middleware normal redireciona para selecao de tenant se necessario

### 2. Configuracao do Hook no Supabase

**Via Dashboard:**
- Authentication > Hooks > SMS Provider
- Type: HTTP (Edge Function)
- URL: `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/auth-sms-hook`
- Secret: gerar um UUID seguro e salvar como `AUTH_SMS_HOOK_SECRET`

**Via SQL (alternativa):**
```sql
-- Habilitar Phone Auth no Supabase
-- Dashboard: Authentication > Providers > Phone > Enable

-- O hook e configurado no dashboard, nao via SQL
-- Mas precisamos garantir que Phone provider esta habilitado
```

**Via API (supabase-cli ou curl):**
```bash
# Habilitar phone no config do GoTrue
# Isso e feito no Dashboard > Authentication > Providers > Phone
# Marcar "Enable Phone Provider"
# Em "SMS Provider" selecionar "Hook"
# Configurar URL e secret da Edge Function
```

### 3. Mensagem WhatsApp OTP

**Template:**
```
ELLAHOS - Codigo de Verificacao

Seu codigo: {otp}

Valido por 5 minutos.
Nao compartilhe este codigo com ninguem.
```

**Consideracoes:**
- Mensagem curta e direta (WhatsApp tem preview rapido)
- Sem emojis (conforme regra do projeto)
- Inclui nome do app para contexto
- Alerta de seguranca embutido
- O OTP de 6 digitos e gerado pelo Supabase Auth (nao por nos)

### 4. Mudancas no Frontend

**NENHUMA.** O frontend ja esta 100% funcional:
- `signInWithOtp({ phone })` dispara o hook automaticamente
- `verifyOtp({ phone, token, type: 'sms' })` valida no Supabase Auth
- A UI de countdown, reenvio e troca de numero ja esta implementada

**Unica mudanca cosmetic recomendada (opcional):**
- Trocar texto "Voce recebera um codigo por SMS" para "Voce recebera um codigo por WhatsApp"
- Na linha 271 de `login/page.tsx`

### 5. Tratamento de Erros

| Cenario | Comportamento |
|---------|---------------|
| Z-API fora do ar | Hook retorna 500, Supabase retorna erro ao frontend, usuario ve "Erro ao enviar SMS" |
| Numero invalido | Supabase valida formato antes de chamar hook; Z-API rejeita e hook retorna 400 |
| WhatsApp nao cadastrado | Z-API tenta enviar mas msg nao e entregue; usuario nao recebe OTP; pode reenviar |
| Rate limit | Supabase Auth gerencia (max attempts configuravel no dashboard) |
| OTP expirado | Supabase Auth gerencia (default 5 minutos); frontend mostra "Codigo expirado" |
| Hook timeout | Supabase Auth trata como falha; frontend mostra erro generico |

### 6. Associacao User-Tenant no Primeiro Login por Phone

**Problema:** Quando um usuario faz login por phone pela primeira vez, ele nao tem profile nem tenant associado.

**Solucao:**
1. O hook usa config Z-API global (env vars, nao por tenant) para enviar OTP
2. Apos `verifyOtp()` bem-sucedido, o Supabase cria o user com `phone` como identidade
3. O middleware do Next.js detecta que o usuario nao tem profile e redireciona para `/onboarding`
4. No onboarding, o usuario e associado a um tenant (via convite ou criacao de novo tenant)
5. Alternativamente, se ja existe um `tenant_invitation` para aquele phone, aceita automaticamente

**Migration necessaria:**
```sql
-- Adicionar coluna phone na tabela tenant_invitations (se nao existir)
-- para permitir convites por numero de celular
ALTER TABLE tenant_invitations ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_phone ON tenant_invitations(phone) WHERE phone IS NOT NULL;
```

### 7. Seguranca

- **OTP lifecycle:** 100% gerenciado pelo Supabase Auth (geracao, hash, expiracao, max tentativas)
- **Brute force:** Supabase Auth tem rate limiting nativo por IP e por phone
- **Replay attack:** OTP e single-use, invalidado apos verificacao
- **Hook authentication:** Secret compartilhado no header `Authorization: Bearer {secret}`
- **Logs:** Phone e logado sanitizado (nunca OTP); registros em `whatsapp_messages`
- **Fallback:** Se Z-API cair, nenhum OTP e enviado; usuario pode tentar de novo ou usar email
- **Multi-tenant:** Config Z-API global para OTP (nao depende de tenant no momento do login)

### 8. Checklist de Implementacao

1. [ ] Criar Edge Function `auth-sms-hook` (handler simples, ~80 linhas)
2. [ ] Deploy da Edge Function
3. [ ] Habilitar Phone Provider no dashboard Supabase
4. [ ] Configurar SMS Hook no dashboard (URL + secret)
5. [ ] Adicionar `AUTH_SMS_HOOK_SECRET` nos secrets do Supabase
6. [ ] Adicionar env vars Z-API globais na Edge Function (ou usar Vault)
7. [ ] Testar fluxo completo: digitar phone > receber WhatsApp > digitar OTP > logado
8. [ ] (Opcional) Atualizar texto "SMS" para "WhatsApp" no frontend
9. [ ] (Opcional) Migration para phone em tenant_invitations

### 9. Estimativa de Esforco

| Item | Tempo |
|------|-------|
| Edge Function auth-sms-hook | 30 min |
| Config dashboard Supabase | 15 min |
| Teste E2E | 30 min |
| Ajuste texto frontend (opcional) | 5 min |
| **Total** | **~1h20** |

## Consequencias

**Positivas:**
- Login por celular funciona sem custo adicional
- UX superior: usuario recebe OTP no WhatsApp (app que ja usa)
- Seguranca do Supabase Auth mantida integralmente
- Frontend existente funciona sem alteracoes
- Facil de desabilitar ou trocar provider no futuro

**Negativas:**
- Dependencia do Z-API para autenticacao (se Z-API cair, phone login nao funciona)
- Usuarios sem WhatsApp no numero nao recebem OTP (edge case raro no Brasil)
- Hook e um ponto unico de falha para phone auth

**Mitigacao:**
- Login por email continua funcionando como fallback
- Monitorar health do Z-API via status check periodico
- Alertar admin se hook falhar mais de 3x consecutivas

## Alternativas Consideradas

1. **Opcao A (Twilio nativo):** Descartada por custo duplicado e UX inferior (SMS vs WhatsApp)
2. **Opcao B (Custom auth flow):** Descartada por complexidade de seguranca e risco de bugs
3. **SMS via Z-API (nao WhatsApp):** Z-API nao suporta envio de SMS puro, apenas WhatsApp
4. **Supabase Postgres Hook (pg_net):** Possivel mas Edge Function e mais facil de debugar e manter
