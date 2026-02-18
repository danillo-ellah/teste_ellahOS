'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRecoverySession, setIsRecoverySession] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Escutar evento PASSWORD_RECOVERY do Supabase (vem do magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoverySession(true)
          setChecking(false)
        }
      },
    )

    // Fallback: verificar se ja ha sessao ativa (link processado antes do mount)
    supabase.auth.getUser().then(({ data: { user } }) => {
      // Se nao houve evento PASSWORD_RECOVERY e nao ha user, redirecionar
      // Se ha user mas sem evento de recovery, pode ter vindo do hash da URL
      // Damos um timeout curto para o evento chegar
      setTimeout(() => {
        setChecking((prev) => {
          // Se ainda estiver checking, decidir baseado no user
          if (prev) {
            if (!user) {
              router.replace('/login')
              return false
            }
            // User existe - pode ser recovery via hash processado pelo SDK
            // Permitir o formulario (o updateUser validara server-side)
            setIsRecoverySession(true)
            return false
          }
          return prev
        })
      }, 1000)
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(
        error.message.includes('same password')
          ? 'A nova senha deve ser diferente da senha atual'
          : 'Ocorreu um erro ao redefinir a senha. O link pode ter expirado.'
      )
      setLoading(false)
      return
    }

    router.push('/jobs')
    router.refresh()
  }

  // Estado de verificacao
  if (checking) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="text-center text-sm text-muted-foreground">
          Verificando link de recuperacao...
        </div>
      </div>
    )
  }

  // Sessao invalida
  if (!isRecoverySession) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold">Link invalido</h2>
          <p className="text-sm text-muted-foreground">
            Este link de recuperacao expirou ou e invalido. Solicite um novo.
          </p>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            Solicitar novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground">
          Digite sua nova senha.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Nova senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
            autoComplete="new-password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="********"
            required
            autoComplete="new-password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/login"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Voltar para login
        </Link>
      </div>
    </div>
  )
}
