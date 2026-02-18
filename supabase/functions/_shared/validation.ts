import { z } from 'https://esm.sh/zod@3.22.4';
import { AppError } from './errors.ts';
import {
  JOB_STATUSES,
  PROJECT_TYPES,
  PRIORITY_LEVELS,
  CLIENT_SEGMENTS,
  TEAM_ROLES,
  HIRING_STATUSES,
  DELIVERABLE_STATUSES,
  POS_SUB_STATUSES,
} from './types.ts';

// Helper: valida dados contra um schema Zod. Lanca AppError se invalido.
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw new AppError('VALIDATION_ERROR', issues[0].message, 400, {
      issues,
    });
  }
  return result.data;
}

// ===== Schemas de Jobs =====

export const CreateJobSchema = z.object({
  title: z.string().min(1, 'Titulo e obrigatorio').max(500),
  client_id: z.string().uuid('client_id deve ser UUID valido'),
  job_type: z.enum(PROJECT_TYPES, {
    errorMap: () => ({ message: 'Tipo de projeto invalido' }),
  }),
  agency_id: z.string().uuid().optional().nullable(),
  brand: z.string().max(200).optional().nullable(),
  format: z.string().max(100).optional().nullable(),
  segment: z
    .enum(CLIENT_SEGMENTS, {
      errorMap: () => ({ message: 'Segmento invalido' }),
    })
    .optional()
    .nullable(),
  total_duration_seconds: z.number().int().positive().optional().nullable(),
  tags: z.array(z.string()).optional(),
  priority: z
    .enum(PRIORITY_LEVELS, {
      errorMap: () => ({ message: 'Prioridade invalida' }),
    })
    .optional(),
  briefing_text: z.string().optional().nullable(),
  references_text: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  expected_delivery_date: z.string().optional().nullable(),
  closed_value: z.number().min(0).optional().nullable(),
  production_cost: z.number().min(0).optional().nullable(),
  other_costs: z.number().min(0).optional().nullable(),
  tax_percentage: z.number().min(0).max(100).optional(),
  parent_job_id: z.string().uuid().optional().nullable(),
  media_type: z.string().max(100).optional().nullable(),
  complexity_level: z.string().max(50).optional().nullable(),
  po_number: z.string().max(100).optional().nullable(),
  commercial_responsible: z.string().max(200).optional().nullable(),
  custom_fields: z.record(z.unknown()).optional(),
});

export const UpdateJobSchema = z
  .object({
    title: z.string().min(1).max(500),
    client_id: z.string().uuid(),
    agency_id: z.string().uuid().nullable(),
    brand: z.string().max(200).nullable(),
    job_type: z.enum(PROJECT_TYPES),
    format: z.string().max(100).nullable(),
    segment: z.enum(CLIENT_SEGMENTS).nullable(),
    total_duration_seconds: z.number().int().positive().nullable(),
    tags: z.array(z.string()),
    priority: z.enum(PRIORITY_LEVELS),
    briefing_text: z.string().nullable(),
    references_text: z.string().nullable(),
    notes: z.string().nullable(),
    internal_notes: z.string().nullable(),
    expected_delivery_date: z.string().nullable(),
    closed_value: z.number().min(0).nullable(),
    production_cost: z.number().min(0).nullable(),
    other_costs: z.number().min(0).nullable(),
    tax_percentage: z.number().min(0).max(100),
    media_type: z.string().max(100).nullable(),
    complexity_level: z.string().max(50).nullable(),
    po_number: z.string().max(100).nullable(),
    commercial_responsible: z.string().max(200).nullable(),
    payment_terms: z.string().nullable(),
    payment_date: z.string().nullable(),
    currency: z.string().max(3),
    is_archived: z.boolean(),
    custom_fields: z.record(z.unknown()),
    // Datas
    briefing_date: z.string().nullable(),
    budget_sent_date: z.string().nullable(),
    client_approval_deadline: z.string().nullable(),
    kickoff_ppm_date: z.string().nullable(),
    post_start_date: z.string().nullable(),
    post_deadline: z.string().nullable(),
    actual_delivery_date: z.string().nullable(),
    // URLs
    drive_folder_url: z.string().url().nullable(),
    production_sheet_url: z.string().url().nullable(),
    budget_letter_url: z.string().url().nullable(),
    schedule_url: z.string().url().nullable(),
    script_url: z.string().url().nullable(),
    ppm_url: z.string().url().nullable(),
    contracts_folder_url: z.string().url().nullable(),
    raw_material_url: z.string().url().nullable(),
    team_sheet_url: z.string().url().nullable(),
    team_form_url: z.string().url().nullable(),
    cast_sheet_url: z.string().url().nullable(),
    pre_production_url: z.string().url().nullable(),
    pre_art_url: z.string().url().nullable(),
    pre_costume_url: z.string().url().nullable(),
    closing_production_url: z.string().url().nullable(),
    closing_art_url: z.string().url().nullable(),
    closing_costume_url: z.string().url().nullable(),
    final_delivery_url: z.string().url().nullable(),
    // Sub-status pos-producao
    sub_status: z.enum(POS_SUB_STATUSES).nullable(),
    // Booleans
    has_contracted_audio: z.boolean(),
    has_mockup_scenography: z.boolean(),
    has_computer_graphics: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado para atualizacao',
  });

