# Phone Auth — Implementacao e Deploy (04/03/2026)

## Edge Function `auth-sms-hook` — DEPLOYED

**URL:** `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/auth-sms-hook`
**Arquivo:** `supabase/functions/auth-sms-hook/index.ts`

### Logica (7 etapas)

1. Validacao de metodo — Apenas POST (405 para outros)
2. Autenticacao do hook — `Authorization: Bearer {secret}` contra `AUTH_SMS_HOOK_SECRET`
3. Parse do payload — Extrai `user.phone` e `sms.otp` do Supabase Auth
4. Config Z-API global — Carrega `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` de env vars
5. Mensagem OTP:
   ```
   ELLAHOS - Codigo de Verificacao

   Seu codigo: 123456

   Valido por 5 minutos.
   Nao compartilhe este codigo com ninguem.
   ```
6. Envio via Z-API — `sendText()` do `_shared/zapi-client.ts`
7. Resposta — 200 OK ou 500 com erro

### Seguranca
- OTP nunca logado
- verify_jwt: false (usa secret proprio)
- Rate limiting, expiracao, validacao: 100% Supabase Auth

---

## Configuracao Manual Necessaria no Dashboard

### 1. Habilitar Phone Provider
- Authentication > Providers > Phone > Enable Phone Provider

### 2. Configurar SMS Hook
- Authentication > Hooks > Send SMS
- Type: HTTP
- URL: `https://etvapcxesaxhsvzgaane.supabase.co/functions/v1/auth-sms-hook`
- Secret: gerar UUID seguro

### 3. Adicionar Secrets na Edge Function
Via Dashboard > Edge Functions > auth-sms-hook > Secrets:
- `AUTH_SMS_HOOK_SECRET` = UUID do passo 2
- `ZAPI_INSTANCE_ID` = ID da instancia Z-API
- `ZAPI_TOKEN` = Token da instancia Z-API
- `ZAPI_CLIENT_TOKEN` = Client-Token do painel Z-API

### 4. (Opcional) Atualizar texto no frontend
- Trocar "SMS" por "WhatsApp" em `login/page.tsx` linha 271
