import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecret } from './vault.ts';
import { getServiceClient } from './supabase-client.ts';

// ========================================================
// Google Drive Client — JWT RS256 Auth + Folder Operations
// ========================================================

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

// Retry config para chamadas ao Drive API
const DRIVE_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DRIVE_MAX_RETRIES = 3;
const DRIVE_BASE_DELAY_MS = 1000;
const DRIVE_TIMEOUT_MS = 30000;

async function driveFetchWithRetry(
  url: string,
  options: RequestInit,
  label: string,
): Promise<Response> {
  for (let attempt = 0; attempt <= DRIVE_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = DRIVE_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[google-drive] retry ${attempt}/${DRIVE_MAX_RETRIES} em ${delay}ms para ${label}`);
      await new Promise((r) => setTimeout(r, delay));
    }

    let resp: Response;
    try {
      resp = await fetch(url, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(DRIVE_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt < DRIVE_MAX_RETRIES) continue;
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Drive ${label}: network error — ${msg}`);
    }

    if (!resp.ok && DRIVE_RETRYABLE_STATUS.has(resp.status) && attempt < DRIVE_MAX_RETRIES) {
      console.warn(`[google-drive] ${label} HTTP ${resp.status} — retrying...`);
      continue;
    }

    return resp;
  }

  throw new Error(`Drive ${label}: max retries exceeded`);
}

// Opcoes para chamadas que suportam Shared Drive
interface DriveOptions {
  driveType?: string | null;   // 'my_drive' | 'shared_drive'
  sharedDriveId?: string | null;
}

// Resultado de criacao de pasta
interface CreateFolderResult {
  id: string;
  url: string;
}

// Resultado de buildDriveStructure
export interface BuildDriveResult {
  foldersCreated: number;
  rootUrl: string | null;
  errors: string[];
}

// Estrutura do template de pastas
export interface FolderTemplateNode {
  key: string;
  name: string;
  children?: FolderTemplateNode[];
}

// Template padrao: 26 pastas reais da Ellah Filmes (10 nivel-1 + 16 nivel-2)
export const DEFAULT_FOLDER_TEMPLATE: FolderTemplateNode = {
  key: 'root',
  name: '{CODE}_{TITLE}_{CLIENT}',
  children: [
    { key: 'documentos', name: '01_DOCUMENTOS' },
    {
      key: 'financeiro',
      name: '02_FINANCEIRO',
      children: [
        { key: 'fin_carta_orcamento', name: '01_CARTAORCAMENTO' },
        { key: 'fin_decupado', name: '02_DECUPADO' },
        { key: 'fin_gastos_gerais', name: '03_GASTOS GERAIS' },
        { key: 'fin_nf_recebimento', name: '04_NOTAFISCAL_RECEBIMENTO' },
        { key: 'fin_comprovantes_pg', name: '05_COMPROVANTES_PG' },
        { key: 'fin_notinhas_producao', name: '06_NOTINHAS_EM_PRODUCAO' },
        { key: 'fin_nf_final', name: '07_NOTAFISCAL_FINAL_PRODUCAO' },
        { key: 'fin_fechamento', name: '08_FECHAMENTO_LUCRO_PREJUIZO' },
      ],
    },
    { key: 'monstro_pesquisa', name: '03_MONSTRO_PESQUISA_ARTES' },
    { key: 'cronograma', name: '04_CRONOGRAMA' },
    { key: 'contratos', name: '05_CONTRATOS' },
    { key: 'fornecedores', name: '06_FORNECEDORES' },
    { key: 'clientes', name: '07_CLIENTES' },
    {
      key: 'pos_producao',
      name: '08_POS_PRODUCAO',
      children: [
        { key: 'pos_material_bruto', name: '01_MATERIAL BRUTO' },
        { key: 'pos_material_limpo', name: '02_MATERIAL LIMPO' },
        { key: 'pos_pesquisa', name: '03_PESQUISA' },
        { key: 'pos_storyboard', name: '04_STORYBOARD' },
        { key: 'pos_montagem', name: '05_MONTAGEM' },
        { key: 'pos_color', name: '06_COLOR' },
        { key: 'pos_finalizacao', name: '07_FINALIZACAO' },
        { key: 'pos_copias', name: '08_COPIAS' },
      ],
    },
    { key: 'atendimento', name: '09_ATENDIMENTO' },
    { key: 'vendas', name: '10_VENDAS_PRODUTOR_EXECUTIVO' },
  ],
};

