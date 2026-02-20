'use client'

import { Bell, HelpCircle, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { PortalJob, PortalApproval } from '@/types/portal'

interface PortalHeaderProps {
  job: PortalJob
  approvals: PortalApproval[]
  onScrollToApprovals?: () => void
}

export function PortalHeader({ job, approvals, onScrollToApprovals }: PortalHeaderProps) {
  const hasPendingApprovals = approvals.some((a) => a.status === 'pending')

  const jobTitle = job.title || 'Projeto sem titulo'
  const jobCode = [job.code, job.job_aba].filter(Boolean).join('_')

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 h-16',
        'bg-background/95 backdrop-blur-md border-b border-border',
      )}
      role="banner"
    >
      {/* Skip link para acessibilidade */}
      <a
        href="#main-content"
        className="absolute -top-10 left-4 z-50 rounded bg-primary px-4 py-2 text-sm text-primary-foreground focus:top-4"
      >
        Ir para o conteudo principal
      </a>

      <div className="max-w-3xl mx-auto h-full px-4 flex items-center gap-4">
        {/* Logo Ellah */}
        <button type="button" onClick={() => window.location.reload()} className="shrink-0" aria-label="Recarregar pagina">
          <span className="text-base font-bold tracking-tight text-foreground">
            ELLAH<span className="text-primary">OS</span>
          </span>
        </button>

        {/* Nome do job — ocupa espaco central */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {jobTitle}
            {jobCode && (
              <span className="ml-1 text-xs text-muted-foreground font-normal">
                ({jobCode})
              </span>
            )}
          </p>
        </div>

        {/* Acoes */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Botao ajuda */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground"
            aria-label="Ajuda"
            title="Ajuda"
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </Button>

          {/* Notificacoes (scroll para aprovacoes) */}
          {hasPendingApprovals && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative text-muted-foreground"
              aria-label="Aprovacoes pendentes — clique para ver"
              onClick={onScrollToApprovals}
            >
              <Bell className="h-[18px] w-[18px]" />
              {/* Badge vermelho */}
              <span
                className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500"
                aria-hidden="true"
              />
            </Button>
          )}

          {/* Menu adicional */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground"
                aria-label="Mais opcoes"
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={() => navigator.share?.({ url: window.location.href })}
              >
                Compartilhar este link
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const subject = encodeURIComponent(`Projeto: ${jobTitle}`)
                  window.open(`mailto:?subject=${subject}`)
                }}
              >
                Contatar a producao
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
