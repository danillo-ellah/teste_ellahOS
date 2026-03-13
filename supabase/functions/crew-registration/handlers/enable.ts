import { z } from 'https://esm.sh/zod@3.22.4'
import { getAuthContext } from '../../_shared/auth.ts'
import { getSupabaseClient } from '../../_shared/supabase-client.ts'
import { AppError } from '../../_shared/errors.ts'
import { success, error, fromAppError } from '../../_shared/response.ts'

// Schema de validacao para ativar/desativar o registro de equipe
const EnableSchema = z.object({
  job_id: z.string().uuid('job_id deve ser um UUID valido'),
  enabled: z.boolean(),
})

// POST /crew-registration/enable
// Ativa ou desativa o formulario publico de cadastro de equipe para um job.
// Requer autenticacao. Retorna o token e a URL publica para compartilhamento.
export async function handleEnable(req: Request): Promise<Response> {
  let auth
  try {
    auth = await getAuthContext(req)
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req)
    return error('UNAUTHORIZED', 'Autenticacao invalida', 401, undefined, req)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400, undefined, req)
  }

  const parsed = EnableSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    return error('VALIDATION_ERROR', issues[0].message, 400, { issues }, req)
  }

  const { job_id, enabled } = parsed.data
  const supabase = getSupabaseClient(auth.token)

  // Buscar job — RLS garante isolamento por tenant
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('id, crew_registration_token, crew_registration_enabled')
    .eq('id', job_id)
    .is('deleted_at', null)
    .single()

  if (fetchError || !job) {
    console.error('[crew-registration/enable] job nao encontrado:', fetchError?.message)
    return error('NOT_FOUND', 'Job nao encontrado', 404, undefined, req)
  }

  // Atualizar flag de habilitacao
  const { data: updated, error: updateError } = await supabase
    .from('jobs')
    .update({ crew_registration_enabled: enabled })
    .eq('id', job_id)
    .select('crew_registration_token, crew_registration_enabled')
    .single()

  if (updateError || !updated) {
    console.error('[crew-registration/enable] erro ao atualizar job:', updateError?.message)
    return error('INTERNAL_ERROR', 'Erro ao atualizar configuracao do job', 500, undefined, req)
  }

  const token = updated.crew_registration_token as string

  // Construir URL publica do formulario a partir do Origin ou variavel de ambiente
  const origin =
    req.headers.get('origin') ??
    req.headers.get('referer')?.replace(/\/$/, '') ??
    Deno.env.get('FRONTEND_URL') ??
    'https://teste-ellah-os.vercel.app'

  const publicUrl = `${origin}/crew-registration/${token}`

  console.log(
    `[crew-registration/enable] job=${job_id} enabled=${enabled} token=${token}`,
  )

  return success(
    {
      token,
      enabled: updated.crew_registration_enabled,
      url: publicUrl,
    },
    200,
    req,
  )
}
