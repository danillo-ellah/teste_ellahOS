import { z } from 'https://esm.sh/zod@3.22.4';
import { getSupabaseClient } from '../../_shared/supabase-client.ts';
import { success, created } from '../../_shared/response.ts';
import { AppError } from '../../_shared/errors.ts';
import { validate } from '../../_shared/validation.ts';
import type { AuthContext } from '../../_shared/auth.ts';

// Status de alvara
const PERMIT_STATUSES = [
  'nao_necessario',
  'solicitado',
  'aprovado',
  'reprovado',
  'em_analise',
] as const;

// Schema de vinculo job-locacao
const LinkJobLocationSchema = z.object({
  job_id: z.string().uuid('job_id deve ser UUID valido'),
  location_id: z.string().uuid('location_id deve ser UUID valido'),
  filming_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD')).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  daily_rate_override: z.number().min(0).optional().nullable(),
  permit_status: z.enum(PERMIT_STATUSES).optional().nullable(),
  permit_notes: z.string().max(2000).optional().nullable(),
});

// Schema de atualizacao de vinculo
const UpdateJobLocationSchema = z
  .object({
    filming_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable(),
    notes: z.string().max(2000).nullable(),
    daily_rate_override: z.number().min(0).nullable(),
    permit_status: z.enum(PERMIT_STATUSES).nullable(),
    permit_notes: z.string().max(2000).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

// GET /locations/job/:jobId — lista locacoes de um job
export async function listJobLocations(
  req: Request,
  auth: AuthContext,
  jobId: string,
): Promise<Response> {
  console.log('[locations/job-locations] listando locacoes do job', {
    jobId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar se job pertence ao tenant
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  const { data: jobLocations, error: dbError } = await supabase
    .from('job_locations')
    .select(
      'id, job_id, location_id, filming_dates, notes, daily_rate_override, permit_status, permit_notes, created_at, updated_at, locations(id, name, address_street, address_number, address_city, address_state, daily_rate, contact_name, contact_phone, contact_email, description, location_photos(id, url, caption, is_cover))',
    )
    .eq('job_id', jobId)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: true });

  if (dbError) {
    console.error('[locations/job-locations] erro na query:', dbError);
    throw new AppError('INTERNAL_ERROR', dbError.message, 500);
  }

  return success(jobLocations ?? []);
}

// POST /locations/job-link — vincular locacao a job
export async function linkJobLocation(
  req: Request,
  auth: AuthContext,
): Promise<Response> {
  console.log('[locations/job-link] vinculando locacao a job', {
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const body = await req.json();
  const validated = validate(LinkJobLocationSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar se job pertence ao tenant
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', validated.job_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (jobErr || !job) {
    throw new AppError('NOT_FOUND', 'Job nao encontrado', 404);
  }

  // Verificar se locacao pertence ao tenant
  const { data: location, error: locErr } = await supabase
    .from('locations')
    .select('id')
    .eq('id', validated.location_id)
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .single();

  if (locErr || !location) {
    throw new AppError('NOT_FOUND', 'Locacao nao encontrada', 404);
  }

  // Verificar duplicata
  const { data: existing } = await supabase
    .from('job_locations')
    .select('id')
    .eq('job_id', validated.job_id)
    .eq('location_id', validated.location_id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();

  if (existing) {
    throw new AppError(
      'CONFLICT',
      'Esta locacao ja esta vinculada a este job',
      409,
      { job_location_id: existing.id },
    );
  }

  // Inserir vinculo
  const { data: jobLocation, error: insertErr } = await supabase
    .from('job_locations')
    .insert({
      job_id: validated.job_id,
      location_id: validated.location_id,
      filming_dates: validated.filming_dates ?? null,
      notes: validated.notes ?? null,
      daily_rate_override: validated.daily_rate_override ?? null,
      permit_status: validated.permit_status ?? null,
      permit_notes: validated.permit_notes ?? null,
      tenant_id: auth.tenantId,
    })
    .select(
      '*, locations(id, name, address_street, address_number, address_city, address_state, daily_rate, contact_name, contact_phone, contact_email, description, location_photos(id, url, caption, is_cover))',
    )
    .single();

  if (insertErr) {
    console.error('[locations/job-link] erro ao vincular:', insertErr);
    throw new AppError('INTERNAL_ERROR', insertErr.message, 500);
  }

  console.log('[locations/job-link] vinculado com sucesso:', jobLocation.id);

  return created(jobLocation);
}

// PATCH /locations/job-link/:id — atualizar vinculo
export async function updateJobLocation(
  req: Request,
  auth: AuthContext,
  jobLocationId: string,
): Promise<Response> {
  console.log('[locations/job-link/update] atualizando vinculo', {
    jobLocationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const body = await req.json();
  const validated = validate(UpdateJobLocationSchema, body);

  const supabase = getSupabaseClient(auth.token);

  // Verificar existencia do vinculo
  const { data: existing, error: findErr } = await supabase
    .from('job_locations')
    .select('id')
    .eq('id', jobLocationId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Vinculo nao encontrado', 404);
  }

  const { data: updated, error: updateErr } = await supabase
    .from('job_locations')
    .update(validated)
    .eq('id', jobLocationId)
    .eq('tenant_id', auth.tenantId)
    .select(
      '*, locations(id, name, address_street, address_number, address_city, address_state, daily_rate, contact_name, contact_phone, contact_email, description, location_photos(id, url, caption, is_cover))',
    )
    .single();

  if (updateErr) {
    console.error('[locations/job-link/update] erro ao atualizar:', updateErr);
    throw new AppError('INTERNAL_ERROR', updateErr.message, 500);
  }

  return success(updated);
}

// DELETE /locations/job-link/:id — desvincular locacao de job
export async function unlinkJobLocation(
  req: Request,
  auth: AuthContext,
  jobLocationId: string,
): Promise<Response> {
  console.log('[locations/job-link/delete] desvinculando locacao', {
    jobLocationId,
    userId: auth.userId,
    tenantId: auth.tenantId,
  });

  const supabase = getSupabaseClient(auth.token);

  // Verificar existencia do vinculo
  const { data: existing, error: findErr } = await supabase
    .from('job_locations')
    .select('id')
    .eq('id', jobLocationId)
    .eq('tenant_id', auth.tenantId)
    .single();

  if (findErr || !existing) {
    throw new AppError('NOT_FOUND', 'Vinculo nao encontrado', 404);
  }

  const { error: deleteErr } = await supabase
    .from('job_locations')
    .delete()
    .eq('id', jobLocationId)
    .eq('tenant_id', auth.tenantId);

  if (deleteErr) {
    console.error('[locations/job-link/delete] erro ao desvincular:', deleteErr);
    throw new AppError('INTERNAL_ERROR', deleteErr.message, 500);
  }

  console.log('[locations/job-link/delete] desvinculado:', jobLocationId);

  return success({ deleted: true });
}
