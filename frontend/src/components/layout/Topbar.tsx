'use client'

import dynamic from 'next/dynamic'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from './ThemeToggle'
import { Breadcrumb } from './Breadcrumb'
import { CommandPaletteTrigger } from '@/components/command-palette'
import { usePathname } from 'next/navigation'

// Dynamic imports para evitar hydration mismatch (Radix gera IDs diferentes no SSR vs CSR)
const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell').then((m) => m.NotificationBell),
  { ssr: false },
)
const UserMenu = dynamic(
  () => import('./UserMenu').then((m) => m.UserMenu),
  { ssr: false },
)

interface TopbarProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  breadcrumbItems?: { label: string; href?: string }[]
  onSearchClick?: () => void
}

function getDefaultBreadcrumb(pathname: string) {
  const items: { label: string; href?: string }[] = []

  if (pathname.startsWith('/jobs')) {
    items.push({ label: 'Jobs', href: '/jobs' })
    const match = pathname.match(/^\/jobs\/([^/]+)/)
    if (match) {
      items.push({ label: 'Detalhe' })
    }
  } else if (pathname.startsWith('/settings')) {
    items.push({ label: 'Configuracoes', href: '/settings' })
    if (pathname.includes('/integrations')) {
      items.push({ label: 'Integracoes' })
    }
  } else if (pathname.startsWith('/clients')) {
    items.push({ label: 'Clientes', href: '/clients' })
  } else if (pathname.startsWith('/agencies')) {
    items.push({ label: 'Agencias', href: '/agencies' })
  } else if (pathname.startsWith('/people')) {
    items.push({ label: 'Pessoas', href: '/people' })
  } else if (pathname.startsWith('/crm')) {
    items.push({ label: 'Oportunidades', href: '/crm' })
    if (pathname.includes('/dashboard')) items.push({ label: 'Resumo CRM' })
    else if (pathname.includes('/report')) items.push({ label: 'Relatorio' })
    else if (pathname.includes('/perdas')) items.push({ label: 'Analise de Perdas' })
    else if (pathname.match(/^\/crm\/[^/]+$/)) items.push({ label: 'Detalhe' })
  } else if (pathname.startsWith('/financeiro')) {
    items.push({ label: 'Financeiro', href: '/financeiro' })
    if (pathname.includes('/vendors')) items.push({ label: 'Fornecedores' })
    else if (pathname.includes('/calendario')) items.push({ label: 'Pagamentos' })
    else if (pathname.includes('/nf-validation')) items.push({ label: 'Notas Fiscais' })
    else if (pathname.includes('/nf-request')) items.push({ label: 'Solicitar NFs' })
    else if (pathname.includes('/fluxo-caixa')) items.push({ label: 'Fluxo de Caixa' })
    else if (pathname.includes('/conciliacao')) items.push({ label: 'Conciliacao' })
    else if (pathname.includes('/custos-fixos')) items.push({ label: 'Custos Fixos' })
  } else if (pathname.startsWith('/admin')) {
    items.push({ label: 'Admin' })
    if (pathname.includes('/financeiro/categorias')) items.push({ label: 'Categorias de Custo' })
    else if (pathname.includes('/equipe')) items.push({ label: 'Usuarios & Acessos' })
    else if (pathname.includes('/pre-producao')) items.push({ label: 'Checklist Pre-Prod' })
    else if (pathname.includes('/import')) items.push({ label: 'Importar Dados' })
    else if (pathname.includes('/audit-log')) items.push({ label: 'Audit Log' })
  } else if (pathname === '/minha-semana') {
    items.push({ label: 'Minha Semana' })
  } else if (pathname === '/pos-producao') {
    items.push({ label: 'Pos-Producao' })
  } else if (pathname === '/reports') {
    items.push({ label: 'Relatorios' })
  } else if (pathname === '/atendimento') {
    items.push({ label: 'Atendimento' })
  } else if (pathname.startsWith('/team/calendar')) {
    items.push({ label: 'Calendario' })
  } else if (pathname === '/approvals') {
    items.push({ label: 'Aprovacoes' })
  } else if (pathname === '/portal') {
    items.push({ label: 'Portal' })
  } else if (pathname.startsWith('/notifications')) {
    items.push({ label: 'Notificacoes' })
  }

  return items
}

export function Topbar({ onMenuClick, showMenuButton, breadcrumbItems, onSearchClick }: TopbarProps) {
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

      {/* Busca global */}
      {onSearchClick && (
        <CommandPaletteTrigger onClick={onSearchClick} />
      )}

      {/* Acoes */}
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
