import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'

export function useSubscription() {
  const [loading, setLoading] = useState(true)
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [subscription, setSubscription] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // 🛡️ PASSE LIVRE ADMIN
        const adminEmails = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br']
        if (adminEmails.includes(user.email?.toLowerCase() || '')) {
          setIsPaid(true)
          setIsTrialActive(true)
          setLoading(false)
          return
        }

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, saas_plans(*)') // Busca os detalhes do plano junto
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sub) {
          setSubscription(sub)
          
          // Checa se o período ainda é válido (Segurança extra)
          const isExpired = sub.current_period_end ? new Date(sub.current_period_end) < new Date() : false;

          if (sub.status === 'active' && !isExpired) {
            setIsPaid(true)
          } else if (sub.status === 'trialing' && !isExpired) {
            setIsTrialActive(true)
          }
        }
      } catch (err) {
        console.error("Erro ao verificar assinatura:", err)
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [])

  // Atalho para facilitar o uso nos componentes
  const hasAccess = isPaid || isTrialActive;

  return { isTrialActive, isPaid, hasAccess, loading, subscription }
}