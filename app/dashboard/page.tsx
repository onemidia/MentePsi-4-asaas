'use client'

import { cn } from "@/lib/utils"
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/client'
import { 
  Calendar, 
  AlertTriangle, 
  DollarSign, 
  ArrowRight, 
  MessageCircle, 
  Clock,
  Play,
  Activity,
  Gift,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Loader2,
  Users,
  Wallet,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Info,
  X,
  Video,
  Send
} from "lucide-react"
import dynamic from 'next/dynamic'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getLabels } from '@/lib/labels'

// MentePsi V4 - Versão Estável - Build: 2026-04-02-01

// ⚡ PERFORMANCE: Carregamento dinâmico do gráfico pesado
const RevenueChart = dynamic(() => import('./revenue-chart'), { ssr: false, loading: () => <Skeleton className="h-[300px] w-full rounded-xl" /> })

export default function PsychologistDashboard() {
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [stats, setStats] = useState({
    sessionsToday: 0,
    crisisAlerts: 0,
    monthlyRevenue: 0,
    pendingRevenue: 0,
    activePatients: 0,
    totalCredit: 0,
    totalExpenses: 0,
    netProfit: 0
  })
  const [attentionList, setAttentionList] = useState<any[]>([])
  const [agenda, setAgenda] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([])
  const [processingPayment, setProcessingPayment] = useState(false)
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [transactionToConfirm, setTransactionToConfirm] = useState<any>(null)
  const [confirmAmount, setConfirmAmount] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const [isAdminView, setIsAdminView] = useState(false)
  const [supportPhone, setSupportPhone] = useState('')
  const [showDemoBanner, setShowDemoBanner] = useState(true)

  const handleSendReminder = async (item: any) => {
    const supabase = createClient()
    
    const { data: profData } = await supabase.from('professional_profile').select('reminder_template').eq('user_id', profile?.user_id || user.id).single()
    
    const portalUrl = `https://mentepsi.com.br/portal/${item.patientId}?t=${item.confirmationToken}`
    
    let msgTemplate = profData?.reminder_template || "Olá, {{nome}}! Este é um lembrete da sua sessão agendada para {{data}} às {{hora}}."
    
    if (!msgTemplate.includes('{{link}}')) {
      msgTemplate = msgTemplate + "\n\nPor favor, confirme sua presença clicando no seu portal:\n" + portalUrl
    } else {
      msgTemplate = msgTemplate.replace(/{{link}}/g, portalUrl)
    }
    
    const finalMsg = msgTemplate
      .replace(/{{nome}}/g, item.name.split(' ')[0])
      .replace(/{{data}}/g, item.formattedDate)
      .replace(/{{hora}}/g, item.time)
      // Fallback para quem não salvou as novas tags
      .replace(/{paciente}/g, item.name.split(' ')[0])
      .replace(/{data}/g, item.formattedDate)
      .replace(/{horario}/g, item.time)

    const fone = item.phone?.replace(/[^\d+]/g, '')
    if (!fone) return toast({ variant: "destructive", title: "Erro", description: "Paciente sem telefone." })
    const finalPhone = fone.startsWith('+') ? fone.replace('+', '') : (fone.startsWith('55') ? fone : `55${fone}`)

    await supabase.from('appointments').update({ reminder_sent: true, reminder_status: 'Enviado' }).eq('id', item.id)
    
    setAgenda(prev => prev.map(a => a.id === item.id ? { ...a, reminderSent: true, reminderStatus: 'Enviado' } : a))

    const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const waLink = isMobile 
      ? `whatsapp://send?phone=${finalPhone}&text=${encodeURIComponent(finalMsg)}`
      : `https://wa.me/${finalPhone}?text=${encodeURIComponent(finalMsg)}`;
    window.open(waLink, '_blank')
  }

  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    const cleanValue = value.replace(/\D/g, "");
    setter((Number(cleanValue) / 100).toFixed(2).replace('.', ','));
  }

  const initiateConfirmPayment = (t: any) => {
    setTransactionToConfirm(t)
    setConfirmAmount(Number(t.amount).toFixed(2).replace('.', ','))
    setConfirmModalOpen(true)
  }

  const finalizePaymentConfirmation = async () => {
    if (!transactionToConfirm) return
    setProcessingPayment(true)
    const supabase = createClient()
    const finalAmount = parseFloat(confirmAmount.replace(/\./g, '').replace(',', '.'))
    
    try {
      await supabase.from('financial_transactions').update({ status: 'CONCLUIDO', amount: finalAmount }).eq('id', transactionToConfirm.id)

      let remainingAmount = finalAmount
      const { data: pendingApts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', transactionToConfirm.patient_id)
        .not('payment_status', 'in', '("Pago","paid")')
        .order('start_time', { ascending: true })

      if (pendingApts) {
        for (const apt of pendingApts) {
          if (remainingAmount <= 0.01) break
          const price = Number(apt.price)
          const paid = Number(apt.amount_paid || 0)
          const debt = price - paid

          if (debt > 0) {
            const payNow = Math.min(remainingAmount, debt)
            const newPaid = paid + payNow
            const isFullyPaid = Math.round(newPaid * 100) >= Math.round(price * 100)

            await supabase.from('appointments').update({ 
              amount_paid: newPaid, 
              payment_status: isFullyPaid ? 'Pago' : 'Pendente' 
            }).eq('id', apt.id)

            remainingAmount -= payNow
          }
        }
      }

      if (remainingAmount > 0.01) {
         const { data: pat } = await supabase.from('patients').select('credit_balance').eq('id', transactionToConfirm.patient_id).single()
         await supabase.from('patients').update({ credit_balance: (Number(pat?.credit_balance) || 0) + remainingAmount }).eq('id', transactionToConfirm.patient_id)
      }

      const { data: patient } = await supabase.from('patients').select('*').eq('id', transactionToConfirm.patient_id).maybeSingle()
      const { data: profData } = await supabase.from('professional_profile')
        .select('full_name, crp, city, specialty, appointment_label')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (patient && profData) {
          let receiptNumber = 1
          let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', user.id).single()
          if (!counter) {
            const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: transactionToConfirm.psychologist_id, current_count: 0 }).select().single()
            counter = newCounter
          }
          receiptNumber = (counter?.current_count || 0) + 1
          await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', transactionToConfirm.psychologist_id)

          // ⚡ PERFORMANCE: Importação dinâmica do jsPDF (só carrega o código se clicar)
          const { jsPDF } = (await import('jspdf')).default ? await import('jspdf') : { jsPDF: (await import('jspdf')).jsPDF };
          
          const doc = new jsPDF()
          doc.setFontSize(16); doc.setTextColor(13, 148, 136);
          doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
          doc.setTextColor(0, 0, 0); doc.setFontSize(10);
          doc.text(profData.full_name || "Profissional", 105, 30, { align: "center" }); 
          doc.text(`CRP: ${profData.crp || "..."}`, 105, 35, { align: "center" })
          doc.setFontSize(12);
          const labels = getLabels(profData.appointment_label);
          const servicoDesc = `${labels.singular} de ${profData.specialty || 'Atendimento Clínico'}`;
          doc.text(`Recebi de ${patient.full_name}, CPF ${patient.cpf || '...'}`, 14, 50)
          doc.text(`a importância de ${finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
          doc.text(`referente a ${servicoDesc.toLowerCase()}.`, 14, 64)
          doc.text(`${profData.city || "Local"}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 105, 120, { align: "center" })
          
          const pdfBlob = doc.output('blob')
          const fileName = `${transactionToConfirm.patient_id}/recibo_${receiptNumber}_${Date.now()}.pdf`
          const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, pdfBlob)
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName)
            await supabase.from('patient_documents').insert({
              patient_id: transactionToConfirm.patient_id, psychologist_id: transactionToConfirm.psychologist_id, title: `Recibo Nº ${String(receiptNumber).padStart(3, '0')}`, file_url: publicUrl, status: 'Gerado'
            })
          }
      }

      toast({ title: "Pagamento confirmado!", description: "Recibo gerado e enviado ao portal." })
      setPendingTransactions(prev => prev.filter(item => item.id !== transactionToConfirm.id))
      setConfirmModalOpen(false)

    } catch (error: any) {
      console.warn("Aviso ao confirmar pagamento:", error)
      toast({ variant: "destructive", title: "Erro", description: error.message })
    } finally {
      setProcessingPayment(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.from('global_settings').select('whatsapp').single().then(({ data }) => {
      if (data?.whatsapp) setSupportPhone(data.whatsapp)
    })

    const fetchData = async () => {
      const now = new Date()
      const in36h = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()
      const startOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const endOfMonthStr = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const yesterday = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString()
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) return
        
        let targetUserId = user.id
        const { data: profileCheck } = await supabase.from('professional_profile').select('role').eq('user_id', user.id).maybeSingle()
        
        if (profileCheck?.role === 'admin') {
          setIsAdminView(true)
          const impersonatedId = localStorage.getItem('impersonate_id')
          if (impersonatedId) {
             targetUserId = impersonatedId
          }
        }

      setUser(user)

      const { data: profileData } = await supabase.from('professional_profile')
        .select('full_name, role, birthday_message_template, reminder_template, appointment_label, occupation_type, genero')
        .eq('user_id', targetUserId)
        .maybeSingle()
      const { data: subData } = await supabase.from('subscriptions').select('status, plan_id').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(1).maybeSingle()

      setProfile({
        ...profileData,
        subscription_status: subData?.status || 'trialing',
        plan_type: 'professional'
      })
      
      const sixMonthsAgo = subMonths(new Date(), 5)
      const startChart = startOfMonth(sixMonthsAgo).toISOString()

      const [sessionsRes, crisisRes, paymentsRes, pendingRes, attentionRes, agendaRes, chartTransRes, chartAptsRes, patientsRes, pendingTransRes, expensesRes, chartExpensesRes] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('psychologist_id', targetUserId).gte('start_time', startOfDay).lte('start_time', endOfDay).neq('status', 'Cancelado'),
        supabase.from('emotion_journal').select('patient_id').eq('psychologist_id', targetUserId).lte('mood_level', 2).gte('created_at', yesterday),
        supabase.from('financial_transactions').select('amount, patients!inner(id)').eq('psychologist_id', targetUserId).eq('type', 'income').in('status', ['CONCLUIDO', 'paid']).gte('created_at', `${startDate}T00:00:00.000Z`).lte('created_at', `${endDate}T23:59:59.999Z`),
        supabase.from('appointments').select('price, amount_paid, status, start_time').eq('psychologist_id', targetUserId).not('payment_status', 'in', '("Pago","paid")').gte('start_time', `${startDate}T00:00:00.000Z`).lte('start_time', `${endDate}T23:59:59.999Z`),
        supabase.from('emotion_journal').select(`id, mood_level, notes, created_at, patients (id, full_name, phone)`).eq('psychologist_id', targetUserId).order('created_at', { ascending: false }).limit(5),
        supabase.from('appointments').select(`*, patients (id, full_name, phone, meeting_link)`).eq('psychologist_id', targetUserId).gte('start_time', fourHoursAgo).lte('start_time', in36h).order('start_time', { ascending: true }),
        supabase.from('financial_transactions').select('amount, created_at, patients!inner(id)').eq('psychologist_id', targetUserId).eq('type', 'income').in('status', ['CONCLUIDO', 'paid']).gte('created_at', startChart),
        supabase.from('appointments').select('status, start_time, payment_status').eq('psychologist_id', targetUserId).gte('start_time', startChart),
        supabase.from('patients').select('full_name, birth_date, phone, status, credit_balance').eq('psychologist_id', targetUserId),
        supabase.from('financial_transactions').select('*, patients(full_name)').eq('psychologist_id', user?.id || targetUserId).eq('status', 'pending_review'),
        supabase.from('expenses').select('amount').eq('user_id', targetUserId).gte('date', startDate).lte('date', endDate),
        supabase.from('expenses').select('amount, date').eq('user_id', targetUserId).gte('date', startChart)
      ])

      const monthlyRevenue = paymentsRes.data?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
      const totalExpenses = expensesRes.data?.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0) || 0;
      const netProfit = monthlyRevenue - totalExpenses;

      setStats({
        sessionsToday: sessionsRes.count || 0,
        activePatients: patientsRes.data?.filter((p: any) => p.status === 'Ativo').length || 0,
        totalCredit: patientsRes.data?.reduce((acc: number, curr: any) => acc + (Number(curr.credit_balance) || 0), 0) || 0,
        crisisAlerts: new Set(crisisRes.data?.map((d: any) => d.patient_id)).size,
        monthlyRevenue: monthlyRevenue,
        pendingRevenue: pendingRes.data?.reduce((acc: number, curr: any) => {
          const effectiveStatus = curr.status?.toLowerCase() || ''
          if (['agendado', 'confirmado', 'pendente', 'realizada'].includes(effectiveStatus)) {
            return acc + ((Number(curr.price) || 0) - (Number(curr.amount_paid) || 0))
          }
          return acc
        }, 0) || 0,
        totalExpenses: totalExpenses,
        netProfit: netProfit
      })

      if (pendingTransRes?.data) {
        setPendingTransactions(pendingTransRes.data)
      } else {
        setPendingTransactions([])
      }

      setAttentionList(attentionRes.data?.map((item: any) => ({
        id: item.id, patientId: item.patients?.id, name: item.patients?.full_name, mood: Number(item.mood_level), note: item.notes, time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), whatsapp: item.patients?.phone
      })) || [])

      const rawAgenda = agendaRes.data || []
      const validAgenda = rawAgenda.filter((item: any) => {
        const aptTime = new Date(item.start_time)
        const endTime = item.end_time ? new Date(item.end_time) : new Date(aptTime.getTime() + (item.duration || 50) * 60000)
        return endTime > now
      })

      setAgenda(validAgenda.map((item: any) => {
        const dateObj = new Date(item.start_time)
        return {
          id: item.id,
          patientId: item.patients?.id,
          name: item.patients?.full_name,
          phone: item.patients?.phone,
          meetingLink: item.patients?.meeting_link,
          time: dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          formattedDate: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
          startTime: item.start_time,
          endTime: item.end_time,
          duration: item.duration,
          type: item.modality || 'Sessão',
          status: item.status,
          reminderSent: item.reminder_sent,
          reminderStatus: item.reminder_status,
          confirmationToken: item.confirmation_token
        }
      }))

      const monthsData = []
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i)
        const monthKey = format(d, 'yyyy-MM')
        const monthLabel = format(d, 'MMM', { locale: ptBR }).toUpperCase()
        
        const monthTrans = chartTransRes.data?.filter((t: any) => t.created_at.startsWith(monthKey)) || []
        const monthApts = chartAptsRes.data?.filter((a: any) => a.start_time.startsWith(monthKey)) || []
        const monthExpenses = chartExpensesRes.data?.filter((e: any) => e.date.startsWith(monthKey)) || []
        
        const revenue = monthTrans.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0)
        const despesas = monthExpenses.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0)
        const realizadas = monthApts.filter((a: any) => {
            const status = a.status?.toLowerCase() || ''
            return ['agendado', 'confirmado', 'pendente', 'realizada'].includes(status)
        }).length
        const agendadas = monthApts.length 
        const absenteismo = agendadas > 0 ? Math.round(((agendadas - realizadas) / agendadas) * 100) : 0

        monthsData.push({
          name: monthLabel,
          faturamento: revenue,
          despesas: despesas,
          consultas: realizadas,
          agendadas: agendadas,
          absenteismo: absenteismo
        })
      }
      setChartData(monthsData)

      const currentMonth = new Date().getMonth()
      const bdays = patientsRes.data?.filter((p: any) => {
        if (!p.birth_date) return false
        const parts = p.birth_date.split('-')
        const month = parseInt(parts[1]) - 1
        return month === currentMonth
      }).sort((a: any, b: any) => {
         const dayA = parseInt(a.birth_date.split('-')[2])
         const dayB = parseInt(b.birth_date.split('-')[2])
         return dayA - dayB
      }) || []
      setBirthdays(bdays)

      } catch (err) {
        console.warn("Aviso ao carregar dashboard:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const channel = supabase.channel('dashboard-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => fetchData()).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [startDate, endDate])

  const labels = React.useMemo(() => getLabels(profile?.appointment_label), [profile?.appointment_label])

  // 🚀 SKELETON: Mantemos a estrutura visual idêntica ao loading.tsx para evitar layout shift
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f8fafc] p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-48 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><Skeleton className="h-96 lg:col-span-2 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>
      </div>
    )
  }

  const getGreeting = () => {
    const name = profile?.full_name?.split(' ')[0] || 'Profissional'
    if (['ortopedista', 'medico', 'psiquiatra'].includes(profile?.occupation_type)) {
      const title = profile?.genero === 'Feminino' ? 'Dra.' : 'Dr.'
      return `Olá, ${title} ${name}`
    }
    return `Olá, ${name}`
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] p-4 md:p-8 space-y-8">
      {isAdminView && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-3 rounded-r shadow-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-bold text-sm">Você está visualizando como Administrador</span>
        </div>
      )}

      {/* 🎭 BANNER DA CONTA DEMO */}
      {user?.email === 'demo@mentepsi.com.br' && showDemoBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 relative flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
          <button
            onClick={() => setShowDemoBanner(false)}
            className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
            <Info className="h-6 w-6" />
          </div>
          <div className="flex-1 pr-6 sm:pr-0">
            <h2 className="text-lg font-bold text-blue-900 mb-1">👋 Olá, colega Psicólogo(a)! Seja bem-vindo ao MentePsi.</h2>
            <p className="text-blue-800 text-sm">Este é o seu espaço de testes. Sinta-se à vontade para cadastrar pacientes, criar sessões e explorar o financeiro.</p>
          </div>
          <Button asChild className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm whitespace-nowrap">
            <Link href="/pacientes/b2434c82-f171-44c7-adc5-c3381b44648f">Explorar Prontuário Exemplo</Link>
          </Button>
        </div>
      )}

      {/* ✅ BANNER TRIAL CONSOLIDADO (Lógica real do componente) */}
    
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Olá, {profile?.full_name?.split(' ')[0] || 'Profissional'}</h1>
          <p className="text-slate-500">Resumo clínico do seu consultório.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {supportPhone && (
            <Button variant="outline" className="gap-2 bg-white border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-200" onClick={() => window.open(`https://wa.me/${supportPhone.replace(/\D/g, '')}`, '_blank')}>
              <LifeBuoy className="h-4 w-4" /> Suporte
            </Button>
          )}
          <div className="text-sm text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            {isMounted && new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {pendingTransactions.length > 0 && (
        <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
          <Card className="bg-white border-none shadow-md">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 text-amber-700 rounded-full animate-pulse">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-lg">Ações Necessárias</h3>
                  <p className="text-amber-800">
                    Você tem <span className="font-black">{pendingTransactions.length}</span> comprovante{pendingTransactions.length > 1 ? 's' : ''} pendente{pendingTransactions.length > 1 ? 's' : ''} de aprovação.
                  </p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm">
                <Link href="/financeiro?filter=pendentes">
                  Ver Comprovantes <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        <StatCard title={`${labels.plural} Hoje`} value={stats.sessionsToday} icon={<Calendar className="h-4 w-4 text-teal-600" />} subtitle={`${labels.plural} Agendadas`} />
        <StatCard title="Pacientes Ativos" value={stats.activePatients} icon={<Users className="h-4 w-4 text-blue-600" />} subtitle="Em tratamento" />
        <StatCard title="Alertas de Crise" value={stats.crisisAlerts} icon={<AlertTriangle className="h-4 w-4 text-red-600" />} subtitle="Últimas 24h" isAlert />
        <StatCard title="A Receber" value={`R$ ${stats.pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<Clock className="h-4 w-4 text-amber-500" />} subtitle="Período" />
        <StatCard title="Faturamento" value={`R$ ${stats.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<DollarSign className="h-4 w-4 text-teal-600" />} subtitle="Ref. ao mês atual" />
        <StatCard title="Despesas" value={`R$ ${stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<TrendingDown className="h-4 w-4 text-red-600" />} subtitle="Ref. ao mês atual" />
        <StatCard title="Lucro Líquido" value={`R$ ${stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={stats.netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />} subtitle="Ref. ao mês atual" valueColor={stats.netProfit >= 0 ? "text-emerald-600" : "text-red-600"} />
        <StatCard title="Saldo em Haver" value={`R$ ${stats.totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={<Wallet className="h-4 w-4 text-indigo-500" />} subtitle="Crédito total" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUNA ESQUERDA (Ocupa 2 espaços) */}
        <div className="lg:col-span-2 space-y-8">
          {/* CARD 1: Gráfico */}
          <Card className="bg-white border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800"><TrendingUp className="h-5 w-5 text-teal-600" /> Desempenho e Eficiência</CardTitle>
              <CardDescription>Comparativo dos últimos 6 meses (Faturamento vs. Consultas Realizadas).</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={chartData} />
            </CardContent>
          </Card>

          {/* CARD 2: Agenda / Próximas 24h (Movido para baixo do gráfico) */}
          <Card className="bg-white border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800"><Clock className="h-5 w-5 text-teal-600" /> Próximas 36 Horas</CardTitle>
              <CardDescription>Clique para enviar lembrete.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agenda.map((item) => {
              const now = new Date();
              const aptTime = new Date(item.startTime);
              const endTime = item.endTime ? new Date(item.endTime) : new Date(aptTime.getTime() + (item.duration || 50) * 60000);
              
              let displayStatus = item.status;
              if (item.status === 'Agendado') {
                if (now >= endTime) {
                  displayStatus = 'Realizada';
                } else if (now >= aptTime) {
                  displayStatus = 'Em Andamento';
                }
              }

              return (
                <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center bg-white px-2 py-1 rounded border min-w-[50px]">
                      <span className="text-[10px] font-bold text-teal-600 leading-none mb-0.5">{item.formattedDate}</span>
                      <span className="text-xs font-bold text-slate-700 leading-none">{item.time}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-900">{item.name}</p>
                        {item.type?.toLowerCase() === 'online' && (
                          <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-200 bg-blue-50 px-1.5 py-0 h-4 uppercase tracking-wider">Online</Badge>
                        )}
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider ${
                          item.reminderStatus === 'Confirmado' ? 'bg-green-500 text-white border-green-600' : 
                          item.reminderStatus === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          item.reminderStatus === 'Reagendar' ? 'bg-pink-50 text-pink-700 border-pink-200' : 
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {item.reminderStatus === 'Confirmado' ? '✓ Confirmado' :
                           item.reminderStatus === 'Enviado' ? 'Link Enviado' :
                           item.reminderStatus === 'Reagendar' ? 'Reagendar' :
                           'Pendente'}
                        </Badge>
                      </div>
                      <Badge className={`text-[9px] h-4 px-2 mt-1 rounded-full uppercase font-black shadow-none hover:bg-opacity-100 ${
                        displayStatus === 'Realizada' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 
                        displayStatus === 'Em Andamento' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 animate-pulse' :
                        displayStatus === 'Cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 
                        'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      }`}>
                        {displayStatus}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto justify-end">
                    {item.type?.toLowerCase() === 'online' && item.meetingLink && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[10px] font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 px-2"
                          onClick={() => window.open(item.meetingLink, '_blank')}
                        >
                          <Video className="h-3 w-3 mr-1" />
                          Iniciar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 text-[10px] font-bold border-green-200 text-green-700 bg-green-50 hover:bg-green-100 px-2"
                          onClick={() => {
                            const fone = item.phone?.replace(/\D/g, '')
                            if (!fone) return toast({ variant: "destructive", title: "Erro", description: "Paciente sem telefone." })
                            const msg = `Olá, aqui está o link para nossa sessão de hoje: ${item.meetingLink}`
                          const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          const waLink = isMobile 
                            ? `whatsapp://send?phone=55${fone}&text=${encodeURIComponent(msg)}`
                            : `https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`;
                          window.open(waLink, '_blank')
                          }}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      </>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className={`h-8 text-[10px] font-bold px-2 ${
                        item.reminderSent 
                          ? 'border-emerald-300 text-emerald-800 bg-emerald-100 hover:bg-emerald-200' 
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                      onClick={() => handleSendReminder(item)}
                    >
                      <MessageCircle className="h-3 w-3 mr-1" fill={item.reminderSent ? "currentColor" : "none"} />
                      {item.reminderSent ? 'Avisado' : 'Lembrete'}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-teal-600" asChild>
                      <Link href={`/pacientes/${item.patientId}`}><Play className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              )
            })}
            </CardContent>
            <CardFooter className="border-t border-slate-100 pt-4">
              <Button variant="ghost" className="w-full text-slate-600 hover:text-teal-600" asChild>
                <Link href="/agenda">Ver Agenda Completa <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* COLUNA DIREITA (Ocupa 1 espaço lateral) */}
        <div className="space-y-8">
          {/* CARD 3: Aniversariantes */}
          <Card className="bg-white border-none shadow-md h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-slate-800"><Gift className="h-5 w-5 text-pink-500" /> Aniversariantes</CardTitle>
              <CardDescription>Pacientes celebrando este mês.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 mb-6">
              {birthdays.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm italic">Nenhum aniversariante em {format(new Date(), 'MMMM', { locale: ptBR })}.</div>
              ) : (
                birthdays.map((p: any, idx: number) => {
                  const day = p.birth_date.split('-')[2]
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-pink-50/50 rounded-xl border border-pink-100">
                      <div className="flex items-center gap-3">
                        <div className="bg-white text-pink-500 font-black text-xs h-8 w-8 rounded-full flex items-center justify-center shadow-sm">{day}</div>
                        <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{p.full_name.split(' ')[0]} {p.full_name.split(' ')[1]?.charAt(0)}.</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => {
                          const template = profile?.birthday_message_template || "Olá, {paciente}! Feliz aniversário!"
                          const msg = template.replace(/{nome_paciente}/g, p.full_name.split(' ')[0]).replace(/{paciente}/g, p.full_name.split(' ')[0])
                          const fone = p.phone?.replace(/[^\d+]/g, '') || ''
                          const finalPhone = fone.startsWith('+') ? fone.replace('+', '') : (fone.startsWith('55') ? fone : `55${fone}`)
                          const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                          const waLink = isMobile 
                            ? `whatsapp://send?phone=${finalPhone}&text=${encodeURIComponent(msg)}`
                            : `https://wa.me/${finalPhone}?text=${encodeURIComponent(msg)}`;
                          window.open(waLink, '_blank')
                      }}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* CARD 4: Alertas de Bem-estar (Movido para a direita) */}
          <Card className="bg-white border-none shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-800"><Activity className="h-5 w-5 text-teal-600" /> Alertas de Bem-estar</CardTitle>
              <CardDescription>Diário de emoções dos seus pacientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {attentionList.length === 0 ? <div className="text-center py-8 text-slate-500">Nenhum registro recente.</div> : attentionList.map((item) => <EmotionItem key={item.id} item={item} />)}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Conferência de Pagamento</DialogTitle>
            <DialogDescription>Confirme o valor efetivamente recebido. Se for menor, o restante ficará como pendência.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Valor Esperado</Label>
              <div className="text-sm font-bold text-slate-500">{transactionToConfirm ? Number(transactionToConfirm.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-teal-600 font-bold">Valor Recebido (R$)</Label>
              <Input id="amount" value={confirmAmount} onChange={(e) => handleCurrencyInput(e.target.value, setConfirmAmount)} className="text-2xl font-black h-14 text-center" />
            </div>
          </div>
          <DialogFooter><Button onClick={finalizePaymentConfirmation} disabled={processingPayment} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12">{processingPayment ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Confirmar Baixa</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatCard({ title, value, icon, subtitle, isAlert = false }: any) {
  return (
    <Card className={cn(
      "border-none shadow-md transition-all", 
      isAlert ? "bg-red-50" : "bg-white" 
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-medium", isAlert ? "text-red-700" : "text-slate-600")}>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", isAlert ? "text-red-700" : "text-slate-900")}>{value}</div>
        <p className={cn("text-xs mt-1", isAlert ? "text-red-600/80" : "text-slate-500")}>{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function EmotionItem({ item }: any) {
  const isCrisis = item.mood <= 2
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border shadow-sm ${isCrisis ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'}`}>
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.name}`} />
          <AvatarFallback>{item.name?.substring(0, 2)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold ${isCrisis ? 'text-red-900' : 'text-slate-900'}`}>{item.name}</h4>
            <Badge variant="outline" className={isCrisis ? 'bg-red-100 text-red-700' : ''}>Humor: {item.mood}/5</Badge>
          </div>
          <p className="text-sm text-slate-600">"{item.note || 'Sem anotações'}"</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4 sm:mt-0">
        <Button variant="outline" size="sm" asChild><Link href={`/pacientes/${item.patientId}?tab=emocoes`}>Ver</Link></Button>
        {item.whatsapp && (
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" asChild>
            {(() => {
              const fone = item.whatsapp.replace(/[^\d+]/g, '')
              const finalPhone = fone.startsWith('+') ? fone.replace('+', '') : (fone.startsWith('55') ? fone : `55${fone}`)
              const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              const waLink = isMobile ? `whatsapp://send?phone=${finalPhone}` : `https://wa.me/${finalPhone}`;
              return <a href={waLink} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
            })()}
          </Button>
        )}
      </div>
    </div>
  )
}