export const UpdateStatusSchema = z.object({
  status: z.enum(JOB_STATUSES, {
    errorMap: () => ({ message: 'Status invalido' }),
  }),
  sub_status: z.enum(POS_SUB_STATUSES).optional().nullable(),
  cancellation_reason: z.string().optional(),
});

export const ApproveJobSchema = z.object({
  approval_type: z.enum(['internal', 'external'], {
    errorMap: () => ({ message: 'Tipo de aprovacao invalido' }),
  }),
  approval_date: z.string().min(1, 'Data de aprovacao e obrigatoria'),
  closed_value: z.number().positive('Valor fechado deve ser positivo'),
  approval_document_url: z.string().url().optional().nullable(),
});

// ===== Schemas de Team =====

export const CreateTeamMemberSchema = z.object({
  person_id: z.string().uuid('person_id deve ser UUID valido'),
  role: z.enum(TEAM_ROLES, {
    errorMap: () => ({ message: 'Funcao invalida' }),
  }),
  fee: z.number().min(0).optional().nullable(),
  hiring_status: z
    .enum(HIRING_STATUSES, {
      errorMap: () => ({ message: 'Status de contratacao invalido' }),
    })
    .optional(),
  is_lead_producer: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export const UpdateTeamMemberSchema = z
  .object({
    role: z.enum(TEAM_ROLES),
    fee: z.number().min(0).nullable(),
    hiring_status: z.enum(HIRING_STATUSES),
    is_lead_producer: z.boolean(),
    notes: z.string().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  });

// ===== Schemas de Deliverables =====

export const CreateDeliverableSchema = z.object({
  description: z.string().min(1, 'Descricao e obrigatoria'),
  format: z.string().max(50).optional().nullable(),
  resolution: z.string().max(50).optional().nullable(),
  duration_seconds: z.number().int().positive().optional().nullable(),
  status: z.enum(DELIVERABLE_STATUSES).optional(),
  file_url: z.string().url().optional().nullable(),
  review_url: z.string().url().optional().nullable(),
});

export const UpdateDeliverableSchema = z
  .object({
    description: z.string().min(1),
    format: z.string().max(50).nullable(),
    resolution: z.string().max(50).nullable(),
    duration_seconds: z.number().int().positive().nullable(),
    status: z.enum(DELIVERABLE_STATUSES),
    version: z.number().int().positive(),
    delivery_date: z.string().nullable(),
    file_url: z.string().url().nullable(),
    review_url: z.string().url().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  });

// ===== Schemas de Shooting Dates =====

export const CreateShootingDateSchema = z.object({
  shooting_date: z.string().min(1, 'Data de filmagem e obrigatoria'),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
});

export const UpdateShootingDateSchema = z
  .object({
    shooting_date: z.string().min(1),
    description: z.string().nullable(),
    location: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Pelo menos um campo deve ser enviado',
  });

// Re-exportar z para uso nos handlers
export { z };
