'use client'

import React from 'react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import Link from "next/link"
import { useSubscription } from "@/hooks/use-subscription"

export function SubscriptionBanner() {
  // O hook useSubscription já foi blindado para retornar dados apenas do psicólogo logado
  const {
    isTrialActive = false,
    daysRemaining = 0,
    loading = false
  } = useSubscription()

  // Evita mostrar banners errados enquanto os dados estão sendo buscados no Supabase
  if (loading) return null
  
  // Caso 1: Período de Teste Ativo (Mostra contagem regressiva personalizada)
  if (isTrialActive) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-b border-blue-200 bg-blue-50/90 text-blue-900 flex items-center justify-between py-2 px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
          <AlertDescription className="text-sm font-medium">
            Você está no modo **Avaliação Premium**. Restam <span className="font-bold text-blue-700">{daysRemaining} dias</span> para aproveitar todos os recursos ilimitados.
          </AlertDescription>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 font-bold" asChild>
          <Link href="/planos">Garantir Acesso Premium</Link>
        </Button>
      </Alert>
    )
  }

  // Se o usuário for Premium/Pago e não estiver em trial, não mostra banner nenhum (layout limpo)
  return null
}