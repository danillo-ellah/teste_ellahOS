import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ITEM_TYPES = ['figurino', 'arte', 'cenografia', 'objeto_cena'] as const;
const STATUSES = ['planejado', 'comprado', 'alugado', 'emprestado', 'devolvido', 'descartado'] as const;

const CreateWardrobeItemSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  character_name: z.string().min(1, 'Nome do personagem e obrigatorio').max(500),
  scene_numbers: z.string().max(200).nullable().optional(),
  item_description: z.string().min(1, 'Descricao do item e obrigatoria').max(2000),
  item_type: z.enum(ITEM_TYPES, {
    errorMap: () => ({ message: 'Tipo invalido. Use: figurino, arte, cenografia ou objeto_cena' }),
  }),
  status: z.enum(STATUSES).optional().default('planejado'),
  cost: z.number().min(0, 'Custo nao pode ser negativo').nullable().optional(),
  cost_item_id: z.string().uuid().nullable().optional(),
  supplier: z.string().max(300).nullable().optional(),
  photo_url: z.string().url('photo_url deve ser URL valida').nullable().optional(),
  photo_storage_path: z.string().max(500).nullable().optional(),
  reference_url: z.string().url('reference_url deve ser URL valida').nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function handleCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[wardrobe/create] criando ficha', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateWardrobeItemSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que o job pertence ao tenant
  const { data: job } = await client
    .from('jobs')
    .select('id')
    .eq('id', data.job_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Verificar que cost_item_id pertence ao job (se fornecido)
  if (data.cost_item_id) {
    const { data: costItem } = await client
      .from('cost_items')
      .select('id')
      .eq('id', data.cost_item_id)
      .eq('job_id', data.job_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();

    if (!costItem) {
      throw new AppError('NOT_FOUND', 'Item de custo nao encontrado para este job', 404);
    }
  }

  const { data: createdItem, error: insertError } = await client
    .from('wardrobe_items')
    .insert({
      tenant_id: auth.tenantId,
      job_id: data.job_id,
      character_name: data.character_name,
      scene_numbers: data.scene_numbers ?? null,
      item_description: data.item_description,
      item_type: data.item_type,
      status: data.status,
      cost: data.cost ?? null,
      cost_item_id: data.cost_item_id ?? null,
      supplier: data.supplier ?? null,
      photo_url: data.photo_url ?? null,
      photo_storage_path: data.photo_storage_path ?? null,
      reference_url: data.reference_url ?? null,
      notes: data.notes ?? null,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[wardrobe/create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar ficha de figurino/arte', 500, {
      detail: insertError.message,
    });
  }

  console.log('[wardrobe/create] ficha criada com sucesso', { id: createdItem.id });
  return created(createdItem, req);
}
