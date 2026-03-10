'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// --- Tipos ---

interface InviteDetails {
  company_name: string | null
  role: string
  email: string | null
  phone: string | null
  expires_at: string
}

// --- Constantes ---

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  ceo: 'CEO',
  produtor_executivo: 'Produtor Executivo',
  coordenador: 'Coordenador',
  diretor: 'Diretor',
  financeiro: 'Financeiro',
  atendimento: 'Atendimento',
  comercial: 'Comercial',
  freelancer: 'Freelancer',
}

// --- Pagina ---

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const router = useRouter()

  const [details, setDetails] = useState<InviteDetails | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(true)

  const [accepting, setAccepting] = useState(false)
  const [acceptResult, setAcceptResult] = useState<'success' | 'error' | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  // Verificar sessao do usuario e buscar detalhes do convite
  useEffect(() => {
    async function init() {
      const supabase = createClient()

      // Verificar se ha usuario logado
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setIsLoggedIn(true)
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setAccessToken(session?.access_token ?? null)
      }

      // Buscar detalhes publicos do convite
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/tenant-management/invitations/details?token=${encodeURIComponent(token)}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        )
        const json = await res.json()

        if (!res.ok || json?.error) {
          const message = json?.error?.message ?? 'Convite invalido ou expirado.'
          setLoadError(message)
        } else {
          setDetails(json?.data ?? null)
        }
      } catch {
        setLoadError('Nao foi possivel carregar os detalhes do convite.')
      } finally {
        setLoadingDetails(false)
      }
    }

    init()
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    setAcceptError(null)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/tenant-management/invitations/accept`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ token }),
        },
      )

      const json = await res.json()

      if (!res.ok || json?.error) {
        const message = json?.error?.message ?? 'Erro ao aceitar o convite.'
        setAcceptError(message)
        setAcceptResult('error')
      } else {
        setAcceptResult('success')
        // Redirecionar ao dashboard apos 2s
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch {
      setAcceptError('Erro de conexao. Verifique sua internet e tente novamente.')
      setAcceptResult('error')
    } finally {
      setAccepting(false)
    }
  }

  // --- Estados de carregamento e erro ---

  if (loadingDetails) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm text-center space-y-3">
        <Loader2 className="size-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Verificando convite...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm text-center space-y-4">
        <XCircle className="size-10 mx-auto text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Convite invalido</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Ir para o login
        </Link>
      </div>
    )
  }

  // --- Estado apos aceitar ---

  if (acceptResult === 'success') {
    return (
      <div className="rounded-lg border bg-card p-8 shadow-sm text-center space-y-4">
        <CheckCircle2 className="size-10 mx-auto text-emerald-500" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Convite aceito!</h2>
          <p className="text-sm text-muted-foreground">
            Voce entrou para a equipe
            {details?.company_name ? ` de ${details.company_name}` : ''}.
            Redirecionando...
          </p>
        </div>
      </div>
    )
  }

  // --- Exibir detalhes do convite ---

  const roleLabel = details?.role ? (ROLE_LABELS[details.role] ?? details.role) : '-'
  let expiresDate: string | null = null
  try {
    expiresDate = details?.expires_at
      ? new Date(details.expires_at).toLocaleDateString('pt-BR')
      : null
  } catch {
    expiresDate = null
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">Convite para a equipe</h2>
        <p className="text-sm text-muted-foreground">
          Voce foi convidado para fazer parte de uma organizacao no ELLAHOS
        </p>
      </div>

      {/* Detalhes do convite */}
      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
        {details?.company_name && (
          <div className="flex items-center gap-2.5">
            <Building2 className="size-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Empresa</p>
              <p className="text-sm font-medium">{details.company_name}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Cargo</p>
            <p className="font-medium">{roleLabel}</p>
          </div>
          {expiresDate && (
            <div>
              <p className="text-xs text-muted-foreground">Expira em</p>
              <p className="font-medium">{expiresDate}</p>
            </div>
          )}
          {details?.email && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Email convidado</p>
              <p className="font-medium">{details.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Erro de aceite */}
      {acceptResult === 'error' && acceptError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {acceptError}
        </div>
      )}

      {/* Acoes */}
      {isLoggedIn ? (
        /* Usuario logado: pode aceitar diretamente */
        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Aceitando...
              </>
            ) : (
              'Aceitar Convite'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Voce esta logado e vai ingressar diretamente na organizacao.
          </p>
        </div>
      ) : (
        /* Usuario nao logado: orientar a fazer login */
        <div className="space-y-3">
          <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Voce precisa estar logado para aceitar este convite.
          </div>

          <Link
            href={`/login?returnUrl=/invite/${token}`}
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Fazer login primeiro
          </Link>

          <p className="text-xs text-center text-muted-foreground">
            Apos o login, voce sera redirecionado de volta para esta pagina.
          </p>
        </div>
      )}
    </div>
  )
}
