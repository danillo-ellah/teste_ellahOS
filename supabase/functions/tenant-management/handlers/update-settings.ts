import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles que podem atualizar configuracoes
const ADMIN_ROLES = ['admin', 'ceo'];

const UpdateSettingsSchema = z
  .object({
    company_name: z.string().min(1, 'Nome da empresa nao pode ser vazio').max(200).optional(),
    cnpj: z.string().max(20).optional().nullable(),
    logo_url: z.string().url('URL do logo invalida').optional().nullable(),
    brand_color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato hex (#rrggbb)')
      .optional(),
    onboarding_completed: z.boolean().optional(),
    // Dados adicionais da empresa (armazenados em settings.company)
    company_phone: z.string().max(30).optional().nullable(),
    company_email: z.string().email('Email invalido').max(200).optional().nullable(),
    company_address: z.string().max(500).optional().nullable(),
    company_city: z.string().max(100).optional().nullable(),
    company_state: z.string().max(2).optional().nullable(),
    company_zip: z.string().max(10).optional().nullable(),
    company_ie: z.string().max(30).optional().nullable(),
    company_im: z.string().max(30).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Pelo menos um campo e obrigatorio',
  });

/**
 * PATCH /tenant-management/settings
 * Atualiza o branding e configuracoes do tenant.
 * Apenas admin/ceo podem alterar.
 */
export async function handleUpdateSettings(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[tenant-management/update-settings] atualizando configuracoes', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  if (!ADMIN_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Apenas administradores podem alterar configuracoes do tenant',
      403,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateSettingsSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Montar payload com apenas os campos presentes no body
  const updatePayload: Record<string, unknown> = {};
  if (data.company_name !== undefined) updatePayload.company_name = data.company_name;
  if (data.cnpj !== undefined) updatePayload.cnpj = data.cnpj;
  if (data.logo_url !== undefined) updatePayload.logo_url = data.logo_url;
  if (data.brand_color !== undefined) updatePayload.brand_color = data.brand_color;
  if (data.onboarding_completed !== undefined) {
    updatePayload.onboarding_completed = data.onboarding_completed;
  }

  // Campos extras da empresa → settings.company (JSONB merge)
  const companyFields = ['company_phone', 'company_email', 'company_address', 'company_city', 'company_state', 'company_zip', 'company_ie', 'company_im'] as const;
  const hasCompanyFields = companyFields.some((f) => data[f] !== undefined);
  if (hasCompanyFields) {
    // Buscar settings atual para merge
    const { data: current } = await client
      .from('tenants')
      .select('settings')
      .eq('id', auth.tenantId)
      .single();

    const currentSettings = (current?.settings as Record<string, unknown>) ?? {};
    const currentCompany = (currentSettings.company as Record<string, unknown>) ?? {};

    const updatedCompany: Record<string, unknown> = { ...currentCompany };
    for (const field of companyFields) {
      if (data[field] !== undefined) {
        const key = field.replace('company_', '');
        updatedCompany[key] = data[field];
      }
    }

    updatePayload.settings = { ...currentSettings, company: updatedCompany };
  }

  const { data: updated, error: updateError } = await client
    .from('tenants')
    .update(updatePayload)
    .eq('id', auth.tenantId)
    .select(
      `
      id,
      name,
      slug,
      logo_url,
      brand_color,
      company_name,
      onboarding_completed,
      settings
    `,
    )
    .single();

  if (updateError) {
    console.error(
      '[tenant-management/update-settings] erro ao atualizar:',
      updateError.message,
    );
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar configuracoes', 500, {
      detail: updateError.message,
    });
  }

  console.log('[tenant-management/update-settings] configuracoes atualizadas', {
    tenantId: auth.tenantId,
    fields: Object.keys(updatePayload),
  });

  return success(updated, 200, req);
}
