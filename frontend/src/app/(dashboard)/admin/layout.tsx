'use client'

import { useRouteGuard } from '@/hooks/useRouteGuard'
import { Skeleton } from '@/components/ui/skeleton'
import type { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']

// Admin e CEO tem acesso exclusivo a area de administracao
// Nao esta no SIDEBAR_ACCESS pois usa adminOnly flag na sidebar — definido aqui explicitamente
const ADMIN_ROLES: UserRole[] = ['admin', 'ceo']

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, hasAccess } = useRouteGuard({ allowedRoles: ADMIN_ROLES })

  // Exibe skeleton enquanto o role do usuario e carregado
  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // useRouteGuard ja redirecionou — evita flash do conteudo protegido
  if (!hasAccess) return null

  return <>{children}</>
}
