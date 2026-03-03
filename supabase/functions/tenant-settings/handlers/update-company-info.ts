import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Schema de validacao dos dados da empresa
const companyInfoSchema = z.object({
  legal_name: z.string().max(300).optional(),
  trade_name: z.string().max(300).optional(),
  cnpj: z.string().max(20).optional(),
  state_registration: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).optional(),
  zip_code: z.string().max(10).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().max(200).optional(),
  ancine_registration: z.string().max(50).optional(),
  default_audio_company: z.string().max(300).optional(),
  bank_name: z.string().max(100).optional(),
  bank_agency: z.string().max(20).optional(),
  bank_account: z.string().max(30).optional(),
  bank_pix: z.string().max(100).optional(),
});

// PATCH /tenant-settings/company
// Atualiza dados da empresa em tenants.settings.company_info
export async function updateCompanyInfo(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parsed = companyInfoSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parsed.error.issues,
    });
  }

  const input = parsed.data;

  // Usar service client para bypass RLS (atualizar settings JSONB)
  const serviceClient = getServiceClient();

  // Buscar settings atuais
  const { data: tenant, error: fetchError } = await serviceClient
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError || !tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  const currentSettings = (tenant.settings as Record<string, unknown>) || {};
  const currentCompanyInfo = (currentSettings.company_info as Record<string, unknown>) || {};

  // Merge dados existentes com novos (apenas campos enviados sao atualizados)
  const updatedCompanyInfo = { ...currentCompanyInfo, ...input };
  const updatedSettings = { ...currentSettings, company_info: updatedCompanyInfo };

  // Atualizar settings + sincronizar cnpj top-level
  const updatePayload: Record<string, unknown> = {
    settings: updatedSettings,
  };

  // Sincronizar cnpj top-level (usado por claquete e outros modulos)
  if (input.cnpj !== undefined) {
    updatePayload.cnpj = input.cnpj || null;
  }

  // Sincronizar name top-level se legal_name foi informado
  if (input.legal_name !== undefined) {
    updatePayload.name = input.legal_name || null;
  }

  const { error: updateError } = await serviceClient
    .from('tenants')
    .update(updatePayload)
    .eq('id', auth.tenantId);

  if (updateError) {
    console.error('[tenant-settings] update company_info error:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Falha ao salvar dados da empresa', 500);
  }

  console.log(
    `[tenant-settings] company_info atualizado por user=${auth.userId} tenant=${auth.tenantId}`,
  );

  return success(updatedCompanyInfo, 200, req);
}
