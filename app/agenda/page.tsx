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
import { Loader2, Plus, Calendar as CalendarIcon, Video, MapPin, Repeat, Trash2, XCircle, ChevronLeft, ChevronRight } from "lucide-react" 
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

  const [formData, setFormData] = useState({
    patient_id: '',
    date: '',
    time: '',
    type: 'Individual',
    duration: '50',
    modality: 'Presencial',
    price: '0,00',
    payment_status: 'Pendente',
    observations: '',
    recurrence: 'Nenhuma',
    repeat_count: 1
  })

  const fetchInitialData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [aptRes, patRes] = await Promise.all([
      supabase.from('appointments').select('id, start_time, end_time, status, patient_id, patients(full_name)').eq('psychologist_id', user.id),
      supabase.from('patients').select('id, full_name, session_value').eq('psychologist_id', user.id).order('full_name')
    ])
    
    if (aptRes.data) {
      setEvents(aptRes.data.map(apt => ({
        id: apt.id,
        title: Array.isArray(apt.patients) ? apt.patients[0]?.full_name : (apt.patients as any)?.full_name || 'Paciente',
        start: apt.start_time,
        end: apt.end_time,
        backgroundColor: apt.status === 'Cancelado' ? '#ef4444' : '#14b8a6',
        borderColor: apt.status === 'Cancelado' ? '#ef4444' : '#14b8a6',
        extendedProps: { 
          status: apt.status,
          patient_id: apt.patient_id 
        }
      })))
    }
    if (patRes.data) setPatients(patRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchInitialData() }, [])

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
    const { data: { user } } = await supabase.auth.getUser()
    const startDate = new Date(`${formData.date}T${formData.time}:00`)
    
    const appointmentsToInsert = []
    const numericPrice = parseFloat(String(formData.price).replace(/\./g, '').replace(',', '.')) || 0
    const daysToAdd = formData.recurrence === 'Semanal' ? 7 : 
                      formData.recurrence === 'Quinzenal' ? 14 : 
                      formData.recurrence === 'Mensal' ? 30 : 0;

    const loopCount = formData.recurrence === 'Nenhuma' ? 1 : formData.repeat_count;

    for (let i = 0; i < loopCount; i++) {
      const currentStart = new Date(startDate)
      if (formData.recurrence === 'Mensal') {
        currentStart.setMonth(startDate.getMonth() + i)
      } else {
        currentStart.setDate(startDate.getDate() + (i * daysToAdd))
      }
      
      const start = currentStart.toISOString()
      const end = new Date(currentStart.getTime() + parseInt(formData.duration) * 60000).toISOString()

      appointmentsToInsert.push({
        psychologist_id: user?.id,
        patient_id: formData.patient_id,
        start_time: start,
        end_time: end,
        price: numericPrice,
        payment_status: formData.payment_status,
        amount_paid: formData.payment_status === 'Pago' ? numericPrice : 0,
        status: 'Agendado',
        modality: formData.modality,
        observations: formData.observations || null
      })
    }

    const { error } = await supabase.from('appointments').insert(appointmentsToInsert)

    if (!error) {
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
        .fc-button-primary:hover { background-color: #e2e8f0 !important; color: #1e293b !important; }
        .fc-button-active { background-color: #0d9488 !important; color: white !important; }

        .fc-toolbar-title { font-size: 1.25rem !important; font-weight: 900 !important; color: #1e293b; text-align: center; }
        .fc-prev-button, .fc-next-button { width: 36px !important; height: 36px !important; padding: 0 !important; display: flex; align-items: center; justify-content: center; background-color: transparent !important; color: #64748b !important; }
        .fc-prev-button:hover, .fc-next-button:hover { background-color: #f1f5f9 !important; }
        .fc-icon { font-size: 1.2em; }
        .fc-header-toolbar { display: none !important; }
        .fc-view-harness { background-color: white; min-height: 100vh; }
        /* Oculta colunas padrão da lista para usar layout customizado */
        .fc-list-event-time, .fc-list-event-graphic { display: none; }
        /* Eventos com margem para não colar */
        .fc-timegrid-event { margin: 1px 2px !important; border-radius: 6px !important; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
      `}</style>

      <div className="hidden md:flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-md border border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><CalendarIcon className="h-6 w-6" /></div>
          <div><h1 className="text-xl font-black text-slate-800">Agenda Clínica</h1></div>
        </div>
        <Button className="bg-teal-600 rounded-2xl h-12 shadow-lg shadow-teal-100 text-white font-bold px-6" onClick={() => setOpen(true)}>
           <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      <Button className="md:hidden fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 shadow-2xl bg-teal-600 hover:bg-teal-700 p-0 flex items-center justify-center" onClick={() => setOpen(true)}>
         <Plus className="h-8 w-8 text-white" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white !opacity-100 border border-slate-200 shadow-2xl z-[100]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800">Agendar Consulta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Paciente *</Label>
              <Select onValueChange={(v) => setFormData({...formData, patient_id: v})}>
                <SelectTrigger className="bg-white border-slate-300 shadow-sm h-11">
                  <SelectValue placeholder="Selecione o paciente" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-2xl z-[9999]">
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id} className="hover:bg-slate-50 cursor-pointer">
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Data *</Label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="bg-white border-slate-300 focus:ring-2 focus:ring-teal-500/20 h-11" 
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Horário *</Label>
                <Input 
                  type="time" 
                  value={formData.time} 
                  onChange={e => setFormData({...formData, time: e.target.value})} 
                  className="bg-white border-slate-300 focus:ring-2 focus:ring-teal-500/20 h-11" 
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="space-y-2">
                <Label className="font-bold flex items-center gap-2"><Repeat size={14}/> Frequência de Repetição</Label>
                <Select value={formData.recurrence} onValueChange={v => setFormData({...formData, recurrence: v})}>
                  <SelectTrigger className="bg-white border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-[999]">
                    <SelectItem value="Nenhuma">Não repetir (Sessão única)</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrence !== 'Nenhuma' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-[10px] font-black uppercase text-teal-600 tracking-widest">Repetir por quantas vezes?</Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      min="2" 
                      max="52" 
                      value={formData.repeat_count} 
                      onChange={(e) => setFormData({...formData, repeat_count: parseInt(e.target.value) || 1})}
                      className="w-24 font-bold border-teal-300 text-teal-700 bg-white shadow-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="bg-white border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-[999]"><SelectItem value="Individual">Individual</SelectItem><SelectItem value="Casal">Casal</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Duração</Label>
                <Select defaultValue="50" onValueChange={v => setFormData({...formData, duration: v})}>
                  <SelectTrigger className="bg-white border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-[999]"><SelectItem value="50">50 min</SelectItem><SelectItem value="90">90 min</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setFormData({...formData, modality: 'Presencial'})} className={`gap-2 ${formData.modality === 'Presencial' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white'}`}><MapPin size={16}/> Presencial</Button>
              <Button type="button" variant="outline" onClick={() => setFormData({...formData, modality: 'Online'})} className={`gap-2 ${formData.modality === 'Online' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'bg-white'}`}><Video size={16}/> Online</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Valor (R$)</Label><Input value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="bg-white border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500/20 shadow-sm" /></div>
              <div className="space-y-2"><Label>Pagamento</Label>
                <Select value={formData.payment_status} onValueChange={v => setFormData({...formData, payment_status: v})}>
                  <SelectTrigger className="bg-white border-slate-200 shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-xl z-[999]"><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Pago">Pago</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black h-12 shadow-lg shadow-teal-100" onClick={handleSchedule} disabled={loading}>
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
              className={`rounded-full text-[10px] h-7 px-4 font-bold transition-all whitespace-nowrap ${currentView === view.id ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
        editable={true}
        dragRevertDuration={0}
        handleWindowResize={true}
        longPressDelay={50}
        listDayFormat={{ day: '2-digit', month: 'long', weekday: 'short' }}
        noEventsContent="Nenhum agendamento para este período"
        locale={ptBrLocale}
        events={events}
        height="calc(100vh - 100px)"
        allDaySlot={false}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        eventClassNames="rounded-lg border-l-4 border-0 shadow-sm mb-1 px-3 py-2 font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
        eventContent={(arg) => (
          <div className="flex items-center w-full">
            <b className="text-slate-900 mr-3 text-xs">{arg.timeText}</b>
            <span className="text-slate-700 text-sm truncate">{arg.event.title}</span>
          </div>
        )}
        eventClick={(info) => {
          setSelectedEvent(info.event)
          setOpenDetail(true)
        }}
      />

      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-sm bg-slate-50 rounded-[32px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <p className="text-sm font-bold text-teal-900">{selectedEvent?.title}</p>
              <p className="text-xs text-teal-700 mt-1">
                {selectedEvent?.start && new Date(selectedEvent.start).toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <Label className="text-[10px] font-black uppercase text-slate-400">Opções de Exclusão</Label>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-100 hover:bg-red-50 h-12"
                onClick={() => handleDeleteAppointments('single')}
                disabled={loading}
              >
                <Trash2 size={20} className="mr-2"/> Excluir apenas esta sessão
              </Button>

              <Button 
                variant="outline" 
                className="text-red-700 border-red-200 bg-red-50 hover:bg-red-100 font-bold h-12"
                onClick={() => handleDeleteAppointments('future')}
                disabled={loading}
              >
                <XCircle size={20} className="mr-2"/> Excluir esta e as próximas
              </Button>
            </div>
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