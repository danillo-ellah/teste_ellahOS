'use client'

import { use, useRef } from 'react'
import { ShieldOff, CalendarX, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePortalPublic } from '@/hooks/use-portal'
import { PortalHeader } from '@/components/portal/portal-header'
import { PortalStatusHero } from '@/components/portal/portal-status-hero'
import { PortalTimeline } from '@/components/portal/portal-timeline'
import { PortalDocuments } from '@/components/portal/portal-documents'
import { PortalApprovals } from '@/components/portal/portal-approvals'
import { PortalChat } from '@/components/portal/portal-chat'
import { PortalSkeleton } from '@/components/portal/portal-skeleton'

// --- Estados de erro (tela cheia) ---

function PortalNotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <span className="text-2xl font-bold tracking-tight mb-8">
        ELLAH<span className="text-rose-500">OS</span>
      </span>
      <ShieldOff className="h-16 w-16 text-muted-foreground mb-6" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Link Invalido</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
        Este link de acesso nao e valido ou nao existe.
      </p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">
        Se voce recebeu este link por engano, entre em contato com a producao.
      </p>
      <Button className="mt-6" asChild>
        <a href="mailto:contato@ellahfilmes.com">Contatar a Producao</a>
      </Button>
    </div>
  )
}

function PortalExpired() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <span className="text-2xl font-bold tracking-tight mb-8">
        ELLAH<span className="text-rose-500">OS</span>
      </span>
      <CalendarX className="h-16 w-16 text-muted-foreground mb-6" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Link Expirado</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
        Este link de acesso expirou. Solicite um novo link de acesso a producao.
      </p>
      <Button className="mt-6" asChild>
        <a href="mailto:contato@ellahfilmes.com">Contatar a Producao</a>
      </Button>
    </div>
  )
}

function PortalError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center">
      <span className="text-2xl font-bold tracking-tight mb-8">
        ELLAH<span className="text-rose-500">OS</span>
      </span>
      <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/5 dark:border-red-500/20 p-5 flex flex-col items-center max-w-sm">
        <WifiOff className="h-8 w-8 text-red-500 mb-3" aria-hidden="true" />
        <p className="text-sm text-foreground mb-3">
          Nao foi possivel carregar as informacoes do portal.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}

// --- Pagina principal ---

export default function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const approvalsRef = useRef<HTMLDivElement>(null)

  const { status, data } = usePortalPublic(token)

  function scrollToApprovals() {
    approvalsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Estados de erro / loading
  if (status === 'idle' || status === 'loading') {
    return <PortalSkeleton />
  }

  if (status === 'not_found') {
    return <PortalNotFound />
  }

  if (status === 'expired') {
    return <PortalExpired />
  }

  if (status === 'error' || !data) {
    return <PortalError onRetry={() => window.location.reload()} />
  }

  const { session, job, timeline, documents, approvals, messages } = data
  const { permissions } = session

  const hasPendingApprovals = approvals.some((a) => a.status === 'pending')
  const showApprovals = permissions.approvals !== false
  const showDocuments = permissions.documents !== false
  const showMessages = permissions.messages !== false
  const showTimeline = permissions.timeline !== false

  // Adicionar animacao bell-ring via style tag inline
  return (
    <>
      <style>{`
        @keyframes bell-ring {
          0%,100% { transform: rotate(0deg); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(6deg); }
          40% { transform: rotate(0deg); }
        }
      `}</style>

      {/* Header fixo */}
      <PortalHeader
        job={job}
        approvals={approvals}
        onScrollToApprovals={scrollToApprovals}
      />

      {/* Conteudo principal */}
      <main
        id="main-content"
        className="max-w-3xl mx-auto px-4 pt-24 pb-12 space-y-8"
      >
        {/* Hero de status — sempre visivel */}
        <PortalStatusHero job={job} />

        {/* Aprovacoes pendentes — prioridade maxima, aparecem antes da timeline */}
        {showApprovals && hasPendingApprovals && (
          <div ref={approvalsRef}>
            <PortalApprovals approvals={approvals} token={token} />
          </div>
        )}

        {/* Timeline de eventos */}
        {showTimeline && <PortalTimeline events={timeline} />}

        {/* Aprovacoes nao-pendentes (apos timeline se nao ha pendentes) */}
        {showApprovals && !hasPendingApprovals && (
          <div ref={approvalsRef}>
            <PortalApprovals approvals={approvals} token={token} />
          </div>
        )}

        {/* Documentos */}
        {showDocuments && (
          <PortalDocuments documents={documents} />
        )}

        {/* Chat */}
        {showMessages && (
          <PortalChat messages={messages} token={token} />
        )}

        {/* Footer */}
        <footer
          className="mt-12 pt-8 border-t border-border text-center"
          role="contentinfo"
        >
          <span className="text-base font-bold tracking-tight text-muted-foreground/60">
            ELLAH<span className="text-primary/60">OS</span>
          </span>
          <p className="text-sm text-muted-foreground mt-2">
            {job.title}
          </p>
          {session.expires_at && (
            <p className="text-xs text-muted-foreground/60 mt-4">
              Powered by ELLAHOS
              {' · '}
              Este link expira em{' '}
              {new Date(session.expires_at).toLocaleDateString('pt-BR')}
            </p>
          )}
          {!session.expires_at && (
            <p className="text-xs text-muted-foreground/60 mt-4">
              Powered by ELLAHOS
            </p>
          )}
        </footer>
      </main>
    </>
  )
}
