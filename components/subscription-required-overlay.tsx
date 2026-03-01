'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Lock, CreditCard, CheckCircle2, Zap } from "lucide-react"

export function SubscriptionRequiredOverlay() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 animate-in fade-in zoom-in duration-500">
      <Card className="w-full max-w-md shadow-2xl border-teal-100 bg-white overflow-hidden">
        {/* Barra de destaque no topo */}
        <div className="h-2 bg-teal-600 w-full" />
        
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-teal-50 p-4 rounded-full w-fit mb-4 text-teal-600">
            <Lock className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
            Seu Trial Profissional Venceu
          </CardTitle>
          <CardDescription className="text-base mt-2 font-medium">
            Esperamos que esses 30 dias tenham transformado sua rotina clínica.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center space-y-6 pt-4">
           <p className="text-slate-600 text-sm">
             Para manter o acesso ilimitado à <strong>IA, Fichas Digitais e Gestão Financeira</strong>, ative sua assinatura agora.
           </p>
           
           <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
               <CheckCircle2 className="h-4 w-4 text-teal-500" /> Seus dados continuam salvos e seguros
             </div>
             <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
               <Zap className="h-4 w-4 text-teal-500" /> Liberação imediata após o pagamento
             </div>
           </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-8 px-8">
          <Button className="w-full h-14 text-lg font-black bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-100 transition-all hover:scale-[1.02]" asChild>
            <Link href="/planos">
              <CreditCard className="mr-2 h-5 w-5" /> ATIVAR PLANO PROFISSIONAL
            </Link>
          </Button>
          
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            🔒 Pagamento 100% Seguro via Stripe
          </p>
        </CardFooter>
      </Card>
      
      {/* Botão sutil para logout caso ele queira trocar de conta */}
      <Link href="/login" className="mt-8 text-sm font-medium text-slate-400 hover:text-teal-600 transition-colors">
        Sair ou trocar de conta
      </Link>
    </div>
  )
}