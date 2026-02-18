'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { Breadcrumb } from './Breadcrumb'
import { usePathname } from 'next/navigation'

interface TopbarProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  breadcrumbItems?: { label: string; href?: string }[]
}

function getDefaultBreadcrumb(pathname: string) {
  const items: { label: string; href?: string }[] = []

  if (pathname.startsWith('/jobs')) {
    items.push({ label: 'Jobs', href: '/jobs' })

    // Se for detalhe do job: /jobs/[id]
    const match = pathname.match(/^\/jobs\/([^/]+)/)
    if (match) {
      items.push({ label: 'Detalhe' })
    }
  }

  return items
}

export function Topbar({ onMenuClick, showMenuButton, breadcrumbItems }: TopbarProps) {
  const pathname = usePathname()
  const items = breadcrumbItems || getDefaultBreadcrumb(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      {/* Hamburger (mobile/tablet) */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Breadcrumb */}
      <div className="flex-1">
        {items.length > 0 && <Breadcrumb items={items} />}
      </div>

      {/* Acoes */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
