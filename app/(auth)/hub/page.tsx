'use client'

import { ShieldCheck, LayoutDashboard, UserCog, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/client"
import { Badge } from "@/components/ui/badge"

export default function AdminHubPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // ✅ AÇÃO 1: Lista de Super Admins atualizada (Apenas os dois)
      const admins = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br']
      const email = user?.email?.toLowerCase() || ''
      setUserEmail(email)

      // ✅ AÇÃO 2: Busca o role do banco para garantir
      const { data: profile } = await supabase
        .from('professional_profile')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle()
      
      // Libera se for um dos e-mails OU se tiver role admin no banco
      if (user && (admins.includes(email) || profile?.role === 'admin')) {
        setIsAuthorized(true)
      } else {
        // Se não for nenhum dos dois, manda pro dashboard comum
        router.push('/dashboard')
      }
    }
    checkAccess()
  }, [router])

  if (!isAuthorized) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-teal-600" size={40} /></div>
  }

  // ✅ AÇÃO 3: Lógica para remover a etiqueta "Restrito" visualmente para você e Alvino
  const isMaster = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(userEmail || '')

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 mb-3 italic uppercase tracking-tighter">
            MentePsi <span className="text-teal-600">HUB</span>
          </h1>
          <p className="text-slate-600 text-lg font-medium">Selecione o ambiente de trabalho</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* AMBIENTE ADMINISTRATIVO */}
          <Card 
            className="group cursor-pointer border-2 border-transparent hover:border-teal-500 transition-all shadow-lg hover:shadow-2xl bg-white overflow-hidden flex flex-col"
            onClick={() => router.push('/admin')}
          >
            <div className="h-2 bg-teal-500" />
            <CardHeader className="text-center flex-1">
              <div className="mx-auto bg-teal-50 text-teal-600 p-5 rounded-3xl w-fit mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <ShieldCheck size={42} />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                Painel Gestor
                {/* Remove a badge de restrito se você for o Master */}
                {!isMaster && <Badge className="bg-red-500 hover:bg-red-600 border-none text-white">Restrito</Badge>}
              </CardTitle>
              <CardDescription className="mt-2 text-slate-500">
                Gestão estratégica: métricas do SaaS, faturamento e controle de assinaturas.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* AMBIENTE CLÍNICO */}
          <Card 
            className="group cursor-pointer border-2 border-transparent hover:border-emerald-500 transition-all shadow-lg hover:shadow-2xl bg-white overflow-hidden flex flex-col"
            onClick={() => router.push('/dashboard')}
          >
            <div className="h-2 bg-emerald-500" />
            <CardHeader className="text-center flex-1">
              <div className="mx-auto bg-emerald-50 text-emerald-600 p-5 rounded-3xl w-fit mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <LayoutDashboard size={42} />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Modo Profissional</CardTitle>
              <CardDescription className="mt-2 text-slate-500">
                Operação clínica: agenda pessoal, prontuários de pacientes e evoluções com IA.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* AMBIENTE ASSISTENTE */}
          <Card 
            className="group cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all shadow-lg hover:shadow-2xl bg-white overflow-hidden flex flex-col"
            onClick={() => router.push('/dashboard/assistente')}
          >
            <div className="h-2 bg-blue-500" />
            <CardHeader className="text-center flex-1">
              <div className="mx-auto bg-blue-50 text-blue-600 p-5 rounded-3xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UserCog size={42} />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800">Modo Assistente</CardTitle>
              <CardDescription className="mt-2 text-slate-500">
                Visão de suporte: gestão de agenda e recepção com permissões limitadas.
              </CardDescription>
            </CardHeader>
          </Card>

        </div>
        
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Acesso Master Liberado</p>
        </div>
      </div>
    </div>
  )
}