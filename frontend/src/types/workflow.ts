// =============================================================================
// Types do modulo Workflow — ciclo de aprovacao pre-producao (16 fases)
// =============================================================================

export const WORKFLOW_STATUSES = [
  'pending', 'in_progress', 'completed', 'skipped', 'blocked', 'rejected',
] as const
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number]

export const WORKFLOW_CATEGORIES = [
  'vendas', 'producao', 'objetos', 'locacao', 'figurino', 'pos', 'qa', 'entrega',
] as const
export type WorkflowCategory = (typeof WORKFLOW_CATEGORIES)[number]

export const WORKFLOW_STEP_TYPES = [
  'geral', 'solicitacao', 'aprovacao', 'compra', 'conferencia',
] as const
export type WorkflowStepType = (typeof WORKFLOW_STEP_TYPES)[number]

export const EVIDENCE_TYPES = [
  'foto', 'nota_fiscal', 'recibo', 'outro',
] as const
export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

// --- Step completo (retorno da API) ---

export interface WorkflowStep {
  id: string
  tenant_id: string
  job_id: string
  step_key: string
  step_label: string
  category: WorkflowCategory
  step_type: WorkflowStepType
  sort_order: number
  status: WorkflowStatus
  assigned_to: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  estimated_value: number | null
  actual_value: number | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Joins
  assigned_profile?: { id: string; full_name: string; avatar_url: string | null } | null
  approved_profile?: { id: string; full_name: string } | null
  // Computado pelo backend
  evidence_count?: number
}

// --- Evidencia ---

export interface WorkflowEvidence {
  id: string
  tenant_id: string
  workflow_step_id: string
  evidence_type: EvidenceType
  file_url: string
  file_name: string
  uploaded_by: string | null
  notes: string | null
  created_at: string
  // Join
  uploader?: { id: string; full_name: string; avatar_url: string | null } | null
}

// --- Formularios ---

export interface UpdateStepPayload {
  status?: WorkflowStatus
  assigned_to?: string | null
  notes?: string | null
  estimated_value?: number | null
  actual_value?: number | null
  rejection_reason?: string | null
}

export interface AddEvidencePayload {
  evidence_type: EvidenceType
  file_url: string
  file_name: string
  notes?: string | null
}

// --- Labels e cores ---

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluido',
  skipped: 'Pulado',
  blocked: 'Bloqueado',
  rejected: 'Rejeitado',
}

export const WORKFLOW_STATUS_COLORS: Record<WorkflowStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  in_progress: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  completed: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', dot: 'bg-green-500' },
  skipped: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' },
  blocked: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-600' },
}

export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowCategory, string> = {
  vendas: 'Comercial',
  producao: 'Producao',
  objetos: 'Objetos de Cena',
  locacao: 'Locacao',
  figurino: 'Figurino',
  pos: 'Pos-Producao',
  qa: 'Qualidade',
  entrega: 'Entrega',
}

export const WORKFLOW_CATEGORY_COLORS: Record<WorkflowCategory, { bg: string; text: string; border: string }> = {
  vendas: { bg: 'bg-amber-50 dark:bg-amber-950', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
  producao: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  objetos: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  locacao: { bg: 'bg-teal-50 dark:bg-teal-950', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700' },
  figurino: { bg: 'bg-pink-50 dark:bg-pink-950', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
  pos: { bg: 'bg-orange-50 dark:bg-orange-950', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700' },
  qa: { bg: 'bg-cyan-50 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700' },
  entrega: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
}

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  foto: 'Foto',
  nota_fiscal: 'Nota Fiscal',
  recibo: 'Recibo',
  outro: 'Outro',
}

export const STEP_TYPE_ICONS: Record<WorkflowStepType, string> = {
  geral: 'CircleDot',
  solicitacao: 'FileEdit',
  aprovacao: 'CheckCircle',
  compra: 'ShoppingCart',
  conferencia: 'Camera',
}
