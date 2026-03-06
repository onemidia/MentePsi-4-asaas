'use client'

import React from 'react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/use-subscription'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Zap, Lock, Crown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountStatus() {
  const {
    isTrialActive = false,
    daysRemaining = 0,
    loading = false
  } = useSubscription()

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-2 w-full mb-4" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (isTrialActive) {
    const daysUsed = Math.max(0, 30 - daysRemaining)
    const progress = Math.min(100, (daysUsed / 30) * 100)

    return (
      <Card className="border-blue-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between text-slate-700">
            <span>Período de Teste</span>
            <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Dia {daysUsed} de 30</span>
              <span className="font-medium text-blue-600">{daysRemaining} dias restantes</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md" asChild>
            <Link href="/planos">
              <Crown className="mr-2 h-4 w-4" /> Fazer Upgrade
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}