import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { success } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ITEM_TYPES = ['figurino', 'arte', 'cenografia', 'objeto_cena'] as const;
const STATUSES = ['planejado', 'comprado', 'alugado', 'emprestado', 'devolvido', 'descartado'] as const;

const UpdateWardrobeItemSchema = z
  .object({
    character_name: z.string().min(1).max(500),
    scene_numbers: z.string().max(200).nullable(),
    item_description: z.string().min(1).max(2000),
    item_type: z.enum(ITEM_TYPES),
    status: z.enum(STATUSES),
    cost: z.number().min(0).nullable(),
    cost_item_id: z.string().uuid().nullable(),
    supplier: z.string().max(300).nullable(),
    photo_url: z.string().url().nullable(),
    photo_storage_path: z.string().max(500).nullable(),
    reference_url: z.string().url().nullable(),
    notes: z.string().max(5000).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export async function handleUpdate(req: Request, auth: AuthContext, id: string): Promise<Response> {
  console.log('[wardrobe/update] atualizando ficha', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    wardrobeItemId: id,
  });

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = UpdateWardrobeItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que o item existe e pertence ao tenant
  const { data: existing } = await client
    .from('wardrobe_items')
    .select('id, job_id')
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    throw new AppError('NOT_FOUND', 'Ficha de figurino/arte nao encontrada', 404);
  }

  // Verificar que cost_item_id pertence ao job (se fornecido)
  if (data.cost_item_id) {
    const { data: costItem } = await client
      .from('cost_items')
      .select('id')
      .eq('id', data.cost_item_id)
      .eq('job_id', existing.job_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();

    if (!costItem) {
      throw new AppError('NOT_FOUND', 'Item de custo nao encontrado para este job', 404);
    }
  }

  const { data: updatedItem, error: updateError } = await client
    .from('wardrobe_items')
    .update(data)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();

  if (updateError) {
    console.error('[wardrobe/update] erro ao atualizar:', updateError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar ficha de figurino/arte', 500, {
      detail: updateError.message,
    });
  }

  console.log('[wardrobe/update] ficha atualizada com sucesso', { id });
  return success(updatedItem, 200, req);
}
