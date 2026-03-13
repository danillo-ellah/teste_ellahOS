import { z } from 'https://esm.sh/zod@3.22.4'
import { getServiceClient } from '../../_shared/supabase-client.ts'
import { AppError } from '../../_shared/errors.ts'
import { success, error, fromAppError } from '../../_shared/response.ts'
import { JOB_ROLES } from './job-roles.ts'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Campos comuns para veterano e novo freelancer
const BaseSubmitSchema = z.object({
  email:      z.string().email('E-mail invalido').max(300),
  job_role:   z.enum(JOB_ROLES, { errorMap: () => ({ message: 'Funcao invalida' }) }),
  num_days:   z.number().int().positive('Numero de diarias deve ser positivo'),
  daily_rate: z.number().positive('Cache por diaria deve ser positivo'),
  notes:      z.string().max(2000).optional().nullable(),
})

// Schema para veterano: vendor_id obrigatorio, full_name opcional (ja temos no vendor)
const VeteranSubmitSchema = BaseSubmitSchema.extend({
  vendor_id:  z.string().uuid('vendor_id deve ser um UUID valido'),
  full_name:  z.string().min(2).max(300).optional(),
  // Campos opcionais para atualizacao do vendor veterano
  phone:              z.string().max(30).optional().nullable(),
  zip_code:           z.string().max(10).optional().nullable(),
  address_street:     z.string().max(300).optional().nullable(),
  address_number:     z.string().max(30).optional().nullable(),
  address_complement: z.string().max(100).optional().nullable(),
  address_district:   z.string().max(200).optional().nullable(),
  address_city:       z.string().max(200).optional().nullable(),
  address_state:      z.string().length(2).optional().nullable(),
})

// Schema para novo freelancer: full_name obrigatorio + dados cadastrais
const NewVendorSubmitSchema = BaseSubmitSchema.extend({
  full_name:          z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(300),
  entity_type:        z.enum(['pf', 'pj']).optional().default('pf'),
  cpf:                z.string().max(14).optional().nullable(),
  cnpj:               z.string().max(18).optional().nullable(),
  rg:                 z.string().max(30).optional().nullable(),
  birth_date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data invalida (YYYY-MM-DD)').optional().nullable(),
  drt:                z.string().max(50).optional().nullable(),
  ctps:               z.string().max(50).optional().nullable(),
  phone:              z.string().max(30).optional().nullable(),
  zip_code:           z.string().max(10).optional().nullable(),
  address_street:     z.string().max(300).optional().nullable(),
  address_number:     z.string().max(30).optional().nullable(),
  address_complement: z.string().max(100).optional().nullable(),
  address_district:   z.string().max(200).optional().nullable(),
  address_city:       z.string().max(200).optional().nullable(),
  address_state:      z.string().length(2).optional().nullable(),
  // Dados bancarios — obrigatorios para novo freelancer (ao menos PIX)
  bank_name:          z.string().max(200).optional().nullable(),
  agency:             z.string().max(20).optional().nullable(),
  account_number:     z.string().max(30).optional().nullable(),
  account_type:       z.enum(['corrente', 'poupanca']).optional().nullable(),
  pix_key_type:       z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']),
  pix_key:            z.string().min(1, 'Chave PIX e obrigatoria').max(100),
})

// POST /crew-registration/public/:token/submit
// Rota publica (sem auth) — freelancer envia o formulario de cadastro.
// Usa service_role para bypass RLS.
export async function handlePublicSubmit(
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

  const serviceClient = getServiceClient()

  // ----------------------------------------------------------------
  // 1. Buscar e validar job pelo token
  // ----------------------------------------------------------------
  const { data: job, error: jobError } = await serviceClient
    .from('jobs')
    .select('id, tenant_id, title, code, crew_registration_enabled')
    .eq('crew_registration_token', token)
    .is('deleted_at', null)
    .single()

  if (jobError || !job) {
    return error('NOT_FOUND', 'Link de cadastro invalido ou inexistente', 404)
  }

  if (!job.crew_registration_enabled) {
    return error('NOT_FOUND', 'Este formulario de cadastro nao esta ativo', 404)
  }

  // ----------------------------------------------------------------
  // 2. Determinar se e veterano ou novo e validar schema adequado
  // ----------------------------------------------------------------
  const rawBody = body as Record<string, unknown>
  const isVeteran = typeof rawBody.vendor_id === 'string' && rawBody.vendor_id.length > 0

  try {
    if (isVeteran) {
      return await processVeteran(req, job, rawBody, serviceClient)
    } else {
      return await processNewVendor(req, job, rawBody, serviceClient)
    }
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err)
    console.error('[crew-registration/public-submit] erro nao tratado:', err)
    return error('INTERNAL_ERROR', 'Erro interno ao processar cadastro', 500)
  }
}

