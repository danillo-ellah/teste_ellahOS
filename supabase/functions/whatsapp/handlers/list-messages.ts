import type { AuthContext } from '../../_shared/auth.ts';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { parsePagination, getOffset, buildMeta } from '../../_shared/pagination.ts';
import { paginated } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// GET /whatsapp/:jobId/messages
// Lista mensagens WhatsApp enviadas para um job (paginado)
export async function listMessages(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  const supabase = getSupabaseClient(auth.token);
  const url = new URL(req.url);
  const params = parsePagination(url);
  const offset = getOffset(params);

  // Validar que o job existe e pertence ao tenant (RLS cuida)
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single();

  if (!job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Contar total
  const { count } = await supabase
    .from('whatsapp_messages')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId);

  const total = count ?? 0;

  // Buscar mensagens paginadas
  const { data: messages, error: queryError } = await supabase
    .from('whatsapp_messages')
    .select('id, job_id, phone, recipient_name, message, status, provider, external_message_id, sent_at, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .range(offset, offset + params.perPage - 1);

  if (queryError) {
    console.error('[list-messages] erro:', queryError.message);
    throw new AppError('INTERNAL_ERROR', 'Erro ao buscar mensagens', 500);
  }

  return paginated(messages || [], buildMeta(total, params));
}
