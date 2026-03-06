import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

const ALLOWED_ROLES = [
  'atendimento',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'admin',
  'diretor_producao',
];

const CreateLogisticsSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  item_type: z.enum(
    ['passagem_aerea', 'hospedagem', 'transfer', 'alimentacao', 'outro'],
    { errorMap: () => ({ message: 'item_type invalido' }) },
  ),
  description: z.string().min(1, 'description e obrigatorio').max(2000),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  responsible_name: z.string().max(255).optional().nullable(),
  status: z.enum(['pendente', 'confirmado', 'cancelado']).default('pendente'),
  sent_to_client: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

export async function handleLogisticsCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/logistics-create] criando item de logistica', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar itens de logistica', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateLogisticsSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  const { data: created_item, error: insertError } = await client
    .from('client_logistics')
    .insert({
      tenant_id: auth.tenantId,
      job_id: data.job_id,
      item_type: data.item_type,
      description: data.description,
      scheduled_date: data.scheduled_date ?? null,
      responsible_name: data.responsible_name ?? null,
      status: data.status,
      sent_to_client: data.sent_to_client,
      notes: data.notes ?? null,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[attendance/logistics-create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar item de logistica', 500, {
      detail: insertError.message,
    });
  }

  console.log('[attendance/logistics-create] item criado', { id: created_item.id });
  return created(created_item, req);
}
