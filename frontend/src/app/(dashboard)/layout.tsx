'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useIsDesktop } from '@/hooks/useMediaQuery'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isDesktop = useIsDesktop()
  const [collapsed, setCollapsed] = useLocalStorage('sidebar-collapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userId, setUserId] = useState<string>()

  // Obter userId para Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  // Realtime: atualiza badge de notificacoes sem refresh
  useRealtimeNotifications(userId)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar desktop (lg+) */}
      {isDesktop && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
      )}

      {/* Sidebar mobile/tablet (drawer) */}
      {!isDesktop && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
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
        />

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
    </div>
  )
}
