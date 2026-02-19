import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts';
import { getSecret } from '../../_shared/vault.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

const VALID_INTEGRATIONS = ['google_drive', 'whatsapp', 'docuseal', 'n8n'] as const;
type IntegrationName = (typeof VALID_INTEGRATIONS)[number];

export async function testIntegration(
  _req: Request,
  auth: AuthContext,
  integration: string,
): Promise<Response> {
  if (!VALID_INTEGRATIONS.includes(integration as IntegrationName)) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Integracao "${integration}" invalida`,
      400,
    );
  }

  const integrationName = integration as IntegrationName;

  // Buscar config do tenant
  const userClient = getSupabaseClient(auth.token);
  const { data: tenant } = await userClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const config = integrations[integrationName] || {};

  const serviceClient = getServiceClient();

  switch (integrationName) {
    case 'google_drive':
      return await testGoogleDrive(auth.tenantId, config, serviceClient);
    case 'whatsapp':
      return await testWhatsApp(auth.tenantId, config, serviceClient);
    case 'docuseal':
      return success({
        success: false,
        message: 'DocuSeal estara disponivel na Fase 6',
      });
    case 'n8n':
      return await testN8n(config);
    default:
      throw new AppError('VALIDATION_ERROR', 'Integracao desconhecida', 400);
  }
}

// Testa Google Drive: valida service account JSON + tenta obter access token
async function testGoogleDrive(
  tenantId: string,
  config: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
): Promise<Response> {
  // Ler service account do Vault
  const saJson = await getSecret(serviceClient, `${tenantId}_gdrive_service_account`);

  if (!saJson) {
    return success({
      success: false,
      message: 'Service Account nao configurada. Faca upload do JSON primeiro.',
    });
  }

  try {
    const sa = JSON.parse(saJson);

    // Validar campos essenciais
    if (!sa.client_email || !sa.private_key || !sa.project_id) {
      return success({
        success: false,
        message: 'Service Account JSON incompleto: faltam client_email, private_key ou project_id',
      });
    }

    // Tentar gerar JWT e trocar por access token (prova que credenciais sao validas)
    const token = await getGoogleAccessToken(sa);

    if (!token) {
      return success({
        success: false,
        message: 'Falha ao autenticar com Google. Verifique a Service Account.',
      });
    }

    // Se tem root_folder_id, tenta listar pasta
    const rootFolderId = config.root_folder_id as string | null;
    if (rootFolderId) {
      const driveType = config.drive_type as string | null;
      const sharedDriveId = config.shared_drive_id as string | null;

      const folderOk = await testDriveFolder(token, rootFolderId, driveType, sharedDriveId);
      if (!folderOk) {
        return success({
          success: false,
          message: 'Autenticacao OK, mas a pasta raiz nao foi encontrada ou nao tem permissao.',
        });
      }
    }

    return success({
      success: true,
      message: rootFolderId
        ? 'Conexao OK! Autenticacao e acesso a pasta verificados.'
        : 'Autenticacao OK! Configure a pasta raiz para validar acesso completo.',
    });
  } catch (err) {
    console.error('[test-integration] Erro ao testar Google Drive:', err);
    return success({
      success: false,
      message: 'Erro ao testar Google Drive. Verifique o JSON da Service Account.',
    });
  }
}

// Gera access token usando Service Account JWT (RS256)
async function getGoogleAccessToken(
  sa: { client_email: string; private_key: string },
): Promise<string | null> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    // Base64url encode
    const enc = (obj: unknown) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const headerB64 = enc(header);
    const payloadB64 = enc(payload);
    const unsigned = `${headerB64}.${payloadB64}`;

    // Importar chave privada RSA
    const pemContent = sa.private_key.replace(/\\n/g, '\n');
    const pemLines = pemContent
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemLines), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    // Assinar
    const signatureBuffer = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsigned),
    );

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const jwt = `${unsigned}.${signatureB64}`;

    // Trocar JWT por access token
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    if (!resp.ok) {
      console.error('[test-integration] Google OAuth erro:', await resp.text());
      return null;
    }

    const data = await resp.json();
    return data.access_token || null;
  } catch (err) {
    console.error('[test-integration] Erro ao gerar Google access token:', err);
    return null;
  }
}

// Testa se a pasta raiz existe e esta acessivel
async function testDriveFolder(
  token: string,
  folderId: string,
  driveType: string | null,
  sharedDriveId: string | null,
): Promise<boolean> {
  try {
    let url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType`;

    if (driveType === 'shared_drive' && sharedDriveId) {
      url += '&supportsAllDrives=true&includeItemsFromAllDrives=true';
    }

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return resp.ok;
  } catch {
    return false;
  }
}

// Testa WhatsApp (Evolution API): GET /instance/connectionState
async function testWhatsApp(
  tenantId: string,
  config: Record<string, unknown>,
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
): Promise<Response> {
  const instanceUrl = config.instance_url as string | null;
  const instanceName = config.instance_name as string | null;
  if (!instanceUrl) {
    return success({
      success: false,
      message: 'URL da instancia nao configurada.',
    });
  }

  if (!instanceName) {
    return success({
      success: false,
      message: 'Nome da instancia nao configurado.',
    });
  }

  const apiKey = await getSecret(serviceClient, `${tenantId}_whatsapp_api_key`);
  if (!apiKey) {
    return success({
      success: false,
      message: 'API Key nao configurada.',
    });
  }

  try {
    // Evolution API: GET /instance/connectionState/{instanceName}
    const url = `${instanceUrl.replace(/\/$/, '')}/instance/connectionState/${instanceName}`;
    const resp = await fetch(url, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return success({
        success: false,
        message: `Erro ao conectar: HTTP ${resp.status} — ${text.slice(0, 200)}`,
      });
    }

    const data = await resp.json();
    const state = data?.instance?.state || data?.state || 'unknown';

    return success({
      success: state === 'open' || state === 'connected',
      message: state === 'open' || state === 'connected'
        ? 'WhatsApp conectado!'
        : `WhatsApp status: ${state}. Verifique o QR Code na Evolution API.`,
      state,
    });
  } catch (err) {
    console.error('[test-integration] Erro ao testar WhatsApp:', err);
    return success({
      success: false,
      message: 'Erro ao conectar com a instancia. Verifique a URL e API Key.',
    });
  }
}

// Testa n8n: POST test payload para um dos webhooks
async function testN8n(config: Record<string, unknown>): Promise<Response> {
  const webhooks = config.webhooks as Record<string, string | null> | undefined;

  if (!webhooks) {
    return success({
      success: false,
      message: 'Nenhum webhook configurado.',
    });
  }

  // Encontrar o primeiro webhook configurado para teste
  const firstWebhook = Object.entries(webhooks).find(([, url]) => !!url);
  if (!firstWebhook) {
    return success({
      success: false,
      message: 'Nenhuma URL de webhook configurada.',
    });
  }

  const [name, url] = firstWebhook;

  try {
    const resp = await fetch(url!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test: true,
        source: 'ellahos',
        webhook_name: name,
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (resp.ok) {
      return success({
        success: true,
        message: `Webhook "${name}" respondeu com sucesso!`,
      });
    }

    return success({
      success: false,
      message: `Webhook "${name}" retornou HTTP ${resp.status}`,
    });
  } catch (err) {
    console.error('[test-integration] Erro ao testar n8n:', err);
    return success({
      success: false,
      message: `Erro ao conectar com webhook "${name}". Verifique a URL.`,
    });
  }
}
