import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// Campos default quando company_info nao existe ainda
const DEFAULT_COMPANY_INFO = {
  legal_name: '',
  trade_name: '',
  cnpj: '',
  state_registration: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  ancine_registration: '',
  default_audio_company: '',
  bank_name: '',
  bank_agency: '',
  bank_account: '',
  bank_pix: '',
};

// GET /tenant-settings/company
// Retorna dados da empresa do tenant (company_info + logo_url + cnpj)
export async function getCompanyInfo(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  const client = getSupabaseClient(auth.token);

  const { data: tenant, error: fetchError } = await client
    .from('tenants')
    .select('settings, logo_url, cnpj, name')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError || !tenant) {
    throw new AppError('NOT_FOUND', 'Tenant nao encontrado', 404);
  }

  const settings = (tenant.settings as Record<string, unknown>) || {};
  const saved = (settings.company_info as Record<string, unknown>) || {};

  // Merge defaults com dados salvos + campos top-level
  const companyInfo = {
    ...DEFAULT_COMPANY_INFO,
    ...saved,
    // Campos top-level do tenant tem prioridade se company_info estiver vazio
    cnpj: (saved.cnpj as string) || (tenant.cnpj as string) || '',
    legal_name: (saved.legal_name as string) || (tenant.name as string) || '',
    logo_url: (tenant.logo_url as string) || null,
  };

  return success(companyInfo, 200, req);
}
