'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Clapperboard,
  Building2,
  Users,
  DollarSign,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Jobs', href: '/jobs', icon: Clapperboard },
  { label: 'Clientes', href: '/clients', icon: Building2, disabled: true },
  { label: 'Equipe', href: '/people', icon: Users, disabled: true },
  { label: 'Financeiro', href: '/finance', icon: DollarSign, disabled: true },
  { label: 'Config', href: '/settings', icon: Settings, disabled: true },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16 items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = pathname.startsWith(item.href)

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex min-w-[44px] flex-col items-center justify-center gap-0.5 opacity-40"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px]">{item.label}</span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-[44px] flex-col items-center justify-center gap-0.5 transition-colors',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
