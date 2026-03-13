import { z } from 'https://esm.sh/zod@3.22.4'
import { getServiceClient } from '../../_shared/supabase-client.ts'
import { success, error } from '../../_shared/response.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const LookupSchema = z.object({
  email: z.string().email('E-mail invalido').max(300),
})

// POST /crew-registration/public/:token/lookup
// Rota publica (sem auth) — detecta se o email pertence a um vendor veterano
// e se o freelancer ja se registrou neste job.
export async function handlePublicLookup(
  req: Request,
  token: string,
): Promise<Response> {
  if (!UUID_REGEX.test(token)) {
    return error('NOT_FOUND', 'Link invalido', 404)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return error('VALIDATION_ERROR', 'Body JSON invalido', 400)
  }

  const parsed = LookupSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    return error('VALIDATION_ERROR', issues[0].message, 400, { issues })
  }

  const { email } = parsed.data
  const emailLower = email.toLowerCase().trim()

  const serviceClient = getServiceClient()

  // Buscar job pelo token — valida que existe e esta ativo
  const { data: job, error: jobError } = await serviceClient
    .from('jobs')
    .select('id, tenant_id, crew_registration_enabled')
    .eq('crew_registration_token', token)
    .is('deleted_at', null)
    .single()

  if (jobError || !job) {
    return error('NOT_FOUND', 'Link de cadastro invalido ou inexistente', 404)
  }

  if (!job.crew_registration_enabled) {
    return error('NOT_FOUND', 'Este formulario de cadastro nao esta ativo', 404)
  }

  // Verificar se ja existe registro para esse email neste job
  const { data: existingReg } = await serviceClient
    .from('job_crew_registrations')
    .select('id')
    .eq('job_id', job.id)
    .is('deleted_at', null)
    // Comparacao case-insensitive via ilike
    .ilike('email', emailLower)
    .maybeSingle()

  if (existingReg) {
    return success({
      already_registered: true,
      is_veteran: false,
    })
  }

  // Buscar vendor pelo email (case-insensitive) dentro do mesmo tenant
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('id, full_name, email')
    .eq('tenant_id', job.tenant_id)
    .ilike('email', emailLower)
    .is('deleted_at', null)
    .maybeSingle()

  if (vendor) {
    console.log(
      `[crew-registration/public-lookup] veterano detectado: vendor=${vendor.id} job=${job.id}`,
    )
    return success({
      already_registered: false,
      is_veteran: true,
      full_name: vendor.full_name,
      vendor_id: vendor.id,
    })
  }

  return success({
    already_registered: false,
    is_veteran: false,
  })
}
