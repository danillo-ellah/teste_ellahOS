import { z } from 'https://esm.sh/zod@3.22.4';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Schema de validacao do payload do n8n
const RequestSentCallbackSchema = z.object({
  financial_record_ids: z
    .array(z.string().uuid('Cada financial_record_id deve ser UUID valido'))
    .min(1, 'Ao menos um financial_record_id e necessario'),
  gmail_message_id: z.string().min(1, 'gmail_message_id e obrigatorio'),
  sent_at: z.string().min(1, 'sent_at e obrigatorio'),
  tenant_id: z.string().uuid('tenant_id deve ser UUID valido'),
});

type RequestSentCallbackInput = z.infer<typeof RequestSentCallbackSchema>;

// Comparacao timing-safe para evitar timing attacks
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

// Verifica autenticacao via X-Cron-Secret header
function verifyCronSecret(req: Request): void {
  const secret = req.headers.get('X-Cron-Secret');
  const expected = Deno.env.get('CRON_SECRET');

  if (!expected) {
    console.error('[request-sent-callback] CRON_SECRET nao configurado no ambiente');
    throw new AppError('INTERNAL_ERROR', 'Configuracao de seguranca ausente', 500);
  }

  if (!secret || !timingSafeEqual(secret, expected)) {
    throw new AppError('UNAUTHORIZED', 'Cron Secret invalido ou ausente', 401);
  }
}

export async function requestSentCallbackNf(req: Request): Promise<Response> {
  // 1. Verificar autenticacao via Cron Secret
  verifyCronSecret(req);

  // 2. Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = RequestSentCallbackSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: RequestSentCallbackInput = result.data;
  const serviceClient = getServiceClient();

  console.log(`[request-sent-callback] tenant=${input.tenant_id} records=${input.financial_record_ids.length} gmail_id=${input.gmail_message_id}`);

  // 3. Atualizar financial_records: nf_request_status = 'enviado_confirmado' + tracking
  const { data: updatedRecords, error: updateError } = await serviceClient
    .from('financial_records')
    .update({
      nf_request_status: 'enviado_confirmado',
      nf_request_sent_at: input.sent_at,
      nf_request_gmail_id: input.gmail_message_id,
    })
    .in('id', input.financial_record_ids)
    .eq('tenant_id', input.tenant_id)
    .select('id, job_id, amount, description');

  if (updateError) {
    console.error('[request-sent-callback] falha ao atualizar financial_records:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao confirmar envio dos pedidos de NF', 500);
  }

  const updated = updatedRecords ?? [];

  // 4. Criar invoice com status 'pending' para cada financial_record (se nao existir)
  let invoicesCreated = 0;

  for (const record of updated) {
    if (!record.job_id) continue;

    try {
      // Verificar se ja existe invoice para este financial_record
      const { data: existingInvoice } = await serviceClient
        .from('invoices')
        .select('id')
        .eq('financial_record_id', record.id)
        .eq('tenant_id', input.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!existingInvoice) {
        const { error: invoiceError } = await serviceClient
          .from('invoices')
          .insert({
            tenant_id: input.tenant_id,
            job_id: record.job_id,
            financial_record_id: record.id,
            amount: record.amount ?? null,
            status: 'pending',
            metadata: {
              created_by: 'nf-processor/request-sent-callback',
              gmail_message_id: input.gmail_message_id,
              sent_at: input.sent_at,
            },
          });

        if (invoiceError) {
          console.error(`[request-sent-callback] falha ao criar invoice para record ${record.id}:`, invoiceError.message);
        } else {
          invoicesCreated++;
        }
      }
    } catch (invoiceErr) {
      console.error(`[request-sent-callback] erro ao criar invoice para record ${record.id}:`, invoiceErr);
    }
  }

  console.log(`[request-sent-callback] ${updated.length} registro(s) atualizados, ${invoicesCreated} invoice(s) criadas`);

  return success({
    updated: updated.length,
    invoices_created: invoicesCreated,
  });
}
