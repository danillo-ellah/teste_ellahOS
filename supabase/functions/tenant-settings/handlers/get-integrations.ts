import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Integracao com valores default quando nao configurada
const DEFAULT_INTEGRATIONS = {
  google_drive: {
    enabled: false,
    configured: false,
    drive_type: null,
    shared_drive_id: null,
    root_folder_id: null,
    folder_template: null,
    has_service_account: false,
  },
  whatsapp: {
    enabled: false,
    configured: false,
    provider: null,
    instance_url: null,
    instance_name: null,
    has_api_key: false,
  },
  docuseal: {
    enabled: false,
    configured: false,
    instance_url: null,
    has_token: false,
    status_message: 'Disponivel na Fase 6',
  },
  n8n: {
    enabled: false,
    configured: false,
    webhooks: {
      job_approved: null,
      margin_alert: null,
      status_change: null,
    },
  },
};

type IntegrationName = keyof typeof DEFAULT_INTEGRATIONS;

export async function getIntegrations(
  _req: Request,
  auth: AuthContext,
): Promise<Response> {
  const client = getSupabaseClient(auth.token);

  // Buscar settings do tenant
  const { data: tenant, error: fetchError } = await client
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError || !tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  const settings = (tenant.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};

  // Montar resposta com defaults + dados salvos
  const result: Record<string, unknown> = {};

  for (const [name, defaults] of Object.entries(DEFAULT_INTEGRATIONS)) {
    const saved = integrations[name] || {};
    result[name] = { ...defaults, ...saved };
  }

  return success(result);
}
