import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SubscriptionRequiredOverlay } from '@/components/subscription-required-overlay'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
           try {
             cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
           } catch {}
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscamos as colunas que definimos para o Plano Único
  const { data: profile } = await supabase
    .from('profiles') // Usando a tabela profiles diretamente para garantir os dados novos
    .select('subscription_status, trial_ends_at, plan_type')
    .eq('id', user.id)
    .single()

  // LÓGICA DO PLANO ÚNICO
  const now = new Date()
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  
  // Condições de acesso:
  // 1. Está no período de teste (Trial não expirou)
  const isTrialValid = profile?.subscription_status === 'trialing' && trialEndsAt && trialEndsAt > now
  
  // 2. Já realizou o pagamento (Status Ativo)
  const isPaid = profile?.subscription_status === 'active'

  // SE NÃO ESTIVER EM TRIAL VÁLIDO E NÃO ESTIVER PAGO -> BLOQUEIO TOTAL
  if (!isTrialValid && !isPaid) {
    // Aqui você tem duas opções:
    // Opção A: Redirecionar para a página de planos (Mais agressivo)
    // redirect('/planos') 

    // Opção B: Mostrar o Overlay (Mais elegante, mantém ele na URL que estava)
    return <SubscriptionRequiredOverlay />
  }

  return <>{children}</>
}