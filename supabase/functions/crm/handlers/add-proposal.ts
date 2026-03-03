import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const AddProposalSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio').max(300),
  content: z.string().max(50000).optional().nullable(), // markdown
  value: z.number().min(0).optional().nullable(),
  file_url: z.string().url().optional().nullable(),
  storage_path: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
  valid_until: z.string().optional().nullable(), // YYYY-MM-DD
  sent_at: z.string().optional().nullable(),     // ISO timestamp
});

/**
 * POST /crm/opportunities/:id/proposals
 * Adiciona uma nova versao de proposta a uma oportunidade.
 * A versao e calculada automaticamente (max + 1).
 */
export async function handleAddProposal(
  req: Request,
  auth: AuthContext,
  opportunityId: string,
): Promise<Response> {
  console.log('[crm/add-proposal] adicionando proposta', {
    opportunityId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = AddProposalSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que a oportunidade existe e pertence ao tenant
  const { data: opp, error: oppError } = await client
    .from('opportunities')
    .select('id, stage')
    .eq('id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (oppError || !opp) {
    throw new AppError('NOT_FOUND', 'Oportunidade nao encontrada', 404);
  }

  // Calcular proximo numero de versao
  const { data: lastVersion } = await client
    .from('opportunity_proposals')
    .select('version')
    .eq('opportunity_id', opportunityId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const insertData = {
    tenant_id: auth.tenantId,
    opportunity_id: opportunityId,
    version: nextVersion,
    title: data.title.trim(),
    content: data.content ?? null,
    value: data.value ?? null,
    file_url: data.file_url ?? null,
    storage_path: data.storage_path ?? null,
    status: data.status,
    valid_until: data.valid_until ?? null,
    sent_at: data.status === 'sent' ? (data.sent_at ?? new Date().toISOString()) : null,
    created_by: auth.userId,
  };

  const { data: proposal, error: insertError } = await client
    .from('opportunity_proposals')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error('[crm/add-proposal] erro ao inserir proposta:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao adicionar proposta', 500, {
      detail: insertError.message,
    });
  }

  // Registrar atividade de envio se status = sent
  if (data.status === 'sent') {
    await client.from('opportunity_activities').insert({
      tenant_id: auth.tenantId,
      opportunity_id: opportunityId,
      activity_type: 'proposal',
      description: `Proposta v${nextVersion} enviada: "${data.title}".${data.value ? ` Valor: R$ ${Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`,
      created_by: auth.userId,
      completed_at: new Date().toISOString(),
    });

    // Mover stage para "proposta" automaticamente se ainda em lead/qualificado
    if (opp.stage === 'lead' || opp.stage === 'qualificado') {
      await client
        .from('opportunities')
        .update({ stage: 'proposta' })
        .eq('id', opportunityId)
        .eq('tenant_id', auth.tenantId);
    }
  }

  console.log('[crm/add-proposal] proposta adicionada', {
    proposalId: proposal.id,
    version: nextVersion,
  });
  return created(proposal, req);
}
