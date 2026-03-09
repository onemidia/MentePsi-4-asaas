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

  const pathname = request.nextUrl.pathname
  const email = user?.email || ''

  // 🚀 ROTAS PÚBLICAS (inclui autenticação Supabase)
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/registro' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/auth') || // 👈 convite / set-password / callback
    pathname.startsWith('/planos')

  // 🚀 ROTAS FINANCEIRAS
  const isFinancialRoute =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/api/asaas') ||
    pathname.startsWith('/api/webhooks/asaas')

  if (isFinancialRoute) return response

  // 🚀 BLOQUEIO PARA NÃO LOGADOS
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 🚀 REDIRECIONAMENTO PARA USUÁRIOS LOGADOS
  if (user && (pathname === '/login' || pathname === '/')) {

    const isSuperAdmin = [
      'mentepsiclinic@gmail.com',
      'alvino@onemidia.tv.br'
    ].includes(email)

    if (isSuperAdmin) {
      return NextResponse.redirect(new URL('/hub', request.url))
    }

    // verifica se é assistente
    const { data: assistant } = await supabase
      .from('clinic_team')
      .select('active')
      .eq('member_email', email)
      .eq('active', true)
      .maybeSingle()

    if (assistant) {
      return NextResponse.redirect(new URL('/dashboard/assistente', request.url))
    }

    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 🚀 VERIFICAÇÕES PARA USUÁRIOS LOGADOS
  if (user && !isPublicRoute) {

    let role = user.user_metadata?.role
    let isAdmin = role === 'admin'
    let isAssistant = false
    let subscription = null

    if (!isAdmin) {

      const [profileRes, teamRes, subRes] = await Promise.all([

        supabase
          .from('professional_profile')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('clinic_team')
          .select('active')
          .eq('member_email', email)
          .eq('active', true)
          .maybeSingle(),

        supabase
          .from('subscriptions')
          .select('status, current_period_end')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

      ])

      isAdmin = profileRes.data?.role === 'admin'
      isAssistant = !!teamRes.data
      subscription = subRes.data
    }

    // admins e assistentes têm acesso completo
    if (isAdmin || isAssistant) {
      return response
    }

    // 🚀 CONTROLE DE ASSINATURA
    const now = new Date()

    let expirationDate = null

    if (subscription?.current_period_end) {
      const parsedDate = new Date(subscription.current_period_end)
      if (!isNaN(parsedDate.getTime())) {
        expirationDate = parsedDate
      }
    }

    const hasActivePlan = subscription?.status === 'active'

    const isTrialValid =
      subscription?.status === 'trialing' &&
      expirationDate &&
      expirationDate > now

    if (!hasActivePlan && !isTrialValid) {
      return NextResponse.redirect(new URL('/planos', request.url))
    }

  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|eot)$).*)',
  ],
}