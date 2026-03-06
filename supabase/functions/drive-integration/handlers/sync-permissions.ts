import { getServiceClient } from '../../_shared/supabase-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import {
  getGoogleAccessToken,
  grantFolderPermission,
  revokeFolderPermission,
} from '../../_shared/google-drive-client.ts';
import {
  getPermissionMap,
  resolvePermissionRole,
} from '../../_shared/drive-permission-map.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ========================================================
// sync-permissions.ts
// Re-sync completo e idempotente de permissoes Drive para um job
// Calcula delta: grants faltantes + revokes excedentes
// POST /:jobId/sync-permissions
// RBAC: admin, ceo
// ========================================================

// Delay entre chamadas ao Drive API (rate limit: 300 req/min)
const DRIVE_DELAY_MS = 200;
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Chave composta para comparacao de estado esperado vs atual
function permissionKey(personId: string, folderKey: string): string {
  return `${personId}::${folderKey}`;
}

export async function syncPermissions(
  _req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  // RBAC: apenas admin e ceo
  if (!['admin', 'ceo'].includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas admin ou ceo podem executar re-sync de permissoes', 403);
  }

  const serviceClient = getServiceClient();

  // 1. Verificar Drive habilitado no tenant
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const driveConfig = integrations['google_drive'] || {};

  if (!driveConfig.enabled) {
    throw new AppError('VALIDATION_ERROR', 'Google Drive nao esta habilitado para este tenant', 400);
  }

  // 2. Carregar mapa de permissoes do tenant
  const permissionMap = await getPermissionMap(serviceClient, auth.tenantId);

  // 3. Buscar todos os membros ativos do job com email
  const { data: activeMembers, error: membersError } = await serviceClient
    .from('job_team')
    .select('id, role, person_id, people!inner(id, full_name, email)')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null);

  if (membersError) {
    throw new AppError('INTERNAL_ERROR', `Falha ao buscar membros: ${membersError.message}`, 500);
  }

  const members = activeMembers || [];

  // 4. Buscar pastas do job
  const { data: driveFolders } = await serviceClient
    .from('drive_folders')
    .select('id, folder_key, google_drive_id')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  const folderByKey = new Map(
    (driveFolders || []).map((f) => [f.folder_key, f]),
  );

  // 5. Buscar permissoes ativas atuais do job
  const { data: activePermissions } = await serviceClient
    .from('job_drive_permissions')
    .select('id, person_id, job_team_id, folder_key, drive_permission_id, google_drive_id, drive_role')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('revoked_at', null);

  // Map de estado atual: key(person_id, folder_key) -> permissao
  const currentState = new Map<string, typeof activePermissions extends Array<infer T> ? T : never>();
  for (const perm of activePermissions || []) {
    currentState.set(permissionKey(perm.person_id, perm.folder_key), perm as any);
  }

  // 6. Calcular estado esperado baseado nos membros ativos e mapa de permissoes
  // Map: key(person_id, folder_key) -> { member, folderEntry }
  const expectedState = new Map<string, {
    jobTeamId: string;
    personId: string;
    email: string;
    folderKey: string;
    driveRole: 'writer' | 'reader';
  }>();

  for (const member of members) {
    const person = (member as any).people;
    const email = person?.email as string | null;
    if (!email) continue;

    const driveRole = resolvePermissionRole(member.role);
    const folderEntries = permissionMap[driveRole] || [];

    for (const entry of folderEntries) {
      const folder = folderByKey.get(entry.folder_key);
      if (!folder?.google_drive_id) continue;

      const key = permissionKey(member.person_id, entry.folder_key);
      expectedState.set(key, {
        jobTeamId: member.id,
        personId: member.person_id,
        email,
        folderKey: entry.folder_key,
        driveRole: entry.drive_role,
      });
    }
  }

  // 7. Calcular delta
  // Grants faltantes: estado esperado que nao existe no estado atual
  const grantsNeeded: Array<(typeof expectedState extends Map<string, infer V> ? V : never) & { folderInfo: { id: string; google_drive_id: string } }> = [];
  for (const [key, expected] of expectedState) {
    if (!currentState.has(key)) {
      const folder = folderByKey.get(expected.folderKey);
      if (folder) {
        grantsNeeded.push({ ...expected, folderInfo: folder as { id: string; google_drive_id: string } });
      }
    }
  }

  // Revokes excedentes: permissoes ativas que nao estao no estado esperado
  // (membro removido, role mudou, etc.)
  const revokesNeeded: Array<{ id: string; drive_permission_id: string | null; google_drive_id: string; folder_key: string }> = [];
  for (const [key, current] of currentState) {
    if (!expectedState.has(key)) {
      revokesNeeded.push({
        id: current.id,
        drive_permission_id: current.drive_permission_id,
        google_drive_id: current.google_drive_id,
        folder_key: current.folder_key,
      });
    }
  }

  const unchanged = expectedState.size - grantsNeeded.length;
  const errors: string[] = [];
  let grantsAdded = 0;
  let permissionsRevoked = 0;

  // 8. Obter access token do Drive (so se houver delta)
  let token: string | null = null;
  if (grantsNeeded.length > 0 || revokesNeeded.length > 0) {
    const saJson = await getSecret(serviceClient, `${auth.tenantId}_gdrive_service_account`);
    if (!saJson) {
      throw new AppError('INTERNAL_ERROR', 'Service Account do Drive nao configurada', 500);
    }
    const sa = JSON.parse(saJson);
    token = await getGoogleAccessToken(sa);
    if (!token) {
      throw new AppError('INTERNAL_ERROR', 'Falha ao obter access_token do Drive', 500);
    }
  }

  const driveOpts = driveConfig.drive_type === 'shared_drive'
    ? { driveType: 'shared_drive', sharedDriveId: driveConfig.shared_drive_id as string }
    : undefined;

  const now = new Date().toISOString();

  // 9. Executar grants faltantes
  for (const grant of grantsNeeded) {
    let drivePermissionId: string | null = null;
    let errorMessage: string | null = null;

    try {
      const grantResult = await grantFolderPermission(
        token!,
        grant.folderInfo.google_drive_id,
        grant.email,
        grant.driveRole,
        driveOpts,
      );
      drivePermissionId = grantResult.permissionId;
      grantsAdded++;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      const errMsg = `Grant "${grant.folderKey}" para ${grant.email}: ${errorMessage}`;
      errors.push(errMsg);
      console.error(`[sync-permissions] ${errMsg}`);
    }

    await serviceClient
      .from('job_drive_permissions')
      .insert({
        tenant_id: auth.tenantId,
        job_id: jobId,
        job_team_id: grant.jobTeamId,
        person_id: grant.personId,
        email: grant.email,
        folder_key: grant.folderKey,
        drive_folder_id: grant.folderInfo.id,
        google_drive_id: grant.folderInfo.google_drive_id,
        drive_role: grant.driveRole,
        drive_permission_id: drivePermissionId,
        granted_by: auth.userId,
        error_message: errorMessage,
      });

    await delay(DRIVE_DELAY_MS);
  }

  // 10. Executar revokes excedentes
  for (const revoke of revokesNeeded) {
    let errorMessage: string | null = null;

    if (revoke.drive_permission_id) {
      try {
        const ok = await revokeFolderPermission(
          token!,
          revoke.google_drive_id,
          revoke.drive_permission_id,
          driveOpts,
        );
        if (ok) {
          permissionsRevoked++;
        } else {
          errorMessage = `Drive API retornou falha ao revogar permission ${revoke.drive_permission_id}`;
          errors.push(`Revoke "${revoke.folder_key}": ${errorMessage}`);
          console.error(`[sync-permissions] ${errorMessage}`);
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        errors.push(`Revoke "${revoke.folder_key}": ${errorMessage}`);
        console.error(`[sync-permissions] Erro revoke "${revoke.folder_key}": ${errorMessage}`);
      }
    } else {
      // Sem permission_id — apenas marca no banco
      permissionsRevoked++;
    }

    await serviceClient
      .from('job_drive_permissions')
      .update({
        revoked_at: now,
        revoked_by: auth.userId,
        error_message: errorMessage,
      })
      .eq('id', revoke.id);

    await delay(DRIVE_DELAY_MS);
  }

  console.log(
    `[sync-permissions] job=${jobId} grants_added=${grantsAdded} revoked=${permissionsRevoked} ` +
    `unchanged=${unchanged} errors=${errors.length} total_members=${members.length}`,
  );

  return success({
    grants_added: grantsAdded,
    permissions_revoked: permissionsRevoked,
    unchanged: Math.max(0, unchanged),
    errors,
    total_members: members.length,
    total_permissions: expectedState.size,
  });
}
