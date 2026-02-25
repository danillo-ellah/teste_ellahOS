import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { buildDriveStructure } from '../../_shared/google-drive-client.ts';
import { handleCopyTemplates } from './copy-templates.ts';

// POST /drive-integration/:jobId/create-structure
// Trigger manual para criacao de pastas Drive (admin/ceo only)
// Util para criar pastas sem precisar re-aprovar o job.
//
// Comportamento auto_copy_templates:
//   Se tenant.settings.integrations.google_drive.auto_copy_templates === true
//   e houver templates configurados, aciona copy-templates automaticamente
//   ao final da criacao da estrutura. Falha no copy nao interrompe a resposta.
export async function createStructure(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const serviceClient = getServiceClient();

  const result = await buildDriveStructure({
    serviceClient,
    jobId,
    tenantId: auth.tenantId,
  });

  // Verificar se auto_copy_templates esta habilitado
  let templatesCopied = 0;
  const templateWarnings: string[] = [];

  try {
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('settings')
      .eq('id', auth.tenantId)
      .single();

    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const integrations = (settings.integrations as Record<string, Record<string, unknown>>) || {};
    const driveConfig = integrations['google_drive'] || {};
    const autoCopy = driveConfig.auto_copy_templates === true;
    const hasTemplates = Array.isArray(driveConfig.templates) && (driveConfig.templates as unknown[]).length > 0;

    if (autoCopy && hasTemplates) {
      console.log(`[create-structure] auto_copy_templates habilitado — iniciando copia para job ${jobId}`);

      // Criar um Request sintetico sem body para reutilizar o handler copy-templates
      // (o handler le o body mas aceita body vazio, copiando todos os templates)
      const syntheticReq = new Request(req.url, { method: 'POST' });
      const copyResp = await handleCopyTemplates(syntheticReq, auth, jobId);

      if (copyResp.ok) {
        const copyBody = await copyResp.json();
        templatesCopied = copyBody?.data?.files_copied ?? 0;
        const copyErrors: string[] = copyBody?.data?.errors ?? [];
        templateWarnings.push(...copyErrors);
      } else {
        const errBody = await copyResp.json();
        const errMsg = errBody?.error?.message || 'Erro desconhecido ao copiar templates';
        console.warn(`[create-structure] auto_copy_templates falhou: ${errMsg}`);
        templateWarnings.push(`auto_copy_templates: ${errMsg}`);
      }
    }
  } catch (autoErr) {
    // Falha no auto-copy nao deve bloquear a resposta de create-structure
    const msg = autoErr instanceof Error ? autoErr.message : String(autoErr);
    console.warn(`[create-structure] auto_copy_templates excecao: ${msg}`);
    templateWarnings.push(`auto_copy_templates: ${msg}`);
  }

  return success({
    folders_created: result.foldersCreated,
    root_url: result.rootUrl,
    templates_copied: templatesCopied,
    warnings: [...result.errors, ...templateWarnings],
  });
}
