import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { enqueueEvent } from '../../_shared/integration-client.ts';
import { createNotification } from '../../_shared/notification-helper.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const CreateScopeItemSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  description: z.string().min(1, 'description e obrigatorio').max(2000),
  is_extra: z.boolean().default(false),
  origin_channel: z.enum(
    ['whatsapp', 'email', 'reuniao', 'telefone', 'presencial'],
  ).optional().nullable(),
  requested_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'requested_at deve ser YYYY-MM-DD')
    .optional().nullable(),
}).refine(
  (data) => !data.is_extra || !!data.requested_at,
  { message: 'requested_at e obrigatorio quando is_extra=true', path: ['requested_at'] },
);

export async function handleScopeItemsCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/scope-items-create] criando item de escopo', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar itens de escopo', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateScopeItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Se is_extra, define extra_status automaticamente
  const extraStatus = data.is_extra ? 'pendente_ceo' : null;

  const { data: created_item, error: insertError } = await client
    .from('scope_items')
    .insert({
      tenant_id: auth.tenantId,
      job_id: data.job_id,
      description: data.description,
      is_extra: data.is_extra,
      origin_channel: data.origin_channel ?? null,
      requested_at: data.requested_at ?? null,
      extra_status: extraStatus,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[attendance/scope-items-create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar item de escopo', 500, {
      detail: insertError.message,
    });
  }

  console.log('[attendance/scope-items-create] item criado', {
    id: created_item.id,
    is_extra: data.is_extra,
  });

  // Side effects quando is_extra=true
  if (data.is_extra) {
    // Buscar dados do job para enriquecer o payload
    const { data: job } = await client
      .from('jobs')
      .select('code, title')
      .eq('id', data.job_id)
      .eq('tenant_id', auth.tenantId)
      .single();

    // Buscar nome do criador
    const { data: profile } = await client
      .from('profiles')
      .select('full_name')
      .eq('id', auth.userId)
      .single();

    const jobCode = job?.code ?? '';
    const jobTitle = job?.title ?? '';
    const registeredByName = profile?.full_name ?? auth.email;

    // 1. Enfileirar evento n8n (wf-extra-registered) — falha nao impede a criacao
    try {
      await enqueueEvent(client, {
        tenant_id: auth.tenantId,
        event_type: 'n8n_webhook',
        payload: {
          workflow: 'wf-extra-registered',
          job_id: data.job_id,
          job_code: jobCode,
          job_title: jobTitle,
          extra_description: data.description,
          origin_channel: data.origin_channel ?? null,
          requested_at: data.requested_at,
          registered_by_name: registeredByName,
          scope_item_id: created_item.id,
        },
        idempotency_key: `extra-registered-${created_item.id}`,
      });
    } catch (enqueueErr) {
      console.error(
        '[attendance/scope-items-create] falha ao enfileirar evento n8n (nao critico):',
        enqueueErr,
      );
    }

    // 2. Notificar CEO(s) in-app
    // Busca todos os usuarios com role ceo no mesmo tenant
    try {
      const { data: ceoProfiles } = await client
        .from('profiles')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('role', 'ceo');

      if (ceoProfiles && ceoProfiles.length > 0) {
        const notificationPromises = ceoProfiles.map((ceo: { id: string }) =>
          createNotification(client, {
            tenant_id: auth.tenantId,
            user_id: ceo.id,
            // O tipo 'extra_registered' sera adicionado via migration (ADD VALUE IF NOT EXISTS)
            // Usar cast para aceitar o novo tipo antes da migration de notificacoes
            type: 'extra_registered' as Parameters<typeof createNotification>[1]['type'],
            priority: 'high',
            title: `Extra registrado — Job ${jobCode}`,
            body: `${registeredByName} registrou um extra de escopo: "${data.description.slice(0, 100)}${data.description.length > 100 ? '...' : ''}"`,
            metadata: {
              scope_item_id: created_item.id,
              job_id: data.job_id,
              job_code: jobCode,
              origin_channel: data.origin_channel ?? null,
            },
            action_url: `/jobs/${data.job_id}?tab=atendimento`,
            job_id: data.job_id,
          })
        );
        await Promise.allSettled(notificationPromises);
      }
    } catch (notifyErr) {
      console.error(
        '[attendance/scope-items-create] falha ao notificar CEO (nao critico):',
        notifyErr,
      );
    }
  }

  return created(created_item, req);
}
