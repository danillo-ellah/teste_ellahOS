import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';

// Comparacao timing-safe para evitar timing attacks em verificacao de secrets
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < aBuf.byteLength; i++) {
    diff |= aBuf[i] ^ bBuf[i];
  }
  return diff === 0;
}

// POST /drive-integration/:jobId/sync-urls
// Callback do n8n para atualizar URLs das pastas Drive
// Autenticacao: X-Webhook-Secret obrigatorio (fail-closed — sem secret configurado, rejeita tudo)
export async function syncUrls(
  req: Request,
  jobId: string,
): Promise<Response> {
  // Verificar autenticacao via X-Webhook-Secret antes de qualquer operacao
  const expectedSecret = Deno.env.get('DRIVE_SYNC_WEBHOOK_SECRET');
  if (!expectedSecret) {
    console.error('[sync-urls] DRIVE_SYNC_WEBHOOK_SECRET nao configurado — rejeitando request');
    return error('CONFIG_ERROR', 'Webhook secret nao configurado', 503);
  }

  const providedSecret = req.headers.get('X-Webhook-Secret');
  if (!providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    console.warn(`[sync-urls] Tentativa com secret invalido — jobId=${jobId} ip=${req.headers.get('x-forwarded-for') ?? 'desconhecido'}`);
    return error('UNAUTHORIZED', 'Secret invalido ou ausente', 401);
  }

  const serviceClient = getServiceClient();

  // Validar metodo
  if (req.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Apenas POST', 405);
  }

  // Parse body
  let body: {
    folders?: Array<{
      folder_key: string;
      google_drive_id: string;
      url?: string;
    }>;
    drive_folder_url?: string;
  };

  try {
    body = await req.json();
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  if (!body.folders || !Array.isArray(body.folders)) {
    return error('VALIDATION_ERROR', 'Campo "folders" (array) obrigatorio', 400);
  }

  // Buscar tenant_id do job
  const { data: job } = await serviceClient
    .from('jobs')
    .select('tenant_id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (!job) {
    return error('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Upsert cada pasta
  let updated = 0;
  const errors: string[] = [];

  for (const folder of body.folders) {
    if (!folder.folder_key || !folder.google_drive_id) {
      errors.push(`Pasta invalida: folder_key e google_drive_id obrigatorios`);
      continue;
    }

    const folderUrl = folder.url || `https://drive.google.com/drive/folders/${folder.google_drive_id}`;

    const { error: upsertError } = await serviceClient
      .from('drive_folders')
      .upsert(
        {
          tenant_id: job.tenant_id,
          job_id: jobId,
          folder_key: folder.folder_key,
          google_drive_id: folder.google_drive_id,
          url: folderUrl,
        },
        { onConflict: 'tenant_id,job_id,folder_key' },
      );

    if (upsertError) {
      errors.push(`${folder.folder_key}: ${upsertError.message}`);
    } else {
      updated++;
    }
  }

  // Atualizar drive_folder_url do job se fornecido
  if (body.drive_folder_url) {
    await serviceClient
      .from('jobs')
      .update({ drive_folder_url: body.drive_folder_url })
      .eq('id', jobId);
  }

  return success({
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
