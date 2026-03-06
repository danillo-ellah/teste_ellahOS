'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { SIDEBAR_ACCESS } from '@/lib/access-control-map'
import { Skeleton } from '@/components/ui/skeleton'

// Roles com acesso ao modulo de Atendimento (fonte: SIDEBAR_ACCESS['/atendimento'])
const ATENDIMENTO_ROLES = SIDEBAR_ACCESS['/atendimento']

export default function AtendimentoLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: ATENDIMENTO_ROLES })

  // Exibe skeleton enquanto o role do usuario e carregado
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // useRouteGuard ja redirecionou — evita flash do conteudo protegido
  if (!hasAccess) return null

  return <>{children}</>
}
