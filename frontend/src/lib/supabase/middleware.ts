import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    !request.nextUrl.pathname.startsWith('/reset-password')
  ) {
    // Rotas publicas: portal do cliente e aprovacoes externas nao requerem autenticacao
    const isPublicRoute =
      request.nextUrl.pathname.startsWith('/portal/') ||
      request.nextUrl.pathname.startsWith('/approve/')
    if (isPublicRoute) {
      return supabaseResponse
    }

    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('returnUrl', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirecionar /login para / (dashboard) se ja logado
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}
