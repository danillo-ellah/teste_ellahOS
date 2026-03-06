'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { SIDEBAR_ACCESS } from '@/lib/access-control-map'
import { Skeleton } from '@/components/ui/skeleton'

// Roles com acesso ao modulo financeiro (fonte: SIDEBAR_ACCESS['/financeiro'])
const FINANCEIRO_ROLES = SIDEBAR_ACCESS['/financeiro']

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: FINANCEIRO_ROLES })

  // Exibe skeleton enquanto o role do usuario e carregado
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // useRouteGuard ja redirecionou — evita flash do conteudo protegido
  if (!hasAccess) return null

  return <>{children}</>
}
