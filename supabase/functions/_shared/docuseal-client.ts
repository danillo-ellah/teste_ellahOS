// ========================================================
// DocuSeal Client — HTTP client para DocuSeal API (self-hosted)
// Contratos de elenco: criacao, consulta, webhook, download
// Host: assinaturas.ellahfilmes.com
// ========================================================

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getSecret } from './vault.ts';

// ========================================================
// Tipos — Request
// ========================================================

export interface DocuSealSubmitterField {
  name: string;
  value: string;
  default_value?: string;
}

export interface DocuSealSubmitter {
  role: string;
  email: string;
  fields: DocuSealSubmitterField[];
}

export interface DocuSealCreateSubmission {
  template_id: number;
  send_email: boolean;
  submitters: DocuSealSubmitter[];
}

// ========================================================
// Tipos — Response
// ========================================================

export interface DocuSealSubmitterResponse {
  id: number;
  email: string;
  status: string;
  documents: Array<{ url: string; filename: string }>;
}

export interface DocuSealSubmissionResponse {
  id: number;
  status: string;
  submitters: DocuSealSubmitterResponse[];
}

export interface DocuSealTemplate {
  id: number;
  name: string;
  fields: Array<{ name: string; type: string }>;
}

// ========================================================
// Config interna — le URL e token do Vault
// ========================================================

interface DocuSealConfig {
  url: string;
  token: string;
}