// ========================================================
// JWT RS256 Authentication (Service Account → access_token)
// ========================================================

// Gera access token usando Service Account JWT RS256 via WebCrypto
export async function getGoogleAccessToken(
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
      console.error('[google-drive] OAuth erro:', await resp.text());
      return null;
    }

    const data = await resp.json();
    return data.access_token || null;
  } catch (err) {
    console.error('[google-drive] Erro ao gerar access token:', err);
    return null;
  }
}

// ========================================================
// Drive API Operations
// ========================================================

// Constroi query params para Shared Drive
function sharedDriveParams(opts?: DriveOptions): string {
  if (opts?.driveType === 'shared_drive') {
    return '&supportsAllDrives=true&includeItemsFromAllDrives=true';
  }
  return '';
}

// Gera URL publica de pasta no Drive
export function buildFolderUrl(fileId: string): string {
  return `https://drive.google.com/drive/folders/${fileId}`;
}

// Sanitiza nome de pasta para o Drive (remove caracteres invalidos)
function sanitizeFolderName(name: string): string {
  return name.replace(/[\/\\*?<>|"]/g, '_').trim();
}

// Cria uma pasta no Google Drive
export async function createFolder(
  token: string,
  name: string,
  parentId: string,
  opts?: DriveOptions,
): Promise<CreateFolderResult> {
  const safeName = sanitizeFolderName(name);

  const metadata: Record<string, unknown> = {
    name: safeName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };

  let url = `${DRIVE_API}/files?fields=id`;
  if (opts?.driveType === 'shared_drive') {
    url += '&supportsAllDrives=true';
  }

  const resp = await driveFetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  }, `createFolder "${safeName}"`);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive createFolder "${safeName}": HTTP ${resp.status} — ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  return {
    id: data.id,
    url: buildFolderUrl(data.id),
  };
}

// Lista arquivos/pastas filhos de um parentId
export async function listChildren(
  token: string,
  parentId: string,
  opts?: DriveOptions,
): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
  let url = `${DRIVE_API}/files?q=${q}&fields=files(id,name,mimeType)&pageSize=100`;
  url += sharedDriveParams(opts);

  if (opts?.driveType === 'shared_drive' && opts.sharedDriveId) {
    url += `&driveId=${opts.sharedDriveId}&corpora=drive`;
  }

  const resp = await driveFetchWithRetry(url, {
    headers: { Authorization: `Bearer ${token}` },
  }, 'listChildren');

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive listChildren: HTTP ${resp.status} — ${text.slice(0, 300)}`);
  }

  const data = await resp.json();
  return data.files || [];
}

// Define permissao em um arquivo/pasta
export async function setPermission(
  token: string,
  fileId: string,
  email: string,
  role: 'writer' | 'fileOrganizer' | 'reader',
  opts?: DriveOptions,
): Promise<void> {
  let url = `${DRIVE_API}/files/${fileId}/permissions`;
  if (opts?.driveType === 'shared_drive') {
    url += '?supportsAllDrives=true';
  }

  const resp = await driveFetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role,
      emailAddress: email,
    }),
  }, `setPermission ${role} ${email}`);

  if (!resp.ok) {
    const text = await resp.text();
    // Nao lanca erro fatal — permissao falhando nao deve bloquear criacao de pastas
    console.error(`[google-drive] permissao ${role} para ${email} em ${fileId}: HTTP ${resp.status} — ${text.slice(0, 200)}`);
  }
}

// Define permissao "qualquer pessoa com o link pode visualizar" em um arquivo
// Usado para NF PDFs que precisam ser visualizados no iframe do frontend
export async function setPublicReadPermission(
  token: string,
  fileId: string,
  opts?: DriveOptions,
): Promise<void> {
  let url = `${DRIVE_API}/files/${fileId}/permissions`;
  if (opts?.driveType === 'shared_drive') {
    url += '?supportsAllDrives=true';
  }

  const resp = await driveFetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'anyone',
      role: 'reader',
    }),
  }, `setPublicReadPermission ${fileId}`);

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`[google-drive] permissao publica reader em ${fileId}: HTTP ${resp.status} — ${text.slice(0, 200)}`);
  } else {
    console.log(`[google-drive] permissao publica reader definida em ${fileId}`);
  }
}

// Copia um arquivo no Drive (files.copy API)
// Util para copiar templates de documentos para pastas de jobs
export async function copyDriveFile(
  token: string,
  sourceFileId: string,
  newName: string,
  targetFolderId: string,
): Promise<{ id: string; webViewLink?: string }> {
  const url = `${DRIVE_API}/files/${sourceFileId}/copy?supportsAllDrives=true&fields=id,webViewLink`;

  const resp = await driveFetchWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: newName,
      parents: [targetFolderId],
    }),
  }, `files.copy "${newName}"`);

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Drive files.copy: HTTP ${resp.status} — ${text.slice(0, 300)}`);
  }

  return await resp.json();
}

