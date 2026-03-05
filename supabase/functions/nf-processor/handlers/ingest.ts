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

// Extrai o codigo do job do assunto do email.
// Formato do assunto original: "038 - Senac - Titulo / Fornecedor / SOLICITAÇÃO DE NOTA"
// Quando o fornecedor responde: "Re: 038 - Senac - Titulo / Fornecedor / SOLICITAÇÃO DE NOTA"
// O codigo e um numero de 3 digitos no inicio (apos "Re:" opcional)
function extractJobCodeFromSubject(subject: string): string | null {
  // Remove prefixos de resposta (Re:, Fwd:, Enc:, RES:, ENC:) e espacos
  const cleaned = subject.replace(/^(Re|Fwd|Enc|RES|ENC|Res|Fw):\s*/gi, '').trim();
  // Extrai o codigo numerico no inicio (1-4 digitos)
  const match = cleaned.match(/^(\d{1,4})\b/);
  return match ? match[1] : null;
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

// Auto-match inteligente em 2 etapas (baseado no Apps Script existente):
//
// ETAPA 1: Subject contém codigo do job → busca cost_items por job.code + vendor_email
//   Se 1 match → vincula automaticamente (confianca alta, fornecedor seguiu as regras)
//   Se multiplos → nao vincula (review manual)
//
// ETAPA 2: Sem codigo no subject → busca cost_items por vendor_email apenas
//   Nunca vincula automaticamente (pode ser job errado)
//   Apenas retorna candidatos para review manual na tela
//
// deno-lint-ignore no-explicit-any
async function trySmartAutoMatch(
  serviceClient: ReturnType<typeof getServiceClient>,
  tenantId: string,
  senderEmail: string,
  subject: string,
): Promise<{
  autoLinkedCostItemId: string | null;
  matchMethod: string | null;
  candidateCount: number;
  jobCode: string | null;
  matchedJobId: string | null;
}> {
  const jobCode = extractJobCodeFromSubject(subject);

  console.log(`[ingest] smart-match: subject="${subject}" extracted_code="${jobCode}" email="${senderEmail}"`);

  // ETAPA 1: Se tem codigo do job no assunto, busca por job.code + email
  if (jobCode) {
    // Pad do codigo para 3 digitos (ex: "38" → "038") para comparar com jobs.code
    const paddedCode = jobCode.padStart(3, '0');

    const { data: subjectMatches, error: subjectError } = await serviceClient
      .from('cost_items')
      .select(`
        id, service_description, total_value, vendor_email_snapshot, job_id,
        jobs!inner(id, code, title)
      `)
      .eq('tenant_id', tenantId)
      .eq('vendor_email_snapshot', senderEmail)
      .eq('jobs.code', paddedCode)
      .is('deleted_at', null)
      .is('nf_document_id', null)
      .eq('is_category_header', false)
      .gt('total_value', 0)
      .in('nf_request_status', ['pedido', 'pendente', 'enviado'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (subjectError) {
      console.error('[ingest] smart-match etapa1 erro:', subjectError.message);
    }

    const matches = subjectMatches ?? [];

    if (matches.length === 1) {
      // Match exato: 1 cost_item deste fornecedor neste job
      const m = matches[0];
      console.log(`[ingest] smart-match ETAPA1: match unico! cost_item=${m.id} job_code=${paddedCode}`);
      return {
        autoLinkedCostItemId: m.id,
        matchMethod: 'auto_subject_email',
        candidateCount: 1,
        jobCode: paddedCode,
        // deno-lint-ignore no-explicit-any
        matchedJobId: (m.jobs as any)?.id ?? m.job_id,
      };
    }

    if (matches.length > 1) {
      console.log(`[ingest] smart-match ETAPA1: ${matches.length} candidatos no job ${paddedCode} — review manual`);
      return {
        autoLinkedCostItemId: null,
        matchMethod: null,
        candidateCount: matches.length,
        jobCode: paddedCode,
        matchedJobId: null,
      };
    }

    // Nenhum match por subject+email — tenta sem pad (codigo literal)
    if (paddedCode !== jobCode) {
      const { data: rawCodeMatches } = await serviceClient
        .from('cost_items')
        .select(`
          id, service_description, total_value, vendor_email_snapshot, job_id,
          jobs!inner(id, code, title)
        `)
        .eq('tenant_id', tenantId)
        .eq('vendor_email_snapshot', senderEmail)
        .eq('jobs.code', jobCode)
        .is('deleted_at', null)
        .is('nf_document_id', null)
        .eq('is_category_header', false)
        .gt('total_value', 0)
        .in('nf_request_status', ['pedido', 'pendente', 'enviado'])
        .limit(10);

      if (rawCodeMatches && rawCodeMatches.length === 1) {
        const m = rawCodeMatches[0];
        console.log(`[ingest] smart-match ETAPA1 (raw code): match unico! cost_item=${m.id} job_code=${jobCode}`);
        return {
          autoLinkedCostItemId: m.id,
          matchMethod: 'auto_subject_email',
          candidateCount: 1,
          jobCode,
          // deno-lint-ignore no-explicit-any
          matchedJobId: (m.jobs as any)?.id ?? m.job_id,
        };
      }
    }

    console.log(`[ingest] smart-match ETAPA1: nenhum match por subject code=${paddedCode} + email`);
  }

  // ETAPA 2: Sem codigo no subject ou nao encontrou — busca so por email
  // NAO vincula automaticamente (pode ser do job errado)
  const { data: emailMatches, error: emailError } = await serviceClient
    .from('cost_items')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('vendor_email_snapshot', senderEmail)
    .is('deleted_at', null)
    .is('nf_document_id', null)
    .eq('is_category_header', false)
    .gt('total_value', 0)
    .in('nf_request_status', ['pedido', 'pendente', 'enviado'])
    .limit(10);

  if (emailError) {
    console.error('[ingest] smart-match etapa2 erro:', emailError.message);
  }

  const emailCandidates = emailMatches?.length ?? 0;
  console.log(`[ingest] smart-match ETAPA2: ${emailCandidates} candidatos por email (vinculacao manual)`);

  return {
    autoLinkedCostItemId: null,
    matchMethod: null,
    candidateCount: emailCandidates,
    jobCode: jobCode ? jobCode.padStart(3, '0') : null,
    matchedJobId: null,
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

  // 4. Smart auto-match: por subject (codigo do job) + email do fornecedor
  const smartMatch = await trySmartAutoMatch(
    serviceClient,
    input.tenant_id,
    input.sender_email,
    input.subject,
  );

  // 5. Determinar status e vincular cost_item se auto-matched
  let docStatus: string;
  let matchedCostItemId: string | null = null;
  let matchedJobId: string | null = null;

  if (smartMatch.autoLinkedCostItemId) {
    docStatus = 'auto_matched';
    matchedCostItemId = smartMatch.autoLinkedCostItemId;
    matchedJobId = smartMatch.matchedJobId;
  } else {
    docStatus = 'pending_review';
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
      match_confidence: smartMatch.autoLinkedCostItemId ? 0.95 : null,
      match_method: smartMatch.matchMethod,
      metadata: {
        ingested_at: new Date().toISOString(),
        candidate_count: smartMatch.candidateCount,
        extracted_job_code: smartMatch.jobCode,
        matched_cost_item_id: matchedCostItemId,
        matched_job_id: matchedJobId,
      },
    })
    .select('id, status')
    .single();

  if (insertError || !newDoc) {
    console.error('[ingest] falha ao criar nf_document:', insertError?.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao registrar NF', 500);
  }

  console.log(`[ingest] NF criada: id=${newDoc.id} status=${newDoc.status}`);

  // 6.5. Se auto-matched, vincular o cost_item
  if (matchedCostItemId) {
    try {
      const { error: linkError } = await serviceClient
        .from('cost_items')
        .update({
          nf_document_id: newDoc.id,
          nf_request_status: 'recebido',
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchedCostItemId)
        .is('nf_document_id', null); // Safety: so vincula se ainda nao tem NF

      if (linkError) {
        console.error(`[ingest] falha ao vincular cost_item ${matchedCostItemId}:`, linkError.message);
      } else {
        console.log(`[ingest] cost_item ${matchedCostItemId} vinculado automaticamente (nf_request_status=recebido)`);
      }
    } catch (linkErr) {
      console.error('[ingest] excecao ao vincular cost_item (nao bloqueia):', linkErr);
    }
  }

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
  }

  // 8. Criar notificacoes para roles financeiro/admin/ceo
  try {
    const userIds = await getUsersToNotify(serviceClient, input.tenant_id);
    const notifTitle = docStatus === 'auto_matched'
      ? 'NF recebida e vinculada automaticamente'
      : 'Nova NF recebida — validacao necessaria';
    const notifBody = docStatus === 'auto_matched'
      ? `NF de "${input.sender_name}" vinculada ao job ${smartMatch.jobCode ?? '?'}. Arquivo: ${input.file_name}`
      : `NF de "${input.sender_name}" (${input.sender_email}) recebida. Arquivo: ${input.file_name}`;

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
          job_code: smartMatch.jobCode,
        },
        action_url: `/financial/nf-validation?id=${newDoc.id}`,
      });
    }
  } catch (notifErr) {
    console.error('[ingest] falha ao criar notificacoes:', notifErr);
  }

  return created({
    nf_document_id: newDoc.id,
    status: newDoc.status,
    auto_linked: !!matchedCostItemId,
    matched_cost_item_id: matchedCostItemId,
    matched_job_code: smartMatch.jobCode,
    candidate_count: smartMatch.candidateCount,
    is_duplicate: false,
  });
}
