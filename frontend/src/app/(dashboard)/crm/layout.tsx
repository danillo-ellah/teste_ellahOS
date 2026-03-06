'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { SIDEBAR_ACCESS } from '@/lib/access-control-map'
import { Skeleton } from '@/components/ui/skeleton'

// Roles com acesso ao CRM (fonte: SIDEBAR_ACCESS['/crm'])
const CRM_ROLES = SIDEBAR_ACCESS['/crm']

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: CRM_ROLES })

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
