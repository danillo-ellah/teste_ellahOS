'use client'

import { useMemo, useEffect, Component, type ReactNode } from 'react'
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
  ClipboardList,
  GanttChartSquare,
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
import { TabCast } from '@/components/job-detail/tabs/TabCast'
import { TabOrdemDoDia } from '@/components/job-detail/tabs/TabOrdemDoDia'
import { TabCronograma } from '@/components/job-detail/tabs/TabCronograma'
import type { JobDetail } from '@/types/jobs'
import { useJobAccess } from '@/hooks/useJobAccess'

// --- Error Boundary para abas ---

class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error(`[TabErrorBoundary] Erro na aba ${this.props.tabName}:`, error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 py-10 flex flex-col items-center justify-center text-center gap-2">
          <p className="text-sm text-destructive">Erro ao carregar esta aba.</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

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
  ClipboardList,
  GanttChartSquare,
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
  const { visibleTabs, isLoading: isAccessLoading } = useJobAccess(job)

  // Filtra grupos: so mostra grupos que tenham pelo menos 1 tab visivel
  const filteredGroups = useMemo(() => {
    if (isAccessLoading || visibleTabs.length === 0) return JOB_TAB_GROUPS
    return JOB_TAB_GROUPS
      .map((group) => ({
        ...group,
        tabs: group.tabs.filter((t) => visibleTabs.includes(t.id)),
      }))
      .filter((group) => group.tabs.length > 0)
  }, [visibleTabs, isAccessLoading])

  // Grupo ativo baseado na tab atual
  const activeGroupIdx = useMemo(() => {
    for (let i = 0; i < filteredGroups.length; i++) {
      if (filteredGroups[i].tabs.some((t) => t.id === currentTab)) return i
    }
    return 0
  }, [currentTab, filteredGroups])
  const activeGroup = filteredGroups[activeGroupIdx]

  // Redirect se a tab atual nao e visivel (URL direto ou mudanca de role)
  useEffect(() => {
    if (isAccessLoading || visibleTabs.length === 0) return
    if (!visibleTabs.includes(currentTab)) {
      const fallback = visibleTabs[0] ?? 'geral'
      const params = new URLSearchParams(searchParams.toString())
      if (fallback === 'geral') {
        params.delete('tab')
      } else {
        params.set('tab', fallback)
      }
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : pathname, { scroll: false })
    }
  }, [isAccessLoading, visibleTabs, currentTab, router, pathname, searchParams])

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
    const firstTab = filteredGroups[groupIdx].tabs[0].id
    handleTabChange(firstTab)
  }

  if (!activeGroup) return null

  return (
    <div className="mt-4">
      {/* Nivel 1: Seletores de grupo */}
      <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
        {filteredGroups.map((group, gIdx) => {
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
          <TabErrorBoundary tabName="geral"><TabGeral job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Equipe */}
        <TabsContent value="equipe" className="mt-6">
          <TabErrorBoundary tabName="equipe"><TabEquipe job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Entregaveis */}
        <TabsContent value="entregaveis" className="mt-6">
          <TabErrorBoundary tabName="entregaveis"><TabEntregaveis job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Financeiro */}
        <TabsContent value="financeiro" className="mt-6">
          <TabErrorBoundary tabName="financeiro"><TabFinanceiro job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Diarias */}
        <TabsContent value="diarias" className="mt-6">
          <TabErrorBoundary tabName="diarias"><TabDiarias job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Locacoes */}
        <TabsContent value="locacoes" className="mt-6">
          <TabErrorBoundary tabName="locacoes"><TabLocations job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Storyboard */}
        <TabsContent value="storyboard" className="mt-6">
          <TabErrorBoundary tabName="storyboard"><TabStoryboard job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Elenco */}
        <TabsContent value="elenco" className="mt-6">
          <TabErrorBoundary tabName="elenco">
            <TabCast job={job} />
          </TabErrorBoundary>
        </TabsContent>

        {/* Tab: Ordem do Dia */}
        <TabsContent value="ordem-do-dia" className="mt-6">
          <TabErrorBoundary tabName="ordem-do-dia">
            <TabOrdemDoDia job={job} />
          </TabErrorBoundary>
        </TabsContent>

        {/* Tab: Cronograma */}
        <TabsContent value="cronograma" className="mt-6">
          <TabErrorBoundary tabName="cronograma">
            <TabCronograma job={job} />
          </TabErrorBoundary>
        </TabsContent>

        {/* Tab: Aprovacoes */}
        <TabsContent value="aprovacoes" className="mt-6">
          <TabErrorBoundary tabName="aprovacoes"><TabAprovacoes job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Contratos */}
        <TabsContent value="contratos" className="mt-6">
          <TabErrorBoundary tabName="contratos"><ContractsTab jobId={job.id} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: PPM */}
        <TabsContent value="ppm" className="mt-6">
          <TabErrorBoundary tabName="ppm"><TabPPM job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Claquete */}
        <TabsContent value="claquete" className="mt-6">
          <TabErrorBoundary tabName="claquete"><TabClaquete job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Diario de Producao */}
        <TabsContent value="diario" className="mt-6">
          <TabErrorBoundary tabName="diario"><TabProductionDiary job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Figurino / Arte */}
        <TabsContent value="figurino" className="mt-6">
          <TabErrorBoundary tabName="figurino"><TabWardrobe job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Horas Extras */}
        <TabsContent value="horas-extras" className="mt-6">
          <TabErrorBoundary tabName="horas-extras"><TabOvertime job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Historico */}
        <TabsContent value="historico" className="mt-6">
          <TabErrorBoundary tabName="historico"><TabHistorico job={job} /></TabErrorBoundary>
        </TabsContent>

        {/* Tab: Portal */}
        <TabsContent value="portal" className="mt-6">
          <TabErrorBoundary tabName="portal"><PortalSessionsManager jobId={job.id} /></TabErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
