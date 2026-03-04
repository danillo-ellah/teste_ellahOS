'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  FileText,
  Users,
  Package,
  DollarSign,
  Calendar,
  CheckSquare,
  Clock,
  Globe,
  PenLine,
  Clapperboard,
  FileCheck,
  Film,
  BookOpen,
  MapPin,
  Shirt,
  Timer,
} from 'lucide-react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { JOB_TAB_GROUPS, AREA_CONFIG } from '@/lib/constants'
import type { JobDetailTabId } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { TabGeral } from '@/components/job-detail/tabs/TabGeral'
import { TabEquipe } from '@/components/job-detail/tabs/TabEquipe'
import { TabEntregaveis } from '@/components/job-detail/tabs/TabEntregaveis'
import { TabFinanceiro } from '@/components/job-detail/tabs/TabFinanceiro'
import { TabDiarias } from '@/components/job-detail/tabs/TabDiarias'
import { TabAprovacoes } from '@/components/job-detail/tabs/TabAprovacoes'
import { TabHistorico } from '@/components/job-detail/tabs/TabHistorico'
import { PortalSessionsManager } from '@/components/portal/portal-sessions-manager'
import { ContractsTab } from '@/app/(dashboard)/jobs/[id]/_components/contracts/contracts-tab'
import { TabClaquete } from '@/components/job-detail/tabs/TabClaquete'
import { TabPPM } from '@/components/job-detail/tabs/TabPPM'
import { TabProductionDiary } from '@/components/job-detail/tabs/TabProductionDiary'
import { TabLocations } from '@/components/job-detail/tabs/TabLocations'
import { TabWardrobe } from '@/components/job-detail/tabs/TabWardrobe'
import { TabOvertime } from '@/components/job-detail/tabs/TabOvertime'
import { TabStoryboard } from '@/components/job-detail/tabs/TabStoryboard'
import type { JobDetail } from '@/types/jobs'

// Mapa de icones por nome
const ICON_MAP: Record<string, typeof FileText> = {
  FileText,
  Users,
  Package,
  DollarSign,
  Calendar,
  CheckSquare,
  Clock,
  Globe,
  PenLine,
  Clapperboard,
  FileCheck,
  Film,
  BookOpen,
  MapPin,
  Shirt,
  Timer,
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

// Descobrir a qual grupo pertence uma tab
function findGroupIndex(tabId: JobDetailTabId): number {
  for (let i = 0; i < JOB_TAB_GROUPS.length; i++) {
    if (JOB_TAB_GROUPS[i].tabs.some((t) => t.id === tabId)) return i
  }
  return 0
}

export function JobDetailTabs({ job }: JobDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get('tab') as JobDetailTabId) || 'geral'

  // Grupo ativo baseado na tab atual
  const activeGroupIdx = useMemo(() => findGroupIndex(currentTab), [currentTab])
  const activeGroup = JOB_TAB_GROUPS[activeGroupIdx]

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

  // Ao clicar num grupo, navega pra primeira tab desse grupo
  function handleGroupClick(groupIdx: number) {
    const firstTab = JOB_TAB_GROUPS[groupIdx].tabs[0].id
    handleTabChange(firstTab)
  }

  return (
    <div className="mt-4">
      {/* Nivel 1: Seletores de grupo */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
        {JOB_TAB_GROUPS.map((group, gIdx) => {
          const areaConfig = AREA_CONFIG[group.area]
          const isActive = gIdx === activeGroupIdx

          return (
            <button
              key={group.group}
              type="button"
              onClick={() => handleGroupClick(gIdx)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap',
                isActive
                  ? cn(areaConfig.bgClass, areaConfig.textClass)
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isActive ? areaConfig.dotClass : 'bg-muted-foreground/40',
                )}
              />
              {group.group}
            </button>
          )
        })}
      </div>

      {/* Nivel 2: Tabs do grupo ativo */}
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0">
          {activeGroup.tabs.map((tab) => {
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
                {tab.label}
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

        {/* Tab: Locacoes */}
        <TabsContent value="locacoes" className="mt-6">
          <TabLocations job={job} />
        </TabsContent>

        {/* Tab: Storyboard */}
        <TabsContent value="storyboard" className="mt-6">
          <TabStoryboard job={job} />
        </TabsContent>

        {/* Tab: Aprovacoes */}
        <TabsContent value="aprovacoes" className="mt-6">
          <TabAprovacoes job={job} />
        </TabsContent>

        {/* Tab: Contratos */}
        <TabsContent value="contratos" className="mt-6">
          <ContractsTab jobId={job.id} />
        </TabsContent>

        {/* Tab: PPM */}
        <TabsContent value="ppm" className="mt-6">
          <TabPPM job={job} />
        </TabsContent>

        {/* Tab: Claquete */}
        <TabsContent value="claquete" className="mt-6">
          <TabClaquete job={job} />
        </TabsContent>

        {/* Tab: Diario de Producao */}
        <TabsContent value="diario" className="mt-6">
          <TabProductionDiary job={job} />
        </TabsContent>

        {/* Tab: Figurino / Arte */}
        <TabsContent value="figurino" className="mt-6">
          <TabWardrobe job={job} />
        </TabsContent>

        {/* Tab: Horas Extras */}
        <TabsContent value="horas-extras" className="mt-6">
          <TabOvertime job={job} />
        </TabsContent>

        {/* Tab: Historico */}
        <TabsContent value="historico" className="mt-6">
          <TabHistorico job={job} />
        </TabsContent>

        {/* Tab: Portal */}
        <TabsContent value="portal" className="mt-6">
          <PortalSessionsManager jobId={job.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
