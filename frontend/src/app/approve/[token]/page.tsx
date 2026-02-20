'use client'

import { useState } from 'react'
import { use } from 'react'
import { CheckCircle, XCircle, Clock, FileText, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { usePublicApproval, useRespondApproval } from '@/hooks/usePublicApproval'
import { APPROVAL_TYPE_LABELS } from '@/types/approvals'

export default function PublicApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const { data: approval, isLoading, isError } = usePublicApproval(token)
  const { mutateAsync: respond, isPending } = useRespondApproval(token)

  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRespond(action: 'approved' | 'rejected') {
    setErrorMsg(null)
    try {
      await respond({ action, comment: comment || undefined })
      setResult(action)
      setSubmitted(true)
    } catch {
      setErrorMsg('Nao foi possivel registrar sua resposta. Verifique sua conexao e tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-zinc-400" />
        </div>
      </PublicLayout>
    )
  }

  if (isError || !approval) {
    return (
      <PublicLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <AlertTriangle className="size-12 text-amber-500 mb-4" />
            <h2 className="text-lg font-semibold">Link invalido</h2>
            <p className="text-sm text-zinc-500 mt-2">
              Este link de aprovacao nao existe ou ja expirou.
            </p>
          </CardContent>
        </Card>
      </PublicLayout>
    )
  }

  // Ja respondido ou expirado
  if (approval.status !== 'pending' || submitted) {
    const isApproved = result === 'approved' || approval.status === 'approved'
    const isExpired = approval.status === 'expired'

    return (
      <PublicLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            {isExpired ? (
              <>
                <Clock className="size-12 text-zinc-400 mb-4" />
                <h2 className="text-lg font-semibold">Aprovacao expirada</h2>
                <p className="text-sm text-zinc-500 mt-2">
                  O prazo para responder a esta solicitacao expirou.
                </p>
              </>
            ) : isApproved ? (
              <>
                <CheckCircle className="size-12 text-green-500 mb-4" />
                <h2 className="text-lg font-semibold">Aprovado</h2>
                <p className="text-sm text-zinc-500 mt-2">
                  {approval.message || 'Sua aprovacao foi registrada. Obrigado!'}
                </p>
              </>
            ) : (
              <>
                <XCircle className="size-12 text-red-500 mb-4" />
                <h2 className="text-lg font-semibold">Rejeitado</h2>
                <p className="text-sm text-zinc-500 mt-2">
                  {approval.message || 'Sua resposta foi registrada. Obrigado!'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </PublicLayout>
    )
  }

  // Pendente — mostrar form
  return (
    <PublicLayout>
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center justify-center gap-2 mb-2">
            <span className="px-2 py-1 bg-zinc-100 rounded text-xs font-medium text-zinc-600">
              {APPROVAL_TYPE_LABELS[approval.approval_type]}
            </span>
          </div>
          <h2 className="text-xl font-semibold">{approval.title}</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Job: {approval.job_title}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {approval.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">
              {approval.description}
            </p>
          )}

          {approval.file_url && (
            <a
              href={approval.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-50 hover:bg-zinc-100 text-sm font-medium text-zinc-700 transition-colors"
            >
              <FileText className="size-4" />
              Ver arquivo
              <ExternalLink className="size-3" />
            </a>
          )}

          <div>
            <label htmlFor="approval-comment" className="text-sm font-medium text-zinc-700 block mb-1.5">
              Comentario (opcional)
            </label>
            <Textarea
              id="approval-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Adicione um comentario..."
              className="bg-white"
            />
          </div>

          {errorMsg && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={isPending}
            onClick={() => handleRespond('rejected')}
            aria-label="Rejeitar aprovacao"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            Rejeitar
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled={isPending}
            onClick={() => handleRespond('approved')}
            aria-label="Aprovar solicitacao"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            Aprovar
          </Button>
        </CardFooter>
      </Card>

      <p className="text-center text-xs text-zinc-400 mt-6">
        Expira em {new Date(approval.expires_at).toLocaleDateString('pt-BR')}
      </p>
    </PublicLayout>
  )
}

// Layout publico minimalista — sem sidebar, sem topbar, tema claro fixo
function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center px-4 py-8 sm:py-16">
      {/* Logo */}
      <div className="mb-8">
        <span className="text-xl font-bold tracking-tight text-zinc-900">
          ELLAH<span className="text-rose-500">OS</span>
        </span>
      </div>

      {children}
    </div>
  )
}
