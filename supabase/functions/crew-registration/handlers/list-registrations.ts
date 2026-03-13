import { getAuthContext } from '../../_shared/auth.ts'
import { getSupabaseClient } from '../../_shared/supabase-client.ts'
import { AppError } from '../../_shared/errors.ts'
import { success, error, fromAppError } from '../../_shared/response.ts'

// GET /crew-registration/registrations/:jobId
// Rota autenticada — lista todos os registros de equipe de um job.
// RLS garante isolamento por tenant automaticamente.
export async function handleListRegistrations(
  req: Request,
  jobId: string,
): Promise<Response> {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_REGEX.test(jobId)) {
    return error('VALIDATION_ERROR', 'jobId deve ser um UUID valido', 400, undefined, req)
  }

  let auth
  try {
    auth = await getAuthContext(req)
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req)
    return error('UNAUTHORIZED', 'Autenticacao invalida', 401, undefined, req)
  }

  const supabase = getSupabaseClient(auth.token)

  // Verificar que o job existe e pertence ao tenant do usuario
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .is('deleted_at', null)
    .single()

  if (jobError || !job) {
    return error('NOT_FOUND', 'Job nao encontrado', 404, undefined, req)
  }

  // Listar registros — RLS garante tenant isolation
  const { data: registrations, error: listError } = await supabase
    .from('job_crew_registrations')
    .select(
      'id, full_name, email, job_role, num_days, daily_rate, is_veteran, vendor_id, notes, created_at',
    )
    .eq('job_id', jobId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (listError) {
    console.error('[crew-registration/list-registrations] erro ao listar:', listError.message)
    return error('INTERNAL_ERROR', 'Erro ao buscar registros', 500, undefined, req)
  }

  // Calcular total por registro e total geral
  const items = (registrations ?? []).map((r) => ({
    ...r,
    total: Number(r.num_days) * Number(r.daily_rate),
  }))

  const grandTotal = items.reduce((sum, r) => sum + r.total, 0)

  return success(
    {
      registrations: items,
      summary: {
        count: items.length,
        grand_total: grandTotal,
      },
    },
    200,
    req,
  )
}
