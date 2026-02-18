'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Clapperboard,
  Building2,
  Briefcase,
  Users,
  DollarSign,
  CalendarDays,
  FolderOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Jobs', href: '/jobs', icon: Clapperboard },
  { label: 'Clientes', href: '/clients', icon: Building2 },
  { label: 'Agencias', href: '/agencies', icon: Briefcase },
  { label: 'Equipe', href: '/people', icon: Users },
  { label: 'Financeiro', href: '/financial', icon: DollarSign },
  { label: 'Calendario', href: '/calendar', icon: CalendarDays, disabled: true },
  { label: 'Arquivos', href: '/files', icon: FolderOpen, disabled: true },
]

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Configuracoes', href: '/settings', icon: Settings, disabled: true },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/jobs" className="flex items-center gap-2">
          {collapsed ? (
            <span className="text-lg font-bold">E</span>
          ) : (
            <span className="text-lg font-bold tracking-tight">
              ELLAH<span className="text-primary">OS</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navegacao principal */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <Separator />

      {/* Navegacao inferior */}
      <div className="space-y-1 px-2 py-3">
        {BOTTOM_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed}
          />
        ))}

        {/* Toggle colapso */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            'w-full justify-start gap-3',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span className="text-sm">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}

function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem
  active: boolean
  collapsed: boolean
}) {
  const Icon = item.icon

  const linkContent = (
    <span
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors',
        collapsed && 'justify-center px-0',
        active && !item.disabled
          ? 'bg-accent font-medium text-foreground'
          : 'text-muted-foreground',
        !item.disabled && !active && 'hover:bg-accent hover:text-foreground',
        item.disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {/* Barra accent na esquerda para item ativo */}
      {active && !item.disabled && (
        <span className="absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </span>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {item.disabled ? (
            <div>{linkContent}</div>
          ) : (
            <Link href={item.href}>{linkContent}</Link>
          )}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
          {item.disabled && ' (em breve)'}
        </TooltipContent>
      </Tooltip>
    )
  }

  if (item.disabled) {
    return <div>{linkContent}</div>
  }

  return <Link href={item.href}>{linkContent}</Link>
}
