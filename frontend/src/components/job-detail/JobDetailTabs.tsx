'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  FileText,
  Users,
  Package,
  DollarSign,
  Calendar,
  Clock,
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { JOB_DETAIL_TABS } from '@/lib/constants'
import type { JobDetailTabId } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { TabGeral } from '@/components/job-detail/tabs/TabGeral'
import { TabEquipe } from '@/components/job-detail/tabs/TabEquipe'
import { TabEntregaveis } from '@/components/job-detail/tabs/TabEntregaveis'
import { TabFinanceiro } from '@/components/job-detail/tabs/TabFinanceiro'
import { TabDiarias } from '@/components/job-detail/tabs/TabDiarias'
import { TabHistorico } from '@/components/job-detail/tabs/TabHistorico'
import type { JobDetail } from '@/types/jobs'

// Mapa de icones por nome
const ICON_MAP: Record<string, typeof FileText> = {
  FileText,
  Users,
  Package,
  DollarSign,
  Calendar,
  Clock,
}

interface JobDetailTabsProps {
  job: JobDetail
}

// Contadores para os badges das abas
function getTabCount(tabId: JobDetailTabId, job: JobDetail): number | null {
  switch (tabId) {
    case 'equipe':
      return job.team?.length ?? null
    case 'entregaveis':
      return job.deliverables?.length ?? null
    case 'diarias':
      return job.shooting_dates?.length ?? null
    case 'historico':
      return job.history?.length ?? null
    default:
      return null
  }
}

export function JobDetailTabs({ job }: JobDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get('tab') as JobDetailTabId) || 'geral'

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'geral') {
      params.delete('tab')
    } else {
      params.set('tab', value)
    }
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="mt-4">
      <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0 overflow-x-auto">
        {JOB_DETAIL_TABS.map((tab) => {
          const Icon = ICON_MAP[tab.icon]
          const count = getTabCount(tab.id, job)

          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'relative rounded-none border-b-2 border-transparent px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap',
                'text-muted-foreground hover:text-foreground transition-colors',
                'data-[state=active]:border-primary data-[state=active]:text-foreground',
                'data-[state=active]:shadow-none data-[state=active]:bg-transparent',
              )}
            >
              {Icon && <Icon className="size-4 mr-1.5" />}
              <span className="hidden sm:inline">{tab.label}</span>
              {count !== null && count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                  {count}
                </span>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>

      {/* Tab: Geral */}
      <TabsContent value="geral" className="mt-6">
        <TabGeral job={job} />
      </TabsContent>

      {/* Tab: Equipe */}
      <TabsContent value="equipe" className="mt-6">
        <TabEquipe job={job} />
      </TabsContent>

      {/* Tab: Entregaveis */}
      <TabsContent value="entregaveis" className="mt-6">
        <TabEntregaveis job={job} />
      </TabsContent>

      {/* Tab: Financeiro */}
      <TabsContent value="financeiro" className="mt-6">
        <TabFinanceiro job={job} />
      </TabsContent>

      {/* Tab: Diarias */}
      <TabsContent value="diarias" className="mt-6">
        <TabDiarias job={job} />
      </TabsContent>

      {/* Tab: Historico */}
      <TabsContent value="historico" className="mt-6">
        <TabHistorico job={job} />
      </TabsContent>
    </Tabs>
  )
}
