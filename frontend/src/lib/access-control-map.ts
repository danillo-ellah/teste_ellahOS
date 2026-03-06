/**
 * Mapa centralizado de controle de acesso — fonte unica de verdade.
 * Baseado nas 31 perguntas com o CEO (06/03/2026) + respostas PO-01 a PO-07 (07/03/2026).
 * Mesmo mapa governa Drive (drive-permission-map.ts) e frontend (este arquivo).
 */

import type { JobDetailTabId } from './constants'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']
type TeamRole = Database['public']['Enums']['team_role']

// --- Tipos ---

export type TabAccessLevel = 'view_edit' | 'view' | 'view_restricted' | 'hidden'

export type RoleGroup =
  | 'admin' | 'pe' | 'dp' | 'coord' | 'fin' | 'jur'
  | 'atd' | 'cco' | 'dc' | 'dop' | 'pos' | 'da'
  | 'fig' | 'cas' | 'tec'

// --- Mapeamentos role → grupo ---

const USER_ROLE_TO_GROUP: Record<UserRole, RoleGroup> = {
  admin: 'admin',
  ceo: 'admin',
  produtor_executivo: 'pe',
  coordenador: 'coord',
  diretor: 'dc',
  financeiro: 'fin',
  atendimento: 'atd',
  comercial: 'cco',
  freelancer: 'tec',
}

// team_role inclui valores novos do migration G-04 (ainda nao no generated types)
const TEAM_ROLE_TO_GROUP: Record<string, RoleGroup> = {
  diretor: 'dc',
  produtor_executivo: 'pe',
  coordenador_producao: 'coord',
  dop: 'dop',
  primeiro_assistente: 'dc',
  editor: 'pos',
  colorista: 'pos',
  motion_designer: 'pos',
  finalizador: 'pos',
  diretor_arte: 'da',
  figurinista: 'fig',
  produtor_casting: 'cas',
  produtor_locacao: 'tec',
  gaffer: 'tec',
  som_direto: 'tec',
  maquiador: 'tec',
  outro: 'tec',
  // Novos enum values (migration G-04)
  cco: 'cco',
  diretor_producao: 'dp',
  atendimento: 'atd',
  financeiro: 'fin',
  juridico: 'jur',
}

// --- Mapa de acesso: grupo × aba → nivel ---
// Abas nao listadas = 'hidden'

type TabMap = Partial<Record<JobDetailTabId, TabAccessLevel>>

const ALL_TABS_VE: TabMap = {
  'geral': 'view_edit', 'equipe': 'view_edit', 'entregaveis': 'view_edit',
  'ppm': 'view_edit', 'diarias': 'view_edit', 'locacoes': 'view_edit',
  'storyboard': 'view_edit', 'elenco': 'view_edit', 'ordem-do-dia': 'view_edit',
  'diario': 'view_edit', 'figurino': 'view_edit', 'financeiro': 'view_edit',
  'cronograma': 'view_edit', 'aprovacoes': 'view_edit', 'contratos': 'view_edit',
  'claquete': 'view_edit', 'horas-extras': 'view_edit',
  'historico': 'view_edit', 'portal': 'view_edit',
}

const ACCESS_MAP: Record<RoleGroup, TabMap> = {
  admin: ALL_TABS_VE,
  pe: ALL_TABS_VE,

  dp: {
    'geral': 'view_restricted', 'equipe': 'view_restricted',
    'entregaveis': 'view', 'diarias': 'view', 'locacoes': 'view',
    'ordem-do-dia': 'view', 'diario': 'view',
    'financeiro': 'view_restricted', 'cronograma': 'view',
    'aprovacoes': 'view', 'claquete': 'view', 'horas-extras': 'view',
  },

  coord: {
    'geral': 'view', 'equipe': 'view', 'entregaveis': 'view',
    'diarias': 'view', 'locacoes': 'view', 'ordem-do-dia': 'view',
    'diario': 'view', 'cronograma': 'view', 'aprovacoes': 'view',
    'claquete': 'view', 'horas-extras': 'view',
  },

  fin: {
    'geral': 'view_restricted', 'equipe': 'view_restricted',
    'entregaveis': 'view', 'financeiro': 'view_edit',
    'cronograma': 'view', 'contratos': 'view', 'horas-extras': 'view_edit',
  },

  jur: {
    'equipe': 'view', // PO-05: precisa ver fee pra redigir contratos
    'entregaveis': 'view', 'elenco': 'view_edit', 'contratos': 'view_edit',
  },

  atd: {
    'geral': 'view', 'equipe': 'view_restricted', 'entregaveis': 'view',
    'ppm': 'view', 'cronograma': 'view', 'aprovacoes': 'view',
    'claquete': 'view', 'financeiro': 'view_restricted',
    'portal': 'view_edit', // PO-07: pode criar sessoes
  },

  cco: {
    'geral': 'view_restricted', 'entregaveis': 'view', 'cronograma': 'view',
  },

  dc: {
    'geral': 'view_restricted', 'equipe': 'view_restricted',
    'entregaveis': 'view', 'ppm': 'view_edit', 'diarias': 'view_edit',
    'locacoes': 'view_edit', 'storyboard': 'view_edit',
    'ordem-do-dia': 'view_edit', 'diario': 'view_edit',
    'cronograma': 'view_edit', 'aprovacoes': 'view_edit', 'claquete': 'view_edit',
  },

  dop: {
    'geral': 'view', 'diarias': 'view', 'locacoes': 'view',
    'ordem-do-dia': 'view', 'cronograma': 'view', 'claquete': 'view',
  },

  pos: {
    'geral': 'view_restricted', 'equipe': 'view_restricted',
    'entregaveis': 'view', 'diarias': 'view', 'ordem-do-dia': 'view',
    'diario': 'view', 'cronograma': 'view', 'aprovacoes': 'view', 'claquete': 'view',
  },

  da: {
    'geral': 'view', 'ppm': 'view_edit', 'diarias': 'view',
    'ordem-do-dia': 'view', 'cronograma': 'view', 'figurino': 'view_edit',
  },

  fig: {
    'diarias': 'view', 'ordem-do-dia': 'view',
    'cronograma': 'view', 'figurino': 'view_edit',
  },

  cas: {
    'elenco': 'view_edit', 'diarias': 'view', 'ordem-do-dia': 'view',
    'cronograma': 'view', 'contratos': 'view_restricted',
  },

  tec: {
    'diarias': 'view', 'ordem-do-dia': 'view',
    'cronograma': 'view', 'claquete': 'view',
  },
}

