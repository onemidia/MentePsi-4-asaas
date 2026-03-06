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
  const pathname = url.pathname

  // 1. EXCEÇÕES (Passe Livre)
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/registro' || 
    pathname === '/auth/callback' ||
    pathname.startsWith('/planos')

  const isFinancialRoute = 
    pathname.startsWith('/checkout') || 
    pathname.startsWith('/api/asaas') || 
    pathname.startsWith('/api/webhooks/asaas')

  if (isFinancialRoute) return response

  // 2. REDIRECIONAMENTO PÓS-LOGIN
  if (user && (pathname === '/login' || pathname === '/')) {
    const email = user.email || ''
    const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email)
    
    // Otimização: Tenta ler do metadata primeiro
    let role = user.user_metadata?.role

    if (!role) {
      const { data: profile } = await supabase
        .from('professional_profile')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      role = profile?.role
    }

    if (isSuperAdmin || role === 'admin') {
      return NextResponse.redirect(new URL('/hub', request.url))
    }
    
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (isPublicRoute) return response

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 1. Identificação do usuário
  const email = user.email || ''
  const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email)

  // 2. REGRA DE OURO (Passe Livre para o Marron)
  // Se for Super Admin, não aplique NENHUM redirecionamento de bloqueio.
  // Ele deve poder navegar em /admin, /dashboard e /dashboard/assistente livremente.
  if (isSuperAdmin) {
    return response; // Liberação total: o Middleware para aqui e deixa você passar.
  }

  // Otimização: Cache de Verificação
  let isAdmin = user.user_metadata?.role === 'admin'
  let isAssistant = false
  let subscription = null

  if (!isAdmin) {
    const [profileRes, teamRes, subRes] = await Promise.all([
      supabase.from('professional_profile').select('role').eq('user_id', user.id).maybeSingle(),
      supabase.from('clinic_team').select('status').eq('email', email).eq('status', 'active').maybeSingle(),
      supabase.from('subscriptions').select('status, current_period_end').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    ])
    isAdmin = profileRes.data?.role === 'admin'
    isAssistant = !!teamRes.data
    subscription = subRes.data
  }

  // REGRA DE OURO PARA O (ADMIN):
  // Se eu sou Admin, não me tire da rota que eu escolhi no HUB.
  if (isAdmin) {
    const allowedAdminRoutes = ['/admin', '/dashboard', '/hub', '/planos']
    const isInAllowedRoute = allowedAdminRoutes.some(route => pathname.startsWith(route))
    
    if (isInAllowedRoute) {
      return response // "Passe Livre": Não redireciona, apenas deixa navegar.
    }
  }

  // Assistentes não passam pela trava de pagamento
  if (isAssistant) return response

  // Trava para Profissionais (Usa a nova tabela subscriptions)
  const now = new Date()
  let expirationDate = null

  // Consistência de Data: Evita erro 500 se data for inválida
  if (subscription?.current_period_end) {
    const parsedDate = new Date(subscription.current_period_end)
    if (!isNaN(parsedDate.getTime())) {
      expirationDate = parsedDate
    }
  }
  
  const hasActivePlan = subscription?.status === 'active'
  const isTrialValid = subscription?.status === 'trialing' && expirationDate && expirationDate > now

  if (!hasActivePlan && !isTrialValid) {
    return NextResponse.redirect(new URL('/planos', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|eot)$).*)'],
}