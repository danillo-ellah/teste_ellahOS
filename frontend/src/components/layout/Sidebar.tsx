'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clapperboard,
  Building2,
  Briefcase,
  Users,
  DollarSign,
  CalendarDays,
  ClipboardCheck,
  Globe,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  FileCheck2,
  MailPlus,
  UserRoundSearch,
  CalendarClock,
  ListTree,
  Landmark,
  Target,
  BookOpen,
  MapPin,
  Shirt,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUserRole } from '@/hooks/useUserRole'
import { SIDEBAR_SECTIONS, AREA_CONFIG } from '@/lib/constants'
import { SIDEBAR_ACCESS } from '@/lib/access-control-map'
import type { SidebarItem, AreaType } from '@/lib/constants'

// Mapa de nome do icone → componente Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Clapperboard,
  Building2,
  Briefcase,
  Users,
  DollarSign,
  CalendarDays,
  ClipboardCheck,
  Globe,
  Settings,
  BarChart3,
  FileCheck2,
  MailPlus,
  UserRoundSearch,
  CalendarClock,
  ListTree,
  Landmark,
  Target,
  BookOpen,
  MapPin,
  Shirt,
  Timer,
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  badges?: Record<string, number>
}

export function Sidebar({ collapsed, onToggle, badges }: SidebarProps) {
  const pathname = usePathname()
  const { role } = useUserRole()
  const isAdmin = role === 'admin' || role === 'ceo'

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

      {/* Navegacao com secoes */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {SIDEBAR_SECTIONS.map((section, sIdx) => {
          // Filtrar items por role (adminOnly + SIDEBAR_ACCESS)
          const visibleItems = section.items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false
            const allowedRoles = SIDEBAR_ACCESS[item.href]
            if (allowedRoles && role && !allowedRoles.includes(role)) return false
            return true
          })
          if (visibleItems.length === 0) return null

          const areaConfig = section.area ? AREA_CONFIG[section.area] : null

          return (
            <div key={section.area ?? 'home'} className={cn(sIdx > 0 && 'mt-3')}>
              {/* Section header (apenas quando expanded e tem area) */}
              {areaConfig && !collapsed && (
                <div className="mb-1 flex items-center gap-2 px-3 pt-1">
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', areaConfig.dotClass)}
                  />
                  <span
                    className={cn(
                      'text-[11px] font-semibold uppercase tracking-wider',
                      areaConfig.textClass,
                    )}
                  >
                    {areaConfig.label}
                  </span>
                </div>
              )}

              {/* Separador fino quando collapsed (substitui header) */}
              {areaConfig && collapsed && sIdx > 0 && (
                <div className="mx-2 mb-1.5 mt-0.5 border-t border-border/50" />
              )}

              {/* Items */}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const badge = badges?.[item.href] ?? 0
                  const active = isItemActive(item, pathname)
                  return (
                    <SidebarNavLink
                      key={item.href}
                      item={item}
                      active={active}
                      collapsed={collapsed}
                      badge={badge}
                      areaType={section.area}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Toggle colapso */}
      <div className="border-t px-2 py-2">
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

// Determinar se item esta ativo
function isItemActive(item: SidebarItem, pathname: string): boolean {
  if (item.href === '/') return pathname === '/'
  if (item.exact) return pathname === item.href
  return pathname.startsWith(item.href)
}

// NavLink individual com suporte a cor de area
function SidebarNavLink({
  item,
  active,
  collapsed,
  badge,
  areaType,
}: {
  item: SidebarItem
  active: boolean
  collapsed: boolean
  badge: number
  areaType: AreaType | null
}) {
  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
  const areaConfig = areaType ? AREA_CONFIG[areaType] : null

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
      {/* Barra colorida na esquerda para item ativo (cor da area) */}
      {active && !item.disabled && (
        <span
          className={cn(
            'absolute left-0 top-1.5 h-5 w-[3px] rounded-r-full',
            areaConfig ? areaConfig.dotClass : 'bg-primary',
          )}
        />
      )}
      <span className="relative">
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {collapsed && badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between">
          <span>{item.label}</span>
          {badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </span>
      )}
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
