import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { getSubscriptionStatus } from '@/lib/subscription'

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

      // 2. Buscar Perfil (Plano e Data de Início do Trial)
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, trial_started_at')
        .eq('id', user.id)
        .single()

      // 3. Contar Pacientes
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const patientCount = count || 0
      
      // Usar a função auxiliar para lógica de negócio
      const result = getSubscriptionStatus(profile, patientCount)

      setStatus({
        isTrialActive: !result.isExpired,
        daysRemaining: result.daysRemaining,
        isFreePlan: result.currentPlan === 'Free',
        canAddPatient: result.canCreatePatient,
        patientCount,
        planType: result.currentPlan,
        loading: false
      })
    }

    fetchSubscription()
  }, [])

  return status
}