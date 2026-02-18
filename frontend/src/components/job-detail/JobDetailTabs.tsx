'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="mt-4">
      <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b border-border rounded-none gap-0">
        {JOB_DETAIL_TABS.map((tab) => {
          const Icon = ICON_MAP[tab.icon]
          const count = getTabCount(tab.id, job)

          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                'relative rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium',
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
        <div className="rounded-lg border border-border p-6">
          <h3 className="text-sm font-semibold mb-4">Informacoes Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Briefing</span>
              <p className="mt-1 whitespace-pre-wrap">
                {job.briefing || 'Nenhum briefing informado'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Notas internas</span>
              <p className="mt-1 whitespace-pre-wrap">
                {job.internal_notes || 'Sem notas'}
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Tab: Equipe */}
      <TabsContent value="equipe" className="mt-6">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Gerenciamento de equipe sera implementado na proxima fase.
          {job.team && job.team.length > 0 && (
            <p className="mt-2 text-foreground font-medium">
              {job.team.length} membro(s) na equipe
            </p>
          )}
        </div>
      </TabsContent>

      {/* Tab: Entregaveis */}
      <TabsContent value="entregaveis" className="mt-6">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Gerenciamento de entregaveis sera implementado na proxima fase.
          {job.deliverables && job.deliverables.length > 0 && (
            <p className="mt-2 text-foreground font-medium">
              {job.deliverables.length} entregavel(is)
            </p>
          )}
        </div>
      </TabsContent>

      {/* Tab: Financeiro */}
      <TabsContent value="financeiro" className="mt-6">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Painel financeiro sera implementado na proxima fase.
        </div>
      </TabsContent>

      {/* Tab: Diarias */}
      <TabsContent value="diarias" className="mt-6">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Gerenciamento de diarias sera implementado na proxima fase.
          {job.shooting_dates && job.shooting_dates.length > 0 && (
            <p className="mt-2 text-foreground font-medium">
              {job.shooting_dates.length} diaria(s) programada(s)
            </p>
          )}
        </div>
      </TabsContent>

      {/* Tab: Historico */}
      <TabsContent value="historico" className="mt-6">
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          Historico de alteracoes sera implementado na proxima fase.
          {job.history && job.history.length > 0 && (
            <p className="mt-2 text-foreground font-medium">
              {job.history.length} registro(s) no historico
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
