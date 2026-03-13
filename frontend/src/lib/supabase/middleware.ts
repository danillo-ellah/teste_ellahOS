import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Verificar env vars (inlined no build, mas proteger contra falha)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request })
  }

  try {
    let supabaseResponse = NextResponse.next({
      request,
    })

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            )
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Rotas protegidas: dashboard
    if (
      !user &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/forgot-password') &&
      !request.nextUrl.pathname.startsWith('/reset-password') &&
      !request.nextUrl.pathname.startsWith('/auth/callback')
    ) {
      // Rotas publicas: portal do cliente, aprovacoes externas e portal do fornecedor nao requerem autenticacao
      const isPublicRoute =
        request.nextUrl.pathname.startsWith('/portal/') ||
        request.nextUrl.pathname.startsWith('/approve/') ||
        request.nextUrl.pathname.startsWith('/vendor/') ||
        request.nextUrl.pathname.startsWith('/crew/') ||
        request.nextUrl.pathname.startsWith('/invite/') ||
        request.nextUrl.pathname.startsWith('/landing') ||
        request.nextUrl.pathname.startsWith('/pricing') ||
        request.nextUrl.pathname.startsWith('/enterprise') ||
        request.nextUrl.pathname.startsWith('/signup')
      if (isPublicRoute) {
        return supabaseResponse
      }

      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('returnUrl', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Redirecionar /login e /signup para / (dashboard) se ja logado
    if (
      user &&
      (request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup'))
    ) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Guard de onboarding: se logado mas onboarding nao concluido, redirecionar para /onboarding
    // (exceto se ja esta no onboarding ou em rotas publicas)
    if (
      user &&
      !request.nextUrl.pathname.startsWith('/onboarding') &&
      !request.nextUrl.pathname.startsWith('/auth/callback')
    ) {
      // Verificar app_metadata no JWT para onboarding_completed
      // O campo e setado pelo EF complete-onboarding
      const appMeta = (user as unknown as { app_metadata?: Record<string, unknown> })
        .app_metadata
      if (appMeta && appMeta.onboarding_completed === false) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

    return supabaseResponse
  } catch {
    // Fail-closed: se o middleware falhar (ex: Supabase indisponivel),
    // redirecionar para login em vez de permitir acesso sem auth.
    // Exceto rotas publicas que nao precisam de autenticacao.
    const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password',
      '/auth/callback', '/portal/', '/approve/', '/vendor/', '/crew/', '/invite/', '/landing', '/pricing', '/enterprise', '/onboarding']
    const isPublic = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))
    if (isPublic) {
      return NextResponse.next({ request })
    }
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}
