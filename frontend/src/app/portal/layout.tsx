import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Portal do Cliente | ELLAHOS',
    template: '%s | Portal ELLAHOS',
  },
  description: 'Acompanhe o andamento do seu projeto audiovisual.',
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Layout do portal publico.
 * Sem sidebar, sem topbar do dashboard. Pagina limpa para o cliente.
 * O ThemeProvider e QueryProvider ja estao no layout raiz (app/layout.tsx).
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
