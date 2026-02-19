import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { setSecret } from '../../_shared/vault.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Nomes de integracao validos
const VALID_INTEGRATIONS = ['google_drive', 'whatsapp', 'docuseal', 'n8n'] as const;
type IntegrationName = (typeof VALID_INTEGRATIONS)[number];

// Schemas de validacao por integracao
const googleDriveSchema = z.object({
  enabled: z.boolean().optional(),
  drive_type: z.enum(['my_drive', 'shared_drive']).optional().nullable(),
  shared_drive_id: z.string().optional().nullable(),
  root_folder_id: z.string().optional().nullable(),
  folder_template: z.array(z.object({
    name: z.string(),
    key: z.string(),
    children: z.array(z.object({
      name: z.string(),
      key: z.string(),
    })).optional(),
  })).optional().nullable(),
  service_account_json: z.string().optional(), // Secret → Vault
});

const whatsappSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.enum(['evolution', 'zapi']).optional().nullable(),
  instance_url: z.string().url().optional().nullable(),
  instance_name: z.string().max(100).optional().nullable(),
  api_key: z.string().optional(), // Secret → Vault
});

const docusealSchema = z.object({
  enabled: z.boolean().optional(),
  instance_url: z.string().url().optional().nullable(),
  auth_token: z.string().optional(), // Secret → Vault
});

const n8nSchema = z.object({
  enabled: z.boolean().optional(),
  webhooks: z.object({
    job_approved: z.string().url().optional().nullable(),
    margin_alert: z.string().url().optional().nullable(),
    status_change: z.string().url().optional().nullable(),
  }).optional(),
});

const SCHEMAS: Record<IntegrationName, z.ZodSchema> = {
  google_drive: googleDriveSchema,
  whatsapp: whatsappSchema,
  docuseal: docusealSchema,
  n8n: n8nSchema,
};

// Mapeamento de campos secret → nome no Vault
const SECRET_FIELDS: Record<IntegrationName, Record<string, string>> = {
  google_drive: { service_account_json: 'gdrive_service_account' },
  whatsapp: { api_key: 'whatsapp_api_key' },
  docuseal: { auth_token: 'docuseal_token' },
  n8n: {},
};

export async function updateIntegration(
  req: Request,
  auth: AuthContext,
  integration: string,
): Promise<Response> {
  // Validar nome da integracao
  if (!VALID_INTEGRATIONS.includes(integration as IntegrationName)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Integracao "${integration}" invalida. Opcoes: ${VALID_INTEGRATIONS.join(', ')}`,
      400,
    );
  }

  const integrationName = integration as IntegrationName;
  const body = await req.json();

  // Validar body com schema
  const schema = SCHEMAS[integrationName];
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parsed.error.issues.map(i => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  const validData = parsed.data as Record<string, unknown>;

  // Google Drive: validar shared_drive_id obrigatorio se drive_type = shared_drive
  if (integrationName === 'google_drive') {
    const driveType = validData.drive_type as string | null | undefined;
    const sharedDriveId = validData.shared_drive_id as string | null | undefined;
    if (driveType === 'shared_drive' && !sharedDriveId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'shared_drive_id e obrigatorio quando drive_type e "shared_drive"',
        400,
      );
    }
  }

  // Validar service_account_json e um JSON valido
  if (integrationName === 'google_drive' && validData.service_account_json) {
    try {
      const sa = JSON.parse(validData.service_account_json as string);
      if (!sa.client_email || !sa.private_key || !sa.project_id) {
        throw new Error('Campos obrigatorios ausentes');
      }
    } catch {
      throw new AppError(
        'VALIDATION_ERROR',
        'service_account_json deve ser um JSON valido contendo client_email, private_key e project_id',
        400,
      );
    }
  }

  // Separar secrets do config
  const secretFields = SECRET_FIELDS[integrationName];
  const configData = { ...validData };
  const secretsToWrite: Record<string, string> = {};

  for (const [field, vaultName] of Object.entries(secretFields)) {
    if (configData[field] !== undefined) {
      secretsToWrite[vaultName] = configData[field] as string;
      delete configData[field];
      // Marcar que o secret existe
      configData[`has_${field.replace('_json', '').replace('auth_', '')}`] = true;
    }
  }

  // Escrever secrets no Vault usando service client
  if (Object.keys(secretsToWrite).length > 0) {
    const serviceClient = getServiceClient();
    for (const [vaultName, value] of Object.entries(secretsToWrite)) {
      const fullName = `${auth.tenantId}_${vaultName}`;
      await setSecret(serviceClient, fullName, value);
    }
  }

  // Determinar se esta "configured" baseado nos campos essenciais
  configData.configured = isConfigured(integrationName, configData);

  const userClient = getSupabaseClient(auth.token);

  // Ler settings atual do tenant
  const { data: tenant, error: fetchError } = await userClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError || !tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  // Merge no JSONB
  const currentSettings = (tenant.settings as Record<string, unknown>) || {};
  const currentIntegrations = (currentSettings.integrations as Record<string, unknown>) || {};
  const currentConfig = (currentIntegrations[integrationName] as Record<string, unknown>) || {};

  // Merge: manter campos existentes, sobrescrever com novos
  const mergedConfig = { ...currentConfig, ...configData };
  currentIntegrations[integrationName] = mergedConfig;
  currentSettings.integrations = currentIntegrations;

  // Atualizar tenant
  const { error: updateError } = await userClient
    .from('tenants')
    .update({ settings: currentSettings })
    .eq('id', auth.tenantId);

  if (updateError) {
    console.error('Erro ao atualizar settings:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar configuracao', 500);
  }

  return success(mergedConfig);
}

// Verifica se a integracao tem os campos minimos configurados
function isConfigured(name: IntegrationName, config: Record<string, unknown>): boolean {
  switch (name) {
    case 'google_drive':
      return !!(config.has_service_account || config.root_folder_id);
    case 'whatsapp':
      return !!(config.has_api_key && config.instance_url && config.instance_name);
    case 'docuseal':
      return !!(config.has_token && config.instance_url);
    case 'n8n': {
      const webhooks = config.webhooks as Record<string, unknown> | undefined;
      return !!(webhooks && Object.values(webhooks).some(v => !!v));
    }
    default:
      return false;
  }
}
