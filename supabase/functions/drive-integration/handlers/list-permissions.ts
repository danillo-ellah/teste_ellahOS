import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ========================================================
// list-permissions.ts
// Lista permissoes Drive do job, agrupadas por membro
// GET /:jobId/permissions
// RBAC: qualquer usuario autenticado do tenant
// ========================================================

export async function listPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);

  // Ler query param active_only (default: true)
  const url = new URL(req.url);
  const activeOnlyParam = url.searchParams.get('active_only');
  const activeOnly = activeOnlyParam !== 'false'; // default true

  // 1. Validar que o job pertence ao tenant (RLS ja faz isso, mas verificacao explicita)
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (jobError || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // 2. Buscar permissoes do job com JOIN em people para nome do membro
  // RLS garante que o usuario so ve permissoes do seu tenant
  let query = supabase
    .from('job_drive_permissions')
    .select(`
      id,
      job_team_id,
      person_id,
      email,
      folder_key,
      drive_role,
      drive_permission_id,
      granted_at,
      revoked_at,
      error_message,
      job_team!inner(role),
      people!inner(full_name)
    `)
    .eq('job_id', jobId)
    .order('granted_at', { ascending: false });

  if (activeOnly) {
    query = query.is('revoked_at', null);
  }

  const { data: permissions, error: permError } = await query;

  if (permError) {
    throw new AppError('INTERNAL_ERROR', `Falha ao buscar permissoes: ${permError.message}`, 500);
  }

  const perms = permissions || [];

  // 3. Agrupar por job_team_id
  const memberMap = new Map<string, {
    job_team_id: string;
    person_id: string;
    person_name: string;
    email: string;
    role: string;
    permissions: Array<{
      id: string;
      folder_key: string;
      drive_role: string;
      drive_permission_id: string | null;
      granted_at: string;
      revoked_at: string | null;
      error_message: string | null;
    }>;
  }>();

  for (const perm of perms) {
    const teamId = perm.job_team_id;
    const personName = (perm as any).people?.full_name as string;
    const teamRole = (perm as any).job_team?.role as string;

    if (!memberMap.has(teamId)) {
      memberMap.set(teamId, {
        job_team_id: teamId,
        person_id: perm.person_id,
        person_name: personName,
        email: perm.email,
        role: teamRole,
        permissions: [],
      });
    }

    memberMap.get(teamId)!.permissions.push({
      id: perm.id,
      folder_key: perm.folder_key,
      drive_role: perm.drive_role,
      drive_permission_id: perm.drive_permission_id,
      granted_at: perm.granted_at,
      revoked_at: perm.revoked_at,
      error_message: perm.error_message,
    });
  }

  const members = Array.from(memberMap.values());

  const totalActivePermissions = activeOnly
    ? perms.length
    : perms.filter((p) => p.revoked_at === null).length;

  console.log(
    `[list-permissions] job=${jobId} active_only=${activeOnly} ` +
    `members=${members.length} total_permissions=${perms.length}`,
  );

  return success({
    members,
    meta: {
      total_members: members.length,
      total_active_permissions: totalActivePermissions,
      active_only: activeOnly,
    },
  });
}
