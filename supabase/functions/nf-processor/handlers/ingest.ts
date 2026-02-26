import { z } from 'https://esm.sh/zod@3.22.4';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { createNotification } from '../../_shared/notification-helper.ts';
import { getGoogleAccessToken, setPublicReadPermission } from '../../_shared/google-drive-client.ts';
import { getSecret } from '../../_shared/vault.ts';

// Schema de validacao do payload do n8n
const IngestSchema = z.object({
  tenant_id: z.string().uuid('tenant_id deve ser UUID valido'),
  gmail_message_id: z.string().min(1, 'gmail_message_id e obrigatorio'),
  sender_email: z.string().email('sender_email deve ser email valido'),
  sender_name: z.string().min(1, 'sender_name e obrigatorio'),
  subject: z.string().min(1, 'subject e obrigatorio'),
  received_at: z.string().min(1, 'received_at e obrigatorio'),
  file_name: z.string().min(1, 'file_name e obrigatorio'),
  file_hash: z.string().min(1, 'file_hash e obrigatorio'),
  file_size_bytes: z.number().int().positive('file_size_bytes deve ser positivo'),
  drive_file_id: z.string().min(1, 'drive_file_id e obrigatorio'),
  drive_url: z.string().url('drive_url deve ser URL valida'),
});

type IngestInput = z.infer<typeof IngestSchema>;

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
    console.error('[ingest] CRON_SECRET nao configurado no ambiente');
    throw new AppError('INTERNAL_ERROR', 'Configuracao de seguranca ausente', 500);
  }

  if (!secret || !timingSafeEqual(secret, expected)) {
    throw new AppError('UNAUTHORIZED', 'Cron Secret invalido ou ausente', 401);
  }
}

// Busca perfis de usuarios com roles financeiro/admin/ceo para notificar
async function getUsersToNotify(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
): Promise<string[]> {
  const { data: profiles, error: profilesError } = await serviceClient
    .from('profiles')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .in('role', ['admin', 'ceo', 'financeiro'])
    .is('deleted_at', null);

  if (profilesError) {
    console.error('[ingest] falha ao buscar perfis para notificacao:', profilesError.message);
    return [];
  }

  return (profiles ?? []).map((p: { id: string }) => p.id);
}

// Tenta match automatico da NF com financial_records do tenant
// Retorna { matchedId, confidence, matchCount } baseado na logica da spec
async function tryAutoMatch(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
  senderEmail: string,
): Promise<{ matchedId: string | null; confidence: number; matchCount: number; matchData: Record<string, unknown> | null }> {
  // Busca financial_records onde supplier_email = sender_email
  const { data: directMatches, error: directError } = await serviceClient
    .from('financial_records')
    .select('id, description, amount, supplier_email, person_id, nf_request_status')
    .eq('tenant_id', tenantId)
    .eq('supplier_email', senderEmail)
    .in('nf_request_status', ['enviado', 'enviado_confirmado'])
    .eq('status', 'pendente')
    .is('deleted_at', null);

  if (directError) {
    console.error('[ingest] falha ao buscar financial_records por supplier_email:', directError.message);
  }

  let matches = directMatches ?? [];

  // Se nao achou por supplier_email, tenta via people.email
  if (matches.length === 0) {
    const { data: peopleMatches, error: peopleError } = await serviceClient
      .from('financial_records')
      .select(`
        id, description, amount, supplier_email, person_id, nf_request_status,
        people!inner(email)
      `)
      .eq('tenant_id', tenantId)
      .eq('people.email', senderEmail)
      .in('nf_request_status', ['enviado', 'enviado_confirmado'])
      .eq('status', 'pendente')
      .is('deleted_at', null);

    if (peopleError) {
      console.error('[ingest] falha ao buscar financial_records por people.email:', peopleError.message);
    }

    matches = peopleMatches ?? [];
  }

  if (matches.length === 0) {
    return { matchedId: null, confidence: 0.0, matchCount: 0, matchData: null };
  }

  if (matches.length === 1) {
    const m = matches[0];
    return {
      matchedId: m.id,
      confidence: 0.95,
      matchCount: 1,
      matchData: {
        financial_record_id: m.id,
        description: m.description,
        amount: m.amount,
        confidence: 0.95,
      },
    };
  }

  // Multiplos matches: retorna o primeiro mas com baixa confianca
  const m = matches[0];
  return {
    matchedId: m.id,
    confidence: 0.50,
    matchCount: matches.length,
    matchData: {
      financial_record_id: m.id,
      description: m.description,
      amount: m.amount,
      confidence: 0.50,
    },
  };
}