// ========================================================
// buildDriveStructure — Funcao principal: cria 26 pastas
// ========================================================

interface BuildDriveParams {
  serviceClient: SupabaseClient;
  jobId: string;
  tenantId: string;
}

export async function buildDriveStructure(
  params: BuildDriveParams,
): Promise<BuildDriveResult> {
  const { serviceClient, jobId, tenantId } = params;
  const errors: string[] = [];
  let foldersCreated = 0;

  // 1. Ler config do tenant
  const { data: tenant } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) || {};
  const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
  const driveConfig = integrations['google_drive'] || {};

  if (!driveConfig.enabled) {
    throw new Error('Google Drive nao esta habilitado para este tenant');
  }

  const rootFolderId = driveConfig.root_folder_id as string;
  if (!rootFolderId) {
    throw new Error('root_folder_id nao configurado nas settings do tenant');
  }

  const driveType = (driveConfig.drive_type as string) || 'my_drive';
  const sharedDriveId = (driveConfig.shared_drive_id as string) || null;
  const driveOpts: DriveOptions = { driveType, sharedDriveId };

  // 2. Ler SA do Vault e obter access token
  const saJson = await getSecret(serviceClient, `${tenantId}_gdrive_service_account`);
  if (!saJson) {
    throw new Error('Service Account nao encontrada no Vault');
  }

  const sa = JSON.parse(saJson);
  const token = await getGoogleAccessToken(sa);
  if (!token) {
    throw new Error('Falha ao obter access_token do Google');
  }

  // 3. Buscar dados do job para nome da pasta raiz
  const { data: job } = await serviceClient
    .from('jobs')
    .select('id, code, title, client_id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (!job) {
    throw new Error(`Job ${jobId} nao encontrado`);
  }

  // Buscar nome do cliente
  let clientName = '';
  if (job.client_id) {
    const { data: client } = await serviceClient
      .from('clients')
      .select('company_name')
      .eq('id', job.client_id)
      .single();
    clientName = client?.company_name || '';
  }

  // 4. Resolver template (customizado do tenant ou default)
  const template: FolderTemplateNode = (driveConfig.folder_template as FolderTemplateNode) || DEFAULT_FOLDER_TEMPLATE;

  // Substituir placeholders no nome da raiz
  const rootName = template.name
    .replace('{CODE}', job.code || 'SEM-CODIGO')
    .replace('{TITLE}', job.title || 'SEM-TITULO')
    .replace('{CLIENT}', clientName || 'SEM-CLIENTE');

  // 5. Criar arvore de pastas (sequencial para evitar rate limits)

  // Map de folder_key → { driveId, dbId }
  const folderMap: Record<string, { driveId: string; url: string; dbId: string }> = {};

  // Helper: cria pasta no Drive e registra no banco
  async function createAndRecord(
    key: string,
    name: string,
    parentDriveId: string,
    parentDbId: string | null,
  ): Promise<void> {
    try {
      // Verificar se ja existe no banco (idempotencia)
      const { data: existing } = await serviceClient
        .from('drive_folders')
        .select('id, google_drive_id, url')
        .eq('tenant_id', tenantId)
        .eq('job_id', jobId)
        .eq('folder_key', key)
        .maybeSingle();

      if (existing?.google_drive_id) {
        // Ja existe — pular criacao, registrar no map
        folderMap[key] = {
          driveId: existing.google_drive_id,
          url: existing.url || buildFolderUrl(existing.google_drive_id),
          dbId: existing.id,
        };
        return;
      }

      // Criar pasta no Drive
      const result = await createFolder(token!, name, parentDriveId, driveOpts);

      // Inserir no banco
      const { data: row } = await serviceClient
        .from('drive_folders')
        .upsert(
          {
            tenant_id: tenantId,
            job_id: jobId,
            folder_key: key,
            google_drive_id: result.id,
            url: result.url,
            parent_folder_id: parentDbId,
          },
          { onConflict: 'tenant_id,job_id,folder_key' },
        )
        .select('id')
        .single();

      folderMap[key] = {
        driveId: result.id,
        url: result.url,
        dbId: row?.id || '',
      };
      foldersCreated++;
    } catch (err) {
      const msg = `Erro criando pasta "${key}": ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      console.error(`[google-drive] ${msg}`);
    }
  }

  // Criar pasta raiz
  await createAndRecord('root', rootName, rootFolderId, null);

  if (!folderMap['root']) {
    throw new Error('Falha ao criar pasta raiz no Drive');
  }

  // Criar pastas nivel-1
  if (template.children) {
    for (const child of template.children) {
      await createAndRecord(child.key, child.name, folderMap['root'].driveId, folderMap['root'].dbId);

      // Criar pastas nivel-2
      if (child.children && folderMap[child.key]) {
        for (const grandchild of child.children) {
          await createAndRecord(
            grandchild.key,
            grandchild.name,
            folderMap[child.key].driveId,
            folderMap[child.key].dbId,
          );
        }
      }
    }
  }

  // 6. Atualizar jobs.drive_folder_url
  const rootUrl = folderMap['root']?.url || null;
  if (rootUrl) {
    await serviceClient
      .from('jobs')
      .update({ drive_folder_url: rootUrl })
      .eq('id', jobId);
  }

  // 7. Permissoes na pasta raiz para equipe do job
  try {
    const { data: teamMembers } = await serviceClient
      .from('job_team')
      .select('role, people!inner(email)')
      .eq('job_id', jobId)
      .is('deleted_at', null);

    if (teamMembers && teamMembers.length > 0 && folderMap['root']) {
      for (const member of teamMembers) {
        const email = (member as any).people?.email;
        if (!email) continue;

        // PE e coordenador = fileOrganizer, demais = writer
        const role = ['produtor_executivo', 'coordenador_producao'].includes(member.role)
          ? 'fileOrganizer' as const
          : 'writer' as const;

        await setPermission(token!, folderMap['root'].driveId, email, role, driveOpts);
      }
    }
  } catch (permErr) {
    const msg = `Aviso: falha ao definir permissoes: ${permErr instanceof Error ? permErr.message : String(permErr)}`;
    errors.push(msg);
    console.error(`[google-drive] ${msg}`);
  }

  console.log(
    `[google-drive] buildDriveStructure concluido para job ${jobId}: ${foldersCreated} pastas criadas, ${errors.length} erros`,
  );

  return { foldersCreated, rootUrl, errors };
}
