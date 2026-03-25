'use client'

import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { MobileNav } from "@/components/MobileNav"
import { TrialBanner } from "@/components/trial-banner"
import { SubscriptionRequiredOverlay } from "@/components/subscription-required-overlay"
import { useEffect, useState } from "react"
import { createClient } from '@/lib/client'
import { Loader2, Bell, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
  const [pendingPayments, setPendingPayments] = useState(0)

  useEffect(() => {
    setIsMounted(true)
    const supabase = createClient()

    const fetchPendingCount = async (userId: string) => {
      try {
        const { count, error } = await supabase
          .from('patient_documents')
          .select('id', { count: 'exact', head: true })
          .eq('psychologist_id', userId)
          .ilike('title', '%Comprovante%')
          .eq('status', 'Pendente')
        
        if (error) throw error;
        setPendingPayments(count || 0)
      } catch (err) {
        console.warn("Aviso: Falha ao buscar contagem de comprovantes:", err)
      }
    }

    const getData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      fetchPendingCount(user.id)

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

    // Fallback manual para atualização instantânea via eventos do navegador
    const handleManualUpdate = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchPendingCount(user.id);
    };
    window.addEventListener('atualizar_notificacoes', handleManualUpdate);

    const channel = supabase.channel('pending-docs-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_documents' }, async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          fetchPendingCount(user.id)
        }
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
      window.removeEventListener('atualizar_notificacoes', handleManualUpdate);
    }
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

        {/* 🚀 FILA DE BANNERS GLOBAL */}
        <div className="flex flex-col w-full relative z-40">
          {/* 1º: BANNER DE TRIAL NO TOPO */}
          {userData?.status === 'trialing' && !hideSidebar && (
            <div className="w-full shadow-sm relative z-50">
              <TrialBanner
                key="global-trial-banner"
                trialEndsAt={userData.trialEndsAt}
                status={userData.status}
                planName={userData.plan}
              />
            </div>
          )}

          {/* 2º: BANNER AMARELO DE PENDÊNCIAS */}
          {pendingPayments > 0 && !hideSidebar && (
            <div className="w-full bg-amber-50 border-b border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 relative z-40">
              <div className="p-3 max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-amber-800">
                  <div className="p-2 bg-amber-100 rounded-full animate-pulse shrink-0">
                    <Bell className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="font-bold text-sm">
                    Você tem <span className="text-base">{pendingPayments}</span> novo{pendingPayments > 1 ? 's' : ''} comprovante{pendingPayments > 1 ? 's' : ''} aguardando conferência.
                  </p>
                </div>
                <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm w-full sm:w-auto shrink-0">
                  <Link href="/financeiro?pending_receipt=true">
                    Ver e Aprovar <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

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