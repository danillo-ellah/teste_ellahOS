import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { createNotification } from '../../_shared/notification-helper.ts';
import { sendFallbackEmail } from '../../_shared/email-fallback.ts';

// Stages que estao fora do funil ativo — excluidos dos alertas
const EXCLUDED_STAGES = ['ganho', 'perdido', 'pausado'];

// Dias de tolerancia para considerar deadline urgente
const DEADLINE_URGENT_DAYS = 3;

// Dias sem atividade para considerar oportunidade inativa
const INACTIVITY_DAYS = 5;

type AlertType = 'deadline_urgent' | 'deadline_overdue' | 'inactive' | 'unassigned';

// Verifica autenticacao CRON via header x-cron-secret
function verifyCronAuth(req: Request): void {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const headerSecret = req.headers.get('x-cron-secret');
  if (!cronSecret || !headerSecret || cronSecret !== headerSecret) {
    throw new AppError('FORBIDDEN', 'CRON secret invalido', 403);
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function urgentCutoffStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + DEADLINE_URGENT_DAYS);
  return d.toISOString().slice(0, 10);
}

/**
 * POST /crm/process-alerts  (CRON endpoint — autenticado via x-cron-secret)
 * Processa alertas de todas as oportunidades ativas em todos os tenants,
 * criando notificacoes para os responsaveis e enviando email em casos de deadline_overdue.
 *
 * Deduplicacao: evita criar mais de uma notificacao 'deadline_approaching' por
 * usuario por dia para a mesma oportunidade.
 */
