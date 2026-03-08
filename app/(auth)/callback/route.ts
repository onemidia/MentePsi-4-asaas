import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  // Proteção de Variáveis: Verifica se as chaves do Supabase existem
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
              // O middleware pode lidar com isso se necessário
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Se o link veio do 'forgot-password', o 'next' será '/reset-password'
      // O middleware agora vai permitir que ele chegue lá.
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }

    // Tratamento de Erro Detalhado
    if (error) {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Se algo der errado ou não houver código, volta para o login com uma mensagem
  return NextResponse.redirect(`${requestUrl.origin}/login?error=InvalidToken`)
}