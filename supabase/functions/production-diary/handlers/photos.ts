import { z } from 'https://esm.sh/zod@3.22.4';
import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { created } from '../../_shared/response.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';

// Roles autorizados para adicionar fotos
const ALLOWED_ROLES = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'diretor_producao',
  'cco',
];

// Schema de validacao para adicionar foto
const AddPhotoSchema = z.object({
  url: z.string().url('URL da foto invalida'),
  thumbnail_url: z.string().url('URL do thumbnail invalida').nullable().optional(),
  caption: z.string().max(500).nullable().optional(),
  photo_type: z.enum(['referencia', 'bts', 'continuidade', 'problema']).default('bts'),
  taken_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function handlePhotos(req: Request, auth: AuthContext, entryId: string): Promise<Response> {
  console.log('[production-diary/photos] adicionando foto', {
    entryId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  // Validacao de role
  if (!ALLOWED_ROLES.includes(auth.role)) {
    throw new AppError(
      'FORBIDDEN',
      'Permissao insuficiente para adicionar fotos ao diario',
      403,
    );
  }

  // Parsear body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Body JSON invalido', 400);
  }

  const parseResult = AddPhotoSchema.safeParse(body);
  if (!parseResult.success) {
    throw new AppError('VALIDATION_ERROR', 'Dados invalidos', 400, {
      issues: parseResult.error.issues,
    });
  }

  const data = parseResult.data;
  const client = getSupabaseClient(auth.token);

  // Verificar que a entrada existe e pertence ao tenant
  const { data: entry, error: fetchError } = await client
    .from('production_diary_entries')
    .select('id, job_id')
    .eq('id', entryId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (fetchError || !entry) {
    throw new AppError('NOT_FOUND', 'Entrada do diario nao encontrada', 404);
  }

  // Inserir foto
  const insertData = {
    tenant_id: auth.tenantId,
    entry_id: entryId,
    url: data.url,
    thumbnail_url: data.thumbnail_url ?? null,
    caption: data.caption ?? null,
    photo_type: data.photo_type,
    taken_at: data.taken_at ?? null,
    uploaded_by: auth.userId,
  };

  const { data: createdPhoto, error: insertError } = await client
    .from('production_diary_photos')
    .insert(insertData)
    .select('*')
    .single();

  if (insertError) {
    console.error('[production-diary/photos] erro ao inserir foto:', insertError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao adicionar foto ao diario', 500, {
      detail: insertError.message,
    });
  }

  console.log('[production-diary/photos] foto adicionada com sucesso', { id: createdPhoto.id });
  return created(createdPhoto, req);
}
