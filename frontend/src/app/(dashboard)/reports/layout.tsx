'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { SIDEBAR_ACCESS } from '@/lib/access-control-map'
import { Skeleton } from '@/components/ui/skeleton'

// Roles com acesso a reports (fonte: SIDEBAR_ACCESS['/reports'])
const REPORTS_ROLES = SIDEBAR_ACCESS['/reports']

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: REPORTS_ROLES })

  // Exibe skeleton enquanto o role do usuario e carregado
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // useRouteGuard ja redirecionou — evita flash do conteudo protegido
  if (!hasAccess) return null

  return <>{children}</>
}
