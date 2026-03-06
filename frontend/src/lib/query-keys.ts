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
  companyInfo: () => [...settingsKeys.all, 'company-info'] as const,
  integrations: () => [...settingsKeys.all, 'integrations'] as const,
  integration: (name: string) => [...settingsKeys.integrations(), name] as const,
  logs: () => [...settingsKeys.all, 'logs'] as const,
  logsList: (filters: Record<string, string>) => [...settingsKeys.logs(), filters] as const,
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: () => [...dashboardKeys.all, 'kpis'] as const,
  pipeline: () => [...dashboardKeys.all, 'pipeline'] as const,
  alerts: (limit?: number) => [...dashboardKeys.all, 'alerts', limit] as const,
  activity: (hours?: number, limit?: number) => [...dashboardKeys.all, 'activity', hours, limit] as const,
  revenue: (months?: number) => [...dashboardKeys.all, 'revenue', months] as const,
}

export const reportKeys = {
  all: ['reports'] as const,
  financial: (startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'financial', startDate, endDate] as const,
  performance: (groupBy?: string, startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'performance', groupBy, startDate, endDate] as const,
  team: (startDate?: string, endDate?: string) =>
    [...reportKeys.all, 'team', startDate, endDate] as const,
}

export const portalKeys = {
  all: ['portal'] as const,
  sessions: () => [...portalKeys.all, 'sessions'] as const,
  sessionsByJob: (jobId: string) => [...portalKeys.sessions(), 'job', jobId] as const,
  sessionMessages: (sessionId: string) =>
    [...portalKeys.all, 'session-messages', sessionId] as const,
  public: (token: string) => ['portal-public', token] as const,
}

export const aiBudgetKeys = {
  all: ['ai-budget-estimates'] as const,
  history: (jobId: string) => [...aiBudgetKeys.all, 'history', jobId] as const,
}

export const copilotKeys = {
  all: ['ai-copilot'] as const,
  conversations: () => [...copilotKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...copilotKeys.conversations(), id] as const,
}

export const dailiesKeys = {
  all: ['ai-dailies'] as const,
  history: (jobId: string) => [...dailiesKeys.all, 'history', jobId] as const,
}

export const freelancerMatchKeys = {
  all: ['ai-freelancer-match'] as const,
  suggestions: (jobId: string, role: string) => [...freelancerMatchKeys.all, 'suggestions', jobId, role] as const,
}

export const nfKeys = {
  all: ['nf-processor'] as const,
  lists: () => [...nfKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...nfKeys.lists(), filters] as const,
  stats: () => [...nfKeys.all, 'stats'] as const,
}

export const nfRequestKeys = {
  all: ['nf-request'] as const,
  lists: () => [...nfRequestKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...nfRequestKeys.lists(), filters] as const,
  stats: () => [...nfRequestKeys.all, 'stats'] as const,
}

export const docusealKeys = {
  all: ['docuseal'] as const,
  lists: () => [...docusealKeys.all, 'list'] as const,
  list: (jobId: string) => [...docusealKeys.lists(), jobId] as const,
  details: () => [...docusealKeys.all, 'detail'] as const,
  detail: (id: string) => [...docusealKeys.details(), id] as const,
  templates: () => [...docusealKeys.all, 'templates'] as const,
}

export const vendorKeys = {
  all: ['vendors'] as const,
  lists: () => [...vendorKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...vendorKeys.lists(), filters] as const,
  details: () => [...vendorKeys.all, 'detail'] as const,
  detail: (id: string) => [...vendorKeys.details(), id] as const,
  suggest: (q: string) => [...vendorKeys.all, 'suggest', q] as const,
  banks: () => [...vendorKeys.all, 'banks'] as const,
}

export const costItemKeys = {
  all: ['cost-items'] as const,
  lists: () => [...costItemKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...costItemKeys.lists(), filters] as const,
  details: () => [...costItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...costItemKeys.details(), id] as const,
  budgetSummary: (jobId: string) => [...costItemKeys.all, 'budget-summary', jobId] as const,
  referenceJobs: (jobId: string) => [...costItemKeys.all, 'reference-jobs', jobId] as const,
}

export const paymentKeys = {
  all: ['payment-manager'] as const,
  batchPreview: (ids: string[]) => [...paymentKeys.all, 'batch-preview', ids] as const,
}

