'use client'

import React from 'react'
import Link from 'next/link'
import { Lock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FeatureLockProps {
  title?: string
  description?: string
  icon?: 'lock' | 'alert'
  className?: string
}

export function FeatureLock({ 
  title = "Funcionalidade Exclusiva", 
  description = "Este recurso está disponível apenas em planos superiores. Faça o upgrade para desbloquear.",
  icon = 'lock',
  className
}: FeatureLockProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl space-y-4 animate-in fade-in zoom-in duration-300", className)}>
      <div className="bg-amber-100 p-3 rounded-full">
        {icon === 'lock' ? (
          <Lock className="h-6 w-6 text-amber-700" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-amber-700" />
        )}
      </div>
      <div className="space-y-2">
        <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          {description}
        </p>
      </div>
      <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white mt-2 shadow-lg shadow-teal-100">
        <Link href="/planos">Fazer Upgrade Agora</Link>
      </Button>
    </div>
  )
}