import type {
  JobStatus,
  ProjectType,
  PriorityLevel,
  TeamRole,
  HiringStatus,
  DeliverableStatus,
  PosSubStatus,
} from '@/types/jobs'
import type { ClientSegment } from '@/types/clients'

// --- Labels pt-BR ---

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  briefing_recebido: 'Briefing Recebido',
  orcamento_elaboracao: 'Orcamento em Elaboracao',
  orcamento_enviado: 'Orcamento Enviado',
  aguardando_aprovacao: 'Aguardando Aprovacao Cliente',
  aprovado_selecao_diretor: 'Aprovado - Selecao de Diretor',
  cronograma_planejamento: 'Cronograma/Planejamento',
  pre_producao: 'Pre-Producao em Andamento',
  producao_filmagem: 'Producao/Filmagem',
  pos_producao: 'Pos-Producao',
  aguardando_aprovacao_final: 'Aguardando Aprovacao Final',
  entregue: 'Entregue',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  pausado: 'Pausado',
}

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  briefing_recebido: '#8B5CF6',
  orcamento_elaboracao: '#F59E0B',
  orcamento_enviado: '#F59E0B',
  aguardando_aprovacao: '#F59E0B',
  aprovado_selecao_diretor: '#22C55E',
  cronograma_planejamento: '#3B82F6',
  pre_producao: '#3B82F6',
  producao_filmagem: '#EF4444',
  pos_producao: '#A855F7',
  aguardando_aprovacao_final: '#A855F7',
  entregue: '#06B6D4',
  finalizado: '#10B981',
  cancelado: '#6B7280',
  pausado: '#6B7280',
}

// Ordem linear do pipeline (sem cancelado e pausado)
export const STATUS_PIPELINE_ORDER: JobStatus[] = [
  'briefing_recebido',
  'orcamento_elaboracao',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado_selecao_diretor',
  'cronograma_planejamento',
  'pre_producao',
  'producao_filmagem',
  'pos_producao',
  'aguardando_aprovacao_final',
  'entregue',
  'finalizado',
]

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  filme_publicitario: 'Filme Publicitario',
  branded_content: 'Branded Content',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Conteudo Digital',
  evento_livestream: 'Evento/Livestream',
  institucional: 'Institucional',
  motion_graphics: 'Motion Graphics',
  fotografia: 'Fotografia',
  outro: 'Outro',
}

// Versoes curtas para a celula condensada da tabela v2
export const PROJECT_TYPE_SHORT_LABELS: Record<ProjectType, string> = {
  filme_publicitario: 'Filme Pub.',
  branded_content: 'Branded',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Digital',
  evento_livestream: 'Evento',
  institucional: 'Institucional',
  motion_graphics: 'Motion',
  fotografia: 'Fotografia',
  outro: 'Outro',
}

// Emojis por status (spec v2.1 - Emoji Guide)
export const JOB_STATUS_EMOJI: Record<JobStatus, string> = {
  briefing_recebido: '\u{1F4A1}',           // 💡
  orcamento_elaboracao: '\u{1F4B0}',         // 💰
  orcamento_enviado: '\u{1F4B0}',            // 💰
  aguardando_aprovacao: '\u{231B}',          // ⏳
  aprovado_selecao_diretor: '\u{2705}',      // ✅
  cronograma_planejamento: '\u{1F4CB}',      // 📋
  pre_producao: '\u{1F4CB}',                 // 📋
  producao_filmagem: '\u{1F3AC}',            // 🎬
  pos_producao: '\u{2702}\u{FE0F}',          // ✂️
  aguardando_aprovacao_final: '\u{1F680}',   // 🚀
  entregue: '\u{1F680}',                     // 🚀
  finalizado: '\u{1F3C6}',                   // 🏆
  cancelado: '\u{1F6AB}',                    // 🚫
  pausado: '\u{23F8}\u{FE0F}',              // ⏸️
}

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  diretor: 'Diretor(a)',
  produtor_executivo: 'Produtor(a) Executivo(a)',
  coordenador_producao: 'Coordenador(a) de Producao',
  dop: 'Diretor(a) de Fotografia',
  primeiro_assistente: '1o Assistente de Direcao',
  editor: 'Editor(a)',
  colorista: 'Colorista',
  motion_designer: 'Motion Designer',
  diretor_arte: 'Diretor(a) de Arte',
  figurinista: 'Figurinista',
  produtor_casting: 'Produtor(a) de Casting',
  produtor_locacao: 'Produtor(a) de Locacao',
  gaffer: 'Gaffer',
  som_direto: 'Som Direto',
  maquiador: 'Maquiador(a)',
  outro: 'Outro',
}

