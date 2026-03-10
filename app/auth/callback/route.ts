import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // 🚀 REDIRECIONAMENTO INTELIGENTE
  // Se houver um parâmetro 'next' (ex: vindo de reset de senha), usamos ele.
  // Caso contrário, mandamos para a raiz '/' para o seu Middleware decidir
  // se o usuário vai para o /hub, /dashboard ou /dashboard/assistente.
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Validação de segurança das chaves
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=ServerConfigurationError`)
  }

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Middleware assume o controle se houver erro de escrita de cookie aqui
            }
          },
        },
      }
    )

    // Troca o código temporário do Google pela sessão permanente
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 🛡️ VERIFICAÇÃO DE ADMIN PARA REDIRECIONAMENTO (GOOGLE LOGIN)
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmails = ['alvino@onemidia.tv.br', 'mentepsiclinic@gmail.com', 'onemidiamarketing@gmail.com'];
      
      if (user && adminEmails.includes(user.email?.toLowerCase() || '')) {
         return NextResponse.redirect(`${requestUrl.origin}/auth/hub`)
      }

      // Redireciona para a URL final (limpando os parâmetros de código da barra de busca)
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }

    if (error) {
      console.error('Erro no Callback:', error.message)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Se chegar aqui sem código, algo falhou no fluxo do Google
  return NextResponse.redirect(`${requestUrl.origin}/login?error=InvalidToken`)
}