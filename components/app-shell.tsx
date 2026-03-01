'use client'

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/MobileNav"
import { TrialBanner } from "@/components/trial-banner"
import { SubscriptionRequiredOverlay } from "@/components/subscription-required-overlay"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Loader2 } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<{ 
    createdAt: string, 
    status: string, 
    plan: string,
    isBlocked: boolean 
  } | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const getData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, subscription_status, plan_type, trial_ends_at')
        .eq('id', user.id)
        .single()

      // LÓGICA DE BLOQUEIO
      const status = profile?.subscription_status || 'trialing'
      const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
      const now = new Date()
      
      // Bloqueia se: Não for 'active' E (não tiver data de trial ou trial já venceu)
      const isPaid = status === 'active'
      const isTrialValid = status === 'trialing' && trialEndsAt && trialEndsAt > now
      const isBlocked = !isPaid && !isTrialValid

      setUserData({
        createdAt: profile?.created_at || user.created_at,
        status: status,
        plan: profile?.plan_type || 'Profissional',
        isBlocked: isBlocked
      })
      setLoading(false)
    }

    getData()
  }, [pathname]) // Re-verifica ao mudar de página para garantir segurança

  const hideSidebar =
    pathname === '/' ||
    pathname === '/login' ||
    pathname?.startsWith('/portal/') ||
    pathname === '/planos' ||
    pathname === '/registro'

  // 1. Enquanto carrega, evita mostrar o sistema (segurança)
  if (loading && !hideSidebar) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600 h-8 w-8" />
      </div>
    )
  }

  // 2. SE ESTIVER BLOQUEADO (Trial vencido e não pago)
  // E não for uma página pública, interrompemos tudo e mostramos o Overlay
  if (userData?.isBlocked && !hideSidebar) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <SubscriptionRequiredOverlay />
      </div>
    )
  }

  // 3. SE TIVER ACESSO (Trial ativo ou Pago), renderiza o sistema normal
  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {!hideSidebar && (
        <aside className="hidden lg:block w-64 border-r relative bg-white">
          <Sidebar />
        </aside>
      )}

      <div className="flex flex-col flex-1 min-w-0">

        {!hideSidebar && <MobileNav />}

        {!hideSidebar && userData && (
          <TrialBanner
            key="global-trial-banner"
            createdAt={userData.createdAt}
            status={userData.status}
            planName={userData.plan}
          />
        )}

        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-8">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}