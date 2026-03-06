'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

export function useSubscription() {
  const [status, setStatus] = useState({
    isTrialActive: false,
    daysRemaining: 0,
    loading: true,
    isPaid: false,
    isExpired: false
  })

  // Singleton do Supabase: Instância criada fora do useEffect
  const supabase = createClient()

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatus(prev => ({ ...prev, loading: false }))
        return
      }

      // 1. BUSCA ASSINATURA
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      const now = new Date()
      let expirationDate: Date;
      let currentStatus: string;

      if (sub) {
        // Usuário com registro de assinatura
        expirationDate = sub.current_period_end ? new Date(sub.current_period_end) : now;
        currentStatus = sub.status;
      } else {
        // Fallback para novos usuários: assume trial de 30 dias a partir do cadastro
        const { data: planData } = await supabase.from('saas_plans').select('trial_days').eq('slug', 'professional').single();
        const trialDays = planData?.trial_days || 30;
        
        const createdAt = new Date(user.created_at);
        expirationDate = new Date(createdAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
        currentStatus = 'trialing';
      }

      const remaining = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      setStatus({
        isTrialActive: currentStatus === 'trialing' && remaining > 0,
        daysRemaining: remaining,
        isPaid: currentStatus === 'active',
        loading: false,
        isExpired: remaining === 0 && currentStatus !== 'active'
      })
    }

    fetchSubscription()
  }, [supabase])

  return status
}