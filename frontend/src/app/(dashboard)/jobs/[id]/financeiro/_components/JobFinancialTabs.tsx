'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface JobFinancialTabsProps {
  jobId: string
}

const TABS = [
  { label: 'Custos', href: 'custos' },
  { label: 'Dashboard', href: 'dashboard' },
  { label: 'Orcamento', href: 'orcamento' },
  { label: 'Verbas', href: 'verbas' },
]

export function JobFinancialTabs({ jobId }: JobFinancialTabsProps) {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b">
      {TABS.map(tab => {
        const href = `/jobs/${jobId}/financeiro/${tab.href}`
        const isActive = pathname === href
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