async function getDocuSealConfig(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<DocuSealConfig> {
  // Keys do Vault: prefixadas com tenant_id para isolamento multi-tenant
  const [url, token] = await Promise.all([
    getSecret(serviceClient, `${tenantId}_DOCUSEAL_URL`),
    getSecret(serviceClient, `${tenantId}_DOCUSEAL_TOKEN`),
  ]);

  // Fallback para keys globais (usadas em single-tenant ou durante setup)
  const resolvedUrl = url ?? (await getSecret(serviceClient, 'DOCUSEAL_URL'));
  const resolvedToken = token ?? (await getSecret(serviceClient, 'DOCUSEAL_TOKEN'));

  if (!resolvedUrl) {
    throw new Error('[docuseal] DOCUSEAL_URL nao configurado no Vault nem nas variaveis de ambiente');
  }
  if (!resolvedToken) {
    throw new Error('[docuseal] DOCUSEAL_TOKEN nao configurado no Vault nem nas variaveis de ambiente');
  }

  return {
    url: resolvedUrl.replace(/\/$/, ''), // remove trailing slash
    token: resolvedToken,
  };
}

// ========================================================
// Helper — fetch com headers padrao e error handling
// ========================================================

async function docusealFetch(
  config: DocuSealConfig,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const url = `${config.url}/api${path}`;

  console.log(`[docuseal] ${options.method ?? 'GET'} ${url}`);

  let resp: Response;
  try {
    resp = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': config.token,
        ...options.headers,
      },
      signal: options.signal ?? AbortSignal.timeout(30000),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[docuseal] network error em ${path}: ${msg}`);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(
      `[docuseal] HTTP ${resp.status} em ${path}: ${body.slice(0, 400)}`,
    );
  }

  return resp;
}

// ========================================================
// createSubmission — POST /api/submissions
// ========================================================

// Cria uma ou mais submissions no DocuSeal para assinatura digital.
// Cada submitter na lista recebe um email de assinatura (quando send_email = true).
// Template id:3 e o contrato padrao de elenco da Ellah Filmes.
export async function createSubmission(
  serviceClient: SupabaseClient,
  tenantId: string,
  submission: DocuSealCreateSubmission,
): Promise<DocuSealSubmissionResponse> {
  const config = await getDocuSealConfig(serviceClient, tenantId);

  console.log(
    `[docuseal] criando submission template_id=${submission.template_id} submitters=${submission.submitters.length}`,
  );

  const resp = await docusealFetch(config, '/submissions', {
    method: 'POST',
    body: JSON.stringify(submission),
  });

  const data = await resp.json();

  console.log(`[docuseal] submission criada id=${data.id} status=${data.status}`);

  return data as DocuSealSubmissionResponse;
}

// ========================================================
// getSubmission — GET /api/submissions/:id
// ========================================================

// Busca o status atual de uma submission e URLs dos documentos assinados.
// Util para polling de status antes do webhook chegar.
export async function getSubmission(
  serviceClient: SupabaseClient,
  tenantId: string,
  submissionId: number,
): Promise<DocuSealSubmissionResponse> {
  const config = await getDocuSealConfig(serviceClient, tenantId);

  console.log(`[docuseal] buscando submission id=${submissionId}`);

  const resp = await docusealFetch(config, `/submissions/${submissionId}`);
  const data = await resp.json();

  return data as DocuSealSubmissionResponse;
}

// ========================================================
// listTemplates — GET /api/templates
// ========================================================

// Lista os templates de contrato disponiveis no DocuSeal self-hosted.
// Util para validar que o template_id:3 (elenco) existe e listar campos.
export async function listTemplates(
  serviceClient: SupabaseClient,
  tenantId: string,
): Promise<DocuSealTemplate[]> {
  const config = await getDocuSealConfig(serviceClient, tenantId);

  console.log('[docuseal] listando templates disponiveis');

  const resp = await docusealFetch(config, '/templates');
  const data = await resp.json();

  // DocuSeal retorna { data: [...] } ou array direto dependendo da versao
  const templates = Array.isArray(data) ? data : (data.data ?? []);

  console.log(`[docuseal] ${templates.length} template(s) encontrado(s)`);

  return templates as DocuSealTemplate[];
}

// ========================================================
// validateWebhookSignature — HMAC SHA-256
// ========================================================

// Valida a assinatura HMAC enviada pelo DocuSeal no header x-docuseal-signature.
// O secret fica no Vault sob a key DOCUSEAL_WEBHOOK_SECRET.
// Retorna true se a assinatura for valida, false caso contrario.
// Idempotente: pode ser chamado multiplas vezes com o mesmo payload sem efeito colateral.
export async function validateWebhookSignature(
  serviceClient: SupabaseClient,
  tenantId: string,
  signature: string,
  rawBody: string,
): Promise<boolean> {
  // Ler secret do webhook — tenta por tenant, depois global
  let secret = await getSecret(serviceClient, `${tenantId}_DOCUSEAL_WEBHOOK_SECRET`);
  if (!secret) {
    secret = await getSecret(serviceClient, 'DOCUSEAL_WEBHOOK_SECRET');
  }

  if (!secret) {
    console.warn('[docuseal] DOCUSEAL_WEBHOOK_SECRET nao configurado — rejeitar webhook');
    return false;
  }

  try {
    const encoder = new TextEncoder();

    // Importar chave HMAC
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    // Calcular HMAC sobre o corpo cru do webhook
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(rawBody),
    );

    // Converter para hex (formato esperado pelo DocuSeal)
    const expectedSig = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Comparacao timing-safe para evitar timing attacks
    const encoder2 = new TextEncoder();
    const sigBytes = encoder2.encode(signature);
    const expectedBytes = encoder2.encode(expectedSig);

    if (sigBytes.length !== expectedBytes.length) {
      console.warn('[docuseal] webhook signature invalida (tamanho diferente)');
      return false;
    }

    // XOR constant-time comparison
    let diff = 0;
    for (let i = 0; i < sigBytes.length; i++) {
      diff |= sigBytes[i] ^ expectedBytes[i];
    }
    const valid = diff === 0;

    if (!valid) {
      console.warn(
        `[docuseal] webhook signature invalida. received=${signature.slice(0, 16)}... expected=${expectedSig.slice(0, 16)}...`,
      );
    }

    return valid;
  } catch (err) {
    console.error('[docuseal] erro ao validar webhook signature:', err);
    return false;
  }
}

// ========================================================
// resendSubmission — POST /api/submissions/:id/resend
// ========================================================

// Reenvia o email de assinatura para submitters que ainda nao assinaram.
// Util para o botao "Reenviar" na aba Contratos do Job Detail.
export async function resendSubmission(
  serviceClient: SupabaseClient,
  tenantId: string,
  submissionId: number,
): Promise<void> {
  const config = await getDocuSealConfig(serviceClient, tenantId);

  console.log(`[docuseal] reenviando email de assinatura para submission id=${submissionId}`);

  await docusealFetch(config, `/submissions/${submissionId}/resend`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  console.log(`[docuseal] reenvio solicitado com sucesso para submission id=${submissionId}`);
}

// ========================================================
// downloadSignedDocument — GET /api/submissions/:id/documents/:docId/download
// ========================================================

// Baixa o PDF assinado de um documento especifico de uma submission.
// Retorna ArrayBuffer para upload posterior no Google Drive.
// Deve ser chamado somente apos docuseal_status = 'signed'.
export async function downloadSignedDocument(
  serviceClient: SupabaseClient,
  tenantId: string,
  submissionId: number,
  documentId: number,
): Promise<ArrayBuffer> {
  const config = await getDocuSealConfig(serviceClient, tenantId);

  console.log(
    `[docuseal] baixando PDF assinado submission_id=${submissionId} document_id=${documentId}`,
  );

  const url = `${config.url}/api/submissions/${submissionId}/documents/${documentId}/download`;

  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: {
        // Download nao usa Content-Type: application/json
        'X-Auth-Token': config.token,
      },
      signal: AbortSignal.timeout(60000), // PDF pode ser grande: timeout maior
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[docuseal] network error ao baixar documento submission=${submissionId} doc=${documentId}: ${msg}`,
    );
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(
      `[docuseal] HTTP ${resp.status} ao baixar documento submission=${submissionId} doc=${documentId}: ${body.slice(0, 300)}`,
    );
  }

  const buffer = await resp.arrayBuffer();

  console.log(
    `[docuseal] PDF baixado com sucesso submission_id=${submissionId} document_id=${documentId} bytes=${buffer.byteLength}`,
  );

  return buffer;
}
