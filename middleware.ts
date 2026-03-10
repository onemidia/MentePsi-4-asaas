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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname
  const email = user?.email || ''

  // 🚀 1. ROTAS PÚBLICAS (Garante que /auth/callback e /planos fiquem livres)
  const publicAuthRoutes = ['/auth/login', '/auth/registro', '/auth/callback', '/auth/set-password']
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/ajuda' || // Nova rota pública para tutoriais
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    publicAuthRoutes.includes(pathname) ||
    pathname.startsWith('/planos')

  const isFinancialRoute =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/api/asaas') ||
    pathname.startsWith('/api/webhooks') // Abrange qualquer webhook

  if (isFinancialRoute) return response

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 🚀 2. REDIRECIONAMENTO INTELIGENTE (Pós-Login)
  if (user && (pathname === '/auth/login' || pathname === '/')) {
    // Super Admins vão para o HUB
    const isSuperAdmin = [
      'mentepsiclinic@gmail.com',
      'alvino@onemidia.tv.br'
    ].includes(email.toLowerCase())

    if (isSuperAdmin) {
      return NextResponse.redirect(new URL('/auth/hub', request.url))
    }

    // Verifica se é assistente
    const { data: assistant } = await supabase
      .from('clinic_team')
      .select('active, status')
      .eq('member_email', email)
      .maybeSingle()

    if (assistant) {
      // Se o assistente está pendente, ativa a conta no primeiro login.
      if (assistant.status === 'pending') {
        // Aguardamos a atualização para garantir que ele entre já ativo
        await supabase
          .from('clinic_team')
          .update({ active: true, status: 'active' })
          .eq('member_email', email)
      }
      return NextResponse.redirect(new URL('/dashboard/assistente', request.url))
    }

    // Padrão: vai para o dashboard (o AppShell cuidará do bloqueio se necessário)
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 🚀 3. VERIFICAÇÃO DE ASSINATURA (Para quem já está dentro)
  if (user && !isPublicRoute) {
    if (pathname === '/dashboard') {
      return response
    }

    const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email.toLowerCase())
    if (isSuperAdmin) return response

    const [profileRes, teamRes, subRes] = await Promise.all([
      supabase.from('professional_profile').select('role').eq('user_id', user.id).maybeSingle(),
      supabase.from('clinic_team').select('active').eq('member_email', email).eq('active', true).maybeSingle(),
      supabase.from('subscriptions').select('status, current_period_end').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ])

    const isAdmin = profileRes.data?.role === 'admin'
    const isAssistant = !!teamRes.data
    const subscription = subRes.data

    if (isAdmin || isAssistant) return response

    // Controle de Assinatura Trial
    const now = new Date()
    let expirationDate = null
    if (subscription?.current_period_end) {
      expirationDate = new Date(subscription.current_period_end)
    }

    const hasActivePlan = subscription?.status === 'active'
    // IMPORTANTE: Aqui garantimos que o status 'trialing' vindo da Trigger libere o acesso
    const isTrialValid = (subscription?.status === 'trialing' || subscription?.status === 'trial') && 
                        expirationDate && expirationDate > now

    const isFirstLogin = !subscription

    if (!hasActivePlan && !isTrialValid && !isFirstLogin) {
      // Evita loop se já estiver tentando assinar
      if (pathname !== '/planos') {
        return NextResponse.redirect(new URL('/planos', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|eot)$).*)'],
}