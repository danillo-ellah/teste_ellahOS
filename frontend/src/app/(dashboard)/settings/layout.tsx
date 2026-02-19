'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings2, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTINGS_TABS = [
  { href: '/settings/integrations', label: 'Integracoes', icon: Settings2 },
  { href: '/settings/notifications', label: 'Notificacoes', icon: Bell },
] as const

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

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
