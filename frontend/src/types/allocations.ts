// Tipos de Alocacao (Fase 6)

export interface Allocation {
  id: string
  tenant_id: string
  job_id: string
  people_id: string
  job_team_id: string | null
  allocation_start: string
  allocation_end: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joins
  job?: { id: string; code: string; title: string; status: string }
  people?: { id: string; full_name: string }
}

export interface AllocationConflict {
  person_id: string
  person_name: string
  allocations: Array<{
    allocation_id: string
    job_id: string
    job_code: string
    job_title: string
    allocation_start: string
    allocation_end: string
  }>
  overlap_start: string
  overlap_end: string
}

export interface ConflictWarning {
  code: 'ALLOCATION_CONFLICT'
  message: string
  details: {
    person_name: string
    conflicting_job_code: string
    conflicting_job_title: string
    overlap_start: string
    overlap_end: string
  }
}

export interface CreateAllocationPayload {
  job_id: string
  people_id: string
  job_team_id?: string
  allocation_start: string
  allocation_end: string
  notes?: string
}

export interface UpdateAllocationPayload {
  allocation_start?: string
  allocation_end?: string
  notes?: string | null
  job_team_id?: string | null
}
