// Tipos do modulo de Inteligencia Artificial do ELLAHOS

// --- Estimativa de Orcamento ---

export interface BudgetBreakdown {
  pre_production: number
  production: number
  post_production: number
  talent: number
  equipment: number
  locations: number
  other: number
}

export type EstimateConfidence = 'high' | 'medium' | 'low'

export interface SimilarJob {
  job_id: string
  title: string
  code: string
  closed_value: number | null
  production_cost: number | null
  margin_percentage: number | null
  similarity_score: number
}

export interface TokenUsage {
  input: number
  output: number
}

export interface SuggestedBudget {
  total: number
  breakdown: BudgetBreakdown
  confidence: EstimateConfidence
  confidence_explanation: string
}

export interface BudgetEstimateResult {
  estimate_id: string | null
  job_id: string
  suggested_budget: SuggestedBudget
  similar_jobs: SimilarJob[]
  reasoning: string
  warnings: string[]
  tokens_used: TokenUsage
  cached: boolean
}

export interface BudgetEstimateHistoryItem {
  estimate_id: string
  job_id: string
  requested_by: string
  suggested_budget: {
    total: number
    breakdown: BudgetBreakdown
    confidence: EstimateConfidence
  }
  similar_jobs: SimilarJob[]
  reasoning: string
  warnings: string[]
  model_used: string
  tokens_used: TokenUsage
  was_applied: boolean
  created_at: string
}

// Contexto opcional para sobrescrever parametros na geracao
export interface BudgetEstimateOverrideContext {
  additional_requirements?: string
  reference_jobs?: string[]
  budget_ceiling?: number
}

// --- Copilot ELLA (chat) ---

export type CopilotRole = 'user' | 'assistant'

export interface CopilotMessage {
  id: string
  conversation_id: string
  role: CopilotRole
  content: string
  created_at: string
  tokens_used?: TokenUsage | null
}

export interface CopilotConversation {
  id: string
  title: string
  job_id: string | null
  model_used: string
  message_count: number
  last_message_at: string | null
  created_at: string
}

export interface CopilotChatContext {
  job_id?: string
  page?: string
}

// Resposta do endpoint chat-sync
export interface CopilotChatSyncResult {
  conversation_id: string
  message_id: string
  response: string
  sources: unknown[]
  tokens_used: TokenUsage
}

// Resposta do endpoint conversations/:id
export interface CopilotConversationDetail {
  conversation: CopilotConversation
  messages: CopilotMessage[]
}

// --- Analise de Dailies ---

export type DailiesProgressStatus = 'on_track' | 'at_risk' | 'behind' | 'ahead'
export type DailiesRiskSeverity = 'high' | 'medium' | 'low'

export interface DailyEntryInput {
  shooting_date: string
  notes?: string
  scenes_planned?: number
  scenes_completed?: number
  weather_notes?: string
  equipment_issues?: string
  talent_notes?: string
  extra_costs?: string
  general_observations?: string
}

export interface DailiesProgressAssessment {
  status: DailiesProgressStatus
  explanation: string
  completion_percentage: number
}

export interface DailiesRisk {
  severity: DailiesRiskSeverity
  description: string
  recommendation: string
}

export interface DailiesAnalysisResult {
  analysis_id: string
  job_id: string
  summary: string
  progress_assessment: DailiesProgressAssessment
  risks: DailiesRisk[]
  recommendations: string[]
  tokens_used: TokenUsage
}

export interface DailiesAnalysisHistoryItem {
  id: string
  job_id: string
  requested_by: string
  model_used: string
  tokens_used: TokenUsage
  duration_ms: number
  status: string
  metadata: Record<string, unknown>
  created_at: string
}

// --- Freelancer Match ---

export interface FreelancerSuggestion {
  person_id: string
  full_name: string
  default_role: string
  default_rate: number | null
  is_internal: boolean
  match_score: number
  match_reasons: string[]
  availability: {
    is_available: boolean
    conflicts: Array<{
      job_code: string
      job_title: string
      overlap_start: string
      overlap_end: string
    }>
  }
  past_performance: {
    total_jobs: number
    jobs_with_same_type: number
    avg_job_health_score: number | null
    last_job_date: string | null
  }
}

export interface FreelancerMatchResult {
  suggestions: FreelancerSuggestion[]
  reasoning: string
  tokens_used: TokenUsage
}

export interface FreelancerMatchRequest {
  job_id: string
  role: string
  requirements?: string
  max_rate?: number
  preferred_start?: string
  preferred_end?: string
  limit?: number
}
