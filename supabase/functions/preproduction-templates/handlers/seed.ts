import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = ['ceo', 'admin'];

export async function handleTemplatesSeed(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[preproduction-templates/seed] executando seed de templates padrao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para executar seed de templates', 403);
  }

  const client = getSupabaseClient(auth.token);

  const { data: result, error: rpcError } = await client.rpc('seed_default_ppm_templates', {
    p_tenant_id: auth.tenantId,
    p_created_by: auth.userId,
  });

  if (rpcError) {
    console.error('[preproduction-templates/seed] erro na RPC:', rpcError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao executar seed de templates', 500, {
      detail: rpcError.message,
    });
  }

  const templatesCreated = typeof result === 'number' ? result : 0;

  console.log('[preproduction-templates/seed] seed concluido', { templates_created: templatesCreated });
  return success({ templates_created: templatesCreated }, 200, req);
}
