import { z } from 'https://esm.sh/zod@3.22.4'
import { getAuthContext } from '../../_shared/auth.ts'
import { getSupabaseClient, getServiceClient } from '../../_shared/supabase-client.ts'
import { AppError } from '../../_shared/errors.ts'
import { success, error, fromAppError } from '../../_shared/response.ts'

// Mapeamento job_role (texto livre do formulario) → team_role (enum do banco)
const JOB_ROLE_TO_TEAM_ROLE: Record<string, string> = {
  'Diretor de Cena': 'diretor',
  'Diretor de Produção': 'diretor_producao',
  'Coordenador de Produção': 'coordenador_producao',
  'Produtor': 'produtor_executivo',
  'Produtor(a) de Locação': 'produtor_locacao',
  'Produtor de Locação': 'produtor_locacao',
  'Produtor de Casting': 'produtor_casting',
  'Diretor de Arte': 'diretor_arte',
  'Diretor de Fotografia': 'dop',
  'Operador de Câmera': 'dop',
  'Atendimento': 'atendimento',
  'Chefe de Elétrica (Gaffer)': 'gaffer',
  'Maquiador(a)': 'maquiador',
  'Produtor de Figurino': 'figurinista',
  'Colorista': 'colorista',
  'Editor': 'editor',
  'Motion Designer': 'motion_designer',
  'Finalizador': 'finalizador',
  'Técnico de Som': 'som_direto',
  'Roteirista': 'diretor',
  'Assistente de Direção I': 'primeiro_assistente',
  'Assistente de Direção II': 'primeiro_assistente',
}

const ApproveSchema = z.object({
  registration_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
})

