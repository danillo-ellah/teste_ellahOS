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
  FolderOpen,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useUserRole } from '@/hooks/useUserRole'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  disabled?: boolean
  exact?: boolean
  badge?: number
  indent?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Jobs', href: '/jobs', icon: Clapperboard },
  { label: 'Relatorios', href: '/reports', icon: BarChart3 },
  { label: 'Clientes', href: '/clients', icon: Building2 },
  { label: 'Agencias', href: '/agencies', icon: Briefcase },
  { label: 'Equipe', href: '/people', icon: Users },
  { label: 'Financeiro', href: '/financeiro', icon: DollarSign, exact: true },
  { label: 'Fornecedores', href: '/financeiro/vendors', icon: UserRoundSearch, indent: true },
  { label: 'Calendario Pgtos', href: '/financeiro/calendario', icon: CalendarClock, indent: true },
  { label: 'Validacao de NFs', href: '/financeiro/nf-validation', icon: FileCheck2, indent: true },
  { label: 'Solicitar NFs', href: '/financeiro/nf-request', icon: MailPlus, indent: true },
  { label: 'Calendario', href: '/team/calendar', icon: CalendarDays },
  { label: 'Aprovacoes', href: '/approvals', icon: ClipboardCheck },
  { label: 'Portal', href: '/portal', icon: Globe },
  { label: 'Arquivos', href: '/files', icon: FolderOpen, disabled: true },
]

const ADMIN_NAV_ITEM: NavItem = {
  label: 'Categorias Custo', href: '/admin/financeiro/categorias', icon: ListTree, indent: true,
}

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Configuracoes', href: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  badges?: Record<string, number>
}

export function Sidebar({ collapsed, onToggle, badges }: SidebarProps) {
  const pathname = usePathname()
  const { role } = useUserRole()
  const isAdmin = role === 'admin' || role === 'ceo'

  // Monta lista de itens incluindo admin se aplicavel
  const allItems = isAdmin
    ? [
        ...NAV_ITEMS.slice(0, 12), // ate "Solicitar NFs"
        ADMIN_NAV_ITEM,
        ...NAV_ITEMS.slice(12), // "Calendario", "Aprovacoes", etc
      ]
    : NAV_ITEMS

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
        {allItems.map((item) => {
          const itemWithBadge = badges?.[item.href]
            ? { ...item, badge: badges[item.href] }
            : item
          // Financeiro parent: ativo quando qualquer sub-rota /financeiro/* esta ativa
          const isFinanceiroParent = item.href === '/financeiro' && item.exact
          const active = item.href === '/'
            ? pathname === '/'
            : isFinanceiroParent
              ? pathname === '/financeiro' || (pathname.startsWith('/financeiro/') && !NAV_ITEMS.some(n => n.indent && pathname.startsWith(n.href)))
              : item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href)
          return (
            <NavLink
              key={item.href}
              item={itemWithBadge}
              active={active}
              collapsed={collapsed}
            />
          )
        })}
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
        !collapsed && item.indent && 'ml-3 pl-3',
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
      <span className="relative">
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {collapsed && item.badge != null && item.badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </span>
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between">
          <span>{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
              {item.badge > 99 ? '99+' : item.badge}
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
