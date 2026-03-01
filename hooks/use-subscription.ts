'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { differenceInDays } from 'date-fns'
// Importamos a lógica central para não repetir código
import { getPlanLimits } from '@/lib/planLimits' 

export function useSubscription() {
  const [status, setStatus] = useState({
    isTrialActive: false,
    daysRemaining: 0,
    patientCount: 0,
    loading: true,
    planLimits: null as any // Adicionamos os limites reais aqui
  })

  useEffect(() => {
    const fetchSubscription = async () => {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus(prev => ({ ...prev, loading: false }))
        return
      }

      // 1. BUSCA TUDO: Note o plan_type e o subscription_status
      const [profileRes, countRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('created_at, plan_type, subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .eq('psychologist_id', user.id)
      ])

      const profile = profileRes.data
      const patientCount = countRes.count || 0
      
      // 2. LÓGICA DE TRIAL (Usando o que está no banco)
      const now = new Date()
      const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(new Date(profile?.created_at || user.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
      
      const remaining = Math.max(0, differenceInDays(trialEndsAt, now))
      
      // 3. Integração com o PLAN_LIMITS
      const limits = getPlanLimits(profile)

      setStatus({
        isTrialActive: profile?.subscription_status === 'trialing' && remaining > 0,
        daysRemaining: remaining,
        patientCount: patientCount,
        loading: false,
        planLimits: limits // Agora o componente sabe exatamente o que pode ou não usar
      })
    }

    fetchSubscription()
  }, [])

  return status
}