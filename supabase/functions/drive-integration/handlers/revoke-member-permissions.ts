import { z } from 'https://esm.sh/zod@3.22.4';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import {
  getGoogleAccessToken,
  revokeFolderPermission,
} from '../../_shared/google-drive-client.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// ========================================================
// revoke-member-permissions.ts
// Revoga todas as permissoes Google Drive de um membro do job_team
// POST /:jobId/revoke-member-permissions
// RBAC: admin, ceo, produtor_executivo
// ========================================================

// Schema de validacao do body
const RevokeMemberPermissionsSchema = z.object({
  job_team_id: z.string().uuid('job_team_id deve ser um UUID valido'),
});

// Delay entre chamadas ao Drive API (rate limit: 300 req/min)
const DRIVE_DELAY_MS = 200;
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function revokeMemberPermissions(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  // RBAC: apenas admin, ceo e produtor_executivo
  if (!['admin', 'ceo', 'produtor_executivo'].includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Apenas admin, ceo ou produtor_executivo podem revogar permissoes Drive', 403);
  }

  const serviceClient = getServiceClient();

  // 1. Validar payload
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parsed = RevokeMemberPermissionsSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', parsed.error.errors[0].message, 400);
  }

  const { job_team_id } = parsed.data;

  // 2. Verificar Drive habilitado no tenant
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

  // 3. Buscar todas permissoes ativas do membro neste job
  const { data: activePermissions, error: fetchError } = await serviceClient
    .from('job_drive_permissions')
    .select('id, drive_permission_id, folder_key, google_drive_id')
    .eq('job_team_id', job_team_id)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('revoked_at', null);

  if (fetchError) {
    throw new AppError('INTERNAL_ERROR', `Falha ao buscar permissoes: ${fetchError.message}`, 500);
  }

  if (!activePermissions || activePermissions.length === 0) {
    console.log(`[revoke-member-permissions] Nenhuma permissao ativa para membro ${job_team_id} no job ${jobId}`);
    return success({
      job_team_id,
      permissions_revoked: 0,
      permissions_failed: 0,
    });
  }

  // 4. Obter access token do Drive
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

  const now = new Date().toISOString();
  let permissionsRevoked = 0;
  let permissionsFailed = 0;

  // 5. Revogar cada permissao no Drive e marcar no banco
  for (const perm of activePermissions) {
    let errorMessage: string | null = null;

    if (perm.drive_permission_id) {
      try {
        const ok = await revokeFolderPermission(
          token,
          perm.google_drive_id,
          perm.drive_permission_id,
          driveOpts,
        );
        if (ok) {
          permissionsRevoked++;
        } else {
          errorMessage = `Drive API retornou falha ao revogar permission ${perm.drive_permission_id}`;
          permissionsFailed++;
          console.error(`[revoke-member-permissions] Falha na pasta "${perm.folder_key}": ${errorMessage}`);
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err);
        permissionsFailed++;
        console.error(`[revoke-member-permissions] Erro na pasta "${perm.folder_key}": ${errorMessage}`);
      }
    } else {
      // Sem drive_permission_id (concessao anterior falhou) — apenas marcar no banco
      permissionsRevoked++;
    }

    // Sempre atualizar o registro no banco, independente do resultado do Drive
    await serviceClient
      .from('job_drive_permissions')
      .update({
        revoked_at: now,
        revoked_by: auth.userId,
        error_message: errorMessage,
      })
      .eq('id', perm.id);

    await delay(DRIVE_DELAY_MS);
  }

  console.log(
    `[revoke-member-permissions] job=${jobId} member=${job_team_id} ` +
    `revoked=${permissionsRevoked} failed=${permissionsFailed}`,
  );

  return success({
    job_team_id,
    permissions_revoked: permissionsRevoked,
    permissions_failed: permissionsFailed,
  });
}
