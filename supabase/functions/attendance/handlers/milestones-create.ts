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

const CreateMilestoneSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  description: z.string().min(1, 'description e obrigatorio').max(1000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'due_date deve ser YYYY-MM-DD'),
  responsible_name: z.string().max(255).optional().nullable(),
  status: z.enum(['pendente', 'concluido', 'atrasado', 'cancelado']).default('pendente'),
  notes: z.string().max(2000).optional().nullable(),
});

export async function handleMilestonesCreate(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[attendance/milestones-create] criando marco', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar marcos', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateMilestoneSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  const { data: created_item, error: insertError } = await client
    .from('client_milestones')
    .insert({
      tenant_id: auth.tenantId,
      job_id: data.job_id,
      description: data.description,
      due_date: data.due_date,
      responsible_name: data.responsible_name ?? null,
      status: data.status,
      notes: data.notes ?? null,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[attendance/milestones-create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar marco', 500, {
      detail: insertError.message,
    });
  }

  console.log('[attendance/milestones-create] marco criado', { id: created_item.id });
  return created(created_item, req);
}
