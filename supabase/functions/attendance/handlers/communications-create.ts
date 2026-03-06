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

const CreateCommunicationSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'entry_date deve ser YYYY-MM-DD'),
  entry_type: z.enum(
    ['decisao', 'alteracao', 'informacao', 'aprovacao', 'satisfacao_automatica', 'registro_set', 'outro'],
    { errorMap: () => ({ message: 'entry_type invalido' }) },
  ),
  channel: z.enum(
    ['whatsapp', 'email', 'reuniao', 'telefone', 'presencial', 'sistema'],
    { errorMap: () => ({ message: 'channel invalido' }) },
  ),
  description: z.string().min(1, 'description e obrigatorio').max(5000),
  shared_with_team: z.boolean().default(false),
  team_note: z.string().max(2000).optional().nullable(),
});

export async function handleCommunicationsCreate(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[attendance/communications-create] criando comunicacao', {
    userId: auth.userId,
    tenantId: auth.tenantId,
    role: auth.role,
  });

  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError('FORBIDDEN', 'Permissao insuficiente para criar comunicacoes', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = CreateCommunicationSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  const { data: created_item, error: insertError } = await client
    .from('client_communications')
    .insert({
      tenant_id: auth.tenantId,
      job_id: data.job_id,
      entry_date: data.entry_date,
      entry_type: data.entry_type,
      channel: data.channel,
      description: data.description,
      shared_with_team: data.shared_with_team,
      team_note: data.team_note ?? null,
      created_by: auth.userId,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('[attendance/communications-create] erro ao inserir:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar comunicacao', 500, {
      detail: insertError.message,
    });
  }

  console.log('[attendance/communications-create] comunicacao criada', { id: created_item.id });
  return created(created_item, req);
}
