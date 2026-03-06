'use client'

import type { JobDetail } from '@/types/jobs'
import { InternalApprovalSection } from './attendance/InternalApprovalSection'
import { CommunicationLogSection } from './attendance/CommunicationLogSection'
import { ScopeExtrasSection } from './attendance/ScopeExtrasSection'
import { ClientLogisticsSection } from './attendance/ClientLogisticsSection'
import { ClientMilestonesSection } from './attendance/ClientMilestonesSection'

export function TabAtendimento({ job }: { job: JobDetail }) {
  return (
    <div className="space-y-8">
      <InternalApprovalSection jobId={job.id} />
      <CommunicationLogSection jobId={job.id} />
      <ScopeExtrasSection jobId={job.id} />
      <ClientLogisticsSection jobId={job.id} />
      <ClientMilestonesSection jobId={job.id} />
    </div>
  )
}
