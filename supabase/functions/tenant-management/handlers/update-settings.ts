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
    logo_url: z.string().url('URL do logo invalida').optional().nullable(),
    brand_color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Cor deve estar no formato hex (#rrggbb)')
      .optional(),
    onboarding_completed: z.boolean().optional(),
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
  if (data.logo_url !== undefined) updatePayload.logo_url = data.logo_url;
  if (data.brand_color !== undefined) updatePayload.brand_color = data.brand_color;
  if (data.onboarding_completed !== undefined) {
    updatePayload.onboarding_completed = data.onboarding_completed;
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