// ----------------------------------------------------------------
// Fluxo: freelancer veterano (ja cadastrado como vendor)
// ----------------------------------------------------------------
async function processVeteran(
  _req: Request,
  job: { id: string; tenant_id: string; title: string; code: string },
  rawBody: Record<string, unknown>,
  serviceClient: ReturnType<typeof getServiceClient>,
): Promise<Response> {
  const parsed = VeteranSubmitSchema.safeParse(rawBody)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    const fieldNames: Record<string, string> = {
      job_role: 'Funcao', full_name: 'Nome', email: 'E-mail',
      num_days: 'Diarias', daily_rate: 'Cache',
    }
    const summary = issues.map(i => fieldNames[i.field] || i.field).filter(Boolean).join(', ')
    const msg = issues.length === 1
      ? `Campo invalido: ${summary} — ${issues[0].message}`
      : `Campos invalidos: ${summary}`
    return error('VALIDATION_ERROR', msg, 400, { issues })
  }

  const data = parsed.data
  const emailLower = data.email.toLowerCase().trim()

  // Verificar duplicidade de email neste job
  const { data: existing } = await serviceClient
    .from('job_crew_registrations')
    .select('id')
    .eq('job_id', job.id)
    .ilike('email', emailLower)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return error('CONFLICT', 'Este e-mail ja foi cadastrado para este job', 409)
  }

  // Confirmar que o vendor existe e pertence ao tenant
  const { data: vendor, error: vendorError } = await serviceClient
    .from('vendors')
    .select('id, full_name, email')
    .eq('id', data.vendor_id)
    .eq('tenant_id', job.tenant_id)
    .is('deleted_at', null)
    .single()

  if (vendorError || !vendor) {
    return error('NOT_FOUND', 'Fornecedor nao encontrado', 404)
  }

  // Atualizar dados de contato do vendor se o freelancer enviou campos novos
  const vendorUpdate: Record<string, unknown> = {}
  if (data.phone !== undefined)              vendorUpdate.phone              = data.phone
  if (data.zip_code !== undefined)           vendorUpdate.zip_code           = data.zip_code
  if (data.address_street !== undefined)     vendorUpdate.address_street     = data.address_street
  if (data.address_number !== undefined)     vendorUpdate.address_number     = data.address_number
  if (data.address_complement !== undefined) vendorUpdate.address_complement = data.address_complement
  if (data.address_district !== undefined)   vendorUpdate.address_district   = data.address_district
  if (data.address_city !== undefined)       vendorUpdate.address_city       = data.address_city
  if (data.address_state !== undefined)      vendorUpdate.address_state      = data.address_state

  if (Object.keys(vendorUpdate).length > 0) {
    vendorUpdate.updated_at = new Date().toISOString()
    const { error: updateError } = await serviceClient
      .from('vendors')
      .update(vendorUpdate)
      .eq('id', vendor.id)
      .eq('tenant_id', job.tenant_id)

    if (updateError) {
      console.error('[crew-registration/submit/veteran] erro ao atualizar vendor:', updateError.message)
      // Nao falha o cadastro por isso — apenas loga
    }
  }

  // Criar registro de participacao
  const { data: registration, error: insertError } = await serviceClient
    .from('job_crew_registrations')
    .insert({
      tenant_id:  job.tenant_id,
      job_id:     job.id,
      vendor_id:  vendor.id,
      full_name:  data.full_name ?? vendor.full_name,
      email:      data.email,
      job_role:   data.job_role,
      num_days:   data.num_days,
      daily_rate: data.daily_rate,
      is_veteran: true,
      notes:      data.notes ?? null,
    })
    .select('id, full_name, email, job_role, num_days, daily_rate, is_veteran, vendor_id, created_at')
    .single()

  if (insertError || !registration) {
    console.error('[crew-registration/submit/veteran] erro ao inserir registro:', insertError?.message)
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar cadastro', 500)
  }

  console.log(
    `[crew-registration/submit/veteran] registro criado: id=${registration.id} job=${job.id} vendor=${vendor.id}`,
  )

  return success({
    id:         registration.id,
    full_name:  registration.full_name,
    job_role:   registration.job_role,
    num_days:   registration.num_days,
    daily_rate: registration.daily_rate,
    total:      Number(registration.num_days) * Number(registration.daily_rate),
    is_veteran: registration.is_veteran,
  }, 201)
}

