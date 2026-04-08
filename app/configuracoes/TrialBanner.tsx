'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Info, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function TrialBanner() {
  const [remainingDays, setRemainingDays] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (sub && sub.status === 'trialing' && sub.current_period_end) {
        const endDate = new Date(sub.current_period_end)
        const now = new Date()
        // Use Math.ceil para contar corretamente os dias parciais como um dia inteiro restante
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysLeft <= 0) {
          setIsExpired(true)
          setRemainingDays(0)
        } else {
          setRemainingDays(daysLeft)
        }
      }
      setIsLoading(false)
    }

    fetchSubscription()
  }, [])

  if (isLoading || remainingDays === null) {
    return null // Não exibe nada enquanto carrega ou se não estiver em trial
  }

  const message = isExpired
    ? <>Seu período de teste <strong>expirou</strong>. Ative sua assinatura para não perder o acesso.</>
    : remainingDays === 1
      ? <>Seu teste gratuito termina <strong>amanhã</strong>! Garanta seu acesso contínuo.</>
      : <>Você tem <strong>{remainingDays} dias</strong> restantes no seu período de teste gratuito.</>

  return (
    <div className={`w-full p-4 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200 text-red-900' : 'bg-brand-secondary border-brand-primary/30 text-brand-primary'} flex flex-col sm:flex-row items-center gap-4 mb-8`}>
      <div className="shrink-0">{isExpired ? <AlertTriangle className="h-5 w-5 text-red-600" /> : <Info className="h-5 w-5 text-brand-primary" />}</div>
      <div className="flex-grow text-sm font-medium text-center sm:text-left">{message}</div>
      <Button asChild variant="outline" className="bg-white shadow-sm hover:bg-slate-50 whitespace-nowrap w-full sm:w-auto">
        <Link href="/planos">{isExpired ? 'Ativar Assinatura' : 'Ver Planos'}</Link>
      </Button>
    </div>
  )
}