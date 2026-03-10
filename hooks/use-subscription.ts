import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

export function useSubscription() {
  const [loading, setLoading] = useState(true)
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 🛡️ PASSE LIVRE ADMIN
      const adminEmails = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br']
      if (adminEmails.includes(user.email?.toLowerCase() || '')) {
        setIsPaid(true)
        setIsTrialActive(true) // Considera ativo também
        setLoading(false)
        return
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sub) {
        if (sub.status === 'active') setIsPaid(true)
        if (sub.status === 'trialing') setIsTrialActive(true)
      }
      setLoading(false)
    }
    check()
  }, [])

  return { isTrialActive, isPaid, loading, plan }
}