'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function sanitizeReturnUrl(url: string | null): string {
  if (!url) return '/'
  if (!url.startsWith('/')) return '/'
  if (url.startsWith('//')) return '/'
  if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(url)) return '/'
  return url
}

function getAuthErrorMessage(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Confirme seu email antes de fazer login',
    'Too many requests': 'Muitas tentativas. Aguarde alguns minutos',
    'User already registered': 'Ocorreu um erro. Tente novamente',
    'For security purposes': 'Aguarde alguns segundos antes de tentar novamente',
    'Phone not confirmed': 'Confirme seu celular antes de fazer login',
    'Invalid OTP': 'Codigo invalido ou expirado. Tente novamente',
    'Token has expired': 'Codigo expirado. Solicite um novo codigo',
    'Otp expired': 'Codigo expirado. Solicite um novo codigo',
    'SMS provider error': 'Erro ao enviar SMS. Tente novamente em instantes',
    'Unable to validate phone': 'Numero de celular invalido. Verifique e tente novamente',
    'Phone number is invalid': 'Numero de celular invalido. Verifique e tente novamente',
  }
  const key = Object.keys(map).find((k) => message.includes(k))
  if (key) return map[key]
  console.error('[login] Auth error:', message)
  return `Erro: ${message}`
}

function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55')) {
    return `+${digits}`
  }
  return `+55${digits}`
}

function EmailForm({ returnUrl }: { returnUrl: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get('session_expired')
  const passwordResetSuccess = searchParams.get('message') === 'password_reset_success'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(getAuthErrorMessage(error.message))
      setLoading(false)
      return
    }

    router.push(returnUrl)
    router.refresh()
  }

  return (
    <>
      {sessionExpired && (
        <div className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Sua sessao expirou. Faca login novamente.
        </div>
      )}

      {passwordResetSuccess && (
        <div className="mt-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
          Senha redefinida com sucesso. Faca login com a nova senha.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            autoComplete="email"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="********"
            required
            autoComplete="current-password"
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
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Esqueceu a senha?
        </Link>
      </div>
    </>
  )
}

function PhoneForm({ returnUrl }: { returnUrl: string }) {
  const router = useRouter()

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function startCountdown() {
    setCountdown(60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d+\s\-()]/g, '')
    setPhone(raw)
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formatted = formatPhoneNumber(phone)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })

    if (error) {
      setError(getAuthErrorMessage(error.message))
      setLoading(false)
      return
    }

    setLoading(false)
    setStep('otp')
    startCountdown()
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formatted = formatPhoneNumber(phone)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      phone: formatted,
      token: otp,
      type: 'sms',
    })

    if (error) {
      setError(getAuthErrorMessage(error.message))
      setLoading(false)
      return
    }

    router.push(returnUrl)
    router.refresh()
  }

  async function handleResend() {
    if (countdown > 0) return
    setError(null)
    setLoading(true)

    const formatted = formatPhoneNumber(phone)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ phone: formatted })

    if (error) {
      setError(getAuthErrorMessage(error.message))
      setLoading(false)
      return
    }

    setLoading(false)
    startCountdown()
  }

  if (step === 'phone') {
    return (
      <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Celular
          </label>
          <div className="flex items-center gap-2">
            <span className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
              +55
            </span>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(11) 91234-5678"
              required
              autoComplete="tel"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Voce recebera um codigo por SMS
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? 'Enviando...' : 'Enviar Codigo'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="otp" className="text-sm font-medium">
          Codigo de verificacao
        </label>
        <input
          id="otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          required
          autoComplete="one-time-code"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-center text-sm tracking-[0.4em] shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Codigo enviado para {formatPhoneNumber(phone)}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || otp.length < 6}
        className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {loading ? 'Verificando...' : 'Verificar'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setStep('phone')
            setOtp('')
            setError(null)
            if (timerRef.current) clearInterval(timerRef.current)
            setCountdown(0)
          }}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          Trocar numero
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || loading}
          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {countdown > 0 ? `Reenviar em ${countdown}s` : 'Reenviar codigo'}
        </button>
      </div>
    </form>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  const returnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'))

  const [tab, setTab] = useState<'email' | 'phone'>('email')

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Entrar</h2>
        <p className="text-sm text-muted-foreground">
          Acesse sua conta do ELLAHOS
        </p>
      </div>

      <div className="mt-5 flex rounded-md border border-input bg-muted p-0.5">
        <button
          type="button"
          onClick={() => setTab('email')}
          className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
            tab === 'email'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Email
        </button>
        <button
          type="button"
          onClick={() => setTab('phone')}
          className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
            tab === 'phone'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Celular
        </button>
      </div>

      {tab === 'email' ? (
        <EmailForm returnUrl={returnUrl} />
      ) : (
        <PhoneForm returnUrl={returnUrl} />
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
