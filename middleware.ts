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
  const email = user?.email || ''

  const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email)
  
  // 1. REGRA DE DIRECIONAMENTO (PRIORIDADE MÁXIMA)
  if (user && (pathname === '/login' || pathname === '/')) {
    // Caso A: É um dos dois Super Admins -> Vai para o HUB
    if (isSuperAdmin) {
      return NextResponse.redirect(new URL('/hub', request.url))
    }

    // Caso B: É um profissional comum logado -> Vai direto para o DASHBOARD
    // Isso impede que ele caia na Landing Page (/) ou fique na tela de login
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Se já estiver logado e NÃO for uma das rotas acima, apenas segue (Passe Livre)
  if (isSuperAdmin) return response

  // 2. EXCEÇÕES PÚBLICAS
  const isPublicRoute = 
    pathname === '/' || 
    pathname === '/login' || 
    pathname === '/registro' || 
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/auth/callback' ||
    pathname.startsWith('/planos')

  const isFinancialRoute = 
    pathname.startsWith('/checkout') || 
    pathname.startsWith('/api/asaas') || 
    pathname.startsWith('/api/webhooks/asaas')

  if (isFinancialRoute) return response

  // 3. BLOQUEIO PARA NÃO LOGADOS
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. VERIFICAÇÃO DE ADMIN COMUM E ASSISTENTE
  if (user && !isPublicRoute) {
    let role = user.user_metadata?.role
    let isAdmin = role === 'admin'
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

    // Admins e Assistentes têm passe livre nas rotas internas
    if (isAdmin || isAssistant) return response

    // 5. TRAVA DE PAGAMENTO PARA PROFISSIONAIS COMUNS
    const now = new Date()
    let expirationDate = null
    if (subscription?.current_period_end) {
      const parsedDate = new Date(subscription.current_period_end)
      if (!isNaN(parsedDate.getTime())) expirationDate = parsedDate
    }
    
    const hasActivePlan = subscription?.status === 'active'
    const isTrialValid = subscription?.status === 'trialing' && expirationDate && expirationDate > now

    if (!hasActivePlan && !isTrialValid) {
      return NextResponse.redirect(new URL('/planos', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|eot)$).*)'],
}