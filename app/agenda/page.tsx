'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation' 
import { createClient } from '@/lib/client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Calendar as CalendarIcon, Video, MapPin, Repeat, Trash2, XCircle, ChevronLeft, ChevronRight, Edit3, Save } from "lucide-react" 
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// 1. Componente que contém toda a lógica da agenda
function AgendaContent() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [openDetail, setOpenDetail] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const searchParams = useSearchParams() 
  const [patients, setPatients] = useState<any[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const calendarRef = React.useRef<FullCalendar>(null)
  const [currentTitle, setCurrentTitle] = useState("")
  const [currentView, setCurrentView] = useState("timeGridWeek")
  const supabase = createClient()
  const { toast } = useToast()
  const [subscriptionStatus, setSubscriptionStatus] = useState('active') // Default to active to avoid blocking UI on first load
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    date: '',
    time: '',
    modality: '',
    price: ''
  })

  const [formData, setFormData] = useState({
    patient_id: '',
    date: '',
    time: '',
    type: 'Individual',
    duration: '50',
    modality: 'Presencial',
    price: '0,00',
    observations: '',
    recurrence: 'Nenhuma',
    repeat_count: 1
  })

  const fetchInitialData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      setLoading(false)
      return
    }

    // Lógica de Identificação de Papel (Admin / Assistente / Profissional)
    let targetUserId = user.id
    const email = user.email
    const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email)
    let isAssistant = false

    // Só busca na clinic_team se NÃO for super admin e o e-mail existir
    if (!isSuperAdmin && email) {
       const { data: teamMember } = await supabase
         .from('clinic_team')
         .select('psychologist_id')
         .eq('email', email)
         .eq('status', 'active')
         .maybeSingle()
       
       if (teamMember) {
         targetUserId = teamMember.psychologist_id
         isAssistant = true
       }
    }

    const [aptRes, patRes, subRes, profRes] = await Promise.all([
      supabase.from('appointments').select('id, start_time, end_time, status, patient_id, modality, price, patients(full_name)').eq('psychologist_id', targetUserId),
      supabase.from('patients').select('id, full_name, session_value').eq('psychologist_id', targetUserId).order('full_name'),
      supabase.from('subscriptions').select('status').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('professional_profile').select('default_session_duration').eq('user_id', targetUserId).maybeSingle()
    ])
    
    if (aptRes.data) {
      setEvents(aptRes.data.map(apt => ({
        id: apt.id,
        title: Array.isArray(apt.patients) ? apt.patients[0]?.full_name : (apt.patients as any)?.full_name || 'Paciente',
        start: apt.start_time,
        end: apt.end_time,
        backgroundColor: apt.status === 'Cancelado' ? '#fef2f2' : 'var(--secondary-color, #f0fdfa)',
        borderColor: apt.status === 'Cancelado' ? '#ef4444' : 'var(--primary-color, #0d9488)',
        extendedProps: { 
          status: apt.status,
          patient_id: apt.patient_id,
          modality: apt.modality,
          price: apt.price
        }
      })))
    }
    if (patRes.data) setPatients(patRes.data)

    if (profRes.data?.default_session_duration) {
      setFormData(prev => ({ ...prev, duration: String(profRes.data.default_session_duration) }))
    }
    
    // Passe Livre para Admin e Assistente
    if (isSuperAdmin || isAssistant) {
      setSubscriptionStatus('active')
    } else if (subRes.data?.status) {
      setSubscriptionStatus(subRes.data.status)
    } else {
      setSubscriptionStatus('trialing') // Fallback for new users without a subscription record yet
    }
    setLoading(false)
  }

  useEffect(() => { 
    fetchInitialData() 

    const channel = supabase
      .channel('agenda-subscription-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscriptions' 
      }, 
      (payload) => { fetchInitialData() }
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (searchParams.get('new') === 'true') setOpen(true)
  }, [searchParams])

  useEffect(() => {
    if (formData.patient_id) {
      const selectedPatient = patients.find(p => p.id === formData.patient_id)
      if (selectedPatient?.session_value) {
        setFormData(prev => ({ ...prev, price: String(selectedPatient.session_value).replace('.', ',') }))
      }
    }
  }, [formData.patient_id, patients])

  const handleEditClick = () => {
    if (!selectedEvent) return
    const start = selectedEvent.start
    setEditFormData({
      date: start.toISOString().split('T')[0],
      time: start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      modality: selectedEvent.extendedProps.modality || 'Presencial',
      price: selectedEvent.extendedProps.price ? Number(selectedEvent.extendedProps.price).toFixed(2).replace('.', ',') : '0,00'
    })
    setIsEditing(true)
  }

  const handleUpdateAppointment = async () => {
    setLoading(true)
    try {
      const startDate = new Date(`${editFormData.date}T${editFormData.time}:00`)
      const originalDuration = selectedEvent.end ? (selectedEvent.end.getTime() - selectedEvent.start.getTime()) : (50 * 60000)
      const endDate = new Date(startDate.getTime() + originalDuration)

      const numericPrice = parseFloat(String(editFormData.price).replace(/\./g, '').replace(',', '.')) || 0

      const { error } = await supabase.from('appointments').update({
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        modality: editFormData.modality,
        price: numericPrice
      }).eq('id', selectedEvent.id)

      if (error) throw error

      toast({ title: "Agendamento atualizado!" })
      setOpenDetail(false)
      setIsEditing(false)
      fetchInitialData()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAppointments = async (mode: 'single' | 'future') => {
    if (!selectedEvent) return
    setLoading(true)

    try {
      let query = supabase.from('appointments').delete()

      if (mode === 'single') {
        query = query.eq('id', selectedEvent.id)
      } else {
        query = query
          .eq('patient_id', selectedEvent.extendedProps.patient_id)
          .gte('start_time', selectedEvent.startStr)
      }

      const { error } = await query
      if (error) throw error

      toast({ title: mode === 'single' ? "Sessão excluída" : "Sessões futuras removidas" })
      setOpenDetail(false)
      fetchInitialData()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSchedule = async () => {
    if (!formData.patient_id || !formData.date || !formData.time) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha paciente, data e horário." });
      return;
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      toast({ variant: "destructive", title: "Erro de autenticação", description: "Sessão não encontrada ou e-mail indisponível." });
      setLoading(false);
      return;
    }
    
    // Lógica de Identificação para Agendamento
    let targetUserId = user.id
    const email = user.email
    const isSuperAdmin = ['mentepsiclinic@gmail.com', 'alvino@onemidia.tv.br'].includes(email)
    let isAssistant = false

    // Só busca na clinic_team se NÃO for super admin e o e-mail existir
    if (!isSuperAdmin && email) {
       const { data: teamMember } = await supabase
         .from('clinic_team')
         .select('psychologist_id')
         .eq('email', email)
         .eq('status', 'active')
         .maybeSingle()
       
       if (teamMember) {
         targetUserId = teamMember.psychologist_id
         isAssistant = true
       }
    }

    // Validação de Acesso (Assinatura)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const now = new Date();
    const expirationDate = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
    const hasActivePlan = subscription?.status === 'active';
    const isTrialValid = subscription?.status === 'trialing' && expirationDate && expirationDate > now;

    if (!hasActivePlan && !isTrialValid && !isSuperAdmin && !isAssistant) {
      toast({ variant: "destructive", title: "Acesso Bloqueado", description: "Sua assinatura expirou. Regularize seu plano para agendar novas sessões." });
      setLoading(false);
      return;
    }

    const startDate = new Date(`${formData.date}T${formData.time}:00`)
    
    // 1. Busca o saldo atual do paciente antes de agendar
    const { data: patData } = await supabase.from('patients').select('credit_balance').eq('id', formData.patient_id).single()
    let availableCredit = Number(patData?.credit_balance || 0)

    const appointmentsToInsert = []
    const numericPrice = parseFloat(String(formData.price).replace(/\./g, '').replace(',', '.')) || 0
    const daysToAdd = formData.recurrence === 'Semanal' ? 7 : 
                      formData.recurrence === 'Quinzenal' ? 14 : 
                      formData.recurrence === 'Mensal' ? 28 : 0;
    const loopCount = formData.recurrence === 'Nenhuma' ? 1 : formData.repeat_count;

    for (let i = 0; i < loopCount; i++) {
      const currentStart = new Date(startDate)
      currentStart.setDate(startDate.getDate() + (i * daysToAdd))
      
      const start = currentStart.toISOString()
      const end = new Date(currentStart.getTime() + (parseInt(formData.duration) || 50) * 60000).toISOString()

      let paymentStatus = 'Pendente'
      let amountPaid = 0

      // 2. Abatimento Automático caso o paciente tenha saldo para cobrir a sessão
      if (availableCredit >= numericPrice && numericPrice > 0) {
        paymentStatus = 'Pago'
        amountPaid = numericPrice
        availableCredit = Math.round((availableCredit - numericPrice) * 100) / 100
      }

      appointmentsToInsert.push({
        psychologist_id: targetUserId,
        patient_id: formData.patient_id,
        start_time: start,
        end_time: end,
        price: numericPrice,
        payment_status: paymentStatus,
        amount_paid: amountPaid,
        status: 'Agendado',
        modality: formData.modality,
        observations: formData.observations || null
      })
    }

    // 3. Insere os agendamentos e retorna os dados (.select()) para vincularmos ao extrato
    const { data: insertedApts, error } = await supabase.from('appointments').insert(appointmentsToInsert).select()

    if (!error) {
      // 4. Sincronização do Financeiro e atualização do saldo "Em Haver"
      const consumedCredit = Math.round((Number(patData?.credit_balance || 0) - availableCredit) * 100) / 100
      
      if (consumedCredit > 0 && insertedApts) {
        const txsToInsert = insertedApts
          .filter(apt => apt.payment_status === 'Pago')
          .map(apt => ({
            psychologist_id: targetUserId,
            patient_id: formData.patient_id,
            appointment_id: apt.id,
            amount: apt.amount_paid,
            type: 'usage',
            category: 'Sessão (Crédito)',
            description: 'Abatimento automático via Saldo em Haver',
            status: 'CONCLUIDO'
          }))
          
        if (txsToInsert.length > 0) {
          await supabase.from('financial_transactions').insert(txsToInsert)
        }
        
        await supabase.from('patients').update({ credit_balance: availableCredit }).eq('id', formData.patient_id)
      }

      toast({ title: "Sucesso!", description: loopCount > 1 ? `${loopCount} sessões agendadas!` : "Consulta agendada!" })
      setOpen(false)
      await fetchInitialData()
    } else {
      toast({ variant: "destructive", title: "Erro ao agendar", description: error.message })
      setLoading(false)
    }
  }

  const handlePrev = () => {
    const api = calendarRef.current?.getApi()
    api?.prev()
  }

  const handleNext = () => {
    const api = calendarRef.current?.getApi()
    api?.next()
  }

  const handleToday = () => {
    const api = calendarRef.current?.getApi()
    api?.today()
  }

  const handleViewChange = (view: string) => {
    const api = calendarRef.current?.getApi()
    api?.changeView(view)
  }

  return (
    <div className="p-0 md:p-6 space-y-0 md:space-y-6 bg-white md:bg-slate-100 min-h-screen relative">
      {/* Estilos Globais para FullCalendar (Google Style) */}
      <style>{`
        .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #f1f5f9 !important; }
        .fc-timegrid-slot { height: 3em !important; border-bottom: 1px solid #f8fafc !important; }
        .fc-list-day-cushion { background-color: transparent !important; }
        .fc-list-event:hover td { background-color: transparent !important; }
        .fc-list-day-text { font-weight: 800; color: #64748b; text-transform: capitalize; font-size: 0.9rem; }
        .fc-list-day-side-text { font-weight: 800; color: #64748b; font-size: 0.9rem; }
        
        .fc-button { border-radius: 9999px !important; text-transform: capitalize !important; font-weight: 700 !important; font-size: 0.75rem !important; padding: 0.3rem 1rem !important; border: none !important; box-shadow: none !important; }
        .fc-button-primary { background-color: #f1f5f9 !important; color: #64748b !important; }
        .fc-button-primary:hover { filter: brightness(0.9); }
        .fc-button-active { background-color: var(--primary-color) !important; color: white !important; }

        .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 900 !important; color: #1e293b; text-align: center; }
        .fc-prev-button, .fc-next-button { width: 36px !important; height: 36px !important; padding: 0 !important; display: flex; align-items: center; justify-content: center; background-color: transparent !important; color: #64748b !important; }
        .fc-prev-button:hover, .fc-next-button:hover { background-color: #f1f5f9 !important; }
        .fc-icon { font-size: 1.2em; }
        .fc-header-toolbar { display: none !important; }
        .fc-view-harness { background-color: white; min-height: 100vh; }
        .fc-list-event-time, .fc-list-event-graphic { display: none; }
        .fc-timegrid-event, .fc-daygrid-event { border-width: 0 0 0 4px !important; border-radius: 6px !important; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); color: #1e293b !important; margin: 1px 2px !important; }
        .fc-timegrid-event:hover, .fc-daygrid-event:hover { filter: brightness(0.95); }
      `}</style>

      <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-md border border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-secondary p-2 rounded-lg text-brand-primary"><CalendarIcon className="h-6 w-6" /></div>
          <div><h1 className="text-xl font-black text-slate-800">Agenda Clínica</h1></div>
        </div>
        <Button className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)] text-white hover:text-white hover:brightness-90 transition-all rounded-2xl h-12 shadow-lg shadow-brand-primary/20 font-bold px-6 border-0" onClick={() => setOpen(true)}>
           <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      <Button className="md:hidden fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-2xl bg-[var(--primary-color)] hover:bg-[var(--primary-color)] text-white hover:text-white hover:brightness-90 transition-all p-0 flex items-center justify-center border-0" onClick={() => setOpen(true)}>
         <Plus className="h-8 w-8 text-white" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md max-h-[90vh] overflow-y-auto bg-white !opacity-100 border border-slate-200 shadow-2xl z-[100]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Agendar Consulta</DialogTitle>
            <DialogDescription className="sr-only">Formulário para agendamento de novas sessões clínicas.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Paciente *</Label>
              <select 
                value={formData.patient_id} 
                onChange={(e) => setFormData({...formData, patient_id: e.target.value})}
                className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-sm"
              >
                <option value="" disabled>Selecione o paciente</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Data *</Label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 h-11 shadow-sm appearance-none" 
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Horário *</Label>
                <Input 
                  type="time" 
                  value={formData.time} 
                  onChange={e => setFormData({...formData, time: e.target.value})} 
                  className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 h-11 shadow-sm" 
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2"><Repeat size={14}/> Frequência de Repetição</Label>
                <select 
                  value={formData.recurrence} 
                  onChange={(e) => setFormData({...formData, recurrence: e.target.value})}
                  className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-sm"
                >
                  <option value="Nenhuma">Não repetir (Sessão única)</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Quinzenal">Quinzenal</option>
                  <option value="Mensal">Mensal</option>
                </select>
              </div>

              {formData.recurrence !== 'Nenhuma' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Repetir por quantas vezes?</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      min="2" 
                      max="52" 
                      value={formData.repeat_count} 
                      onChange={(e) => setFormData({...formData, repeat_count: parseInt(e.target.value) || 1})}
                      className="w-24 font-bold border-brand-primary/50 text-brand-primary bg-white shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo</Label>
                <select 
                  value={formData.type} 
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer shadow-sm"
                >
                  <option value="Individual">Individual</option>
                  <option value="Casal">Casal</option>
                </select>
              </div>
              <div className="space-y-2"><Label>Duração (minutos)</Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.duration} 
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 h-11 shadow-sm"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setFormData({...formData, modality: 'Presencial'})} className={`gap-2 ${formData.modality === 'Presencial' ? 'border-brand-primary bg-brand-secondary text-brand-primary' : 'bg-white'}`}><MapPin size={16}/> Presencial</Button>
              <Button type="button" variant="outline" onClick={() => setFormData({...formData, modality: 'Online'})} className={`gap-2 ${formData.modality === 'Online' ? 'border-brand-primary bg-brand-secondary text-brand-primary' : 'bg-white'}`}><Video size={16}/> Online</Button>
            </div>

            <div className="space-y-2">
              <Label>Valor da Sessão (R$)</Label>
              <Input value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-primary/20 h-11 shadow-sm" />
            </div>

          <Button className="w-full bg-[var(--primary-color)] hover:bg-[var(--primary-color)] text-white hover:text-white hover:brightness-90 transition-all font-black h-12 shadow-lg shadow-brand-primary/20" onClick={handleSchedule} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Confirmar Agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NOVO CABEÇALHO PERSONALIZADO (PADRÃO GOOGLE) */}
      <div className="flex flex-col bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Linha 1: Título e Navegação */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-tight">{currentTitle}</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-full"><ChevronLeft className="h-5 w-5 text-slate-600" /></Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs font-bold text-slate-600">Hoje</Button>
            <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-full"><ChevronRight className="h-5 w-5 text-slate-600" /></Button>
          </div>
        </div>
        
        {/* Linha 2: Modos de Visão (Pílulas) */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 bg-white no-scrollbar">
          {[
            { id: 'timeGridDay', label: 'Dia' },
            { id: 'timeGridWeek', label: 'Semana' },
            { id: 'dayGridMonth', label: 'Mês' },
            { id: 'listWeek', label: 'Lista' }
          ].map(view => (
            <Button
              key={view.id}
              variant="ghost"
              onClick={() => handleViewChange(view.id)}
              className={`rounded-full text-[10px] h-7 px-4 font-bold transition-all whitespace-nowrap ${currentView === view.id ? 'bg-brand-secondary text-brand-primary' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {view.label}
            </Button>
          ))}
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={isMobile ? 'listWeek' : 'timeGridWeek'}
        headerToolbar={false}
        datesSet={(arg) => {
          setCurrentTitle(arg.view.title)
          setCurrentView(arg.view.type)
        }}
        editable={subscriptionStatus !== 'canceled'}
        dragRevertDuration={0}
        handleWindowResize={true}
        longPressDelay={50}
        listDayFormat={{ day: '2-digit', month: 'long', weekday: 'short' }}
        noEventsContent="Nenhum agendamento para este período"
        locale={ptBrLocale}
        events={events}
        height="calc(100vh - 100px)"
        allDaySlot={false}
        slotMinTime="01:00:00"
        slotMaxTime="23:59:00"
        scrollTime="08:00:00"
        eventClassNames="mb-1 px-2 py-1 font-medium cursor-pointer transition-all"
        eventContent={(arg) => (
          <div className="flex items-center w-full">
            <b className="text-slate-900 mr-3 text-xs">{arg.timeText}</b>
            <span className="text-slate-700 text-sm truncate">{arg.event.title}</span>
          </div>
        )}
        eventClick={(info) => {
          setSelectedEvent(info.event)
          setOpenDetail(true)
          setIsEditing(false)
        }}
      />

      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent aria-describedby={undefined} className="max-w-sm bg-slate-50 rounded-[32px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Agendamento</DialogTitle>
            <DialogDescription className="sr-only">Opções para editar ou excluir uma sessão existente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Data</Label>
                    <Input type="date" value={editFormData.date} onChange={e => setEditFormData({...editFormData, date: e.target.value})} className="bg-slate-50 border-slate-200 rounded-xl shadow-sm appearance-none" />
                  </div>
                  <div className="space-y-1">
                    <Label>Hora</Label>
                    <Input type="time" value={editFormData.time} onChange={e => setEditFormData({...editFormData, time: e.target.value})} className="bg-slate-50 border-slate-200 rounded-xl shadow-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   <div className="space-y-1">
                      <Label>Modalidade</Label>
                      <select 
                        value={editFormData.modality} 
                        onChange={(e) => setEditFormData({...editFormData, modality: e.target.value})}
                        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary shadow-sm"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Online">Online</option>
                      </select>
                   </div>
                   <div className="space-y-1">
                      <Label>Valor (R$)</Label>
                      <Input value={editFormData.price} onChange={e => setEditFormData({...editFormData, price: e.target.value})} className="bg-slate-50 border-slate-200 rounded-xl shadow-sm" />
                   </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">Cancelar</Button>
                  <Button onClick={handleUpdateAppointment} disabled={loading} className="flex-1 bg-[var(--primary-color)] text-white hover:brightness-90 transition-all">
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />} Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 bg-brand-secondary rounded-xl border border-brand-primary/30">
                  <p className="text-sm font-bold text-brand-primary">{selectedEvent?.title}</p>
                  <p className="text-xs text-brand-primary opacity-80 mt-1">
                    {selectedEvent?.start && new Date(selectedEvent.start).toLocaleString('pt-BR')}
                  </p>
                  {selectedEvent?.extendedProps?.modality && (
                     <p className="text-xs text-brand-primary opacity-90 mt-1 font-medium">{selectedEvent.extendedProps.modality} • R$ {Number(selectedEvent.extendedProps.price || 0).toFixed(2).replace('.', ',')}</p>
                  )}
                </div>

                <Button onClick={handleEditClick} className="w-full bg-blue-600 hover:brightness-90 transition-all text-white font-bold h-10 mt-4">
                    <Edit3 className="mr-2 h-4 w-4" /> Reagendar / Editar
                </Button>

                <div className="flex flex-col gap-3 pt-4 border-t mt-4">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Opções de Exclusão</Label>
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-100 hover:bg-red-50 h-10"
                    onClick={() => handleDeleteAppointments('single')}
                    disabled={loading}
                  >
                    <Trash2 size={16} className="mr-2"/> Excluir apenas esta sessão
                  </Button>

                  <Button 
                    variant="outline" 
                    className="text-red-700 border-red-200 bg-red-50 hover:bg-red-100 font-bold h-10"
                    onClick={() => handleDeleteAppointments('future')}
                    disabled={loading}
                  >
                    <XCircle size={16} className="mr-2"/> Excluir esta e as próximas
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 2. Componente principal que exporta a página com o Suspense boundary
export default function AgendaClinicaPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center font-bold text-slate-400">Carregando Agenda...</div>}>
      <AgendaContent />
    </Suspense>
  )
}
