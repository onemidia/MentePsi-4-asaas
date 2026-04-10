import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SubscriptionRequiredOverlay } from '@/components/subscription-required-overlay'

const THEMES = [
  { id: 'padrao', name: 'Padrão', primary: '#0d9488', secondary: '#f0fdfa' },
  { id: 'oceano', name: 'Oceano', primary: '#1e40af', secondary: '#eff6ff' },
  { id: 'natureza', name: 'Natureza', primary: '#166534', secondary: '#f0fdf4' },
  { id: 'lavanda', name: 'Lavanda', primary: '#6b21a8', secondary: '#faf5ff' },
  { id: 'grafite', name: 'Grafite', primary: '#334155', secondary: '#f8fafc' },
];

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

  // Dentro do seu DashboardLayout
  const admins = [
    'alvino@onemidia.tv.br', 
    'mentepsiclinic@gmail.com', 
    'onemidiamarketing@gmail.com'
  ];

  const isSuperAdmin = admins.includes(user.email || '');

  if (isSuperAdmin) {
    return <>{children}</>; // Imunidade total contra bloqueios de assinatura
  }

  // BUSCA DO TEMA DO USUÁRIO
  const { data: profile } = await supabase
    .from('professional_profile')
    .select('theme_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const activeTheme = THEMES.find(t => t.id === profile?.theme_name) || THEMES[0];

  // 🟢 BLINDAGEM: Imunidade para Equipe/Assistentes (Acesso liberado sem checar assinatura)
  // const { data: teamMember } = await supabase
  //   .from('clinic_team')
  //   .select('status')
  //   .eq('email', user.email)
  //   .eq('status', 'active')
  //   .maybeSingle()
  //
  // if (teamMember) { return <>{children}</> }

  // LÓGICA DO PLANO ÚNICO (Via Subscriptions)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, grace_period_until')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date()
  const trialEndsAt = subscription?.current_period_end ? new Date(subscription.current_period_end) : null
  const gracePeriodEnd = subscription?.grace_period_until ? new Date(subscription.grace_period_until) : null
  
  const isTrialValid = subscription?.status === 'trialing' && trialEndsAt && trialEndsAt > now
  const isPaid = subscription?.status === 'active'
  const isInGracePeriod = subscription?.status === 'overdue' && gracePeriodEnd && gracePeriodEnd > now

  // BLOQUEIO TOTAL se não estiver pago ou em trial
  if (!isTrialValid && !isPaid && !isInGracePeriod) {
    return <SubscriptionRequiredOverlay />
  }

  return (
    <>
      <style>{`
        :root {
          --primary-color: ${activeTheme.primary};
          --secondary-color: ${activeTheme.secondary};
        }
      `}</style>
      {subscription?.status === 'overdue' && (
        <div className="bg-amber-100 border-b border-amber-200 p-3 text-amber-800 text-center text-sm font-medium">
          ⚠️ <strong>Atenção:</strong> Identificamos um atraso no seu pagamento. 
          Seu acesso está garantido pela carência até {new Date(subscription.grace_period_until).toLocaleDateString('pt-BR')}. 
          <a href="/planos" className="underline ml-2">Regularizar agora</a>
        </div>
      )}
      {children}
    </>
  )
}