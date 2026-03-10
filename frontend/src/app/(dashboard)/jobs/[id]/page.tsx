'use client'

import { Suspense, use, useMemo } from 'react'
import { notFound } from 'next/navigation'
import { JobHeader } from '@/components/job-detail/JobHeader'
import { JobStatusPipeline } from '@/components/job-detail/JobStatusPipeline'
import { JobDetailTabs } from '@/components/job-detail/JobDetailTabs'
import { JobDetailSkeleton } from '@/components/job-detail/JobDetailSkeleton'
import { useJob } from '@/hooks/useJob'
import { ApiRequestError } from '@/lib/api'
import { useBreadcrumbOverride } from '@/hooks/useBreadcrumbOverride'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function JobDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useJob(id, {
    include: ['team', 'deliverables', 'shooting_dates', 'history'],
  })

  // Breadcrumb dinamico: "Jobs > [CODE] - [Titulo]" assim que o job carrega
  const breadcrumbItems = useMemo(() => {
    if (!job) return null
    const jobLabel = job.job_code
      ? `${job.job_code}${job.title ? ` - ${job.title}` : ''}`
      : job.title ?? 'Detalhe'
    return [
      { label: 'Jobs', href: '/jobs' },
      { label: jobLabel },
    ]
  }, [job])

  useBreadcrumbOverride(breadcrumbItems)

  if (isLoading) {
    return <JobDetailSkeleton />
  }

  // 404 se o job nao for encontrado
  if (
    isError &&
    error instanceof ApiRequestError &&
    error.status === 404
  ) {
    notFound()
  }

  if (isError || !job) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm text-muted-foreground">
          Erro ao carregar detalhes do job.
        </p>
        <a
          href={`/jobs/${id}`}
          className="text-sm text-primary hover:underline"
        >
          Tentar novamente
        </a>
      </div>
    )
  }

  return (
    <div>
      <JobHeader job={job} />
      <JobStatusPipeline currentStatus={job.status} className="mt-4" />
      <Suspense fallback={null}>
        <JobDetailTabs job={job} />
      </Suspense>
    </div>
  )
}
