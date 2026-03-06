import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

export type SubscriptionStatus = {
  isTrialActive: boolean
  daysRemaining: number
  isFreePlan: boolean
  canAddPatient: boolean
  patientCount: number
  planType: string
  loading: boolean
}

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isTrialActive: false,
    daysRemaining: 0,
    isFreePlan: true,
    canAddPatient: true,
    patientCount: 0,
    planType: 'Free',
    loading: true
  })

  useEffect(() => {
    const fetchSubscription = async () => {
      const supabase = createClient()
      
      // 1. Obter Usuário Atual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus(prev => ({ ...prev, loading: false }))
        return
      }

      // 2. Buscar Assinatura Ativa
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let daysRemaining = 0
      let isTrialActive = false

      if (sub?.status === 'trialing' && sub.current_period_end) {
        const endDate = new Date(sub.current_period_end)
        const now = new Date()
        const diffTime = endDate.getTime() - now.getTime()
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
        isTrialActive = daysRemaining > 0
      }

      setStatus({
        isTrialActive,
        daysRemaining,
        isFreePlan: false, // Conceito descontinuado
        canAddPatient: true, // Ilimitado
        patientCount: 0, // Não é mais necessário consultar
        planType: 'Professional',
        loading: false
      })
    }

    fetchSubscription()
  }, [])

  return status
}