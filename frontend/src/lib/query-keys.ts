import type { JobFilters } from '@/types/jobs'
import type { ClientFilters, AgencyFilters } from '@/types/clients'
import type { PersonFilters } from '@/types/people'
import type { FinancialRecordFilters } from '@/types/financial'
import type { NotificationFilters } from '@/types/notifications'

export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  list: (filters: JobFilters) => [...jobKeys.lists(), filters] as const,
  details: () => [...jobKeys.all, 'detail'] as const,
  detail: (id: string) => [...jobKeys.details(), id] as const,
  team: (jobId: string) => [...jobKeys.detail(jobId), 'team'] as const,
  deliverables: (jobId: string) =>
    [...jobKeys.detail(jobId), 'deliverables'] as const,
  shootingDates: (jobId: string) =>
    [...jobKeys.detail(jobId), 'shooting-dates'] as const,
  history: (jobId: string, filters?: Record<string, string>) =>
    [...jobKeys.detail(jobId), 'history', filters] as const,
  driveFolders: (jobId: string) =>
    [...jobKeys.detail(jobId), 'drive-folders'] as const,
  whatsappMessages: (jobId: string) =>
    [...jobKeys.detail(jobId), 'whatsapp-messages'] as const,
}

export const clientKeys = {
  all: ['clients'] as const,
  lists: () => [...clientKeys.all, 'list'] as const,
  list: (search?: string) => [...clientKeys.lists(), search] as const,
  listFiltered: (filters: ClientFilters) => [...clientKeys.lists(), 'filtered', filters] as const,
  details: () => [...clientKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientKeys.details(), id] as const,
  contacts: (clientId: string) => [...clientKeys.detail(clientId), 'contacts'] as const,
}

export const agencyKeys = {
  all: ['agencies'] as const,
  lists: () => [...agencyKeys.all, 'list'] as const,
  list: (search?: string) => [...agencyKeys.lists(), search] as const,
  listFiltered: (filters: AgencyFilters) => [...agencyKeys.lists(), 'filtered', filters] as const,
  details: () => [...agencyKeys.all, 'detail'] as const,
  detail: (id: string) => [...agencyKeys.details(), id] as const,
  contacts: (agencyId: string) => [...agencyKeys.detail(agencyId), 'contacts'] as const,
}

export const peopleKeys = {
  all: ['people'] as const,
  lists: () => [...peopleKeys.all, 'list'] as const,
  list: (search?: string) => [...peopleKeys.lists(), search] as const,
  listFiltered: (filters: PersonFilters) => [...peopleKeys.lists(), 'filtered', filters] as const,
  details: () => [...peopleKeys.all, 'detail'] as const,
  detail: (id: string) => [...peopleKeys.details(), id] as const,
  jobHistory: (personId: string) => [...peopleKeys.detail(personId), 'job-history'] as const,
}

export const contactKeys = {
  all: ['contacts'] as const,
  list: (entityId: string) => [...contactKeys.all, 'list', entityId] as const,
}

export const financialKeys = {
  all: ['financial'] as const,
  lists: () => [...financialKeys.all, 'list'] as const,
  list: (filters: FinancialRecordFilters) =>
    [...financialKeys.lists(), filters] as const,
  details: () => [...financialKeys.all, 'detail'] as const,
  detail: (id: string) => [...financialKeys.details(), id] as const,
  summary: (jobId?: string) =>
    [...financialKeys.all, 'summary', jobId] as const,
}

export const budgetKeys = {
  all: ['budgets'] as const,
  lists: () => [...budgetKeys.all, 'list'] as const,
  listByJob: (jobId: string) => [...budgetKeys.lists(), jobId] as const,
  details: () => [...budgetKeys.all, 'detail'] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
  items: (budgetId: string) =>
    [...budgetKeys.detail(budgetId), 'items'] as const,
}

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  listByJob: (jobId: string) => [...invoiceKeys.lists(), jobId] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
}

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
}

export const allocationKeys = {
  all: ['allocations'] as const,
  lists: () => [...allocationKeys.all, 'list'] as const,
  listByJob: (jobId: string) => [...allocationKeys.lists(), 'job', jobId] as const,
  listByPerson: (personId: string, from: string, to: string) =>
    [...allocationKeys.lists(), 'person', personId, from, to] as const,
  conflicts: (from: string, to: string) =>
    [...allocationKeys.all, 'conflicts', from, to] as const,
}

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  listByJob: (jobId: string) => [...approvalKeys.lists(), 'job', jobId] as const,
  pending: () => [...approvalKeys.all, 'pending'] as const,
  detail: (id: string) => [...approvalKeys.all, 'detail', id] as const,
  logs: (id: string) => [...approvalKeys.detail(id), 'logs'] as const,
  public: (token: string) => ['approval-public', token] as const,
}

export const settingsKeys = {
  all: ['settings'] as const,
  integrations: () => [...settingsKeys.all, 'integrations'] as const,
  integration: (name: string) => [...settingsKeys.integrations(), name] as const,
  logs: () => [...settingsKeys.all, 'logs'] as const,
  logsList: (filters: Record<string, string>) => [...settingsKeys.logs(), filters] as const,
}
