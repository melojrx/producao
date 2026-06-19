import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buscarPapelAdminPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import { createSupabaseFetch } from '@/lib/supabase/fetch'
import {
  DJANGO_ACCESS_TOKEN_COOKIE,
  DJANGO_REFRESH_TOKEN_COOKIE,
} from '@/lib/django/session.ts'
import { tokenJwtExpirado } from '@/lib/django/jwt.ts'
import { estaUsandoDjango } from '@/lib/django/flags.ts'
import type { Database } from '@/types/supabase'

function redirecionarParaLogin(request: NextRequest, erro?: 'auth' | 'permissao') {
  const url = request.nextUrl.clone()
  url.pathname = '/login'

  if (erro === 'permissao') {
    url.searchParams.set('erro', 'sem-permissao')
  }

  if (erro === 'auth') {
    url.searchParams.set('erro', 'sessao-expirada')
  }

  return NextResponse.redirect(url)
}

function redirecionarParaDashboard(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/admin/dashboard'
  url.search = ''
  return NextResponse.redirect(url)
}

function possuiSessaoDjangoValida(request: NextRequest): boolean {
  const accessToken = request.cookies.get(DJANGO_ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = request.cookies.get(DJANGO_REFRESH_TOKEN_COOKIE)?.value

  if (!accessToken && !refreshToken) {
    return false
  }

  if (accessToken && !tokenJwtExpirado(accessToken)) {
    return true
  }

  return Boolean(refreshToken)
}

async function updateSessionDjango(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isScannerRoute = pathname.startsWith('/scanner')
  const isLoginRoute = pathname.startsWith('/login')
  const isPublicRoute = isScannerRoute || isLoginRoute

  if (isAdminRoute && !possuiSessaoDjangoValida(request)) {
    return redirecionarParaLogin(request, 'auth')
  }

  if (isLoginRoute && possuiSessaoDjangoValida(request)) {
    return redirecionarParaDashboard(request)
  }

  if (!isPublicRoute) {
    return NextResponse.next({ request })
  }

  return NextResponse.next({ request })
}

async function updateSessionSupabase(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      global: {
        fetch: createSupabaseFetch(),
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')
  const isScannerRoute = pathname.startsWith('/scanner')
  const isLoginRoute = pathname.startsWith('/login')
  const isPublicRoute = isScannerRoute || isLoginRoute
  const role = user ? await buscarPapelAdminPorAuthUserId(supabase, user.id) : null

  if (isAdminRoute) {
    if (!user) {
      return redirecionarParaLogin(request, 'auth')
    }

    if (!role) {
      return redirecionarParaLogin(request, 'permissao')
    }
  }

  if (isLoginRoute && user && role) {
    return redirecionarParaDashboard(request)
  }

  if (!isPublicRoute) {
    return supabaseResponse
  }

  return supabaseResponse
}

export async function updateSession(request: NextRequest) {
  if (estaUsandoDjango('auth')) {
    return updateSessionDjango(request)
  }

  return updateSessionSupabase(request)
}
