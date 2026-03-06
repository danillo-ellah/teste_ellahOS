import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getServiceClient } from './supabase-client.ts';
import { getSecret } from './vault.ts';
import {
  getGoogleAccessToken,
  grantFolderPermission,
  revokeFolderPermission,
} from './google-drive-client.ts';
import { getPermissionMap, resolvePermissionRole } from './drive-permission-map.ts';
import type { AuthContext } from './auth.ts';

// ========================================================
// drive-permissions-helper.ts
// Logica core de concessao/revogacao de permissoes Drive
// Compartilhada entre drive-integration handlers e jobs-team handlers
// ========================================================

// Delay entre chamadas ao Drive API para respeitar rate limit (300 req/min)
const DRIVE_RATE_LIMIT_DELAY_MS = 200;

// Delay simples entre chamadas ao Drive API
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Verifica se o email provavelmente e compativel com o Google (aceita para Drive API).
// Regra pragmatica: rejeita providers sabidamente incompativeis.
// Google Workspace pode usar qualquer dominio, entao aceita a maioria.
// O Drive API retornara erro 400 se o email nao for uma conta Google valida.
export function isLikelyGoogleEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const blockedDomains = [
    '@hotmail.com',
    '@hotmail.com.br',
    '@outlook.com',
    '@outlook.com.br',
    '@yahoo.com',
    '@yahoo.com.br',
    '@icloud.com',
    '@me.com',
    '@msn.com',
    '@live.com',
  ];
  return !blockedDomains.some((domain) => lower.endsWith(domain));
}

// Carrega o access token do Drive a partir da Service Account do Vault
async function getDriveToken(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const saJson = await getSecret(serviceClient, `${tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new Error('Service Account do Google Drive nao encontrada no Vault');
  }

  const sa = JSON.parse(saJson);
  const token = await getGoogleAccessToken(sa);
  if (!token) {
    throw new Error('Falha ao obter access_token da Service Account do Drive');
  }

  return token;
}

// Verifica se o Drive esta habilitado para o tenant.
// Retorna as configuracoes do Drive ou null se nao habilitado.
async function getDriveConfig(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<Record<string, unknown> | null> {
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const driveConfig = integrations['google_drive'] || {};

  if (!driveConfig.enabled) {
    return null;
  }

  return driveConfig;
}

// Resultado de grantDrivePermissionsForMember
export interface GrantDriveResult {
  granted: number;
  skipped: number;
  failed: number;
}

// Concede permissoes Drive para um membro especifico do job_team.
// Logica idempotente: ignora pastas onde a permissao ja existe.
// Registra resultados na tabela job_drive_permissions.
// Fire-and-forget: chamado pelo jobs-team/add-member e update-member.
export async function grantDrivePermissionsForMember(
  auth: AuthContext,
  jobId: string,
  jobTeamId: string,
): Promise<GrantDriveResult> {
  const serviceClient = getServiceClient();
  const result: GrantDriveResult = { granted: 0, skipped: 0, failed: 0 };

  // 1. Verificar se Drive esta habilitado
  const driveConfig = await getDriveConfig(serviceClient, auth.tenantId);
  if (!driveConfig) {
    console.log(`[drive-permissions-helper] Drive nao habilitado para tenant ${auth.tenantId} — skip grant`);
    return result;
  }

  // 2. Buscar membro do job_team com email da pessoa
  const { data: member, error: memberError } = await serviceClient
    .from('job_team')
    .select('id, role, person_id, people!inner(id, full_name, email)')
    .eq('id', jobTeamId)
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .single();

  if (memberError || !member) {
    throw new Error(`Membro ${jobTeamId} nao encontrado no job ${jobId}: ${memberError?.message}`);
  }

  const person = (member as any).people;
  const email = person?.email as string | null;

  if (!email) {
    console.warn(`[drive-permissions-helper] Membro ${jobTeamId} sem email — skip grant`);
    return result;
  }

  // 3. Verificar email Google — return early se provider incompativel (RN-02)
  if (!isLikelyGoogleEmail(email)) {
    console.warn(`[drive-permissions-helper] Email "${email}" parece nao ser Google (provider incompativel) — skip grant`);
    return result;
  }

  // 4. Carregar mapa de permissoes e resolver role do membro
  const permissionMap = await getPermissionMap(serviceClient, auth.tenantId);
  const driveRole = resolvePermissionRole(member.role);

  if (!driveRole) {
    console.log(`[drive-permissions-helper] Role "${member.role}" sem acesso Drive (configuravel por job via override) — skip`);
    return result;
  }

  const folderEntries = permissionMap[driveRole] || [];

  if (folderEntries.length === 0) {
    console.log(`[drive-permissions-helper] Nenhuma entrada no mapa para role "${driveRole}" — skip`);
    return result;
  }

  // 5. Buscar pastas do job no banco
  const { data: driveFolders } = await serviceClient
    .from('drive_folders')
    .select('id, folder_key, google_drive_id')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  if (!driveFolders || driveFolders.length === 0) {
    console.warn(`[drive-permissions-helper] Nenhuma pasta Drive registrada para job ${jobId} — skip grant`);
    return result;
  }

  // Map folder_key -> { id (db), google_drive_id }
  const folderByKey = new Map(
    driveFolders.map((f) => [f.folder_key, f]),
  );

  // 6. Obter access token do Drive
  const token = await getDriveToken(serviceClient, auth.tenantId);

  const driveOpts = driveConfig.drive_type === 'shared_drive'
    ? { driveType: 'shared_drive', sharedDriveId: driveConfig.shared_drive_id as string }
    : undefined;

  // 7. Para cada entrada no mapa, verificar idempotencia e conceder permissao
  for (const entry of folderEntries) {
    const folder = folderByKey.get(entry.folder_key);

    if (!folder?.google_drive_id) {
      console.warn(`[drive-permissions-helper] Pasta "${entry.folder_key}" nao encontrada para job ${jobId} — skip`);
      continue;
    }

    // Verificar se ja existe permissao ativa (idempotencia)
    const { data: existing } = await serviceClient
      .from('job_drive_permissions')
      .select('id')
      .eq('job_team_id', jobTeamId)
      .eq('job_id', jobId)
      .eq('folder_key', entry.folder_key)
      .is('revoked_at', null)
      .maybeSingle();

    if (existing) {
      result.skipped++;
      continue;
    }

    // Tentar conceder permissao no Drive
    let drivePermissionId: string | null = null;
    let errorMessage: string | null = null;

    try {
      const grantResult = await grantFolderPermission(
        token,
        folder.google_drive_id,
        email,
        entry.drive_role,
        driveOpts,
      );
      drivePermissionId = grantResult.permissionId;
      result.granted++;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[drive-permissions-helper] Falha ao conceder permissao "${entry.folder_key}" para ${email}: ${errorMessage}`);
      result.failed++;
    }

    // Registrar na tabela job_drive_permissions (sucesso ou falha)
    await serviceClient
      .from('job_drive_permissions')
      .insert({
        tenant_id: auth.tenantId,
        job_id: jobId,
        job_team_id: jobTeamId,
        person_id: member.person_id,
        email,
        folder_key: entry.folder_key,
        drive_folder_id: folder.id,
        google_drive_id: folder.google_drive_id,
        drive_role: entry.drive_role,
        drive_permission_id: drivePermissionId,
        granted_by: auth.userId,
        error_message: errorMessage,
      });

    // Respeitar rate limit do Drive API
    await delay(DRIVE_RATE_LIMIT_DELAY_MS);
  }

  console.log(
    `[drive-permissions-helper] Grant concluido para membro ${jobTeamId}: ` +
    `granted=${result.granted}, skipped=${result.skipped}, failed=${result.failed}`,
  );

  return result;
}

