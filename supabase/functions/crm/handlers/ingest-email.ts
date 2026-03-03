import { z } from 'https://esm.sh/zod@3.22.4';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';

// Prefixos de email a remover do subject para usar como titulo
const SUBJECT_PREFIXES = /^(re|fwd?|enc|rv|fw):\s*/gi;

// Limite de caracteres para campo notes
const NOTES_MAX_CHARS = 5_000;

// Verifica autenticacao CRON via header x-cron-secret
function verifyCronAuth(req: Request): void {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || !headerSecret || cronSecret !== headerSecret) {
    throw new AppError('FORBIDDEN', 'CRON secret invalido', 403);
  }
}

const IngestEmailSchema = z.object({
  from_email: z.string().email('Email do remetente invalido'),
  from_name: z.string().max(300).optional(),
  subject: z.string().min(1, 'Subject e obrigatorio').max(500),
  body_text: z.string().min(1, 'body_text e obrigatorio'),
  body_html: z.string().optional(),
  received_at: z.string().optional(),
  tenant_id: z.string().uuid('tenant_id invalido'),
});

type IngestEmailInput = z.infer<typeof IngestEmailSchema>;

/**
 * Remove prefixos comuns de reply/forward do subject para obter um titulo limpo.
 */
function cleanSubject(subject: string): string {
  let cleaned = subject.trim();
  // Remove prefixos repetidamente ate nao encontrar mais
  let prev = '';
  while (prev !== cleaned) {
    prev = cleaned;
    cleaned = cleaned.replace(SUBJECT_PREFIXES, '').trim();
  }
  return cleaned || subject.trim();
}

/**
 * POST /crm/ingest-email  (webhook para n8n — autenticado via x-cron-secret)
 * Cria uma oportunidade automaticamente a partir de um email parseado pelo n8n.
 *
 * Tenta fazer match do remetente com contatos/agencias/clientes do tenant.
 * Registra automaticamente uma atividade do tipo 'email' na oportunidade criada.
 */
export async function handleIngestEmail(req: Request): Promise<Response> {
  verifyCronAuth(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = IngestEmailSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const input: IngestEmailInput = parseResult.data;

  console.log('[crm/ingest-email] processando email ingerido', {
    from_email: input.from_email,
    subject: input.subject,
    tenant_id: input.tenant_id,
  });

  const serviceClient = getServiceClient();

  // 1. Tentar fazer match do remetente com contatos do tenant
  //    Busca em contacts onde email = from_email E tenant_id bate
  const { data: contactMatch } = await serviceClient
    .from('contacts')
    .select('id, name, client_id, agency_id')
    .eq('tenant_id', input.tenant_id)
    .ilike('email', input.from_email)
    .limit(1)
    .maybeSingle();

  let matchedAgencyId: string | null = null;
  let matchedClientId: string | null = null;
  let matchedContactId: string | null = null;
  let matchedAgencyName: string | null = null;
  let matchedClientName: string | null = null;

  if (contactMatch) {
    matchedContactId = contactMatch.id;
    matchedAgencyId = contactMatch.agency_id ?? null;
    matchedClientId = contactMatch.client_id ?? null;

    // Buscar nomes para o log/retorno
    if (matchedAgencyId) {
      const { data: agency } = await serviceClient
        .from('agencies')
        .select('name')
        .eq('id', matchedAgencyId)
        .maybeSingle();
      matchedAgencyName = agency?.name ?? null;
    }

    if (matchedClientId) {
      const { data: clientRow } = await serviceClient
        .from('clients')
        .select('name')
        .eq('id', matchedClientId)
        .maybeSingle();
      matchedClientName = clientRow?.name ?? null;
    }

    console.log('[crm/ingest-email] match de contato encontrado', {
      contact_id: matchedContactId,
      agency_id: matchedAgencyId,
      client_id: matchedClientId,
    });
  } else {
    // Fallback: tentar match direto em agencies.email ou clients.email se existir o campo
    // (campos opcionais — falha silenciosa se campo nao existir no schema)
    const { data: agencyMatch } = await serviceClient
      .from('agencies')
      .select('id, name')
      .eq('tenant_id', input.tenant_id)
      .ilike('email', input.from_email)
      .limit(1)
      .maybeSingle();

    if (agencyMatch) {
      matchedAgencyId = agencyMatch.id;
      matchedAgencyName = agencyMatch.name;
      console.log('[crm/ingest-email] match direto com agencia', { agency_id: matchedAgencyId });
    }
  }

  // 2. Criar oportunidade
  const title = cleanSubject(input.subject);
  const notes = input.body_text.slice(0, NOTES_MAX_CHARS);
  const receivedAt = input.received_at ? new Date(input.received_at).toISOString() : new Date().toISOString();

  const { data: opportunity, error: insertError } = await serviceClient
    .from('opportunities')
    .insert({
      tenant_id: input.tenant_id,
      title,
      source: 'email_forward',
      notes,
      stage: 'lead',
      agency_id: matchedAgencyId,
      client_id: matchedClientId,
      contact_id: matchedContactId,
      probability: 20, // default conservador para leads via email
    })
    .select('id, title, stage, created_at')
    .single();

  if (insertError || !opportunity) {
    console.error('[crm/ingest-email] erro ao criar oportunidade:', insertError?.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar oportunidade', 500, {
      detail: insertError?.message ?? 'insert retornou nulo',
    });
  }

  console.log('[crm/ingest-email] oportunidade criada', { id: opportunity.id, title });

  // 3. Registrar atividade automatica do tipo 'email'
  const activityDescription = [
    `Email recebido de ${input.from_name ? `${input.from_name} ` : ''}<${input.from_email}>`,
    `Assunto: ${input.subject}`,
    `\n${notes.slice(0, 500)}${input.body_text.length > 500 ? '...' : ''}`,
  ].join('\n');

  const { error: activityError } = await serviceClient
    .from('opportunity_activities')
    .insert({
      tenant_id: input.tenant_id,
      opportunity_id: opportunity.id,
      activity_type: 'email',
      description: activityDescription,
      completed_at: receivedAt,
    });

  if (activityError) {
    // Nao falha o handler — a oportunidade ja foi criada
    console.error('[crm/ingest-email] erro ao registrar atividade (nao critico):', activityError.message);
  } else {
    console.log('[crm/ingest-email] atividade email registrada', { opportunity_id: opportunity.id });
  }

  return created(
    {
      opportunity_id: opportunity.id,
      title: opportunity.title,
      stage: opportunity.stage,
      matched_agency: matchedAgencyId
        ? { id: matchedAgencyId, name: matchedAgencyName }
        : null,
      matched_client: matchedClientId
        ? { id: matchedClientId, name: matchedClientName }
        : null,
      matched_contact_id: matchedContactId,
    },
    req,
  );
}
