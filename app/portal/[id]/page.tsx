'use client'

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { canUseFeature } from '@/lib/planLimits'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { 
  Frown, Meh, Smile, ThumbsDown, ThumbsUp, FileText, 
  CheckCircle, Eraser, Clock, Filter, MessageSquarePlus, 
  Youtube, Smartphone, RefreshCw, Upload, AlertTriangle,
  Copy, Landmark, MessageCircle, Loader2, CheckCircle2, Video,
  ChevronLeft, ChevronRight,
  BellRing, HeartHandshake
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import SignatureCanvas from 'react-signature-canvas'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
})

const THEMES = [
  { id: 'padrao', name: 'Padrão', primary: '#0d9488', secondary: '#f0fdfa' },
  { id: 'oceano', name: 'Oceano', primary: '#1e40af', secondary: '#eff6ff' },
  { id: 'natureza', name: 'Natureza', primary: '#166534', secondary: '#f0fdf4' },
  { id: 'lavanda', name: 'Lavanda', primary: '#6b21a8', secondary: '#faf5ff' },
  { id: 'grafite', name: 'Grafite', primary: '#334155', secondary: '#f8fafc' },
];

function PatientPortalContent() {
  const params = useParams()
  const id = params?.id as string
  const { toast } = useToast()
  
  const searchParams = useSearchParams()
  const [appointmentToken, setAppointmentToken] = useState<string | null>(null)
  const [tokenHandled, setTokenHandled] = useState(false)
  
  const [patientData, setPatientData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mood, setMood] = useState<number | null>(null)
  const [note, setNote] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [appointments, setAppointments] = useState<any[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('Agendado') 
  const [currentMainTab, setCurrentMainTab] = useState('hoje')
  const [sessionAgenda, setSessionAgenda] = useState("")
  const [materials, setMaterials] = useState<any[]>([])
  const [amountToPay, setAmountToPay] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [uploadingProof, setUploadingProof] = useState(false)
  
  const sigCanvas = useRef<any>(null)
  const [openSignature, setOpenSignature] = useState(false)
  const [lgpdSigned, setLgpdSigned] = useState(false)
  const [pendingDoc, setPendingDoc] = useState<any>(null)
  const [hasPendingProof, setHasPendingProof] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isSavingAgenda, setIsSavingAgenda] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const [emotions, setEmotions] = useState<any[]>([])

  const getMoodIcon = (score: number) => {
    const icons: any = { 1: Frown, 2: ThumbsDown, 3: Meh, 4: ThumbsUp, 5: Smile }
    return icons[score] || Meh
  }

  const [permissions, setPermissions] = useState({
    active: true,
    journal: true,
    financials: true,
    materials: true,
    documents: true
  })

  const fetchPortalData = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    
    try {
      const { data: patient } = await supabase.from('patients').select('*').eq('id', id).single()

      if (patient) {
        const { data: profProfile } = await supabase.from('professional_profile').select('full_name, phone, clinic_name, logo_url, pix_key, bank, agency, bank_account, theme_name').eq('user_id', patient.psychologist_id).maybeSingle()

        setPatientData({ ...patient, professional_profile: profProfile })
        if (profProfile) {
          const fetchedTheme = profProfile.theme_name || 'padrao';
          const activeTheme = THEMES.find(t => t.id === fetchedTheme) || THEMES[0];
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--primary-color', activeTheme.primary);
            document.documentElement.style.setProperty('--secondary-color', activeTheme.secondary);
          }
        }
        setSessionAgenda(patient.next_session_agenda || "")
        
        const { data: settingsRes } = await supabase.from('portal_settings').select('*').eq('patient_id', id).maybeSingle()
        
        const isActive = settingsRes ? settingsRes.active === true : true;

        const currentPermissions = {
          active: isActive,
          journal: settingsRes?.journal ?? true,
          financials: settingsRes?.financials ?? true,
          materials: settingsRes?.materials ?? true,
          documents: settingsRes?.documents ?? true
        };
        setPermissions(currentPermissions);

        if (isActive === false) {
          if (isRefresh) toast({ title: "Dados atualizados!" });
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const [aptsRes, matsRes, signedDocRes, pendingDocRes, proofRes, emotionsRes] = await Promise.all([
          supabase.from('appointments').select('*').eq('patient_id', id).order('start_time', { ascending: true }),
          currentPermissions.materials ? supabase.from('therapeutic_materials').select('*').eq('patient_id', id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
          currentPermissions.documents ? supabase.from('patient_documents').select('id').eq('patient_id', id).eq('status', 'Assinado').limit(1).maybeSingle() : Promise.resolve({ data: null }),
          currentPermissions.documents ? supabase.from('patient_documents').select('*').eq('patient_id', id).in('status', ['Pendente', 'Gerado']).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
          currentPermissions.financials ? supabase.from('patient_documents').select('id').eq('patient_id', id).ilike('title', '%Comprovante%').eq('status', 'Pendente').limit(1).maybeSingle() : Promise.resolve({ data: null }),
          currentPermissions.journal ? supabase.from('emotion_journal').select('*').eq('patient_id', id).order('created_at', { ascending: false }) : Promise.resolve({ data: [] })
        ])
        
        if (matsRes.data) setMaterials(matsRes.data)
        if (aptsRes.data) {
          setAppointments(aptsRes.data)
          const currentToken = searchParams?.get('t')
          if (currentToken) {
            const isConfirmed = aptsRes.data.find((a: any) => a.confirmation_token === currentToken && a.reminder_status === 'Confirmado')
            if (isConfirmed) {
              setTokenHandled(true)
            }
          }
        }
        if (emotionsRes.data) setEmotions(emotionsRes.data)
        
        if (proofRes.data) setHasPendingProof(true);
        if (!proofRes.data) setHasPendingProof(false);

        if (signedDocRes.data) {
           setLgpdSigned(true);
           setPendingDoc(null);
        } else if (pendingDocRes.data) {
           setLgpdSigned(false);
           setPendingDoc(pendingDocRes.data);
        } else {
           setLgpdSigned(false);
           setPendingDoc(null);
        }

        if (isRefresh) toast({ title: "Dados atualizados!" })
      }
    } catch (err) {
      console.warn("Aviso ao sincronizar portal:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, toast])

  useEffect(() => {
    const t = searchParams?.get('t')
    if (t) setAppointmentToken(t)
    fetchPortalData()
    setIsMounted(true)
  }, [fetchPortalData, searchParams])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleConfirmAppointment = async (status: 'Confirmado' | 'Reagendar') => {
    if (!appointmentToken) {
      toast({ variant: "destructive", title: "Erro de Link", description: "Token não identificado na URL." });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          reminder_status: status,
          confirmed_at: status === 'Confirmado' ? new Date().toISOString() : null 
        })
        .eq('confirmation_token', appointmentToken)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ variant: "destructive", title: "Atenção", description: "Não conseguimos localizar seu agendamento no banco." });
        return;
      }

      setTokenHandled(true);
      setAppointmentToken(null); 
      
      toast({ title: "Sucesso!", description: "Sua presença foi confirmada." });
      
      fetchPortalData(true);

      if (status === 'Reagendar') {
        const phone = patientData?.professional_profile?.phone?.replace(/\D/g, '');
        if (phone) window.open(`https://wa.me/55${phone}?text=Olá, preciso reagendar minha sessão de hoje.`, '_blank');
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Falha na Gravação", description: "O servidor recusou a atualização. Verifique o console." });
    }
  };

  const handleSaveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      toast({ variant: "destructive", title: "Assinatura Vazia", description: "Por favor, desenhe sua assinatura." });
      return;
    }
    
    setIsSigning(true);
    try {
      const signatureData = sigCanvas.current.getCanvas().toDataURL('image/png');
      
      const { error: insertError } = await supabase.from('patient_documents').insert({
        patient_id: id,
        psychologist_id: patientData?.psychologist_id,
        title: pendingDoc ? pendingDoc.title + ' (Assinado)' : 'Contrato (Assinado)',
        content: pendingDoc ? pendingDoc.content : 'Assinatura via portal.',
        status: 'Assinado',
        signature_data: signatureData,
        signed_at: new Date().toISOString()
      });
  
      if (insertError) throw insertError;
  
      if (pendingDoc && pendingDoc.id) {
         await supabase.from('patient_documents').delete().eq('id', pendingDoc.id);
      }
  
      setLgpdSigned(true);
      setPendingDoc(null);
      setOpenSignature(false);
      toast({ title: "Contrato Assinado!", description: "A assinatura foi registrada com sucesso." });
      
      fetchPortalData(true); 
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro de Comunicação", description: "Falha ao gravar no sistema." });
    } finally {
      setIsSigning(false);
    }
  }

  const handleSubmitMood = async () => {
    if (mood === null) return
    const { error } = await supabase.from('emotion_journal').insert({
      patient_id: id, psychologist_id: patientData?.psychologist_id, mood_level: mood, notes: note
    })
    if (!error) {
      setSubmitted(true)
      toast({ title: "Registro salvo!", description: "Obrigado por compartilhar seu humor hoje." })
    }
  }

  const handleMarkReplyAsRead = async (emotionId: string) => {
    try {
      const { error } = await supabase.from('emotion_journal').update({ reply_read: true }).eq('id', emotionId)
      if (error) throw error
      setEmotions(prev => prev.map(e => e.id === emotionId ? { ...e, reply_read: true } : e))
      toast({ title: "Marcado como lido", description: "Mensagem do seu terapeuta arquivada." })
    } catch (err) {
      console.error("Erro ao marcar como lido", err)
    }
  }

  const handleSaveAgenda = async () => {
    setIsSavingAgenda(true);
    const { data: currentPatient } = await supabase.from('patients').select('next_session_agenda').eq('id', id).single();
    const currentAgenda = currentPatient?.next_session_agenda || "";
    
    const timestamp = new Date().toLocaleString('pt-BR');
    const novaEntrada = `[Enviado em ${timestamp}]:\n${sessionAgenda}`;
    const pautaAtualizada = currentAgenda ? `${currentAgenda}\n\n${novaEntrada}` : novaEntrada;

    const { error } = await supabase.from('patients').update({ next_session_agenda: pautaAtualizada }).eq('id', id);
    if (!error) {
      toast({ title: "Enviado com sucesso!", description: "Adicionado à fila de tópicos da sessão." });
      setSessionAgenda("");
    } else {
      toast({ variant: "destructive", title: "Erro ao enviar", description: "Tente novamente." });
    }
    setIsSavingAgenda(false);
  }

  const handleCurrencyInput = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    setAmountToPay((Number(cleanValue) / 100).toFixed(2).replace('.', ','));
  }

  const handleUploadProof = async (file: File | null) => {
    if (!file) {
      toast({ variant: "destructive", title: "Arquivo Ausente", description: "Por favor, anexe o comprovante." });
      return;
    }

    if (!id) {
      toast({ variant: "destructive", title: "Sessão Inválida", description: "ID do paciente não identificado. Tente recarregar a página." });
      return;
    }

    setUploadingProof(true);

    try {
      const { data: existingPending } = await supabase
        .from('patient_documents')
        .select('id')
        .eq('patient_id', id)
        .ilike('title', '%Comprovante%')
        .eq('status', 'Pendente')
        .limit(1)
        .maybeSingle();

      if (existingPending) {
        toast({ variant: "destructive", title: "Atenção", description: "Você já possui um envio em análise." });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${id}/comprovantes/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName);

      const parsedAmount = parseFloat(amountToPay.replace(/\./g, '').replace(',', '.'));
      const finalAmount = isNaN(parsedAmount) ? 0 : parsedAmount;

      const { data: patient } = await supabase.from('patients').select('psychologist_id').eq('id', id).single();
      const safePsychologistId = patientData?.psychologist_id || patient?.psychologist_id;

      const docPayload = {
        patient_id: id, 
        psychologist_id: safePsychologistId,
        title: `Comprovante de Pagamento - ${new Date().toLocaleDateString('pt-BR')}`,
        file_url: publicUrl,
        status: 'Pendente'
      };
      const { error: docError } = await supabase.from('patient_documents').insert(docPayload);
      if (docError) throw docError;

      toast({ title: "Enviado com Sucesso!", description: "Seu terapeuta foi notificado." });
      setHasPendingProof(true);
      setPaymentModalOpen(false);
      setAmountToPay('');
      setSelectedFile(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no envio", description: error.message });
    } finally {
      setUploadingProof(false);
    }
  };

  const totalPending = appointments.reduce((acc, apt) => {
    const now = new Date(); const aptTime = new Date(apt.start_time); const isPast = now > aptTime;
    const displayStatus = (apt.status === 'Agendado' && isPast) ? 'Realizada' : apt.status;
    if (displayStatus === 'Realizada') return acc + Math.max(0, Number(apt.price || 0) - Number(apt.amount_paid || 0));
    return acc;
  }, 0)

  const handleSendReceiptWhatsApp = () => {
    const phone = patientData?.professional_profile?.phone?.replace(/\D/g, '')
    if (!phone) return toast({ variant: "destructive", title: "Indisponível", description: "Contato do profissional não encontrado." })
    const msg = `Olá! Acabei de enviar o comprovante de pagamento no valor de ${totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via Portal MentePsi. Por favor, verifique assim que possível.`
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const getMeetingStatus = () => {
    if (!appointments.length) return null
    const now = currentTime
    
    const nextApt = appointments.find(a => {
      if (a.status !== 'Agendado') return false
      const start = new Date(a.start_time)
      const end = a.end_time ? new Date(a.end_time) : new Date(start.getTime() + 60 * 60 * 1000)
      return end > now
    })

    if (!nextApt) return null

    const start = new Date(nextApt.start_time)
    const diffMs = start.getTime() - now.getTime()
    const diffMinutes = diffMs / (1000 * 60)
    
    return { canJoin: diffMinutes <= 10, appointment: nextApt, start, diffMs }
  }

  const formatCountdown = (ms: number) => {
    if (ms < 0) return "00:00:00"
    const seconds = Math.floor((ms / 1000) % 60)
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
    const days = Math.floor(ms / (1000 * 60 * 60 * 24))
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    return `${hours}h ${minutes}m ${seconds}s`
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [startDate, endDate, statusFilter])

  const filteredAppointments = appointments.filter(apt => {
    const dateMatch = (!startDate || new Date(apt.start_time) >= new Date(startDate)) && 
                      (!endDate || new Date(apt.start_time) <= new Date(endDate + 'T23:59:59'))
    
    const now = new Date()
    const isPast = now > new Date(apt.start_time)
    const effectiveStatus = (apt.status === 'Agendado' && isPast) ? 'Realizada' : apt.status
    const statusMatch = statusFilter === 'Todas' ? true : effectiveStatus === statusFilter

    return dateMatch && statusMatch
  }).sort((a, b) => {
    const dateA = new Date(a.start_time).getTime()
    const dateB = new Date(b.start_time).getTime()
    if (statusFilter === 'Agendado') return dateA - dateB
    return dateB - dateA
  })

  const totalPages = Math.ceil(filteredAppointments.length / 10) || 1
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * 10, currentPage * 10)

  if (!isMounted || !id) return null
  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 font-bold text-slate-400"><Loader2 className="animate-spin mr-2 h-6 w-6"/> Carregando Portal...</div>
  
  if (permissions.active === false) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-6 text-center">
        <Card className="max-w-sm p-8 rounded-[32px] shadow-xl border-none bg-white">
          <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2">Portal Indisponível</h2>
          <p className="text-slate-500 text-sm">Este acesso ainda não foi liberado ou foi pausado pelo seu terapeuta.</p>
        </Card>
      </div>
    )
  }

  const meetingStatus = getMeetingStatus()
  const unreadRepliesCount = emotions.filter(e => e.psychologist_reply && !e.reply_read).length

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4 pt-8 max-w-lg mx-auto pb-24 space-y-6">
      
      <header className="text-center relative pt-4 space-y-4">
        {unreadRepliesCount > 0 && (
          <Button variant="ghost" size="icon" className="absolute -left-2 -top-2 text-amber-500 hover:text-amber-600 transition-colors" onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
            <div className="relative animate-bounce">
              <BellRing size={20} />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center shadow-sm">{unreadRepliesCount}</span>
            </div>
          </Button>
        )}
        
        <Button variant="ghost" size="icon" className="absolute -right-2 -top-2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => fetchPortalData(true)} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
        </Button>
        {patientData?.professional_profile?.logo_url ? (
          <div className="flex justify-center animate-in fade-in duration-500">
            <img src={patientData.professional_profile.logo_url} alt="Logo Clínica" className="h-20 max-w-[180px] object-contain drop-shadow-sm" />
          </div>
        ) : (
          <Smartphone className="h-12 w-12 text-slate-300 mx-auto mb-2" />
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{patientData?.professional_profile?.clinic_name || "Portal do Paciente"}</h1>
          <p className="text-slate-500 font-medium text-sm">Olá, {patientData?.full_name?.split(' ')[0]}</p>
        </div>
        <div className="h-1 w-12 mx-auto rounded-full" style={{ backgroundColor: 'var(--primary-color)' }}></div>
      </header>

      {/* CONFIRMAÇÃO DE AGENDAMENTO (TOKEN) */}
      {appointmentToken && !tokenHandled && !appointments.find(a => a.confirmation_token === appointmentToken && a.reminder_status === 'Confirmado') && (
        <Card className="w-full bg-amber-50 border-amber-200 mb-6 shadow-sm animate-in slide-in-from-top-4">
          <CardContent className="p-6 text-center">
            <p className="font-bold text-amber-900 text-lg mb-4">Confirmamos sua presença na sessão de hoje?</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl shadow-md border-0" 
                onClick={() => handleConfirmAppointment('Confirmado')}
              >
                Sim, Confirmar
              </Button>
              <Button 
                variant="outline"
                className="flex-1 bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-bold h-12 rounded-xl" 
                onClick={() => handleConfirmAppointment('Reagendar')}
              >
                Reagendar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SALA ONLINE */}
      {patientData?.meeting_link && (
        <Card className="w-full shadow-md border-slate-200 bg-white animate-in fade-in slide-in-from-top-4">
          <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="bg-slate-100 p-3 rounded-full" style={{ color: 'var(--primary-color)' }}>
              <Video size={24} />
            </div>
            
            {meetingStatus?.canJoin ? (
              <>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-lg">Sua sala de atendimento já está liberada!</h3>
                  <p className="text-sm text-slate-600">Clique abaixo para entrar na videochamada.</p>
                </div>
                <Button 
                  className="w-full text-white font-bold h-12 rounded-xl shadow-lg border-0 hover:brightness-90 transition-all animate-pulse"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                  onClick={() => window.open(patientData.meeting_link, '_blank')}
                >
                  <Video className="mr-2 h-5 w-5" /> ACESSAR CONSULTA AGORA
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  {meetingStatus ? (
                    <>
                      <h3 className="font-bold text-slate-700 text-lg">Sua próxima sessão será em {meetingStatus.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</h3>
                      <p className="text-sm text-slate-500">A sala abre 10 min antes do horário.</p>
                    </>
                  ) : (
                    <h3 className="font-bold text-slate-700 text-lg">Nenhum agendamento próximo</h3>
                  )}
                </div>
                {meetingStatus && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center w-full">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">Tempo Restante</p>
                    <p className="text-2xl font-black font-mono" style={{ color: 'var(--primary-color)' }}>{formatCountdown(meetingStatus.diffMs)}</p>
                    <p className="text-[10px] mt-1 font-medium" style={{ color: 'var(--primary-color)' }}>{meetingStatus.start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                  </div>
                )}
                <Button disabled className="w-full bg-slate-200 text-slate-400 font-bold h-12 rounded-xl cursor-not-allowed">
                  <Clock className="mr-2 h-5 w-5" /> Sala Fechada
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* DOCUMENTOS */}
      {permissions.documents === true && (
      <Card className="w-full shadow-md border-slate-100 bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: 'var(--primary-color)' }} /> Situação Legal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lgpdSigned ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-100 text-sm">
              <CheckCircle className="h-4 w-4" /> <span className="font-bold">Termo e Contrato Assinados</span>
            </div>
          ) : pendingDoc ? (
            <div className="flex items-center justify-between bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="text-amber-800 font-bold text-xs">Contrato Aguardando Assinatura</span>
              <Button size="sm" onClick={() => setOpenSignature(true)} className="text-white h-8 text-xs font-black shadow-md border-0 px-4 rounded-xl hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }}>Assinar Agora</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm">
              <Clock className="h-4 w-4" /> <span className="font-bold text-xs">Nenhum contrato pendente.</span>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* ABAS DE NAVEGAÇÃO */}
      <Tabs value={currentMainTab} onValueChange={setCurrentMainTab} className="w-full">
        <TabsList className="flex flex-wrap justify-center gap-3 mb-8 bg-transparent h-auto p-0 w-full">
          <TabsTrigger 
            value="hoje" 
            className="data-[state=active]:text-white bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full px-6 py-2 text-sm font-bold transition-all shadow-sm border-0" 
            style={{ backgroundColor: currentMainTab === 'hoje' ? 'var(--primary-color)' : '' }}
          >
            Hoje
          </TabsTrigger>
        {permissions.financials === true && (
          <TabsTrigger 
            value="agenda" 
            className="data-[state=active]:text-white bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full px-6 py-2 text-sm font-bold transition-all shadow-sm border-0" 
            style={{ backgroundColor: currentMainTab === 'agenda' ? 'var(--primary-color)' : '' }}
          >
            Agenda
          </TabsTrigger>
        )}
        {permissions.materials === true && (
          <TabsTrigger 
            value="materiais" 
            className="data-[state=active]:text-white bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full px-6 py-2 text-sm font-bold transition-all shadow-sm border-0" 
            style={{ backgroundColor: currentMainTab === 'materiais' ? 'var(--primary-color)' : '' }}
          >
            Materiais
          </TabsTrigger>
        )}
        </TabsList>

        <TabsContent value="hoje" className="space-y-6">
        {permissions.journal === true && (
            !submitted ? (
              <Card className="shadow-xl border-none rounded-[32px] bg-white">
                <CardHeader className="text-center pb-2"><CardTitle className="text-xl font-bold">Como você está hoje?</CardTitle></CardHeader>
                <CardContent className="space-y-8 pt-4">
                  <div className="flex justify-between px-2">
                    {[ {v:1, i:Frown, c:"text-red-500"}, {v:2, i:ThumbsDown, c:"text-orange-500"}, {v:3, i:Meh, c:"text-yellow-500"}, {v:4, i:ThumbsUp, c:"text-lime-600"}, {v:5, i:Smile, c:"text-emerald-600"} ].map((m) => (
                      <button key={m.v} onClick={() => setMood(m.v)} className={`p-3 rounded-2xl transition-all ${mood === m.v ? "text-white scale-110 shadow-lg border-0" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`} style={{ backgroundColor: mood === m.v ? 'var(--primary-color)' : '' }}><m.i size={32} /></button>
                    ))}
                  </div>
                  <Textarea className="min-h-[100px] bg-slate-50 border-none rounded-2xl p-4 shadow-inner text-base" placeholder="Escreva aqui..." value={note} onChange={e => setNote(e.target.value)} />
                  <Button disabled={mood === null} onClick={handleSubmitMood} className="w-full h-14 text-white font-black text-lg rounded-2xl shadow-lg border-0 hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }}>Registrar</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-emerald-50 border-none rounded-[32px] py-8 text-center animate-in zoom-in duration-300"><CardContent><CheckCircle className="mx-auto text-emerald-600 mb-2" size={32}/><p className="font-black text-emerald-900 text-lg">Registro Enviado!</p></CardContent></Card>
            )
          )}

          {/* DIÁRIO DE EMOÇÕES E ACOLHIMENTOS */}
          {emotions.length > 0 && (
            <Card className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden mt-6">
              <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100">
                <CardTitle className="text-sm font-black flex items-center gap-2 text-slate-800">
                  <HeartHandshake size={18} style={{ color: 'var(--primary-color)' }} /> Meu Diário e Respostas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {emotions.slice(0, 10).map(e => {
                  const MoodIcon = getMoodIcon(Number(e.mood_score));
                  const hasUnreadReply = e.psychologist_reply && !e.reply_read;
                  return (
                    <div key={e.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 mt-1"><MoodIcon className="h-6 w-6" style={{ color: 'var(--primary-color)' }} /></div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800">{new Date(e.created_at).toLocaleDateString('pt-BR')} às {new Date(e.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                          <p className="text-sm italic text-slate-600 mt-1 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">"{e.notes}"</p>
                        </div>
                      </div>
                      
                      {e.psychologist_reply && (
                        <div className={`mt-2 p-4 rounded-xl relative overflow-hidden transition-colors shadow-sm ml-2 sm:ml-12 ${hasUnreadReply ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: hasUnreadReply ? '#f59e0b' : 'var(--primary-color)' }}></div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                            <p className={`text-[10px] font-black uppercase tracking-widest flex items-center ${hasUnreadReply ? 'text-amber-700' : 'text-slate-800'}`}>
                              <MessageSquarePlus className="mr-2 h-4 w-4" />
                              Resposta do seu Terapeuta
                            </p>
                            {hasUnreadReply && (
                          <Button size="sm" className="text-white border-0 text-[10px] uppercase font-bold shadow-md animate-pulse h-8 px-4 rounded-xl w-full sm:w-auto hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }} onClick={() => handleMarkReplyAsRead(e.id)}>
                                <CheckCircle2 className="mr-2 h-3 w-3" /> Lida
                              </Button>
                            )}
                          </div>
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${hasUnreadReply ? 'text-amber-900 font-medium' : 'text-slate-800'}`}>{e.psychologist_reply}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[32px] border-none shadow-lg bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-slate-100"><CardTitle className="text-sm font-black flex items-center gap-2 text-slate-800"><MessageSquarePlus size={18} style={{ color: 'var(--primary-color)' }} /> Pauta da Próxima Sessão</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Textarea placeholder="O que gostaria de conversar?" className="bg-slate-50 border-none rounded-2xl min-h-[100px] text-base" value={sessionAgenda} onChange={e => setSessionAgenda(e.target.value)} />
              <Button onClick={handleSaveAgenda} disabled={isSavingAgenda || !sessionAgenda.trim()} className="w-full text-white font-bold h-12 rounded-xl shadow-lg border-0 hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }}>{isSavingAgenda ? <><Loader2 className="animate-spin mr-2 h-4 w-4"/> Enviando...</> : "Enviar Tópico"}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      
      {permissions.financials === true && (
        <TabsContent value="agenda" className="space-y-4">
        {totalPending > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 shadow-sm rounded-2xl mb-6">
              <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><AlertTriangle size={24} /></div>
                  <div><p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Total Pendente</p><h3 className="text-2xl font-black text-slate-900">{totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3><p className="text-xs text-slate-500 font-medium">Sessões realizadas aguardando pagamento.</p></div>
                </div>
                {hasPendingProof ? (
                  <Button disabled className="w-full sm:w-auto bg-slate-200 text-slate-500 font-bold h-12 rounded-xl cursor-not-allowed border-0"><CheckCircle2 className="mr-2 h-4 w-4" /> Enviado com Sucesso</Button>
                ) : (
                  <Button className="w-full sm:w-auto text-white font-bold h-12 rounded-xl shadow-lg border-0 px-6 hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }} onClick={() => { setAmountToPay(totalPending > 0 ? totalPending.toFixed(2).replace('.', ',') : ''); setPaymentModalOpen(true) }}>Pagar Agora com Pix</Button>
                )}
              </CardContent>
            </Card>
          )}
          
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border mb-4">
            <div className="flex items-center gap-2 w-full">
              <Filter size={14} className="text-slate-400 ml-2" />
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-none bg-slate-50 text-xs rounded-xl w-full" />
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-none bg-slate-50 text-xs rounded-xl w-full" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 border-none bg-slate-50 text-xs font-bold rounded-xl w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas</SelectItem>
                <SelectItem value="Agendado">Agendadas</SelectItem>
                <SelectItem value="Realizada">Realizadas</SelectItem>
                <SelectItem value="Cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paginatedAppointments.length === 0 ? <p className="text-center py-10 text-slate-400 text-xs italic font-medium">Nenhum agendamento encontrado.</p> : paginatedAppointments.map(apt => {
            const now = new Date(); const aptTime = new Date(apt.start_time); const isPast = now > aptTime;
            const displayStatus = (apt.status === 'Agendado' && isPast) ? 'Realizada' : apt.status;
            const isPaid = Math.round(Number(apt.amount_paid || 0) * 100) >= Math.round(Number(apt.price || 0) * 100);
            return (
            <Card key={apt.id} className="border-none shadow-sm rounded-2xl bg-white">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="text-sm font-black text-slate-900">{new Date(apt.start_time).toLocaleDateString('pt-BR')}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{new Date(apt.start_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                  <div className="flex gap-2 mt-1"><Badge variant="outline" className={`text-[10px] font-bold ${displayStatus === 'Realizada' ? 'text-emerald-600 border-emerald-200' : displayStatus === 'Cancelado' ? 'text-red-600 border-red-200' : 'text-slate-400 border-slate-200'}`}>{displayStatus.toUpperCase()}</Badge></div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isPaid ? <Badge className="bg-emerald-50 text-emerald-600 border-none font-bold px-3 py-1">PAGO</Badge> : displayStatus === 'Realizada' && <Badge variant="outline" className="text-red-500 border-red-100 font-bold text-[10px] bg-red-50">AGUARDANDO PAGAMENTO</Badge>}
                </div>
              </CardContent>
            </Card>
          )})}

          {filteredAppointments.length > 0 && (
            <div className="flex items-center justify-between pt-4 px-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-slate-500 hover:bg-slate-100 h-8 text-xs font-bold rounded-xl" style={{ color: currentPage !== 1 ? 'var(--primary-color)' : '' }}><ChevronLeft className="h-4 w-4 mr-1"/> Anterior</Button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Página {currentPage} de {totalPages}</span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="text-slate-500 hover:bg-slate-100 h-8 text-xs font-bold rounded-xl" style={{ color: currentPage !== totalPages ? 'var(--primary-color)' : '' }}>Próximo <ChevronRight className="h-4 w-4 ml-1"/></Button>
            </div>
          )}
        </TabsContent>
        )}

      {permissions.materials === true && (
          <TabsContent value="materiais" className="space-y-4">
            {materials.length === 0 ? <p className="text-center py-10 text-slate-400 text-sm italic font-medium">Nenhum material compartilhado pelo seu terapeuta.</p> : materials.map(mat => (
                <Card key={mat.id} className="border-none shadow-md rounded-2xl bg-white cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => window.open(mat.file_url, '_blank')}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center" style={{ color: 'var(--primary-color)' }}>{mat.file_url.includes('youtube') || mat.file_url.includes('youtu.be') ? <Youtube size={20}/> : <FileText size={20}/>}</div>
                    <div><p className="font-bold text-slate-900 text-sm">{mat.title}</p><p className="text-[10px] font-bold uppercase tracking-tight" style={{ color: 'var(--primary-color)' }}>Ver Conteúdo</p></div>
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={openSignature} onOpenChange={setOpenSignature}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-2xl rounded-[32px] p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Contrato e Termo de Consentimento</DialogTitle>
            <DialogDescription className="sr-only">Assine o documento abaixo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-[12px] text-slate-700 bg-slate-50 p-4 rounded-xl border leading-relaxed whitespace-pre-wrap h-80 overflow-y-auto shadow-inner font-serif">
              {pendingDoc ? pendingDoc.content : "Nenhum documento pendente."}
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden flex justify-center">
              <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{width: 320, height: 180, className: 'sigCanvas'}} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => sigCanvas.current?.clear()} className="w-full text-slate-400 text-xs hover:bg-slate-100">
              <Eraser size={12} className="mr-2" /> Limpar quadro
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSignature} disabled={isSigning} className="w-full text-white font-bold h-14 rounded-2xl shadow-xl border-0 hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }}>
              {isSigning ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Salvando...</> : "Assinar e Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentModalOpen} onOpenChange={(open) => { setPaymentModalOpen(open); if(!open) setSelectedFile(null); }}>
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] sm:max-w-sm rounded-[32px] p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Realizar Pagamento</DialogTitle>
              <DialogDescription className="sr-only">Opções de pagamento.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: 'var(--primary-color)' }}></div>
                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Chave Pix</p>
                    <p className="text-lg font-black text-slate-900 select-all break-all">{patientData?.professional_profile?.pix_key || "Chave não configurada"}</p>
                    <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-xs hover:brightness-90 transition-all" style={{ color: 'var(--primary-color)' }} onClick={() => { navigator.clipboard.writeText(patientData?.professional_profile?.pix_key || ""); toast({ title: "Copiado!" }) }}><Copy size={12} className="mr-1"/> Copiar Chave</Button>
                </div>
                {(patientData?.professional_profile?.bank || patientData?.professional_profile?.bank_account) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-400"><div className="h-px bg-slate-200 flex-1"></div><span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Landmark size={12}/> Transferência</span><div className="h-px bg-slate-200 flex-1"></div></div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Banco</span><span className="font-bold text-slate-800">{patientData.professional_profile.bank}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Agência</span><span className="font-bold text-slate-800">{patientData.professional_profile.agency}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Conta</span><span className="font-bold text-slate-800">{patientData.professional_profile.bank_account}</span></div>
                    </div>
                  </div>
                )}
                <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Valor a pagar (R$)</Label>
                    <Input value={amountToPay} onChange={e => handleCurrencyInput(e.target.value)} placeholder="0,00" className="text-lg font-black h-12 border-slate-300" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Anexar Comprovante</Label>
                    <div className="grid grid-cols-1 gap-3">
                      <Button type="button" variant="outline" className={`w-full border-dashed border-2 h-12 ${selectedFile ? 'bg-slate-100' : 'text-slate-500 hover:bg-slate-50'}`} style={selectedFile ? { borderColor: 'var(--primary-color)', color: 'var(--primary-color)' } : {}} onClick={() => document.getElementById('proof-upload')?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> {selectedFile ? selectedFile.name : "Selecionar Arquivo"}
                      </Button>
                      <Input id="proof-upload" type="file" accept="image/*,application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} disabled={uploadingProof} className="hidden" />
                      
                      <Button className="w-full text-white font-bold h-12 rounded-xl shadow-lg border-0 mt-2 hover:brightness-90 transition-all" style={{ backgroundColor: 'var(--primary-color)' }} onClick={() => handleUploadProof(selectedFile)} disabled={uploadingProof || !selectedFile}>
                        {uploadingProof ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> ENVIANDO...</> : "ENVIAR PAGAMENTO PARA CONFERÊNCIA"}
                      </Button>

                      <div className="relative flex items-center py-1"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-2 text-slate-300 text-[10px] uppercase font-bold">OU</span><div className="flex-grow border-t border-slate-200"></div></div>
                      <Button variant="outline" className="w-full border-green-200 bg-green-50 hover:bg-green-100 text-green-700 font-bold h-12 shadow-sm border-0" onClick={handleSendReceiptWhatsApp}><MessageCircle className="mr-2 h-5 w-5" /> Avisar no WhatsApp</Button>
                    </div>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PatientPortalPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 font-bold text-slate-400"><Loader2 className="animate-spin mr-2 h-6 w-6"/> Carregando Portal...</div>}>
      <PatientPortalContent />
    </Suspense>
  )
}