// Prioridade de acesso (maior = mais permissivo)
const ACCESS_PRIORITY: Record<TabAccessLevel, number> = {
  hidden: 0,
  view_restricted: 1,
  view: 2,
  view_edit: 3,
}

// --- Funcoes publicas ---

export function getUserRoleGroup(userRole: UserRole): RoleGroup {
  return USER_ROLE_TO_GROUP[userRole]
}

export function getTeamRoleGroup(teamRole: string): RoleGroup | null {
  return TEAM_ROLE_TO_GROUP[teamRole] ?? null
}

/** Acesso efetivo para uma aba = MAX(user_role, team_role) */
export function resolveTabAccess(
  userRole: UserRole,
  teamRole: string | null,
  tabId: JobDetailTabId,
): TabAccessLevel {
  const userGroup = USER_ROLE_TO_GROUP[userRole]
  const userAccess = ACCESS_MAP[userGroup][tabId] ?? 'hidden'

  if (!teamRole) return userAccess

  const teamGroup = TEAM_ROLE_TO_GROUP[teamRole]
  if (!teamGroup) return userAccess

  const teamAccess = ACCESS_MAP[teamGroup][tabId] ?? 'hidden'

  return ACCESS_PRIORITY[teamAccess] > ACCESS_PRIORITY[userAccess]
    ? teamAccess
    : userAccess
}

/** Retorna todas as abas visiveis (acesso != hidden) */
export function getVisibleTabs(
  userRole: UserRole,
  teamRole: string | null,
): JobDetailTabId[] {
  const allTabs: JobDetailTabId[] = [
    'geral', 'equipe', 'entregaveis', 'ppm', 'diarias', 'locacoes',
    'storyboard', 'elenco', 'ordem-do-dia', 'diario', 'figurino',
    'financeiro', 'cronograma', 'aprovacoes', 'contratos', 'claquete',
    'horas-extras', 'historico', 'portal',
  ]

  return allTabs.filter(
    (tab) => resolveTabAccess(userRole, teamRole, tab) !== 'hidden',
  )
}

/** Verifica se o user pode editar uma aba */
export function canEditTab(
  userRole: UserRole,
  teamRole: string | null,
  tabId: JobDetailTabId,
): boolean {
  return resolveTabAccess(userRole, teamRole, tabId) === 'view_edit'
}

/** Roles que veem TODOS os jobs sem precisar estar no job_team (PO-04: CCO e socia) */
export const GLOBAL_JOB_ROLES: UserRole[] = ['admin', 'ceo', 'produtor_executivo', 'comercial']

// --- Sidebar: acesso por rota ---
// Se href esta no mapa, so roles listados veem. Se nao esta, visivel pra todos.

const FULL_ACCESS: UserRole[] = ['admin', 'ceo', 'produtor_executivo']

export const SIDEBAR_ACCESS: Record<string, UserRole[]> = {
  // Comercial — so lideranca + CCO
  '/crm/dashboard': [...FULL_ACCESS, 'comercial'],
  '/crm/report': [...FULL_ACCESS, 'comercial'],
  '/crm': [...FULL_ACCESS, 'comercial'],
  '/clients': [...FULL_ACCESS, 'comercial', 'atendimento'],
  '/agencies': [...FULL_ACCESS, 'comercial', 'atendimento'],
  // Financeiro — so lideranca + financeiro
  '/financeiro': [...FULL_ACCESS, 'financeiro'],
  '/financeiro/vendors': [...FULL_ACCESS, 'financeiro'],
  '/financeiro/calendario': [...FULL_ACCESS, 'financeiro'],
  '/financeiro/nf-validation': [...FULL_ACCESS, 'financeiro'],
  '/financeiro/nf-request': [...FULL_ACCESS, 'financeiro'],
  '/financeiro/conciliacao': [...FULL_ACCESS, 'financeiro'],
  // Equipe — Portal so pra quem gerencia cliente
  '/portal': [...FULL_ACCESS, 'atendimento'],
  '/reports': FULL_ACCESS,
}

// --- Campos financeiros sensiveis ---
// Roles que podem ver dados financeiros em listagens (closed_value, margin, etc.)
export const FINANCIAL_VIEW_ROLES: UserRole[] = [
  'admin', 'ceo', 'produtor_executivo', 'financeiro',
]

// Roles que podem ver fee/cache na aba Equipe (spec secao 8)
// Admin/CEO, PE, Dir. Producao, Financeiro. DC/1AD, ATD, Coord, Outros = NAO.
// Dir. Producao via team_role (user_role enum ainda nao tem — futuro Fase 3)
export const FEE_VIEW_ROLES: UserRole[] = [
  'admin', 'ceo', 'produtor_executivo', 'financeiro',
]
