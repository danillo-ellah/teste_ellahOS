'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useOpportunity } from '@/hooks/useCrm'
import { OpportunityFullDetail } from '@/components/crm/OpportunityFullDetail'
import { STAGE_CONFIG } from '@/components/crm/CrmKanban'
import { cn } from '@/lib/utils'

interface CrmDetailPageProps {
  params: Promise<{ id: string }>
}

export default function CrmDetailPage({ params }: CrmDetailPageProps) {
  const { id } = use(params)
  const { data: opportunity, isLoading, isError } = useOpportunity(id)

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/crm"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Target className="size-3.5" />
          Comercial
        </Link>
        <ChevronRight className="size-3.5" />
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <>
            <span className="truncate text-foreground font-medium max-w-xs">
              {opportunity?.title ?? 'Oportunidade'}
            </span>
            {opportunity?.stage && STAGE_CONFIG[opportunity.stage] && (
              <Badge className={cn('text-[10px] ml-1', STAGE_CONFIG[opportunity.stage].badgeClass)}>
                {STAGE_CONFIG[opportunity.stage].label}
              </Badge>
            )}
          </>
        )}
      </div>

      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2">
          <Link href="/crm">
            <ArrowLeft className="size-4" />
            Voltar ao Pipeline
          </Link>
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive">
            Oportunidade nao encontrada ou erro ao carregar.
          </p>
          <Button variant="outline" size="sm" asChild className="mt-4">
            <Link href="/crm">Voltar ao Pipeline</Link>
          </Button>
        </div>
      )}

      {/* Main content */}
      {!isLoading && !isError && opportunity && (
        <OpportunityFullDetail opportunity={opportunity} />
      )}
    </div>
  )
}