// Resultado de revokeDrivePermissionsForMember
export interface RevokeDriveResult {
  revoked: number;
  failed: number;
}

// Revoga todas as permissoes Drive ativas de um membro especifico do job_team.
// Marca revoked_at mesmo se a chamada ao Drive falhar (registro de auditoria).
// Fire-and-forget: chamado pelo jobs-team/remove-member e update-member.
export async function revokeDrivePermissionsForMember(
  auth: AuthContext,
  jobId: string,
  jobTeamId: string,
): Promise<RevokeDriveResult> {
  const serviceClient = getServiceClient();
  const result: RevokeDriveResult = { revoked: 0, failed: 0 };

  // 1. Verificar se Drive esta habilitado
  const driveConfig = await getDriveConfig(serviceClient, auth.tenantId);
  if (!driveConfig) {
    console.log(`[drive-permissions-helper] Drive nao habilitado para tenant ${auth.tenantId} — skip revoke`);
    return result;
  }

  // 2. Buscar todas as permissoes ativas do membro
  const { data: activePermissions, error: fetchError } = await serviceClient
    .from('job_drive_permissions')
    .select('id, drive_permission_id, folder_key, google_drive_id')
    .eq('job_team_id', jobTeamId)
    .eq('job_id', jobId)
    .is('revoked_at', null);

  if (fetchError) {
    throw new Error(`Falha ao buscar permissoes ativas de ${jobTeamId}: ${fetchError.message}`);
  }

  if (!activePermissions || activePermissions.length === 0) {
    console.log(`[drive-permissions-helper] Nenhuma permissao ativa para revogar do membro ${jobTeamId}`);
    return result;
  }

  // 3. Obter access token do Drive
  const token = await getDriveToken(serviceClient, auth.tenantId);

  const driveOpts = driveConfig.drive_type === 'shared_drive'
    ? { driveType: 'shared_drive', sharedDriveId: driveConfig.shared_drive_id as string }
    : undefined;

  const now = new Date().toISOString();

  // 4. Para cada permissao, revogar no Drive e marcar como revogada no banco
  for (const perm of activePermissions) {
    let errorMessage: string | null = null;

    // Tentar revogar no Drive se tiver o permission ID
    if (perm.drive_permission_id) {
      try {
        const ok = await revokeFolderPermission(
          token,
          perm.google_drive_id,
          perm.drive_permission_id,
          driveOpts,
        );
        if (!ok) {
          errorMessage = `Drive API retornou falha ao revogar permission ${perm.drive_permission_id}`;
          result.failed++;
        } else {
          result.revoked++;
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[drive-permissions-helper] Falha ao revogar permissao ${perm.id}: ${errorMessage}`);
        result.failed++;
      }
    } else {
      // Sem permission_id (concessao falhou anteriormente) — apenas marca como revogada
      result.revoked++;
    }

    // Sempre marcar como revogada no banco, independente do resultado do Drive
    await serviceClient
      .from('job_drive_permissions')
      .update({
        revoked_at: now,
        revoked_by: auth.userId,
        error_message: errorMessage,
      })
      .eq('id', perm.id);

    // Respeitar rate limit do Drive API
    await delay(DRIVE_RATE_LIMIT_DELAY_MS);
  }

  console.log(
    `[drive-permissions-helper] Revoke concluido para membro ${jobTeamId}: ` +
    `revoked=${result.revoked}, failed=${result.failed}`,
  );

  return result;
}
