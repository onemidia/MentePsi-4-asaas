'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Users, MessageCircle, CheckCircle2, Clock, ArrowRight, Loader2, FileText, DollarSign } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function AssistantDashboardPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // 1. Identificação e Permissão (Passe Livre para Admin)
      const email = user.email || ''
      const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email)

      if (!isSuperAdmin) {
        // Verifica se é membro da equipe
        const { data: teamMember } = await supabase
          .from('clinic_team')
          .select('id, name')
          .eq('email', email)
          .eq('status', 'active')
          .maybeSingle()

        if (!teamMember) {
          // Se não for equipe nem admin, tchau
          router.push('/dashboard')
          return
        }
        setUserName(teamMember.name)
      } else {
        setUserName("Administrador")
      }

      // 2. Buscar Agendamentos de Hoje
      const today = new Date().toISOString().split('T')[0]
      
      let query = supabase
        .from('appointments')
        .select(`
          id, 
          start_time, 
          status, 
          patient_id, 
          confirmation_token,
          reminder_status,
          patients (full_name, phone)
        `)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`)
        .order('start_time', { ascending: true })

      // Se não for super admin, filtra pelo psicólogo do assistente
      if (!isSuperAdmin) {
        const { data: teamData } = await supabase.from('clinic_team').select('psychologist_id').eq('email', email).single()
        if (teamData) {
          query = query.eq('psychologist_id', teamData.psychologist_id)
        }
      }

      const { data: appts } = await query

      if (appts) {
        setAppointments(appts)
      }
      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  const handleWhatsApp = async (aptId: string, phone: string, patientName: string, token: string) => {
    if (!phone) return
    
    // Atualização Otimista
    setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, reminder_status: 'Enviado' } : a))
    
    const portalUrl = `https://mentepsi.sbs/portal/${patientName.split(' ')[0].toLowerCase()}?t=${token}`
    const message = encodeURIComponent(`Olá, ${patientName}! Passando para confirmar nossa sessão. Por favor, confirme sua presença clicando no seu portal: ${portalUrl}`)

    // Atualiza o banco para 'Enviado'
    await supabase.from('appointments').update({ reminder_status: 'Enviado' }).eq('id', aptId)

    const cleanPhone = phone.replace(/[^\d+]/g, '')
    const finalPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`)
    window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank')
  }

  const handleCheckIn = async (aptId: string) => {
    // Otimistic update
    setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: 'Realizado' } : a))
    
    await supabase
      .from('appointments')
      .update({ status: 'Realizado' })
      .eq('id', aptId)
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-teal-600 h-8 w-8" /></div>
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel do Assistente</h1>
          <p className="text-slate-500">Bem-vindo(a), {userName}. Aqui está o resumo de hoje.</p>
        </div>
        <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl font-bold text-sm border border-teal-100">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Atalhos Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/agenda" className="group">
          <Card className="border-none shadow-sm bg-white rounded-[32px] hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer h-full">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="p-5 bg-teal-100 text-teal-600 rounded-3xl group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Calendar className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Ver Agenda</h3>
                <p className="text-sm text-slate-500 font-medium">Gerenciar horários e marcações</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pacientes" className="group">
          <Card className="border-none shadow-sm bg-white rounded-[32px] hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer h-full">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="p-5 bg-indigo-100 text-indigo-600 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Pacientes</h3>
                <p className="text-sm text-slate-500 font-medium">Cadastros e Fichas</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documentos" className="group">
          <Card className="border-none shadow-sm bg-white rounded-[32px] hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer h-full">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="p-5 bg-blue-100 text-blue-600 rounded-3xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Documentos</h3>
                <p className="text-sm text-slate-500 font-medium">Gerar e Imprimir</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financeiro" className="group">
          <Card className="border-none shadow-sm bg-white rounded-[32px] hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer h-full">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="p-5 bg-amber-100 text-amber-600 rounded-3xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 mb-1">Financeiro</h3>
                <p className="text-sm text-slate-500 font-medium">Controle de Caixa</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Lista de Agendamentos do Dia */}
      <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-black text-slate-800">Agendamentos de Hoje</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <div className="bg-slate-50 p-4 rounded-full">
                <Calendar className="h-12 w-12 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium text-lg">Nenhum agendamento encontrado para hoje.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="flex flex-col items-center justify-center bg-slate-100 min-w-[80px] h-[80px] rounded-2xl border border-slate-200">
                      <span className="text-xl font-black text-slate-700">
                        {format(new Date(apt.start_time), 'HH:mm')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Horário</span>
                    </div>
                    
                    <div className="space-y-1">
                      <h4 className="text-lg font-bold text-slate-900">{apt.patients?.full_name || "Paciente sem nome"}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`
                          ${apt.status === 'Realizado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            apt.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' : 
                            'bg-amber-50 text-amber-700 border-amber-200'}
                        `}>
                          {apt.status}
                        </Badge>
                        <Badge variant="outline" className={`
                          ${apt.reminder_status === 'Confirmado' ? 'bg-green-50 text-green-700 border-green-200' : 
                            apt.reminder_status === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            apt.reminder_status === 'Reagendar' ? 'bg-pink-50 text-pink-700 border-pink-200' : 
                            'bg-slate-50 text-slate-500 border-slate-200'}
                        `}>
                          {apt.reminder_status === 'Confirmado' ? '✓ Confirmado' :
                           apt.reminder_status === 'Enviado' ? 'Link Enviado' :
                           apt.reminder_status === 'Reagendar' ? 'Solicitou Troca' :
                           'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl font-bold border-slate-200 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200" 
                      onClick={() => router.push(`/pacientes/${apt.patient_id}`)}
                    >
                      Ver Ficha <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    <Button 
                      size="icon" 
                      variant="outline"
                      className="rounded-xl border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                      title="Chamar no WhatsApp"
                      onClick={() => handleWhatsApp(apt.id, apt.patients?.phone, apt.patients?.full_name, apt.confirmation_token)}
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>

                    {apt.status !== 'Realizado' && (
                      <Button 
                        size="icon"
                        className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-100"
                        title="Confirmar Presença (Check-in)"
                        onClick={() => handleCheckIn(apt.id)}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}