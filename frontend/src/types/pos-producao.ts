// =============================================================================
// Onda 1.2: Pos-Producao -- Tipos do frontend
// =============================================================================

// --- Etapas de pos-producao ---

export const POS_STAGES = [
  'ingest', 'montagem', 'apresentacao_offline', 'revisao_offline',
  'aprovado_offline', 'finalizacao', 'apresentacao_online',
  'revisao_online', 'aprovado_online', 'copias', 'entregue',
] as const;

export type PosStage = (typeof POS_STAGES)[number];

export type PosStageBlock = 'pre' | 'offline' | 'online' | 'entrega';

export interface PosStageInfo {
  value: PosStage;
  label: string;
  block: PosStageBlock;
}

export const POS_STAGE_MAP: PosStageInfo[] = [
  { value: 'ingest', label: 'Ingest', block: 'pre' },
  { value: 'montagem', label: 'Montagem', block: 'offline' },
  { value: 'apresentacao_offline', label: 'Apresentacao Offline', block: 'offline' },
  { value: 'revisao_offline', label: 'Revisao Offline', block: 'offline' },
  { value: 'aprovado_offline', label: 'Aprovado Offline', block: 'offline' },
  { value: 'finalizacao', label: 'Finalizacao', block: 'online' },
  { value: 'apresentacao_online', label: 'Apresentacao Online', block: 'online' },
  { value: 'revisao_online', label: 'Revisao Online', block: 'online' },
  { value: 'aprovado_online', label: 'Aprovado Online', block: 'online' },
  { value: 'copias', label: 'Copias', block: 'entrega' },
  { value: 'entregue', label: 'Entregue', block: 'entrega' },
];

export const POS_BLOCK_COLORS: Record<PosStageBlock, { bg: string; text: string; border: string }> = {
  pre: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' },
  offline: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
  online: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700' },
  entrega: { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700' },
};

// --- Briefing tecnico ---

export interface PosBriefing {
  codec_master?: string | null;
  codec_entrega?: string | null;
  resolucao?: string | null;
  fps?: string | null;
  aspect_ratio?: string | null;
  lut_name?: string | null;
  audio_specs?: string | null;
  notas_tecnicas?: string | null;
}

export const POS_BRIEFING_FIELDS: Array<{ key: keyof PosBriefing; label: string; placeholder: string }> = [
  { key: 'codec_master', label: 'Codec Master', placeholder: 'Ex: ProRes 4444' },
  { key: 'codec_entrega', label: 'Codec Entrega', placeholder: 'Ex: H.264' },
  { key: 'resolucao', label: 'Resolucao', placeholder: 'Ex: 1920x1080' },
  { key: 'fps', label: 'FPS', placeholder: 'Ex: 23.976' },
  { key: 'aspect_ratio', label: 'Aspect Ratio', placeholder: 'Ex: 16:9' },
  { key: 'lut_name', label: 'LUT', placeholder: 'Ex: Ellah_REC709_v2.cube' },
  { key: 'audio_specs', label: 'Audio', placeholder: 'Ex: 48kHz, 24bit, stereo, -23 LUFS' },
  { key: 'notas_tecnicas', label: 'Notas Tecnicas', placeholder: 'Instrucoes adicionais...' },
];

// --- Versao de corte ---

export type CutVersionType = 'offline' | 'online';
export type CutVersionStatus = 'rascunho' | 'enviado' | 'aprovado' | 'rejeitado';

export interface CutVersion {
  id: string;
  tenant_id: string;
  deliverable_id: string;
  job_id: string;
  version_number: number;
  version_type: CutVersionType;
  review_url: string | null;
  status: CutVersionStatus;
  revision_notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins opcionais
  created_by_profile?: { id: string; full_name: string } | null;
  approved_by_profile?: { id: string; full_name: string } | null;
}

export const CUT_VERSION_STATUS_LABELS: Record<CutVersionStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export const CUT_VERSION_STATUS_COLORS: Record<CutVersionStatus, { bg: string; text: string }> = {
  rascunho: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  enviado: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-300' },
  aprovado: { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300' },
  rejeitado: { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300' },
};

// --- Entregavel estendido para pos-producao (join do dashboard) ---

export interface PosDeliverable {
  id: string;
  job_id: string;
  description: string;
  format: string | null;
  resolution: string | null;
  duration_seconds: number | null;
  status: string;
  delivery_date: string | null;
  pos_stage: PosStage | null;
  pos_assignee_id: string | null;
  pos_drive_url: string | null;
  pos_briefing: PosBriefing | null;
  display_order: number;
  created_at: string;
  // Joins do dashboard
  job?: {
    id: string;
    title: string;
    code: string;
    client_id: string;
    client?: { id: string; name: string } | null;
  };
  assignee?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

// --- Formularios ---

export interface CutVersionFormData {
  version_type: CutVersionType;
  review_url: string;
  revision_notes: string;
}

export interface ApproveRejectFormData {
  status: 'aprovado' | 'rejeitado';
  revision_notes: string;
}

export type PosBriefingFormData = PosBriefing;

// --- Filtros do dashboard ---

export interface PosDashboardFilters {
  stage?: PosStage;
  assignee_id?: string;
  job_id?: string;
  deadline?: 'today' | 'week' | 'overdue';
}
