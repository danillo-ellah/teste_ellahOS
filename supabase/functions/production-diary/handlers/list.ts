import type { AuthContext } from '../../_shared/auth.ts';
import { AppError } from '../../_shared/errors.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';

export async function handleList(req: Request, auth: AuthContext): Promise<Response> {
  console.log('[production-diary/list] listando entries', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const url = new URL(req.url);
  const jobId = url.searchParams.get('job_id');

  if (!jobId) {
    throw new AppError('VALIDATION_ERROR', 'job_id e obrigatorio', 400);
  }

  const client = getSupabaseClient(auth.token);

  // Buscar entries com fotos via join
  const { data: entries, error: listError } = await client
    .from('production_diary_entries')
    .select(`
      *,
      production_diary_photos(
        id,
        url,
        thumbnail_url,
        caption,
        photo_type,
        taken_at,
        created_at
      )
    `)
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .order('shooting_date', { ascending: false })
    .order('day_number', { ascending: false });

  if (listError) {
    console.error('[production-diary/list] erro na query:', listError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao listar entradas do diario', 500, {
      detail: listError.message,
    });
  }

  return new Response(
    JSON.stringify({ data: entries ?? [] }),
    {
      status: 200,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    },
  );
}
