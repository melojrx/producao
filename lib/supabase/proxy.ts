import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { extractAdminRole } from '@/lib/auth/roles'
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

export async function updateSession(request: NextRequest) {
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
  const role = user ? extractAdminRole(user) : null

  if (isAdminRoute) {
    if (!user) {
      return redirecionarParaLogin(request, 'auth')
    }

    if (!role) {
      return redirecionarParaLogin(request, 'permissao')
    }
  }

  if (isLoginRoute && user && role) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!isPublicRoute) {
    return supabaseResponse
  }

  return supabaseResponse
}
