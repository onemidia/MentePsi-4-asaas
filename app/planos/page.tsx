'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Loader2, Star, AlertTriangle, Shield, Zap, Heart, Brain, MessageSquare, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function PlanosPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [dbPlan, setDbPlan] = useState<any>(null)
  const [isTrial, setIsTrial] = useState(false)
  const [subStatus, setSubStatus] = useState<string>('')
  
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const motivo = searchParams.get('motivo')
  const { toast } = useToast()

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        // Busca status na tabela nova
        const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
        
        if (sub) {
          setSubStatus(sub.status)
          if (sub.status === 'trialing') setIsTrial(true)
        }
      }

      const { data: planData } = await supabase.from('saas_plans').select('*').eq('slug', 'professional').single()
      if (planData) setDbPlan(planData)
      setLoading(false)
    }
    init()
  }, [])

  const handleSubscribe = () => {
    if (!user) {
      // Se não tem usuário, manda registrar para o teste grátis
      router.push('/registro?plan=professional')
    } else if (['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(user.email?.toLowerCase())) {
      // 🛡️ BYPASS DE ADMIN
      toast({ 
        title: "ACESSO ADMIN LIBERADO", 
        description: "Você possui permissão total ao sistema.",
        duration: 5000
      })
      router.push('/dashboard')
    } else if (subStatus !== 'active') {
      // Se está logado mas não pagou (está em trial ou vencido), vai pro checkout
      // Envia o ID do plano para garantir a integração correta
      router.push(`/checkout?plan=${dbPlan?.id || 'professional'}`)
    } else {
      // Se já é ativo, volta pro dashboard
      router.push('/dashboard')
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-teal-600" size={40} /></div>

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* HEADER ATRAVATIVO */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        {motivo ? (
          motivo === 'inadimplente' ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-amber-600">Atenção: Pagamento Pendente</h1>
              <p className="text-slate-600 mt-2 font-medium">Sua conta está em período de carência. Regularize o pagamento para manter seu acesso ilimitado.</p>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-blue-600">Seu período de teste acabou</h1>
              <p className="text-gray-600">Escolha o melhor plano para continuar evoluindo sua clínica.</p>
            </div>
          )
        ) : (
          <>
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full text-teal-700 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap size={14} className="fill-teal-700" /> O Futuro da Psicologia Clínica
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Tudo o que você precisa em <span className="text-teal-600">um único lugar.</span>
            </h1>
            <p className="text-xl text-slate-600 leading-relaxed">
              Chega de várias ferramentas. Automatize seus prontuários, lembretes e financeiro com a Inteligência Artificial da MentePsi.
            </p>
          </>
        )}
      </div>

      {isTrial && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm max-w-2xl mx-auto mb-12">
          <div className="bg-orange-100 p-2 rounded-full">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          </div>
          <p className="text-sm font-medium">
            Seu <strong>teste grátis</strong> está ativo. Assine agora para garantir acesso contínuo e ilimitado. <strong>Você não perderá nenhum dado cadastrado.</strong>
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
        
        {/* LADO ESQUERDO: LISTA DE VALOR */}
        <div className="space-y-8 p-4">
          <h2 className="text-2xl font-bold text-slate-900">Por que ser Profissional?</h2>
          
          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm h-fit"><Brain className="text-teal-600" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Inteligência Artificial</h3>
              <p className="text-sm text-slate-500">Resumos de sessões e análise de evolução gerados em segundos.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm h-fit"><ClipboardCheck className="text-teal-600" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Ficha Digital Estruturada</h3>
              <p className="text-sm text-slate-500">Prontuários e anamneses organizados e acessíveis de qualquer dispositivo com segurança total.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm h-fit"><ClipboardCheck className="text-teal-600" /></div>
            <div>
              <h3 className="font-bold text-slate-800">Assinatura Digital</h3>
              <p className="text-sm text-slate-500">Documentos e contratos assinados pelo celular do paciente, com validade jurídica.</p>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: O CARD DE PREÇO */}
        {dbPlan && (
          <Card className="relative flex flex-col border-2 border-teal-500 shadow-2xl scale-105 bg-white">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-6 py-1.5 rounded-full text-sm font-black uppercase tracking-widest shadow-lg">
              MAIS ESCOLHIDO
            </div>
            
            <CardHeader className="text-center pt-10">
              <CardTitle className="text-3xl font-black text-slate-900">{dbPlan.name}</CardTitle>
              <CardDescription className="text-teal-600 font-bold uppercase text-xs tracking-widest mt-2">
                Acesso Vitalício às Atualizações
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 px-8">
              <div className="text-center mb-8 bg-slate-50 py-6 rounded-2xl">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-slate-400 text-lg font-medium">R$</span>
                  <span className="text-6xl font-black text-slate-900 tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(dbPlan?.price_monthly || 59.90)}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">cobrado mensalmente</p>
              </div>

              <ul className="space-y-4">
                {[
                  'Pacientes e Prontuários Ilimitados',
                  'Agendamentos e Sessões Ilimitadas',
                  'IA para Análise de Evolução Ilimitada',
                  'Lembretes WhatsApp Ilimitados',
                  'Portal do Paciente Personalizado',
                  'Assinatura Digital de Documentos',
                  'Suporte Prioritário Via WhatsApp'
                ].map((feature: string, i: number) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <div className="bg-teal-100 p-0.5 rounded-full">
                      <Check className="h-4 w-4 text-teal-600" strokeWidth={3} />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="p-8">
              <Button 
                onClick={handleSubscribe}
                disabled={false}
                className="w-full h-16 text-lg font-black rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
              >
                {subStatus === 'active'
                  ? 'SEU PLANO ESTÁ ATIVO'
                  : motivo === 'inadimplente'
                    ? 'REGULARIZAR MINHA CONTA'
                    : user
                    ? 'ATIVAR ASSINATURA AGORA'
                    : 'COMEÇAR TESTE GRÁTIS DE 30 DIAS'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
      
      <div className="mt-20 flex flex-col items-center gap-6">
        <div className="flex items-center gap-8 opacity-40 grayscale grayscale-0">
          {/* Adicione aqui ícones de cadeado ou Stripe se tiver */}
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">Tecnologia de Segurança Bancária</p>
        </div>
      </div>
    </div>
  )
}