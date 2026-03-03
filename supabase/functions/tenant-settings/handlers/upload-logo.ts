import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Extensao do arquivo baseada no content type
function getExtension(contentType: string): string {
  switch (contentType) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/webp': return 'webp';
    default: return 'png';
  }
}

// POST /tenant-settings/logo
// Upload do logo da empresa para Storage bucket 'logos'
export async function uploadLogo(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  // Parsear FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Envie o arquivo como FormData', 400);
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    throw new AppError('VALIDATION_ERROR', 'Campo "file" obrigatorio', 400);
  }

  // Validar tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new AppError('VALIDATION_ERROR', 'Tipo de arquivo invalido. Use PNG, JPG ou WebP', 400);
  }

  // Validar tamanho
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError('VALIDATION_ERROR', 'Arquivo excede o limite de 2MB', 400);
  }

  const ext = getExtension(file.type);
  const filePath = `${auth.tenantId}/logo.${ext}`;

  const serviceClient = getServiceClient();

  // Upload para Storage (upsert para sobrescrever logo anterior)
  const fileBuffer = await file.arrayBuffer();
  const { error: uploadError } = await serviceClient.storage
    .from('logos')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('[tenant-settings] logo upload error:', uploadError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao fazer upload do logo', 500);
  }

  // Gerar URL publica
  const { data: publicUrl } = serviceClient.storage
    .from('logos')
    .getPublicUrl(filePath);

  const logoUrl = publicUrl.publicUrl;

  // Atualizar logo_url no tenant
  const { error: updateError } = await serviceClient
    .from('tenants')
    .update({ logo_url: logoUrl })
    .eq('id', auth.tenantId);

  if (updateError) {
    console.error('[tenant-settings] update logo_url error:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao atualizar URL do logo', 500);
  }

  console.log(
    `[tenant-settings] logo atualizado por user=${auth.userId} tenant=${auth.tenantId} url=${logoUrl}`,
  );

  return success({ logo_url: logoUrl }, 200, req);
}
