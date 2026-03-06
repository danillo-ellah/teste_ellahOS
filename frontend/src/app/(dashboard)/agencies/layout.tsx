'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { SIDEBAR_ACCESS } from '@/lib/access-control-map'
import { Skeleton } from '@/components/ui/skeleton'

// Roles com acesso a agencias (fonte: SIDEBAR_ACCESS['/agencies'])
const AGENCIES_ROLES = SIDEBAR_ACCESS['/agencies']

export default function AgenciesLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: AGENCIES_ROLES })

  // Exibe skeleton enquanto o role do usuario e carregado
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // useRouteGuard ja redirecionou — evita flash do conteudo protegido
  if (!hasAccess) return null

  return <>{children}</>
}