// POST /crew-registration/approve
// Aprova ou reprova um registro de equipe.
// Ao aprovar: cria people (se necessario) + job_team entry.
export async function handleApproveRegistration(req: Request): Promise<Response> {
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

  const parsed = ApproveSchema.safeParse(body)
  if (!parsed.success) {
    return error('VALIDATION_ERROR', parsed.error.issues[0].message, 400, undefined, req)
  }

  const { registration_id, action } = parsed.data
  const userClient = getSupabaseClient(auth.token)
  const serviceClient = getServiceClient()

  // 1. Buscar registro — RLS garante tenant isolation
  const { data: reg, error: regError } = await userClient
    .from('job_crew_registrations')
    .select('id, tenant_id, job_id, vendor_id, full_name, email, job_role, num_days, daily_rate, status')
    .eq('id', registration_id)
    .is('deleted_at', null)
    .single()

  if (regError || !reg) {
    return error('NOT_FOUND', 'Registro nao encontrado', 404, undefined, req)
  }

  if (reg.status !== 'pendente') {
    return error('CONFLICT', `Registro ja foi ${reg.status}`, 409, undefined, req)
  }

  // 2. REPROVAR — simples, so atualiza status
  if (action === 'reject') {
    const { error: updateError } = await userClient
      .from('job_crew_registrations')
      .update({
        status: 'reprovado',
        approved_by: auth.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', registration_id)

    if (updateError) {
      console.error('[crew-registration/approve] erro ao reprovar:', updateError.message)
      return error('INTERNAL_ERROR', 'Erro ao reprovar', 500, undefined, req)
    }

    console.log(`[crew-registration/approve] reprovado: reg=${registration_id}`)
    return success({ status: 'reprovado' }, 200, req)
  }

  // 3. APROVAR — precisa criar person (se nao existe) + job_team
  try {
    // 3a. Buscar vendor para obter people_id (se ja vinculado)
    let personId: string | null = null

    if (reg.vendor_id) {
      const { data: vendor } = await serviceClient
        .from('vendors')
        .select('id, people_id, full_name, email, phone, cpf, rg, birth_date, drt')
        .eq('id', reg.vendor_id)
        .single()

      if (vendor?.people_id) {
        personId = vendor.people_id
      }

      // 3b. Se vendor nao tem people_id, procurar person por email no tenant
      if (!personId && reg.email) {
        const { data: existingPerson } = await serviceClient
          .from('people')
          .select('id')
          .eq('tenant_id', reg.tenant_id)
          .ilike('email', reg.email.toLowerCase().trim())
          .is('deleted_at', null)
          .maybeSingle()

        if (existingPerson) {
          personId = existingPerson.id
        }
      }

      // 3c. Se nao encontrou, criar person a partir dos dados do vendor
      if (!personId) {
        const { data: newPerson, error: personError } = await serviceClient
          .from('people')
          .insert({
            tenant_id: reg.tenant_id,
            full_name: vendor?.full_name ?? reg.full_name,
            email: reg.email,
            phone: vendor?.phone ?? null,
            cpf: vendor?.cpf ?? null,
            rg: vendor?.rg ?? null,
            birth_date: vendor?.birth_date ?? null,
            drt: vendor?.drt ?? null,
            profession: reg.job_role,
            default_role: mapJobRoleToTeamRole(reg.job_role),
            default_rate: reg.daily_rate,
            is_internal: false,
            is_active: true,
          })
          .select('id')
          .single()

        if (personError || !newPerson) {
          console.error('[crew-registration/approve] erro ao criar person:', personError?.message)
          throw new AppError('INTERNAL_ERROR', 'Erro ao criar pessoa na equipe', 500)
        }

        personId = newPerson.id

        // Vincular vendor ao person criado
        if (vendor) {
          await serviceClient
            .from('vendors')
            .update({ people_id: personId, updated_at: new Date().toISOString() })
            .eq('id', vendor.id)
        }
      }
    } else {
      // Sem vendor_id — criar person direto dos dados do registro
      const { data: newPerson, error: personError } = await serviceClient
        .from('people')
        .insert({
          tenant_id: reg.tenant_id,
          full_name: reg.full_name,
          email: reg.email,
          profession: reg.job_role,
          default_role: mapJobRoleToTeamRole(reg.job_role),
          default_rate: reg.daily_rate,
          is_internal: false,
          is_active: true,
        })
        .select('id')
        .single()

      if (personError || !newPerson) {
        console.error('[crew-registration/approve] erro ao criar person (sem vendor):', personError?.message)
        throw new AppError('INTERNAL_ERROR', 'Erro ao criar pessoa na equipe', 500)
      }

      personId = newPerson.id
    }

    // 4. Verificar se ja existe no job_team (evitar duplicata)
    const teamRole = mapJobRoleToTeamRole(reg.job_role)
    const { data: existingTeam } = await serviceClient
      .from('job_team')
      .select('id')
      .eq('job_id', reg.job_id)
      .eq('person_id', personId)
      .is('deleted_at', null)
      .maybeSingle()

    if (existingTeam) {
      // Ja esta na equipe — apenas atualiza status do registro
      const { error: updateError } = await userClient
        .from('job_crew_registrations')
        .update({
          status: 'aprovado',
          approved_by: auth.userId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', registration_id)

      if (updateError) {
        throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar status', 500)
      }

      return success({ status: 'aprovado', message: 'Profissional ja estava na equipe' }, 200, req)
    }

    // 5. Criar job_team entry
    const { error: teamError } = await serviceClient
      .from('job_team')
      .insert({
        tenant_id: reg.tenant_id,
        job_id: reg.job_id,
        person_id: personId,
        role: teamRole,
        rate: reg.daily_rate,
        hiring_status: 'confirmado',
        notes: reg.job_role !== 'Outros' ? `Via cadastro de equipe: ${reg.job_role}` : reg.full_name,
      })

    if (teamError) {
      console.error('[crew-registration/approve] erro ao criar job_team:', teamError.message)
      // Se for constraint unique, ja existe com outra role
      if (teamError.message.includes('unique') || teamError.message.includes('duplicate')) {
        // Continua mesmo assim — atualiza status
      } else {
        throw new AppError('INTERNAL_ERROR', 'Erro ao adicionar na equipe', 500)
      }
    }

    // 6. Atualizar status do registro
    const { error: updateError } = await userClient
      .from('job_crew_registrations')
      .update({
        status: 'aprovado',
        approved_by: auth.userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', registration_id)

    if (updateError) {
      console.error('[crew-registration/approve] erro ao atualizar status:', updateError.message)
      throw new AppError('INTERNAL_ERROR', 'Erro ao atualizar status', 500)
    }

    console.log(
      `[crew-registration/approve] aprovado: reg=${registration_id} person=${personId} job=${reg.job_id}`,
    )

    return success({ status: 'aprovado', person_id: personId }, 200, req)
  } catch (err) {
    if (err instanceof AppError) return fromAppError(err, req)
    console.error('[crew-registration/approve] erro nao tratado:', err)
    return error('INTERNAL_ERROR', 'Erro interno ao aprovar', 500, undefined, req)
  }
}

function mapJobRoleToTeamRole(jobRole: string): string {
  return JOB_ROLE_TO_TEAM_ROLE[jobRole] ?? 'outro'
}
