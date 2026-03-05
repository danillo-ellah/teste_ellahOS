// ========================================================
// auth-sms-hook — Auth Hook do Supabase para Phone OTP via Z-API (WhatsApp)
//
// Supabase Auth chama este hook quando signInWithOtp({ phone }) e disparado.
// Em vez de enviar via Twilio, entregamos o OTP via WhatsApp usando Z-API.
//
// Referencia: ADR-020 — docs/decisions/ADR-020-phone-otp-via-zapi-whatsapp.md
// verify_jwt: false — autenticacao propria via AUTH_SMS_HOOK_SECRET
// ========================================================

import { sendText, sanitizePhone, type ZapiConfig } from '../_shared/zapi-client.ts';

// Payload enviado pelo Supabase Auth Hook (tipo send_sms)
interface AuthHookPayload {
  user: {
    id: string;
    phone: string;
    email: string | null;
  };
  sms: {
    otp: string;
  };
}

Deno.serve(async (req: Request) => {
  // 1. Apenas POST e aceito
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Validar autenticacao do hook via secret compartilhado
  const hookSecret = Deno.env.get('AUTH_SMS_HOOK_SECRET');
  if (!hookSecret) {
    console.error('[auth-sms-hook] AUTH_SMS_HOOK_SECRET nao configurado');
    return new Response(JSON.stringify({ error: 'Hook secret not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const incomingSecret = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  if (incomingSecret !== hookSecret) {
    console.warn('[auth-sms-hook] Tentativa de acesso com secret invalido');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Ler e validar payload
  let payload: AuthHookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const phone = payload?.user?.phone;
  const otp = payload?.sms?.otp;

  if (!phone || !otp) {
    console.error('[auth-sms-hook] Payload invalido: phone ou otp ausentes');
    return new Response(JSON.stringify({ error: 'Missing phone or otp in payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sanitiza o phone para log (nunca loga o OTP)
  const sanitizedPhone = sanitizePhone(phone);
  console.log(`[auth-sms-hook] Enviando OTP via Z-API para phone: ${sanitizedPhone}`);

  // 4. Carregar config Z-API global (env vars — independente de tenant para auth)
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

  if (!instanceId || !token || !clientToken) {
    console.error('[auth-sms-hook] Config Z-API incompleta (ZAPI_INSTANCE_ID / ZAPI_TOKEN / ZAPI_CLIENT_TOKEN)');
    return new Response(JSON.stringify({ error: 'Z-API not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const zapiConfig: ZapiConfig = { instanceId, token, clientToken };

  // 5. Montar mensagem OTP
  const message =
    `ELLAHOS - Codigo de Verificacao\n\nSeu codigo: ${otp}\n\nValido por 5 minutos.\nNao compartilhe este codigo com ninguem.`;

  // 6. Enviar via Z-API
  try {
    const result = await sendText({
      config: zapiConfig,
      phone,
      text: message,
    });

    if (!result.success) {
      console.error(`[auth-sms-hook] Falha no envio Z-API para ${sanitizedPhone}: ${result.error}`);
      return new Response(JSON.stringify({ error: result.error ?? 'Z-API send failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[auth-sms-hook] OTP enviado com sucesso. messageId: ${result.externalMessageId}, phone: ${sanitizedPhone}`);

    // 7. Retornar 200 OK — Supabase considera OTP entregue
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[auth-sms-hook] Erro inesperado para ${sanitizedPhone}: ${msg}`);
    return new Response(JSON.stringify({ error: `Unexpected error: ${msg}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
