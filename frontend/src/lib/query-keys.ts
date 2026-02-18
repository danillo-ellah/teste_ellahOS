import type { JobFilters } from '@/types/jobs'
import type { ClientFilters, AgencyFilters } from '@/types/clients'
import type { PersonFilters } from '@/types/people'
import type { FinancialRecordFilters } from '@/types/financial'

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
