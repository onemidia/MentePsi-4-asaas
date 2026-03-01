import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  // 1. Definimos as rotas e perfis
  const isLoginPage = url.pathname === '/login'
  const isAdminRoute = url.pathname.startsWith('/admin')
  const isAppRoute = 
    url.pathname.startsWith('/dashboard') || 
    url.pathname.startsWith('/pacientes') ||
    url.pathname.startsWith('/agenda') ||
    url.pathname.startsWith('/financeiro')

  // Identifica se é o Super Admin pelo e-mail
  const isSuperAdmin = user?.email === 'mentepsiclinic@gmail.com'

  // 2. Trava de Segurança: Se tentar acessar App ou Admin sem estar logado
  if ((isAppRoute || isAdminRoute) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Busca perfil para verificação de Role e Assinatura
  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, subscription_status')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // 3. Trava de Fluxo e Redirecionamento por Perfil (Login -> Dashboard correta)
  if (isLoginPage && user) {
    if (profile?.role === 'admin' || isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 4. Proteção de Rota Admin: Permite SuperAdmin OU role='admin'
  if (isAdminRoute && user && !isSuperAdmin && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 5. Verificação de Assinatura (Apenas para Profissionais, Admin/SuperAdmin são isentos)
  if (user && isAppRoute && !isSuperAdmin && profile?.role !== 'admin') {
    // Bloqueia apenas inadimplentes
    if (profile?.subscription_status === 'canceled' || profile?.subscription_status === 'past_due') {
      if (url.pathname !== '/planos') {
        return NextResponse.redirect(new URL('/planos', request.url))
      }
    }
  }

  return response
}

export const config = {
  // O Matcher deve ignorar explicitamente a página de login para evitar loops
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
}