export const HIRING_STATUS_LABELS: Record<HiringStatus, string> = {
  orcado: 'Orcado',
  proposta_enviada: 'Proposta Enviada',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

export const DELIVERABLE_STATUS_LABELS: Record<DeliverableStatus, string> = {
  pendente: 'Pendente',
  em_producao: 'Em Producao',
  aguardando_aprovacao: 'Aguardando Aprovacao',
  aprovado: 'Aprovado',
  entregue: 'Entregue',
}

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  alta: 'Alta',
  media: 'Media',
  baixa: 'Baixa',
}

export const POS_SUB_STATUS_LABELS: Record<PosSubStatus, string> = {
  edicao: 'Edicao',
  cor: 'Cor/Color Grading',
  vfx: 'VFX/Motion Graphics',
  finalizacao: 'Finalizacao',
  audio: 'Audio/Mixagem',
  revisao: 'Revisao',
}

// --- Estilos por prioridade ---

export const PRIORITY_STYLE_MAP: Record<
  PriorityLevel,
  { color: string; bgClass: string; textClass: string }
> = {
  alta: {
    color: '#EF4444',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
  },
  media: {
    color: '#F59E0B',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  baixa: {
    color: '#3B82F6',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
  },
}

// --- Abas da pagina de detalhe do job ---

export type JobDetailTabId =
  | 'geral'
  | 'equipe'
  | 'entregaveis'
  | 'financeiro'
  | 'diarias'
  | 'locacoes'
  | 'aprovacoes'
  | 'contratos'
  | 'ppm'
  | 'cronograma'
  | 'claquete'
  | 'storyboard'
  | 'elenco'
  | 'ordem-do-dia'
  | 'diario'
  | 'figurino'
  | 'atendimento'
  | 'horas-extras'
  | 'historico'
  | 'portal'

export const JOB_DETAIL_TABS: ReadonlyArray<{
  id: JobDetailTabId
  label: string
  icon: string
}> = [
  { id: 'geral', label: 'Geral', icon: 'FileText' },
  { id: 'equipe', label: 'Equipe', icon: 'Users' },
  { id: 'entregaveis', label: 'Entregaveis', icon: 'Package' },
  { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign' },
  { id: 'diarias', label: 'Diarias', icon: 'Calendar' },
  { id: 'locacoes', label: 'Locacoes', icon: 'MapPin' },
  { id: 'aprovacoes', label: 'Aprovacoes', icon: 'CheckSquare' },
  { id: 'contratos', label: 'Contratos', icon: 'PenLine' },
  { id: 'ppm', label: 'PPM', icon: 'FileCheck' },
  { id: 'claquete', label: 'Claquete', icon: 'Clapperboard' },
  { id: 'diario', label: 'Diario', icon: 'BookOpen' },
  { id: 'figurino', label: 'Figurino/Arte', icon: 'Shirt' },
  { id: 'horas-extras', label: 'Horas Extras', icon: 'Timer' },
  { id: 'historico', label: 'Historico', icon: 'Clock' },
  { id: 'portal', label: 'Portal', icon: 'Globe' },
] as const

// --- Cadastros: Segmento de cliente ---

export const CLIENT_SEGMENT_LABELS: Record<ClientSegment, string> = {
  automotivo: 'Automotivo',
  varejo: 'Varejo',
  fintech: 'Fintech',
  alimentos_bebidas: 'Alimentos e Bebidas',
  moda: 'Moda',
  tecnologia: 'Tecnologia',
  saude: 'Saude',
  educacao: 'Educacao',
  governo: 'Governo',
  outro: 'Outro',
}

// --- Cadastros: Tipo de pessoa ---

export const PERSON_TYPE_LABELS = {
  internal: 'Interno',
  freelancer: 'Freelancer',
} as const

// --- Financeiro: Labels ---

export const FINANCIAL_RECORD_TYPE_LABELS: Record<
  import('@/types/financial').FinancialRecordType,
  string
> = {
  receita: 'Receita',
  despesa: 'Despesa',
}

export const FINANCIAL_RECORD_STATUS_LABELS: Record<
  import('@/types/financial').FinancialRecordStatus,
  string
> = {
  pendente: 'Pendente',
  pago: 'Pago',
  atrasado: 'Atrasado',
  cancelado: 'Cancelado',
}

export const FINANCIAL_RECORD_CATEGORY_LABELS: Record<
  import('@/types/financial').FinancialRecordCategory,
  string
> = {
  cache_equipe: 'Cache Equipe',
  locacao: 'Locacao',
  equipamento: 'Equipamento',
  transporte: 'Transporte',
  alimentacao: 'Alimentacao',
  cenografia: 'Cenografia',
  figurino: 'Figurino',
  pos_producao: 'Pos-Producao',
  musica_audio: 'Musica/Audio',
  seguro: 'Seguro',
  taxa_administrativa: 'Taxa Administrativa',
  imposto: 'Imposto',
  receita_cliente: 'Receita Cliente',
  adiantamento: 'Adiantamento',
  reembolso: 'Reembolso',
  outro: 'Outro',
}

export const PAYMENT_METHOD_LABELS: Record<
  import('@/types/financial').PaymentMethod,
  string
> = {
  pix: 'PIX',
  transferencia: 'Transferencia',
  boleto: 'Boleto',
  cartao_credito: 'Cartao de Credito',
  cartao_debito: 'Cartao de Debito',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
  outro: 'Outro',
}

export const INVOICE_TYPE_LABELS: Record<
  import('@/types/financial').InvoiceType,
  string
> = {
  nf_servico: 'NF Servico',
  nf_produto: 'NF Produto',
  recibo: 'Recibo',
  fatura: 'Fatura',
}

export const INVOICE_STATUS_LABELS: Record<
  import('@/types/financial').InvoiceStatus,
  string
> = {
  emitida: 'Emitida',
  paga: 'Paga',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
}

// --- Notificacoes: Labels ---

export const NOTIFICATION_TYPE_LABELS: Record<
  import('@/types/notifications').NotificationType,
  string
> = {
  job_approved: 'Job Aprovado',
  status_changed: 'Status Alterado',
  team_added: 'Adicionado a Equipe',
  deadline_approaching: 'Prazo Proximo',
  margin_alert: 'Alerta de Margem',
  deliverable_overdue: 'Entregavel Atrasado',
  shooting_date_approaching: 'Diaria Proxima',
  integration_failed: 'Falha de Integracao',
}

export const NOTIFICATION_PRIORITY_LABELS: Record<
  import('@/types/notifications').NotificationPriority,
  string
> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}

// --- Financeiro: Estilos ---

export const FINANCIAL_STATUS_STYLE_MAP: Record<
  import('@/types/financial').FinancialRecordStatus,
  { bgClass: string; textClass: string }
> = {
  pendente: {
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  pago: {
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-600 dark:text-green-400',
  },
  atrasado: {
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-600 dark:text-red-400',
  },
  cancelado: {
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-500 dark:text-zinc-400',
  },
}

// =========================================================================
// AREA SYSTEM — Navegacao por areas com color-coding
// =========================================================================

export type AreaType = 'producao' | 'comercial' | 'financeiro' | 'equipe' | 'admin'

export const AREA_CONFIG: Record<
  AreaType,
  {
    label: string
    color: string
    bgClass: string
    textClass: string
    dotClass: string
    tintClass: string
  }
> = {
  producao: {
    label: 'Producao',
    color: '#3B82F6',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
    tintClass: 'from-blue-500/3',
  },
  comercial: {
    label: 'Comercial',
    color: '#8B5CF6',
    bgClass: 'bg-violet-500/10',
    textClass: 'text-violet-600 dark:text-violet-400',
    dotClass: 'bg-violet-500',
    tintClass: 'from-violet-500/3',
  },
  financeiro: {
    label: 'Financeiro',
    color: '#10B981',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    tintClass: 'from-emerald-500/3',
  },
  equipe: {
    label: 'Equipe',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
    tintClass: 'from-amber-500/3',
  },
  admin: {
    label: 'Admin',
    color: '#64748B',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-600 dark:text-slate-400',
    dotClass: 'bg-slate-500',
    tintClass: 'from-slate-500/3',
  },
}

// Sidebar sections — substitui NAV_ITEMS flat
export interface SidebarItem {
  label: string
  href: string
  icon: string
  exact?: boolean
  disabled?: boolean
  adminOnly?: boolean
}

export interface SidebarSection {
  area: AreaType | null // null = Dashboard (sem secao header)
  items: SidebarItem[]
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    area: null,
    items: [
      { label: 'Dashboard', href: '/', icon: 'LayoutDashboard', exact: true },
    ],
  },
  {
    area: 'producao',
    items: [
      { label: 'Jobs', href: '/jobs', icon: 'Clapperboard' },
      { label: 'Calendario', href: '/team/calendar', icon: 'CalendarDays' },
      { label: 'Aprovacoes', href: '/approvals', icon: 'ClipboardCheck' },
    ],
  },
  {
    area: 'comercial',
    items: [
      { label: 'Dashboard', href: '/crm/dashboard', icon: 'BarChart3' },
      { label: 'Relatorio', href: '/crm/report', icon: 'FileBarChart' },
      { label: 'Pipeline', href: '/crm', icon: 'Target' },
      { label: 'Clientes', href: '/clients', icon: 'Building2' },
      { label: 'Agencias', href: '/agencies', icon: 'Briefcase' },
    ],
  },
  {
    area: 'financeiro',
    items: [
      { label: 'Visao Geral', href: '/financeiro', icon: 'DollarSign', exact: true },
      { label: 'Fornecedores', href: '/financeiro/vendors', icon: 'UserRoundSearch' },
      { label: 'Calendario Pgtos', href: '/financeiro/calendario', icon: 'CalendarClock' },
      { label: 'Fluxo de Caixa', href: '/financeiro/fluxo-caixa', icon: 'TrendingUp' },
      { label: 'Validacao NFs', href: '/financeiro/nf-validation', icon: 'FileCheck2' },
      { label: 'Solicitar NFs', href: '/financeiro/nf-request', icon: 'MailPlus' },
      { label: 'Conciliacao', href: '/financeiro/conciliacao', icon: 'Landmark' },
    ],
  },
  {
    area: 'equipe',
    items: [
      { label: 'Pessoas', href: '/people', icon: 'Users' },
      { label: 'Atendimento', href: '/atendimento', icon: 'Headset' },
      { label: 'Portal', href: '/portal', icon: 'Globe' },
      { label: 'Relatorios', href: '/reports', icon: 'BarChart3' },
    ],
  },
  {
    area: 'admin',
    items: [
      { label: 'Equipe', href: '/admin/equipe', icon: 'Users', adminOnly: true },
      { label: 'Configuracoes', href: '/settings', icon: 'Settings', adminOnly: true },
      { label: 'Categorias Custo', href: '/admin/financeiro/categorias', icon: 'ListTree', adminOnly: true },
    ],
  },
]

// Job Detail Tab Groups — substitui renderizacao flat do JOB_DETAIL_TABS
export interface JobTabGroup {
  group: string
  area: AreaType
  tabs: Array<{ id: JobDetailTabId; label: string; icon: string }>
}

export const JOB_TAB_GROUPS: JobTabGroup[] = [
  {
    group: 'Info',
    area: 'producao',
    tabs: [
      { id: 'geral', label: 'Geral', icon: 'FileText' },
      { id: 'equipe', label: 'Equipe', icon: 'Users' },
      { id: 'entregaveis', label: 'Entregaveis', icon: 'Package' },
    ],
  },
  {
    group: 'Producao',
    area: 'producao',
    tabs: [
      { id: 'ppm', label: 'PPM', icon: 'FileCheck' },
      { id: 'diarias', label: 'Diarias', icon: 'Calendar' },
      { id: 'locacoes', label: 'Locacoes', icon: 'MapPin' },
      { id: 'storyboard', label: 'Storyboard', icon: 'Film' },
      { id: 'elenco', label: 'Elenco', icon: 'Users' },
      { id: 'ordem-do-dia', label: 'Ordem do Dia', icon: 'ClipboardList' },
      { id: 'diario', label: 'Diario', icon: 'BookOpen' },
      { id: 'figurino', label: 'Figurino/Arte', icon: 'Shirt' },
    ],
  },
  {
    group: 'Gestao',
    area: 'financeiro',
    tabs: [
      { id: 'financeiro', label: 'Financeiro', icon: 'DollarSign' },
      { id: 'cronograma', label: 'Cronograma', icon: 'GanttChartSquare' },
      { id: 'aprovacoes', label: 'Aprovacoes', icon: 'CheckSquare' },
      { id: 'contratos', label: 'Contratos', icon: 'PenLine' },
      { id: 'claquete', label: 'Claquete', icon: 'Clapperboard' },
      { id: 'atendimento', label: 'Atendimento', icon: 'Headset' },
      { id: 'horas-extras', label: 'Horas Extras', icon: 'Timer' },
    ],
  },
  {
    group: 'Registro',
    area: 'admin',
    tabs: [
      { id: 'historico', label: 'Historico', icon: 'Clock' },
      { id: 'portal', label: 'Portal', icon: 'Globe' },
    ],
  },
]

// Helper: detectar area ativa pelo pathname
export function getActiveArea(pathname: string): AreaType | null {
  if (pathname.startsWith('/jobs') || pathname.startsWith('/approvals') || pathname.startsWith('/team/calendar')) {
    return 'producao'
  }
  if (pathname.startsWith('/crm') || pathname.startsWith('/clients') || pathname.startsWith('/agencies')) {
    return 'comercial'
  }
  if (pathname.startsWith('/financeiro')) {
    return 'financeiro'
  }
  if (pathname.startsWith('/people') || pathname.startsWith('/atendimento') || pathname.startsWith('/portal') || pathname.startsWith('/reports')) {
    return 'equipe'
  }
  if (pathname.startsWith('/settings') || pathname.startsWith('/admin')) {
    return 'admin'
  }
  return null
}
