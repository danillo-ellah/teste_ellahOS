// Tipos para o modulo Minha Semana — reflete o contrato da EF my-week

export interface MyWeekJob {
  id: string
  code: string
  title: string
  status: string
  pos_sub_status: string | null
  health_score: number | null
  client_name: string | null
  agency_name: string | null
  expected_delivery_date: string | null
  team_role: string | null
  is_responsible_producer: boolean
}

export interface MyWeekDeliverable {
  id: string
  job_id: string
  job_code: string | null
  job_title: string | null
  description: string
  status: string
  delivery_date: string | null
  format: string | null
  resolution: string | null
}

export interface MyWeekShootingDate {
  id: string
  job_id: string
  job_code: string | null
  job_title: string | null
  shooting_date: string
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
}

export interface MyWeekApproval {
  id: string
  job_id: string
  job_code: string | null
  job_title: string | null
  approval_type: string
  status: string
  created_at: string
}

export interface MyWeekData {
  person_id: string | null
  person_name: string | null
  week_start: string
  week_end: string
  jobs: MyWeekJob[]
  deliverables: MyWeekDeliverable[]
  shooting_dates: MyWeekShootingDate[]
  pending_approvals: MyWeekApproval[]
}
