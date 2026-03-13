'use client'

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/MobileNav"
import { TrialBanner } from "@/components/trial-banner"
import { SubscriptionRequiredOverlay } from "@/components/subscription-required-overlay"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/client'
import { Loader2 } from "lucide-react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [userData, setUserData] = useState<{ 
    trialEndsAt: string | Date, 
    status: string, 
    plan: string,
    isBlocked: boolean 
  } | null>(null)

  useEffect(() => {
    setIsMounted(true)
    const supabase = createClient()

    const getData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // 1. Busca na tabela de assinaturas (Onde a Trigger deve atuar)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end, grace_period_until')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const status = sub?.status || 'trialing'
      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null
      const now = new Date()
      
      // 🛡️ Super Admins com passe livre total
      const isSuperAdmin = ['alvino@onemidia.tv.br', 'mentepsiclinic@gmail.com'].includes(user.email?.toLowerCase() || '')
      
      const gracePeriodEnd = sub?.grace_period_until ? new Date(sub.grace_period_until) : null
      const isGraceValid = gracePeriodEnd && gracePeriodEnd > now

      const hasAccess = isSuperAdmin || status === 'active' || (status === 'trialing' && periodEnd && periodEnd > now) || isGraceValid
      const isBlocked = !hasAccess

      setUserData({
        trialEndsAt: periodEnd || new Date(), 
        status: status,
        plan: 'Profissional',
        isBlocked: isBlocked
      })
      setLoading(false)
    }

    getData()
  }, [])

  // ✅ ROTAS QUE NÃO MOSTRAM SIDEBAR/NAV (Branding Limpo)
  const hideSidebar =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/planos' ||
    pathname === '/registro' ||
    pathname === '/hub' ||
    pathname.startsWith('/auth') || // Cobre /auth/callback, /auth/reset-password, etc.
    (pathname?.startsWith('/portal/') && pathname !== '/portal')

  if (!isMounted) return null

  // Loader centralizado
  if (loading && !hideSidebar) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-teal-600 h-8 w-8" />
      </div>
    )
  }

  // Overlay de Bloqueio (Só aparece se não for rota pública e estiver bloqueado)
  if (userData?.isBlocked && !hideSidebar) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center p-4">
        <SubscriptionRequiredOverlay />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50">
      {!hideSidebar && (
        <aside className="hidden lg:block w-64 border-r bg-white h-full flex-shrink-0">
          <Sidebar />
        </aside>
      )}

      <div className="flex flex-col flex-1 min-w-0 h-full overflow-y-auto relative scroll-smooth">
        {!hideSidebar && <MobileNav />}

        {/* ✅ BANNER DE TRIAL NO TOPO */}
        {!hideSidebar && userData && userData.status === 'trialing' && (
          <TrialBanner
            key="global-trial-banner"
            trialEndsAt={userData.trialEndsAt}
            status={userData.status}
            planName={userData.plan}
          />
        )}

        <main className="flex-1 bg-slate-50">
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