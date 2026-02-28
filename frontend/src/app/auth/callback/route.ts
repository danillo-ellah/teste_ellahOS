import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Rota de callback para fluxo PKCE do Supabase Auth.
 * Quando o usuario clica no link de recovery/magic-link no email,
 * o Supabase redireciona para ca com ?code=xxx.
 * Trocamos o code por sessao e redirecionamos para a pagina destino.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    console.error('[auth/callback] Erro ao trocar code por sessao:', error.message)
  }

  // Se nao tem code ou deu erro, redirecionar para pagina de erro
  return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`)
}
