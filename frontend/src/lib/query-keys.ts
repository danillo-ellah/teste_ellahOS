import type { JobFilters } from '@/types/jobs'

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
  list: (search?: string) => [...clientKeys.all, 'list', search] as const,
}

export const agencyKeys = {
  all: ['agencies'] as const,
  list: (search?: string) => [...agencyKeys.all, 'list', search] as const,
}

export const peopleKeys = {
  all: ['people'] as const,
  list: (search?: string) => [...peopleKeys.all, 'list', search] as const,
}
