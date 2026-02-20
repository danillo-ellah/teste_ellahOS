import { getServiceClient } from '../../_shared/supabase-client.ts';
import { success, error } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';

// GET /approvals/public/:token — busca dados da aprovacao sem auth (publico)
export async function getByToken(
  _req: Request,
  token: string,
): Promise<Response> {
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return error('NOT_FOUND', 'Token invalido', 404);
  }

  // Usar service client para bypass RLS
  const serviceClient = getServiceClient();

  const { data: approval, error: fetchError } = await serviceClient
    .from('approval_requests')
    .select('id, approval_type, title, description, file_url, status, expires_at, jobs(title)')
    .eq('token', token)
    .is('deleted_at', null)
    .single();

  if (fetchError || !approval) {
    return error('NOT_FOUND', 'Solicitacao de aprovacao nao encontrada', 404);
  }

  // Verificar se expirou
  if (new Date(approval.expires_at) < new Date()) {
    return success({
      id: approval.id,
      status: 'expired',
      message: 'Este link de aprovacao expirou. Entre em contato com a producao para solicitar um novo link.',
    });
  }

  // Verificar se ja foi respondido
  if (approval.status !== 'pending') {
    return success({
      id: approval.id,
      status: approval.status,
      message: approval.status === 'approved'
        ? 'Esta aprovacao ja foi aprovada.'
        : approval.status === 'rejected'
          ? 'Esta aprovacao ja foi rejeitada.'
          : 'Esta aprovacao nao esta mais disponivel.',
    });
  }

  // Retornar dados seguros (sem dados sensiveis do tenant)
  return success({
    id: approval.id,
    approval_type: approval.approval_type,
    title: approval.title,
    description: approval.description,
    file_url: approval.file_url,
    status: approval.status,
    expires_at: approval.expires_at,
    job_title: (approval as any).jobs?.title ?? '',
  });
}
