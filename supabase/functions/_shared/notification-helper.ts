import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tipos de notificacao suportados (espelha o ENUM notification_type do banco)
export const NOTIFICATION_TYPES = [
  'job_approved',
  'status_changed',
  'team_added',
  'deadline_approaching',
  'margin_alert',
  'deliverable_overdue',
  'shooting_date_approaching',
  'integration_failed',
  'portal_message_received',
  'approval_responded',
  'approval_requested',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Prioridades de notificacao (espelha o ENUM notification_priority do banco)
export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

// Input para criar uma notificacao
export interface CreateNotificationInput {
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  action_url?: string;
  job_id?: string;
}

// Representa um registro na tabela notifications
export interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  action_url: string | null;
  job_id: string | null;
  read_at: string | null;
  created_at: string;
}

// Cria uma unica notificacao para um usuario.
// Retorna o id da notificacao criada.
export async function createNotification(
  client: SupabaseClient,
  notification: CreateNotificationInput,
): Promise<string> {
  const { data, error } = await client
    .from('notifications')
    .insert({
      tenant_id: notification.tenant_id,
      user_id: notification.user_id,
      type: notification.type,
      priority: notification.priority ?? 'normal',
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata ?? null,
      action_url: notification.action_url ?? null,
      job_id: notification.job_id ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error(
      `[notification-helper] falha ao criar notificacao para usuario ${notification.user_id}: ${error?.message}`,
    );
    throw new Error(`Falha ao criar notificacao: ${error?.message}`);
  }

  console.log(
    `[notification-helper] notificacao "${notification.type}" criada para usuario ${notification.user_id} (id: ${data.id})`,
  );
  return data.id as string;
}

// Notifica todos os membros da equipe de um job.
// Busca os membros em job_team e cria 1 notificacao por membro com user_id.
// Retorna o numero de membros notificados.
export async function notifyJobTeam(
  client: SupabaseClient,
  jobId: string,
  notification: Omit<CreateNotificationInput, 'user_id'>,
): Promise<number> {
  // Busca membros do job com profile_id (perfis vinculados)
  const { data: members, error: membersError } = await client
    .from('job_team')
    .select('id, person_id, people!inner(profile_id)')
    .eq('job_id', jobId)
    .is('deleted_at', null);

  if (membersError) {
    console.error(
      `[notification-helper] falha ao buscar equipe do job ${jobId}: ${membersError.message}`,
    );
    return 0;
  }

  if (!members || members.length === 0) {
    console.log(`[notification-helper] job ${jobId} nao tem membros de equipe para notificar`);
    return 0;
  }

  // Filtra somente membros com profile_id (pessoa vinculada a um usuario do sistema)
  const membersWithProfile = members.filter(
    (m) => (m.people as { profile_id: string | null } | null)?.profile_id,
  );

  if (membersWithProfile.length === 0) {
    console.log(
      `[notification-helper] nenhum membro da equipe do job ${jobId} tem profile_id vinculado`,
    );
    return 0;
  }

  // Cria uma notificacao por membro (insercao em batch)
  const inserts = membersWithProfile.map((m) => ({
    tenant_id: notification.tenant_id,
    user_id: (m.people as { profile_id: string }).profile_id,
    type: notification.type,
    priority: notification.priority ?? 'normal',
    title: notification.title,
    body: notification.body,
    metadata: notification.metadata ?? null,
    action_url: notification.action_url ?? null,
    job_id: notification.job_id ?? jobId,
  }));

  const { error: insertError } = await client.from('notifications').insert(inserts);

  if (insertError) {
    console.error(
      `[notification-helper] falha ao notificar equipe do job ${jobId}: ${insertError.message}`,
    );
    return 0;
  }

  console.log(
    `[notification-helper] ${membersWithProfile.length} membro(s) da equipe do job ${jobId} notificados ("${notification.type}")`,
  );
  return membersWithProfile.length;
}

// Retorna o total de notificacoes nao lidas de um usuario.
export async function getUnreadCount(
  client: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error(
      `[notification-helper] falha ao contar notificacoes nao lidas do usuario ${userId}: ${error.message}`,
    );
    return 0;
  }

  return count ?? 0;
}
