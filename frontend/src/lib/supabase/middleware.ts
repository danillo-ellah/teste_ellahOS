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
        request.nextUrl.pathname.startsWith('/invite/') ||
        request.nextUrl.pathname.startsWith('/landing') ||
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

    return supabaseResponse
  } catch {
    // Se o middleware falhar (ex: Supabase indisponivel), deixar a request passar
    return NextResponse.next({ request })
  }
}
