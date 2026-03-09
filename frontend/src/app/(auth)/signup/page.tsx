'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'

function getSignupErrorMessage(message: string): string {
  const map: Record<string, string> = {
    'User already registered': 'Este email ja esta cadastrado. Tente fazer login.',
    'Email already in use': 'Este email ja esta cadastrado. Tente fazer login.',
    'Password should be at least 6 characters': 'A senha deve ter no minimo 6 caracteres',
    'Unable to validate email address': 'Email invalido. Verifique e tente novamente',
    'Signup is disabled': 'Cadastro desabilitado. Entre em contato com o suporte',
    'For security purposes': 'Aguarde alguns segundos antes de tentar novamente',
    'Too many requests': 'Muitas tentativas. Aguarde alguns minutos',
    'rate limit': 'Limite de tentativas atingido. Aguarde alguns minutos',
  }
  const key = Object.keys(map).find((k) => message.toLowerCase().includes(k.toLowerCase()))
  if (key) return map[key]
  console.error('[signup] Auth error:', message)
  return `Erro: ${message}`
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export default function SignupPage() {
  const router = useRouter()

  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!companyName.trim()) {
      errors.companyName = 'Nome da produtora e obrigatorio'
    }

    if (!fullName.trim()) {
      errors.fullName = 'Nome completo e obrigatorio'
    }

    if (!email.trim()) {
      errors.email = 'Email e obrigatorio'
    }

    if (password.length < 6) {
      errors.password = 'A senha deve ter no minimo 6 caracteres'
    }

    if (password !== passwordConfirm) {
      errors.passwordConfirm = 'As senhas nao coincidem'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          company_name: companyName.trim(),
        },
      },
    })

    if (error) {
      toast.error(getSignupErrorMessage(error.message))
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/onboarding')
    } else {
      setShowConfirmation(true)
      setLoading(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h2 className="text-xl font-semibold">Verifique seu email</h2>
          <p className="text-sm text-muted-foreground">
            Conta criada com sucesso
          </p>
        </div>

        <div className="mt-6 rounded-md bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          Enviamos um link de confirmacao para{' '}
          <span className="font-medium">{email}</span>. Acesse seu email e
          clique no link para ativar sua conta.
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ja confirmou?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Criar conta</h2>
        <p className="text-sm text-muted-foreground">
          Cadastre sua produtora no ELLAHOS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="company_name" className="text-sm font-medium">
            Nome da produtora
          </label>
          <input
            id="company_name"
            type="text"
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value)
              if (fieldErrors.companyName) {
                setFieldErrors((prev) => ({ ...prev, companyName: '' }))
              }
            }}
            placeholder="Ellah Filmes"
            autoComplete="organization"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError message={fieldErrors.companyName} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-sm font-medium">
            Seu nome completo
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (fieldErrors.fullName) {
                setFieldErrors((prev) => ({ ...prev, fullName: '' }))
              }
            }}
            placeholder="Maria Silva"
            autoComplete="name"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError message={fieldErrors.fullName} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: '' }))
              }
            }}
            placeholder="seu@email.com"
            autoComplete="email"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: '' }))
              }
            }}
            placeholder="Minimo 6 caracteres"
            autoComplete="new-password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError message={fieldErrors.password} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password_confirm" className="text-sm font-medium">
            Confirmar senha
          </label>
          <input
            id="password_confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value)
              if (fieldErrors.passwordConfirm) {
                setFieldErrors((prev) => ({ ...prev, passwordConfirm: '' }))
              }
            }}
            placeholder="Repita a senha"
            autoComplete="new-password"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <FieldError message={fieldErrors.passwordConfirm} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Ja tem conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  )
}
