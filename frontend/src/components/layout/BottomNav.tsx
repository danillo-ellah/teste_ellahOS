'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clapperboard,
  Target,
  Users,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AREA_CONFIG, getActiveArea } from '@/lib/constants'
import type { AreaType } from '@/lib/constants'

const BOTTOM_NAV_ITEMS: Array<{
  label: string
  href: string
  icon: typeof LayoutDashboard
  area: AreaType | null
}> = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard, area: null },
  { label: 'Jobs', href: '/jobs', icon: Clapperboard, area: 'producao' },
  { label: 'Pipeline', href: '/crm', icon: Target, area: 'comercial' },
  { label: 'Equipe', href: '/people', icon: Users, area: 'equipe' },
  { label: 'Financeiro', href: '/financeiro', icon: DollarSign, area: 'financeiro' },
]

export function BottomNav() {
  const pathname = usePathname()
  const activeArea = getActiveArea(pathname)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16 items-center justify-around">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active =
            item.href === '/'
              ? pathname === '/'
              : item.href === '/financeiro'
                ? pathname.startsWith('/financeiro') || pathname.startsWith('/admin/financeiro')
                : pathname.startsWith(item.href)

          const areaConfig = item.area ? AREA_CONFIG[item.area] : null

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[44px] flex-col items-center justify-center gap-0.5 transition-colors',
                active
                  ? areaConfig ? areaConfig.textClass : 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {/* Dot colorido acima do icone quando ativo */}
                {active && areaConfig && (
                  <span
                    className={cn(
                      'absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                      areaConfig.dotClass,
                    )}
                  />
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
