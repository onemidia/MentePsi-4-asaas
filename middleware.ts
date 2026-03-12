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

  // 🚀 1. ROTAS PÚBLICAS
  const publicAuthRoutes = ['/auth/login', '/auth/registro', '/auth/callback', '/auth/set-password']
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/ajuda' ||
    pathname === '/termos' ||
    pathname === '/privacidade' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    publicAuthRoutes.includes(pathname) ||
    pathname.startsWith('/planos')

  if (isPublicRoute) return response

  const isFinancialRoute =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/api/asaas') ||
    pathname.startsWith('/api/webhooks')

  if (isFinancialRoute) return response

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // 🚀 2. REDIRECIONAMENTO INTELIGENTE (Pós-Login)
  if (user && (pathname === '/auth/login' || pathname === '/')) {
    const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email.toLowerCase())
    if (isSuperAdmin) return NextResponse.redirect(new URL('/auth/hub', request.url))

    const { data: assistant } = await supabase
      .from('clinic_team')
      .select('active, status')
      .eq('member_email', email)
      .maybeSingle()

    if (assistant) {
      if (assistant.status === 'pending') {
        await supabase
          .from('clinic_team')
          .update({ active: true, status: 'active' })
          .eq('member_email', email)
      }
      return NextResponse.redirect(new URL('/dashboard/assistente', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 🚀 3. VERIFICAÇÃO DE ASSINATURA E CARÊNCIA
  if (user && !isPublicRoute) {
    const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email.toLowerCase())
    if (isSuperAdmin || pathname === '/dashboard') return response

    const [profileRes, teamRes, subRes] = await Promise.all([
      supabase.from('professional_profile').select('role').eq('user_id', user.id).maybeSingle(),
      supabase.from('clinic_team').select('active').eq('member_email', email).eq('active', true).maybeSingle(),
      supabase.from('subscriptions').select('status, current_period_end, grace_period_until').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ])

    if (profileRes.data?.role === 'admin' || !!teamRes.data) return response

    const subscription = subRes.data
    const now = new Date()
    
    // Validação de Trial
    let expirationDate = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
    const isTrialValid = (subscription?.status === 'trialing' || subscription?.status === 'trial') && 
                        expirationDate && expirationDate > now

    // 🟢 Validação de Carência (Grace Period)
    let gracePeriodDate = subscription?.grace_period_until ? new Date(subscription.grace_period_until) : null
    const isGracePeriodValid = subscription?.status === 'overdue' && 
                               gracePeriodDate && gracePeriodDate > now

    const hasActivePlan = subscription?.status === 'active'
    const isFirstLogin = !subscription

    if (!hasActivePlan && !isTrialValid && !isGracePeriodValid && !isFirstLogin) {
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