export async function handleProcessAlerts(req: Request): Promise<Response> {
  verifyCronAuth(req);

  console.log('[crm/process-alerts] iniciando processamento de alertas CRM');

  const serviceClient = getServiceClient();

  // 1. Buscar todas as oportunidades ativas (todos os tenants)
  const { data: opportunities, error: oppError } = await serviceClient
    .from('opportunities')
    .select(`
      id,
      tenant_id,
      title,
      stage,
      assigned_to,
      response_deadline,
      estimated_value
    `)
    .is('deleted_at', null)
    .not('stage', 'in', `(${EXCLUDED_STAGES.map((s) => `"${s}"`).join(',')})`);

  if (oppError) {
    console.error('[crm/process-alerts] erro ao buscar oportunidades:', oppError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar oportunidades', 500, {
      detail: oppError.message,
    });
  }

  const opps = opportunities ?? [];

  if (opps.length === 0) {
    console.log('[crm/process-alerts] nenhuma oportunidade ativa encontrada');
    return success({ notifications_created: 0, emails_sent: 0 }, 200, req);
  }

  // 2. Buscar ultima atividade por oportunidade (query unica)
  const { data: activityRows, error: activityError } = await serviceClient
    .from('opportunity_activities')
    .select('opportunity_id, created_at')
    .in('opportunity_id', opps.map((o) => o.id));

  if (activityError) {
    console.error('[crm/process-alerts] erro ao buscar atividades:', activityError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar atividades', 500, {
      detail: activityError.message,
    });
  }

  const lastActivityMap = new Map<string, string>();
  for (const row of (activityRows ?? [])) {
    const current = lastActivityMap.get(row.opportunity_id);
    if (!current || row.created_at > current) {
      lastActivityMap.set(row.opportunity_id, row.created_at);
    }
  }

  // 3. Buscar notificacoes 'deadline_approaching' ja criadas hoje (dedup)
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: existingNotifications } = await serviceClient
    .from('notifications')
    .select('user_id, metadata')
    .eq('type', 'deadline_approaching')
    .gte('created_at', todayStart.toISOString());

  // Chave de dedup: "userId:opportunityId"
  const dedupSet = new Set<string>();
  for (const notif of (existingNotifications ?? [])) {
    const meta = notif.metadata as Record<string, unknown> | null;
    const oppId = meta?.opportunity_id as string | undefined;
    if (oppId && notif.user_id) {
      dedupSet.add(`${notif.user_id}:${oppId}`);
    }
  }

  const today = todayStr();
  const urgentCutoff = urgentCutoffStr();
  const inactivityCutoff = daysAgoStr(INACTIVITY_DAYS);

  let notificationsCreated = 0;
  let emailsSent = 0;

  // 4. Processar cada oportunidade
  for (const opp of opps) {
    // Apenas oportunidades com responsavel recebem notificacao
    if (!opp.assigned_to) continue;

    const alertTypes: AlertType[] = [];

    // Verificar deadline
    if (opp.response_deadline) {
      const deadlineDateStr = (opp.response_deadline as string).slice(0, 10);
      if (deadlineDateStr < today) {
        alertTypes.push('deadline_overdue');
      } else if (deadlineDateStr <= urgentCutoff) {
        alertTypes.push('deadline_urgent');
      }
    }

    // Verificar inatividade
    const lastActivity = lastActivityMap.get(opp.id) ?? null;
    if (!lastActivity || lastActivity < inactivityCutoff) {
      alertTypes.push('inactive');
    }

    if (alertTypes.length === 0) continue;

    const userId = opp.assigned_to as string;
    const dedupKey = `${userId}:${opp.id}`;

    // Pular se ja foi notificado hoje
    if (dedupSet.has(dedupKey)) {
      console.log('[crm/process-alerts] alerta ja enviado hoje, pulando', {
        opportunity_id: opp.id,
        user_id: userId,
      });
      continue;
    }

    const isOverdue = alertTypes.includes('deadline_overdue');
    const priority = isOverdue ? 'urgent' : 'high';

    const alertLabels: Record<AlertType, string> = {
      deadline_overdue: 'prazo vencido',
      deadline_urgent: 'prazo urgente',
      inactive: 'sem atividade',
      unassigned: 'sem responsavel',
    };
    const alertSummary = alertTypes.map((t) => alertLabels[t]).join(', ');

    // Criar notificacao
    try {
      await createNotification(serviceClient, {
        tenant_id: opp.tenant_id as string,
        user_id: userId,
        type: 'deadline_approaching',
        priority,
        title: `Alerta CRM: ${opp.title}`,
        body: `A oportunidade "${opp.title}" precisa de atencao (${alertSummary}).`,
        metadata: {
          opportunity_id: opp.id,
          alert_types: alertTypes,
          response_deadline: opp.response_deadline ?? null,
        },
        action_url: `/crm?highlight=${opp.id}`,
      });

      dedupSet.add(dedupKey);
      notificationsCreated++;
    } catch (err) {
      console.error('[crm/process-alerts] falha ao criar notificacao', {
        opportunity_id: opp.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Enviar email apenas para deadline_overdue
    if (isOverdue) {
      // Buscar email do perfil
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.email) {
        const emailSubject = `[ELLAHOS CRM] Prazo vencido: ${opp.title}`;
        const emailHtml = buildAlertEmailHtml(opp.title, opp.response_deadline as string, alertTypes, profile.full_name ?? '');

        const sent = await sendFallbackEmail(profile.email, emailSubject, emailHtml);
        if (sent) emailsSent++;
      }
    }
  }

  console.log('[crm/process-alerts] processamento concluido', {
    opportunities_analyzed: opps.length,
    notifications_created: notificationsCreated,
    emails_sent: emailsSent,
  });

  return success(
    {
      notifications_created: notificationsCreated,
      emails_sent: emailsSent,
      opportunities_analyzed: opps.length,
    },
    200,
    req,
  );
}

function buildAlertEmailHtml(
  opportunityTitle: string,
  responseDeadline: string | null,
  alertTypes: AlertType[],
  recipientName: string,
): string {
  const alertLabels: Record<AlertType, string> = {
    deadline_overdue: 'Prazo de resposta vencido',
    deadline_urgent: 'Prazo de resposta urgente',
    inactive: 'Sem atividade recente',
    unassigned: 'Sem responsavel',
  };

  const alertItems = alertTypes
    .map((t) => `<li style="margin: 4px 0; color: #b91c1c;">${alertLabels[t]}</li>`)
    .join('');

  const deadlineText = responseDeadline
    ? `<p style="margin: 8px 0; font-size: 14px; color: #374151;"><strong>Prazo:</strong> ${responseDeadline.slice(0, 10)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Alerta CRM</title>
</head>
<body style="margin:0; padding:0; background:#f9fafb; font-family:Arial,sans-serif;">
  <div style="max-width:600px; margin:32px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <div style="background:#09090b; padding:20px 28px;">
      <p style="margin:0; font-size:16px; font-weight:700; color:#fff;">ELLAHOS CRM</p>
      <p style="margin:4px 0 0; font-size:12px; color:#a1a1aa;">Alerta de oportunidade</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 16px; font-size:15px; color:#111827;">Ola, ${recipientName || 'usuario'},</p>
      <p style="margin:0 0 12px; font-size:14px; color:#374151;">
        A oportunidade abaixo requer sua atencao imediata:
      </p>
      <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:16px 20px; margin-bottom:16px;">
        <p style="margin:0 0 8px; font-size:16px; font-weight:700; color:#111827;">${opportunityTitle}</p>
        ${deadlineText}
        <ul style="margin:8px 0 0; padding-left:20px;">
          ${alertItems}
        </ul>
      </div>
      <p style="margin:0; font-size:13px; color:#6b7280;">
        Acesse o ELLAHOS para registrar uma atividade ou atualizar o status desta oportunidade.
      </p>
    </div>
    <div style="background:#f9fafb; padding:14px 28px; border-top:1px solid #e5e7eb;">
      <p style="margin:0; font-size:11px; color:#9ca3af; text-align:center;">
        Notificacao automatica — ELLAHOS / Ellah Filmes. Nao responda a este email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
