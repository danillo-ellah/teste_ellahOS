'use client'

import { BookOpen, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useReferenceJobs } from '@/hooks/useCostItems'
import { formatCurrency, formatDate } from '@/lib/format'

interface ReferenceJob {
  id: string
  code: string
  title: string
  status: string
  project_type: string
  closed_value: number | null
  created_at: string
  cost_items_count: number
  total_estimated: number
  total_paid: number
}

interface ReferenceJobsResponse {
  project_type: string
  reference_jobs: ReferenceJob[]
}

interface ReferenceJobCardProps {
  job: ReferenceJob
}

const STATUS_COLORS: Record<string, string> = {
  orcamento: '#f59e0b',
  pre_producao: '#3b82f6',
  producao: '#8b5cf6',
  pos_producao: '#6366f1',
  entregue: '#22c55e',
  finalizado: '#10b981',
  cancelado: '#ef4444',
}

function ReferenceJobCard({ job }: ReferenceJobCardProps) {
  const accentColor = STATUS_COLORS[job.status] ?? '#94a3b8'
  const pctPaid = job.total_estimated > 0 ? (job.total_paid / job.total_estimated) * 100 : 0

  return (
    <Card className="p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: accentColor }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              {job.code}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] shrink-0"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {job.status.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-sm font-medium mt-1 line-clamp-2">{job.title}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(job.created_at)} &middot; {job.cost_items_count} item(s) de custo
          </p>
        </div>
        <a
          href={`/jobs/${job.id}/financeiro/orcamento`}
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir job de referencia"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {job.closed_value != null && (
          <div>
            <p className="text-muted-foreground">OC</p>
            <p className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">{formatCurrency(job.closed_value)}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Estimado</p>
          <p className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{formatCurrency(job.total_estimated)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Pago</p>
          <p className="font-semibold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(job.total_paid)}</p>
        </div>
      </div>

      {/* Barra de progresso pago vs estimado */}
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, pctPaid)}%`,
            backgroundColor: pctPaid >= 80 ? '#22c55e' : '#f59e0b',
          }}
        />
      </div>
    </Card>
  )
}

function ReferenceJobsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </Card>
      ))}
    </div>
  )
}

interface ReferenceJobsSectionProps {
  jobId: string
}

export function ReferenceJobsSection({ jobId }: ReferenceJobsSectionProps) {
  const query = useReferenceJobs(jobId)
  const responseData = query.data?.data as ReferenceJobsResponse | undefined
  const referenceJobs = responseData?.reference_jobs ?? []
  const projectType = responseData?.project_type

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          Jobs de Referencia
          {projectType && (
            <Badge variant="secondary" className="text-xs font-normal ml-1">
              {projectType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading && <ReferenceJobsSkeleton />}

        {query.isError && !query.isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Erro ao carregar jobs de referencia.
          </p>
        )}

        {!query.isLoading && !query.isError && referenceJobs.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum job de referencia encontrado para este tipo de producao.
            </p>
          </div>
        )}

        {!query.isLoading && !query.isError && referenceJobs.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {referenceJobs.map(job => (
              <ReferenceJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
