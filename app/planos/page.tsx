'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Star, AlertTriangle, Shield, Zap, Heart, Brain, MessageSquare, ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlanosPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [dbPlan, setDbPlan] = useState<any>(null)
  const [isTrial, setIsTrial] = useState(false)
  const [subStatus, setSubStatus] = useState<string>('')
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from('profiles').select('created_at, subscription_status').eq('id', user.id).single()
        if (profile) {
          if (profile.subscription_status) setSubStatus(profile.subscription_status)
          const createdAt = new Date(profile.created_at)
          const now = new Date()
          const diffDays = Math.ceil(Math.abs(now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays <= 30) setIsTrial(true)
        }
      }

      const { data: planData } = await supabase.from('plans').select('*').eq('slug', 'profissional').single()
      if (planData) setDbPlan(planData)
      setLoading(false)
    }
    init()
  }, [])

  const handleSubscribe = () => {
    if (!user) {
      // Se não tem usuário, manda registrar para o teste grátis
      router.push('/registro?plan=profissional')
    } else if (subStatus !== 'active') {
      // Se está logado mas não pagou (está em trial ou vencido), vai pro checkout
      // Envia o ID do plano para garantir a integração correta
      router.push(`/checkout?plan=${dbPlan?.id || 'profissional'}`)
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
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full text-teal-700 text-xs font-bold uppercase tracking-wider mb-6">
          <Zap size={14} className="fill-teal-700" /> O Futuro da Psicologia Clínica
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
          Tudo o que você precisa em <span className="text-teal-600">um único lugar.</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          Chega de várias ferramentas. Automatize seus prontuários, lembretes e financeiro com a Inteligência Artificial da MentePsi.
        </p>
      </div>

      {isTrial && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-2xl flex items-center gap-4 shadow-sm max-w-2xl mx-auto mb-12">
          <div className="bg-orange-100 p-2 rounded-full">
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          </div>
          <p className="text-sm font-medium">
            Seu <strong>teste grátis de 30 dias</strong> está ativo. Assine agora para desbloquear o acesso vitalício aos seus dados e garantir sua vaga no Plano Profissional.
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
                    {dbPlan.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-1">cobrado mensalmente</p>
              </div>

              <ul className="space-y-4">
                {[
                  'Pacientes e Prontuários Ilimitados',
                  'IA para Análise de Evolução',
                  'Lembretes WhatsApp Sem Custo Extra',
                  'Portal do Paciente Personalizado',
                  'Assinatura Digital de Documentos',
                  'Gestão Financeira e Fluxo de Caixa',
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
                onClick={() => {
                  if (!user) {
                    // Se não tem usuário, manda registrar para o teste grátis
                    router.push('/registro?plan=profissional')
                  } else if (subStatus !== 'active') {
                    // Se está logado mas não pagou (está em trial ou vencido), vai pro checkout
                    router.push('/checkout?plan=profissional')
                  } else {
                    // Se já é ativo, volta pro dashboard
                    router.push('/dashboard')
                  }
                }}
                onClick={handleSubscribe}
                disabled={false}
                className="w-full h-16 text-lg font-black rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200 transition-all hover:scale-105 active:scale-95"
              >
                {subStatus === 'active'
                  ? 'SEU PLANO ESTÁ ATIVO'
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