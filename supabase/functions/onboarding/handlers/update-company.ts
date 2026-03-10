import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem atualizar dados da empresa
const ADMIN_ROLES = ['admin', 'ceo'];

// Validacao de CNPJ com digitos verificadores
function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcDigit = (slice: string, weights: number[]): number => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(slice[i]) * w, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits.slice(0, 12), w1);
  if (d1 !== parseInt(digits[12])) return false;

  const d2 = calcDigit(digits.slice(0, 13), w2);
  if (d2 !== parseInt(digits[13])) return false;

  return true;
}

// Schema do passo 1: informacoes da empresa
const UpdateCompanySchema = z.object({
  name: z.string().min(1, 'Nome da empresa e obrigatorio').max(100),
  cnpj: z.string().max(20)
    .refine((val) => !val || isValidCnpj(val), { message: 'CNPJ invalido' })
    .optional().nullable(),
  logo_url: z.string().url('URL do logo invalida')
    .refine((val) => {
      if (!val) return true;
      try {
        const url = new URL(val);
        // Exigir HTTPS e bloquear IPs privados / localhost
        if (url.protocol !== 'https:') return false;
        const host = url.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return false;
        if (host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) return false;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
        return true;
      } catch { return false; }
    }, { message: 'URL do logo deve usar HTTPS e nao pode apontar para enderecos internos' })
    .optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
});

/**
 * PATCH /onboarding/company
 * Passo 1 do wizard: salva dados da empresa (nome, CNPJ, logo, cidade, estado).
 * Avanca o indicador de passo para 2 dentro de settings.
 */
export async function handleUpdateCompany(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[onboarding/update-company] atualizando dados da empresa', {
    userId: auth.userId.substring(0, 8),
    tenantId: auth.tenantId.substring(0, 8),
  });

  // Verificar permissao
  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas administradores podem configurar o onboarding',
      403,
    );
  }

  // Parsear e validar body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateCompanySchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const { name, cnpj, logo_url, city, state } = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Ler settings atual para fazer merge sem perder chaves existentes
  const { data: current, error: fetchError } = await client
    .from('tenants')
    .select('settings')
    .eq('id', auth.tenantId)
    .single();

  if (fetchError) {
    console.error('[onboarding/update-company] erro ao buscar settings atual:', fetchError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar dados do tenant', 500, {
      detail: fetchError.message,
    });
  }

  const currentSettings = (current?.settings as Record<string, unknown>) ?? {};

  // Montar settings atualizado: preserva chaves existentes, adiciona/sobrescreve address e step
  const updatedSettings: Record<string, unknown> = {
    ...currentSettings,
    address: {
      ...((currentSettings.address as Record<string, unknown>) ?? {}),
      city: city ?? null,
      state: state ?? null,
    },
    onboarding_step: 2,
  };

  // Montar payload de colunas diretas do tenant
  const updatePayload: Record<string, unknown> = {
    name,
    settings: updatedSettings,
  };
  if (cnpj !== undefined) updatePayload.cnpj = cnpj;
  if (logo_url !== undefined) updatePayload.logo_url = logo_url;

  const { data: tenant, error: updateError } = await client
    .from('tenants')
    .update(updatePayload)
    .eq('id', auth.tenantId)
    .select('id, name, cnpj, logo_url, settings, onboarding_completed')
    .single();

  if (updateError) {
    console.error('[onboarding/update-company] erro ao atualizar tenant:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar dados da empresa', 500, {
      detail: updateError.message,
    });
  }

  console.log('[onboarding/update-company] dados da empresa atualizados');

  return success(tenant, 200, req);
}
