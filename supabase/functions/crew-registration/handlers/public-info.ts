import { getServiceClient } from '../../_shared/supabase-client.ts'
import { success, error } from '../../_shared/response.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /crew-registration/public/:token
// Rota publica (sem auth) — retorna dados minimos do job para exibir no formulario.
// Usa service_role para bypass RLS, pois o freelancer nao tem sessao.
export async function handlePublicInfo(
  _req: Request,
  token: string,
): Promise<Response> {
  if (!UUID_REGEX.test(token)) {
    return error('NOT_FOUND', 'Link invalido', 404)
  }

  const serviceClient = getServiceClient()

  const { data: job, error: fetchError } = await serviceClient
    .from('jobs')
    .select(`
      id,
      title,
      code,
      crew_registration_enabled,
      tenants (
        id,
        name
      )
    `)
    .eq('crew_registration_token', token)
    .is('deleted_at', null)
    .single()

  if (fetchError || !job) {
    console.warn('[crew-registration/public-info] token nao encontrado:', token)
    return error('NOT_FOUND', 'Link de cadastro invalido ou inexistente', 404)
  }

  if (!job.crew_registration_enabled) {
    return error('NOT_FOUND', 'Este formulario de cadastro nao esta ativo', 404)
  }

  const tenant = job.tenants as Record<string, unknown> | null

  return success({
    job_title: job.title,
    job_code: job.code,
    tenant_name: tenant?.name ?? null,
  })
}