export const finDashboardKeys = {
  all: ['financial-dashboard'] as const,
  job: (jobId: string) => [...finDashboardKeys.all, 'job', jobId] as const,
  jobCharts: (jobId: string, period?: string) =>
    [...finDashboardKeys.all, 'job', jobId, 'charts', period] as const,
  tenant: () => [...finDashboardKeys.all, 'tenant'] as const,
}

export const cashAdvanceKeys = {
  all: ['cash-advances'] as const,
  lists: () => [...cashAdvanceKeys.all, 'list'] as const,
  list: (jobId: string) => [...cashAdvanceKeys.lists(), jobId] as const,
  details: () => [...cashAdvanceKeys.all, 'detail'] as const,
  detail: (id: string) => [...cashAdvanceKeys.details(), id] as const,
}

export const approvalPdfKeys = {
  all: ['approval-pdf'] as const,
  files: (jobId: string) => [...approvalPdfKeys.all, 'files', jobId] as const,
}

export const paymentApprovalKeys = {
  all: ['payment-approvals'] as const,
  lists: () => [...paymentApprovalKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...paymentApprovalKeys.lists(), filters] as const,
  pending: (jobId?: string) => [...paymentApprovalKeys.all, 'pending', jobId] as const,
  detail: (id: string) => [...paymentApprovalKeys.all, 'detail', id] as const,
  check: (costItemId: string, amount: number) =>
    [...paymentApprovalKeys.all, 'check', costItemId, amount] as const,
  rules: () => [...paymentApprovalKeys.all, 'rules'] as const,
}

export const paymentProofKeys = {
  all: ['payment-proofs'] as const,
  lists: () => [...paymentProofKeys.all, 'list'] as const,
  list: (params: Record<string, string | undefined>) =>
    [...paymentProofKeys.lists(), params] as const,
  detail: (id: string) => [...paymentProofKeys.all, 'detail', id] as const,
}

export const locationKeys = {
  all: ['locations'] as const,
  lists: () => [...locationKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...locationKeys.lists(), filters] as const,
  details: () => [...locationKeys.all, 'detail'] as const,
  detail: (id: string) => [...locationKeys.details(), id] as const,
  byJob: (jobId: string) => [...locationKeys.all, 'job', jobId] as const,
  suggest: (q: string) => [...locationKeys.all, 'suggest', q] as const,
}

export const crmKeys = {
  all: ['crm'] as const,
  pipeline: (includeClosed?: boolean) => [...crmKeys.all, 'pipeline', includeClosed] as const,
  opportunities: () => [...crmKeys.all, 'opportunities'] as const,
  list: (filters: Record<string, string>) => [...crmKeys.opportunities(), 'list', filters] as const,
  detail: (id: string) => [...crmKeys.opportunities(), 'detail', id] as const,
  activities: (opportunityId: string) => [...crmKeys.detail(opportunityId), 'activities'] as const,
  stats: (periodDays?: number) => [...crmKeys.all, 'stats', periodDays] as const,
  agencyHistory: (agencyId: string) => [...crmKeys.all, 'agency-history', agencyId] as const,
  dashboard: () => [...crmKeys.all, 'dashboard'] as const,
  alerts: () => [...crmKeys.all, 'alerts'] as const,
  directorRanking: (months?: number) => [...crmKeys.all, 'director-ranking', months] as const,
  monthlyReport: (month?: string) => [...crmKeys.all, 'report', month] as const,
}

export const bankReconciliationKeys = {
  all: ['bank-reconciliation'] as const,
  statements: () => [...bankReconciliationKeys.all, 'statements'] as const,
  statementList: (filters: Record<string, string>) =>
    [...bankReconciliationKeys.statements(), filters] as const,
  transactions: (statementId: string) =>
    [...bankReconciliationKeys.all, 'transactions', statementId] as const,
  transactionList: (statementId: string, filters: Record<string, string>) =>
    [...bankReconciliationKeys.transactions(statementId), filters] as const,
}

export const paymentCalendarKeys = {
  all: ['payment-calendar'] as const,
  events: (start: string, end: string, jobId?: string) =>
    [...paymentCalendarKeys.all, 'events', start, end, jobId] as const,
  kpis: (start: string, end: string, jobId?: string) =>
    [...paymentCalendarKeys.all, 'kpis', start, end, jobId] as const,
}

export const cashflowKeys = {
  all: ['cashflow'] as const,
  projection: (start: string, end: string, granularity: string) =>
    ['cashflow', 'projection', start, end, granularity] as const,
}
