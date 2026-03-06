'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Settings2, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouteGuard } from '@/hooks/useRouteGuard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

// Settings e exclusivo para admin e CEO
// Nao esta no SIDEBAR_ACCESS pois usa adminOnly flag na sidebar — definido aqui explicitamente
const SETTINGS_ROLES: UserRole[] = ['admin', 'ceo']

const SETTINGS_TABS = [
  { href: '/settings/company', label: 'Empresa', icon: Building2 },
  { href: '/settings/integrations', label: 'Integracoes', icon: Settings2 },
  { href: '/settings/notifications', label: 'Notificacoes', icon: Bell },
] as const

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: SETTINGS_ROLES })

  // Exibe skeleton enquanto o role do usuario e carregado
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-1 border-b border-border pb-0">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // useRouteGuard ja redirecionou — evita flash do conteudo protegido
  if (!hasAccess) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configuracoes</h1>

      <nav className="flex gap-1 border-b border-border">
        {SETTINGS_TABS.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>

      {children}
    </div>
  )
}
