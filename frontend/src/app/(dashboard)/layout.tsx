'use client'

import { useCallback, useState, useEffect, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { AiCopilotTrigger } from '@/components/ai/ai-copilot-trigger'
import { CommandPalette } from '@/components/command-palette'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useNfStats } from '@/hooks/useNf'
import { getActiveArea, AREA_CONFIG } from '@/lib/constants'
import { BreadcrumbProvider, useBreadcrumb } from '@/lib/breadcrumb-context'
import { useDashboardKpis } from '@/hooks/use-dashboard'
import { useCrmDashboard } from '@/hooks/useCrm'

// Hook para evitar hydration mismatch de IDs Radix (SSR gera IDs diferentes do client)
function useMounted() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  return mounted
}

// Layout interno — usa o BreadcrumbContext provido pelo wrapper abaixo
function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const { overrideItems } = useBreadcrumb()
  const mounted = useMounted()
  const isDesktop = useIsDesktop()
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userId, setUserId] = useState<string>()
  const router = useRouter()

  // Verificar se o onboarding precisa ser completado (apenas admin/ceo)
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/onboarding/status`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        )
        if (res.ok) {
          const json = await res.json()
          if (
            json.data?.tenant?.onboarding_completed === false &&
            ['admin', 'ceo'].includes(json.data?.profile?.role)
          ) {
            router.push('/onboarding')
          }
        }
      } catch {
        // Silencioso — nao bloquear o dashboard em caso de falha
      }
    }
    checkOnboarding()
  }, [router])

  // Obter userId para Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Realtime: atualiza badge de notificacoes sem refresh
  useRealtimeNotifications(userId)

  // Detectar area ativa para ambient tint
  const pathname = usePathname()
  const activeArea = useMemo(() => getActiveArea(pathname), [pathname])
  const _tintStyle = useMemo(() => {
    if (!activeArea) return undefined
    const config = AREA_CONFIG[activeArea]
    return { borderColor: config.color } as React.CSSProperties
  }, [activeArea])

  // Callback para abrir busca global via Topbar
  const handleSearchClick = useCallback(() => setSearchOpen(true), [])

  // NF pending count para badge no sidebar
  // enabled: so busca apos userId estar definido (sessao pronta)
  const { data: nfStats } = useNfStats(!!userId)
  const nfPendingCount = (nfStats?.pending_review ?? 0) + (nfStats?.auto_matched ?? 0)

  // Jobs ativos e oportunidades abertas para badges da sidebar (QW-7)
  const { data: kpis } = useDashboardKpis(!!userId)
  const { data: crmDashboard } = useCrmDashboard(!!userId)
  const activeJobsCount = kpis?.active_jobs ?? 0
  const openOpportunitiesCount = crmDashboard?.pipeline_summary?.total_count ?? 0

  // Consolida todos os badges da sidebar
  const sidebarBadges = useMemo(() => {
    const badges: Record<string, number> = {}
    if (nfPendingCount > 0) badges['/financeiro/nf-validation'] = nfPendingCount
    if (activeJobsCount > 0) badges['/jobs'] = activeJobsCount
    if (openOpportunitiesCount > 0) badges['/crm'] = openOpportunitiesCount
    return Object.keys(badges).length > 0 ? badges : undefined
  }, [nfPendingCount, activeJobsCount, openOpportunitiesCount])

  // SSR: renderizar shell minimo para evitar hydration mismatch dos IDs Radix
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 px-4 lg:px-6" />
          <main className="flex-1 px-4 py-6 lg:px-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop (lg+) */}
      {isDesktop && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          badges={sidebarBadges}
        />
      )}

      {/* Sidebar mobile/tablet (drawer) */}
      {!isDesktop && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              badges={sidebarBadges}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Conteudo principal */}
      <div
        className={cn(
          'flex min-h-screen flex-col transition-[margin-left] duration-200 ease-out',
          isDesktop && (collapsed ? 'ml-16' : 'ml-64'),
        )}
      >
        <Topbar
          showMenuButton={!isDesktop}
          onMenuClick={() => setMobileOpen(true)}
          onSearchClick={handleSearchClick}
          breadcrumbItems={overrideItems ?? undefined}
        />

        {/* Ambient tint — barra sutil colorida no topo do conteudo */}
        {activeArea && (
          <div
            className="h-[2px] w-full opacity-40 transition-colors duration-300"
            style={{ backgroundColor: AREA_CONFIG[activeArea].color }}
          />
        )}

        <main className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Espaco para bottom nav mobile */}
        <div className="h-16 md:hidden" />
      </div>

      {/* Bottom nav mobile */}
      <BottomNav />

      {/* Copilot ELLA — disponivel em todas as paginas do dashboard */}
      <AiCopilotTrigger />

      {/* Busca global (Ctrl+K) */}
      <CommandPalette
        externalOpen={searchOpen}
        onExternalOpenChange={setSearchOpen}
      />
    </div>
  )
}

// Wrapper que provem o contexto de breadcrumb para todas as paginas do dashboard
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <BreadcrumbProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </BreadcrumbProvider>
  )
}
