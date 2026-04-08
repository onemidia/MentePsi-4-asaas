'use client'

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, AlertTriangle, CreditCard } from "lucide-react"

interface TrialBannerProps {
  trialEndsAt: string | Date
  planName?: string
  status?: string
}

export function TrialBanner({
  trialEndsAt,
  planName = "Profissional",
  status = "trialing"
}: TrialBannerProps) {

  const router = useRouter()

  // 👉 Controle de exibição
  if (status === 'active') return null

  // 👉 Cálculo de dias de trial
  const end = new Date(trialEndsAt)
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Garante início do dia para evitar expiração no meio da tarde
  
  // Diferença em milissegundos convertida para dias
  const diffTime = end.getTime() - now.getTime()
  const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  
  const totalTrialDays = 30
  // Progresso invertido (quanto menos dias faltam, mais a barra enche)
  const progressPercentage = Math.min(100, Math.max(0, ((totalTrialDays - remainingDays) / totalTrialDays) * 100))

  // 👉 Se trial acabou, não exibe (overlay cuida disso)
  if (remainingDays <= 0) return null

  const isUrgent = remainingDays < 5

  const handleUpgrade = () => {
    router.push('/planos')
  }

  const displayPlanName = planName.charAt(0).toUpperCase() + planName.slice(1)

  return (
    <div
      className={`w-full p-4 flex flex-col gap-3 text-white shadow-md transition-all duration-500 ${
        isUrgent
          ? 'bg-red-600'
          : 'bg-gradient-to-r from-brand-primary to-emerald-500'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div
            className={`p-2 rounded-full bg-white/20 ${
              isUrgent ? 'animate-pulse' : ''
            }`}
          >
            {isUrgent
              ? <AlertTriangle className="h-5 w-5" />
              : <Sparkles className="h-5 w-5" />
            }
          </div>

          <div>
            <p className="text-sm font-medium">
              {isUrgent ? (
                "Seu período de teste está chegando ao fim. Assine agora para manter o acesso aos seus dados e pacientes!"
              ) : (
                <>
                  Você está testando o <strong>Plano {displayPlanName}</strong>. Restam <strong>{remainingDays}</strong> dias de acesso gratuito.
                </>
              )}
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          className={`font-semibold shadow-lg hover:bg-white/90 border-0 whitespace-nowrap text-brand-primary ${
            isUrgent ? 'text-red-600 animate-pulse' : 'text-teal-900'
          }`}
          onClick={handleUpgrade}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Assinar Agora
        </Button>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white/90 transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  )
}