export async function ingestNf(req: Request): Promise<Response> {
  // 1. Verificar autenticacao via Cron Secret
  verifyCronSecret(req);

  // 2. Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Payload JSON invalido', 400);
  }

  const result = IngestSchema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, { issues });
  }

  const input: IngestInput = result.data;
  const serviceClient = getServiceClient();

  console.log(`[ingest] recebendo NF do email "${input.sender_email}" (hash: ${input.file_hash.substring(0, 8)}...)`);

  // 3. Deduplicacao: verificar se file_hash ja existe para o tenant
  const { data: existing, error: dupError } = await serviceClient
    .from('nf_documents')
    .select('id, status')
    .eq('tenant_id', input.tenant_id)
    .eq('file_hash', input.file_hash)
    .is('deleted_at', null)
    .maybeSingle();

  if (dupError) {
    console.error('[ingest] falha ao verificar duplicata:', dupError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao verificar duplicata', 500);
  }

  if (existing) {
    console.log(`[ingest] NF duplicada detectada: id=${existing.id} status=${existing.status}`);
    return success({
      nf_document_id: existing.id,
      status: 'duplicate',
      is_duplicate: true,
    });
  }

  // 4. Tentar match automatico
  const { matchedId, confidence, matchCount, matchData } = await tryAutoMatch(
    serviceClient,
    input.tenant_id,
    input.sender_email,
  );

  // 5. Determinar status inicial baseado no resultado do match
  let docStatus: string;
  let matchMethod: string | null = null;

  if (matchedId && confidence >= 0.90) {
    docStatus = 'auto_matched';
    matchMethod = 'auto_value_supplier';
  } else {
    docStatus = 'pending_review';
    if (matchedId) {
      matchMethod = 'auto_value_supplier';
    }
  }

  // 6. Criar registro em nf_documents
  const { data: newDoc, error: insertError } = await serviceClient
    .from('nf_documents')
    .insert({
      tenant_id: input.tenant_id,
      source: 'email',
      gmail_message_id: input.gmail_message_id,
      sender_email: input.sender_email,
      sender_name: input.sender_name,
      subject: input.subject,
      received_at: input.received_at,
      file_name: input.file_name,
      file_hash: input.file_hash,
      file_size_bytes: input.file_size_bytes,
      drive_file_id: input.drive_file_id,
      drive_url: input.drive_url,
      status: docStatus,
      matched_financial_record_id: matchedId ?? null,
      match_confidence: confidence > 0 ? confidence : null,
      match_method: matchMethod,
      metadata: {
        ingested_at: new Date().toISOString(),
        match_count: matchCount,
      },
    })
    .select('id, status')
    .single();

  if (insertError || !newDoc) {
    console.error('[ingest] falha ao criar nf_document:', insertError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao registrar NF', 500);
  }

  console.log(`[ingest] NF criada: id=${newDoc.id} status=${newDoc.status}`);

  // 7. Tornar arquivo acessivel via link (fire-and-forget)
  try {
    const saJson = await getSecret(serviceClient, `${input.tenant_id}_gdrive_service_account`);
    if (saJson) {
      const sa = JSON.parse(saJson);
      const token = await getGoogleAccessToken(sa);
      if (token) {
        await setPublicReadPermission(token, input.drive_file_id);
      }
    }
  } catch (permErr) {
    console.error('[ingest] falha ao definir permissao publica no Drive:', permErr);
    // Nao bloqueia a operacao principal
  }

  // 8. Criar notificacoes para roles financeiro/admin/ceo (fire-and-forget)
  try {
    const userIds = await getUsersToNotify(serviceClient, input.tenant_id);
    const notifTitle = docStatus === 'auto_matched'
      ? 'NF recebida e associada automaticamente'
      : 'Nova NF recebida — validacao necessaria';
    const notifBody = `NF de "${input.sender_name}" (${input.sender_email}) recebida. Arquivo: ${input.file_name}`;

    for (const userId of userIds) {
      await createNotification(serviceClient, {
        tenant_id: input.tenant_id,
        user_id: userId,
        type: 'nf_received',
        priority: docStatus === 'auto_matched' ? 'normal' : 'high',
        title: notifTitle,
        body: notifBody,
        metadata: {
          nf_document_id: newDoc.id,
          sender_email: input.sender_email,
          file_name: input.file_name,
          status: docStatus,
        },
        action_url: `/financial/nf-validation?id=${newDoc.id}`,
      });
    }
  } catch (notifErr) {
    console.error('[ingest] falha ao criar notificacoes:', notifErr);
    // Nao bloqueia a operacao principal
  }

  return created({
    nf_document_id: newDoc.id,
    status: newDoc.status,
    match: matchData ?? undefined,
    is_duplicate: false,
  });
}
