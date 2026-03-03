'use client'

import { ExternalLink, Film, CheckCircle, Clock } from 'lucide-react'

// --- Tipos ---

interface FrameioReviewDeliverable {
  id: string
  description: string
  format: string | null
  status: string
  review_url: string | null
}

interface FrameioReviewLinksProps {
  deliverables: FrameioReviewDeliverable[]
}

// Mapa de status para label/cor
const STATUS_STYLE: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  aprovado: {
    label: 'Aprovado',
    className: 'text-green-600 dark:text-green-400',
    icon: CheckCircle,
  },
  aguardando_aprovacao: {
    label: 'Aguardando sua revisao',
    className: 'text-amber-600 dark:text-amber-400',
    icon: Clock,
  },
  em_producao: {
    label: 'Em producao',
    className: 'text-blue-600 dark:text-blue-400',
    icon: Film,
  },
  entregue: {
    label: 'Entregue',
    className: 'text-teal-600 dark:text-teal-400',
    icon: CheckCircle,
  },
  pendente: {
    label: 'Pendente',
    className: 'text-zinc-500 dark:text-zinc-400',
    icon: Clock,
  },
}

// Filtra somente entregaveis com link Frame.io para exibir no portal do cliente
export function FrameioReviewLinks({ deliverables }: FrameioReviewLinksProps) {
  const withReviewLinks = deliverables.filter((d) => !!d.review_url)

  if (withReviewLinks.length === 0) return null

  return (
    <section aria-labelledby="frameio-links-heading">
      <h2
        id="frameio-links-heading"
        className="text-base font-semibold mb-3"
      >
        Links de Revisao Frame.io
      </h2>

      <div className="space-y-2">
        {withReviewLinks.map((deliverable) => {
          const style = STATUS_STYLE[deliverable.status] ?? STATUS_STYLE.pendente
          const StatusIcon = style.icon

          return (
            <div
              key={deliverable.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-background"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" title={deliverable.description}>
                  {deliverable.description}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusIcon className={`size-3.5 shrink-0 ${style.className}`} aria-hidden="true" />
                  <span className={`text-xs ${style.className}`}>{style.label}</span>
                  {deliverable.format && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{deliverable.format}</span>
                    </>
                  )}
                </div>
              </div>

              <a
                href={deliverable.review_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 shrink-0 text-sm font-medium text-primary hover:underline"
                aria-label={`Revisar ${deliverable.description} no Frame.io`}
              >
                Revisar
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        Clique em &quot;Revisar&quot; para abrir o video no Frame.io e deixar seus comentarios.
        Quando voce aprovar, nossa equipe sera notificada automaticamente.
      </p>
    </section>
  )
}
