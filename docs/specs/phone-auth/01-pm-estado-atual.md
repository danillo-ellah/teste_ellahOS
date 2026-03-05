# Relatorio de Estado: Phone OTP Login — ELLAHOS

## Resumo Executivo

A feature de Phone OTP Login esta **parcialmente implementada**. O frontend existe e esta correto. O backend (Supabase Auth com provider SMS) **nao esta configurado**, tornando a feature inutilizavel em producao. A Z-API, que poderia resolver o problema, esta integrada apenas para WhatsApp de notificacoes — nao para autenticacao.

---

## O que foi implementado (e funciona)

### Frontend — Completo e correto

Arquivo: `/frontend/src/app/(auth)/login/page.tsx`

O codigo do frontend esta bem feito e cobre todos os casos de uso:

1. **Tab Email / Celular** — toggle limpo com reset de estado ao trocar aba
2. **Componente `PhoneForm`** — fluxo de 2 passos:
   - Passo 1: input do numero com prefixo `+55` fixo na UI
   - Passo 2: input do codigo OTP de 6 digitos com countdown de reenvio de 60s
3. **`formatPhoneNumber`** — normaliza o numero para `+55XXXXXXXXXXX`
4. **Chamadas corretas ao Supabase JS SDK:**
   - `supabase.auth.signInWithOtp({ phone: formatted })` — solicita OTP
   - `supabase.auth.verifyOtp({ phone, token, type: 'sms' })` — verifica OTP
5. **Tratamento de erros** — mapa de mensagens em portugues
6. **UX de reenvio** — botao `Reenviar codigo` com countdown + botao `Trocar numero`

### Infraestrutura de WhatsApp — Existe mas nao e Auth

Arquivos: `supabase/functions/_shared/zapi-client.ts` e `whatsapp-notify.ts`

A Z-API esta integrada para envio de mensagens de notificacao. Esta integracao **nao tem relacao** com autenticacao.

---

## O que esta faltando (gaps criticos)

### Gap 1 — Supabase Auth sem provider SMS configurado (BLOCKER)

O Supabase Auth precisa de um **SMS provider** para funcionar com `signInWithOtp({ phone })`. Os providers suportados sao: Twilio, Vonage, MessageBird, Textlocal, e Twilio Verify.

**Estado atual:** Nenhum provider SMS configurado no projeto Supabase. Qualquer chamada a `signInWithOtp({ phone })` retorna erro.

### Gap 2 — Z-API nao resolve o problema de Auth diretamente (BLOCKER arquitetural)

- O Supabase Auth **gera o OTP internamente** e precisa de um provider SMS cadastrado
- A Z-API entrega mensagens WhatsApp, nao SMS tradicional
- O Supabase nao aceita Z-API como provider SMS nativo
- Para usar Z-API/WhatsApp, seria necessario **implementar um Custom SMS Hook** (Supabase Auth Hooks)

### Gap 3 — Coluna `phone` no perfil nao vinculada ao Auth

A tabela `profiles` tem `phone TEXT` mas nao esta sincronizada com `auth.users.phone`.

### Gap 4 — Sem spec formal documentada

Nao existe arquivo em `docs/specs/` para Phone OTP Login.

---

## Analise de Opcoes para Producao

### Opcao A — Twilio ou Vonage (SMS tradicional)

- Configurar no Supabase Dashboard: Authentication > Providers > Phone
- Custo: ~$0.0075/SMS para Brasil
- **Pro:** Solucao nativa, frontend ja pronto
- **Contra:** Custo por SMS, pode cair em spam

### Opcao B — Custom SMS Hook com Z-API/WhatsApp (RECOMENDADA)

- Criar Supabase Auth Hook do tipo `send_sms` (Edge Function)
- Hook intercepta OTP gerado pelo Supabase e envia via Z-API como mensagem WhatsApp
- Configurar: Authentication > Hooks > Send SMS hook
- **Pro:** Usa Z-API ja paga (R$100/mes), WhatsApp tem taxa de abertura altissima, sem custo adicional
- **Contra:** Requer WhatsApp no numero, texto UI precisa ajustar ("SMS" → "WhatsApp")
- **Esforco:** ~1 dia

### Opcao C — Desabilitar a aba Celular temporariamente

Remover/desabilitar aba para nao confundir usuarios em producao.

---

## Perguntas Abertas

1. **Provider:** Z-API/WhatsApp (Opcao B) ou SMS tradicional (Opcao A)?
2. **Numero desconhecido:** Criar conta nova? Bloquear? Redirecionar?
3. **Vinculo com tenant:** 1 numero = 1 tenant, ou pode ter multiplos?
4. **Texto UI:** Atualizar "SMS" para "WhatsApp"?
5. **Prioridade:** Blocker para producao ou pode esperar?

## Arquivos relevantes

| Arquivo | Status |
|---|---|
| `/frontend/src/app/(auth)/login/page.tsx` | Implementado, pronto para uso quando backend configurado |
| `/frontend/src/app/auth/callback/route.ts` | PKCE callback para email |
| `/supabase/functions/_shared/zapi-client.ts` | Z-API para notificacoes |
| `/supabase/functions/_shared/whatsapp-notify.ts` | Templates WhatsApp |