// ----------------------------------------------------------------
// Fluxo: novo freelancer (nao existe como vendor)
// ----------------------------------------------------------------
async function processNewVendor(
  _req: Request,
  job: { id: string; tenant_id: string; title: string; code: string },
  rawBody: Record<string, unknown>,
  serviceClient: ReturnType<typeof getServiceClient>,
): Promise<Response> {
  const parsed = NewVendorSubmitSchema.safeParse(rawBody)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    // Mensagem amigavel com todos os campos invalidos
    const fieldNames: Record<string, string> = {
      job_role: 'Funcao', pix_key_type: 'Tipo de chave PIX', pix_key: 'Chave PIX',
      full_name: 'Nome', email: 'E-mail', num_days: 'Diarias', daily_rate: 'Cache',
      cpf: 'CPF', cnpj: 'CNPJ', phone: 'Telefone',
    }
    const summary = issues.map(i => fieldNames[i.field] || i.field).filter(Boolean).join(', ')
    const msg = issues.length === 1
      ? `Campo invalido: ${summary} — ${issues[0].message}`
      : `Campos invalidos: ${summary}`
    return error('VALIDATION_ERROR', msg, 400, { issues })
  }

  const data = parsed.data
  const emailLower = data.email.toLowerCase().trim()

  // Verificar duplicidade de email neste job
  const { data: existing } = await serviceClient
    .from('job_crew_registrations')
    .select('id')
    .eq('job_id', job.id)
    .ilike('email', emailLower)
    .is('deleted_at', null)
    .maybeSingle()

  if (existing) {
    return error('CONFLICT', 'Este e-mail ja foi cadastrado para este job', 409)
  }

  // Sanitizar CPF e CNPJ (remover mascara)
  const cpfClean = data.cpf ? data.cpf.replace(/\D/g, '') : null
  const cnpjClean = data.cnpj ? data.cnpj.replace(/\D/g, '') : null

  // Criar novo vendor
  const { data: newVendor, error: vendorInsertError } = await serviceClient
    .from('vendors')
    .insert({
      tenant_id:          job.tenant_id,
      full_name:          data.full_name,
      normalized_name:    data.full_name.toLowerCase().trim(),
      entity_type:        data.entity_type ?? 'pf',
      cpf:                cpfClean ?? null,
      cnpj:               cnpjClean ?? null,
      rg:                 data.rg ?? null,
      birth_date:         data.birth_date ?? null,
      drt:                data.drt ?? null,
      ctps:               data.ctps ?? null,
      email:              data.email,
      phone:              data.phone ?? null,
      zip_code:           data.zip_code ?? null,
      address_street:     data.address_street ?? null,
      address_number:     data.address_number ?? null,
      address_complement: data.address_complement ?? null,
      address_district:   data.address_district ?? null,
      address_city:       data.address_city ?? null,
      address_state:      data.address_state ?? null,
      is_active:          true,
      import_source:      'crew_registration',
    })
    .select('id')
    .single()

  if (vendorInsertError || !newVendor) {
    console.error('[crew-registration/submit/new] erro ao criar vendor:', vendorInsertError?.message)
    throw new AppError('INTERNAL_ERROR', 'Erro ao criar fornecedor', 500)
  }

  const vendorId = newVendor.id

  // Criar conta bancaria principal se dados foram fornecidos
  const hasBankData = data.bank_name || data.pix_key || data.account_number
  if (hasBankData) {
    const { error: bankError } = await serviceClient
      .from('bank_accounts')
      .insert({
        tenant_id:      job.tenant_id,
        vendor_id:      vendorId,
        bank_name:      data.bank_name ?? null,
        agency:         data.agency ?? null,
        account_number: data.account_number ?? null,
        account_type:   data.account_type ?? null,
        pix_key_type:   data.pix_key_type ?? null,
        pix_key:        data.pix_key ?? null,
        is_primary:     true,
        is_active:      true,
      })

    if (bankError) {
      // Nao falha o cadastro por isso, mas loga
      console.warn('[crew-registration/submit/new] erro ao criar bank_account:', bankError.message)
    }
  }

  // Criar registro de participacao
  const { data: registration, error: insertError } = await serviceClient
    .from('job_crew_registrations')
    .insert({
      tenant_id:  job.tenant_id,
      job_id:     job.id,
      vendor_id:  vendorId,
      full_name:  data.full_name,
      email:      data.email,
      job_role:   data.job_role,
      num_days:   data.num_days,
      daily_rate: data.daily_rate,
      is_veteran: false,
      notes:      data.notes ?? null,
    })
    .select('id, full_name, email, job_role, num_days, daily_rate, is_veteran, vendor_id, created_at')
    .single()

  if (insertError || !registration) {
    console.error('[crew-registration/submit/new] erro ao inserir registro:', insertError?.message)
    throw new AppError('INTERNAL_ERROR', 'Erro ao salvar cadastro', 500)
  }

  console.log(
    `[crew-registration/submit/new] registro criado: id=${registration.id} job=${job.id} novo vendor=${vendorId}`,
  )

  return success({
    id:         registration.id,
    full_name:  registration.full_name,
    job_role:   registration.job_role,
    num_days:   registration.num_days,
    daily_rate: registration.daily_rate,
    total:      Number(registration.num_days) * Number(registration.daily_rate),
    is_veteran: registration.is_veteran,
  }, 201)
}
