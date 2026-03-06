import { z } from 'https://esm.sh/zod@3.22.4';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import {
  getGoogleAccessToken,
  grantFolderPermission,
} from '../../_shared/google-drive-client.ts';
import {
  getPermissionMap,
  resolvePermissionRole,
} from '../../_shared/drive-permission-map.ts';
import { isLikelyGoogleEmail } from '../../_shared/drive-permissions-helper.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ========================================================
// grant-member-permissions.ts
// Concede permissoes Google Drive a um membro especifico do job_team
// POST /:jobId/grant-member-permissions
// RBAC: admin, ceo, produtor_executivo
// ========================================================

// Schema de validacao do body
const GrantMemberPermissionsSchema = z.object({
  job_team_id: z.string().uuid('job_team_id deve ser um UUID valido'),
});

// Delay entre chamadas ao Drive API (rate limit: 300 req/min)
const DRIVE_DELAY_MS = 200;
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function grantMemberPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  // RBAC: apenas admin, ceo e produtor_executivo
  if (!['admin', 'ceo', 'produtor_executivo'].includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas admin, ceo ou produtor_executivo podem conceder permissoes Drive', 403);
  }

  const serviceClient = getServiceClient();

  // 1. Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parsed = GrantMemberPermissionsSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', parsed.error.errors[0].message, 400);
  }

  const { job_team_id } = parsed.data;

  // 2. Verificar que o membro pertence ao job e esta ativo
  const { data: member, error: memberError } = await serviceClient
    .from('job_team')
    .select('id, role, person_id, people!inner(id, full_name, email)')
    .eq('id', job_team_id)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (memberError || !member) {
    throw new AppError('NOT_FOUND', 'Membro nao encontrado neste job', 404);
  }

  const person = (member as any).people;
  const email = person?.email as string | null;
  const personName = person?.full_name as string;

  if (!email) {
    throw new AppError('VALIDATION_ERROR', 'Membro nao possui email cadastrado', 400);
  }

  // 3. Verificar Drive habilitado no tenant
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

  // 4. Carregar mapa de permissoes e resolver role
  const permissionMap = await getPermissionMap(serviceClient, auth.tenantId);
  const driveRole = resolvePermissionRole(member.role);
  const folderEntries = permissionMap[driveRole] || [];

  // 5. Buscar pastas do job
  const { data: driveFolders } = await serviceClient
    .from('drive_folders')
    .select('id, folder_key, google_drive_id')
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId);

  const folderByKey = new Map(
    (driveFolders || []).map((f) => [f.folder_key, f]),
  );

  // 6. Obter access token do Drive
  const saJson = await getSecret(serviceClient, `${auth.tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new AppError('INTERNAL_ERROR', 'Service Account do Drive nao configurada', 500);
  }
  const sa = JSON.parse(saJson);
  const token = await getGoogleAccessToken(sa);
  if (!token) {
    throw new AppError('INTERNAL_ERROR', 'Falha ao obter access_token do Drive', 500);
  }

  const driveOpts = driveConfig.drive_type === 'shared_drive'
    ? { driveType: 'shared_drive', sharedDriveId: driveConfig.shared_drive_id as string }
    : undefined;

  // 7. Conceder permissoes pasta por pasta
  const warnings: Array<{ code: string; message: string }> = [];
  const details: Array<{
    folder_key: string;
    drive_role: string;
    status: 'granted' | 'skipped_existing' | 'folder_not_found' | 'failed';
    error?: string;
  }> = [];

  let permissionsGranted = 0;
  let permissionsSkipped = 0;
  let permissionsFailed = 0;

  // Avisar se email nao parece ser Google
  if (!isLikelyGoogleEmail(email)) {
    warnings.push({
      code: 'EMAIL_NOT_GOOGLE',
      message: `Email "${email}" pode nao ser uma conta Google — a permissao pode falhar`,
    });
  }

  for (const entry of folderEntries) {
    const folder = folderByKey.get(entry.folder_key);

    if (!folder?.google_drive_id) {
      details.push({ folder_key: entry.folder_key, drive_role: entry.drive_role, status: 'folder_not_found' });
      continue;
    }

    // Verificar idempotencia: permissao ativa ja existe?
    const { data: existing } = await serviceClient
      .from('job_drive_permissions')
      .select('id')
      .eq('job_team_id', job_team_id)
      .eq('job_id', jobId)
      .eq('folder_key', entry.folder_key)
      .is('revoked_at', null)
      .maybeSingle();

    if (existing) {
      permissionsSkipped++;
      details.push({ folder_key: entry.folder_key, drive_role: entry.drive_role, status: 'skipped_existing' });
      continue;
    }

    // Tentar conceder permissao
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
      permissionsGranted++;
      details.push({ folder_key: entry.folder_key, drive_role: entry.drive_role, status: 'granted' });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      permissionsFailed++;
      details.push({
        folder_key: entry.folder_key,
        drive_role: entry.drive_role,
        status: 'failed',
        error: errorMessage,
      });
      console.error(`[grant-member-permissions] Falha em "${entry.folder_key}" para ${email}: ${errorMessage}`);
    }

    // Registrar na tabela job_drive_permissions (sucesso ou falha com erro)
    await serviceClient
      .from('job_drive_permissions')
      .insert({
        tenant_id: auth.tenantId,
        job_id: jobId,
        job_team_id: job_team_id,
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

    await delay(DRIVE_DELAY_MS);
  }

  console.log(
    `[grant-member-permissions] job=${jobId} member=${job_team_id} email=${email} ` +
    `role=${driveRole} granted=${permissionsGranted} skipped=${permissionsSkipped} failed=${permissionsFailed}`,
  );

  const responseData = {
    job_team_id,
    person_name: personName,
    email,
    role: member.role,
    drive_role: driveRole,
    permissions_granted: permissionsGranted,
    permissions_skipped: permissionsSkipped,
    permissions_failed: permissionsFailed,
    details,
  };

  if (warnings.length > 0) {
    return new Response(JSON.stringify({ data: responseData, warnings }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return success(responseData);
}
