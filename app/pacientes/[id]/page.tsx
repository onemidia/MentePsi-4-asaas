'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"
import { 
  User, MapPin, Heart, Target, Info, 
  Save, Trash2, Loader2, ArrowLeft, Plus,
  DollarSign, CheckCircle, Clock, Calendar as CalendarIcon, XCircle,
  Activity, Frown, Meh, Smile, ThumbsDown, ThumbsUp, CreditCard,
  FileText, Smartphone, MessageSquarePlus, Printer, Upload, Download, CheckCircle2, PlayCircle, PauseCircle,
  Video, Link as LinkIcon, ChevronLeft, ChevronRight, Mic, Sparkles, Search
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
// Garante que o import está correto
import PatientCreditLog from '@/components/PatientCreditLog'
import { useSpeechToText } from '@/hooks/use-speech-to-text'
import { getLabels } from '@/lib/labels'

export default function FichaClinicaDigital() {
  const { id } = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false) 
  const [isMounted, setIsMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('pessoal')
  const [metaFilter, setMetaFilter] = useState('ATIVAS')
  
  const [sessaoFilter, setSessaoFilter] = useState('Agendado')
  const [currentPage, setCurrentPage] = useState(1)
  const sessionsPerPage = 10;
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [stats, setStats] = useState({ debt: 0, paid: 0, credit: 0, done: 0, scheduled: 0, cancelled: 0 })
  const [emotions, setEmotions] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [viewDoc, setViewDoc] = useState<any>(null)
  const [metas, setMetas] = useState<any[]>([])
  const [newGoalOpen, setNewGoalOpen] = useState(false)
  const [newGoal, setNewGoal] = useState({ title: '', description: '', deadline: '' })
  const [transactions, setTransactions] = useState<any[]>([])
  const [professional, setProfessional] = useState<any>(null)

  const labels = getLabels(professional?.appointment_label)

  const [evolutions, setEvolutions] = useState<any[]>([])
  const [newEvolution, setNewEvolution] = useState("")
  // NOVO: Paginação e Filtro das Evoluções
  const [evolutionPage, setEvolutionPage] = useState(0)
  const [hasMoreEvolutions, setHasMoreEvolutions] = useState(true)
  const [evoStartDate, setEvoStartDate] = useState('')
  const [evoEndDate, setEvoEndDate] = useState('')
  const [evoSearch, setEvoSearch] = useState('')
  const [totalEvolutions, setTotalEvolutions] = useState(0)
  const [loadingMoreEvolutions, setLoadingMoreEvolutions] = useState(false)

  const contentBeforeRecordingRef = useRef("")
  const [isGeneratingEvolution, setIsGeneratingEvolution] = useState(false)
  const { transcript, isListening, startListening, stopListening } = useSpeechToText()

  const [lgpdModalOpen, setLgpdModalOpen] = useState(false);
  const [lgpdContent, setLgpdContent] = useState("");

  // ESTADOS DA RESPOSTA DE EMOÇÕES
  const [replyingEmotionId, setReplyingEmotionId] = useState<string | null>(null)
  const [emotionReplyText, setEmotionReplyText] = useState("")

  const handleOpenLgpdEditor = async () => {
    try {
      const { data: prof } = await supabase.from('professional_profile')
        .select('full_name, crp, city')
        .eq('user_id', paciente.psychologist_id)
        .maybeSingle();
      
    const defaultContent = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA E TERMO DE CONSENTIMENTO (LGPD)

IDENTIFICAÇÃO DAS PARTES:
CONTRATANTE (PACIENTE): ${paciente.full_name}, CPF: ${paciente.cpf || 'Não informado'}.
CONTRATADO (PSICÓLOGO): ${prof?.full_name || 'Profissional'}, CRP: ${prof?.crp || '...'}, estabelecido em ${prof?.city || 'Cidade'}.

DO OBJETO:
O presente contrato tem por objeto a prestação de serviços de psicologia clínica, realizados em sessões de aproximadamente 50 minutos.

DOS HONORÁRIOS E PAGAMENTO:
O valor acordado por sessão é de R$ ${paciente.session_value ? Number(paciente.session_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'A combinar'}. O pagamento deverá ser efetuado conforme combinado entre as partes (por sessão ou pacote mensal).

DO CANCELAMENTO E FALTAS:
O cancelamento ou reagendamento de sessões deve ser comunicado com antecedência mínima de 24 horas. O não comparecimento sem aviso prévio ou cancelamento fora do prazo implicará na cobrança integral da sessão, visto que o horário estava reservado exclusivamente para o paciente.

DO SIGILO E PROTEÇÃO DE DADOS (LGPD):
Em conformidade com o Código de Ética Profissional do Psicólogo e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o profissional compromete-se a manter o sigilo absoluto de todas as informações tratadas em sessão.

AUTORIZAÇÃO DE TRATAMENTO DE DADOS:
Eu, ${paciente.full_name}, autorizo o tratamento dos meus dados pessoais sensíveis (saúde) para fins exclusivos de prestação de serviços psicológicos, evolução de prontuário e cumprimento de obrigações legais.

DO FORO:
As partes elegem o foro da comarca de ${prof?.city || 'desta cidade'} para dirimir quaisquer dúvidas oriundas deste contrato.

${prof?.city || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.`;
    
    setLgpdContent(defaultContent);
    setLgpdModalOpen(true);
    } catch (e) {
      console.warn("Aviso ao carregar termo LGPD", e)
    }
  };

  // 🎭 MÁSCARA INTELIGENTE (Brasil ou Internacional)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Se tiver um '+' em qualquer lugar da string, ativa o modo internacional
    if (value.includes('+')) {
      // Formato Internacional: remove letras, mas permite +, números, espaços, hifens e parênteses
      value = value.replace(/[^\d+ \-()]/g, '');
      setPaciente((prev: any) => ({ ...prev, phone: value.slice(0, 25) }));
    } else {
      // Formato Brasil: aplica a máscara (XX) XXXXX-XXXX
      value = value.replace(/\D/g, ''); // Tira tudo que não é número
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); // Coloca parênteses
      value = value.replace(/(\d)(\d{4})$/, '$1-$2'); // Coloca hífen
      setPaciente((prev: any) => ({ ...prev, phone: value.slice(0, 15) }));
    }
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d)/, '$1.$2')
    value = value.replace(/(\d{3})(\d{1,2})/, '$1-$2')
    setPaciente((prev: any) => ({ ...prev, cpf: value.slice(0, 14) }))
  }

  const handleSaveLGPD = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from('patient_documents').insert({
        patient_id: id, 
        psychologist_id: paciente.psychologist_id, 
        title: 'Termo de Consentimento e Contrato', 
        content: lgpdContent, 
        status: 'Pendente'
      }).select().single();
      
      if (!error) { 
        setDocuments(prev => [data, ...prev]); 
        toast({ title: "Contrato Gerado e Enviado!" });
        setLgpdModalOpen(false);
      } else throw error;
    } catch (e) { 
      toast({ variant: "destructive", title: "Erro ao gerar termo" });
    } finally { 
      setSaving(false); 
    }
  };

  const [sessionAgenda, setSessionAgenda] = useState("")
  const [materials, setMaterials] = useState<any[]>([])
  const [materialTitle, setMaterialTitle] = useState("")
  const [materialUrl, setMaterialUrl] = useState("")
  const [portalSettings, setPortalSettings] = useState({
    active: false,
    financials: false,
    materials: false
  })

  const [paciente, setPaciente] = useState<any>({
    full_name: '', cpf: '', rg: '', birth_date: '', gender: '', marital_status: '', profession: '', education: '', nationality: '', religion: '', session_value: '', status: 'Ativo',
    phone: '', email: '', cep: '', city: '', address: '', address_number: '', neighborhood: '', complement: '', state: '', emergency_name: '', emergency_phone: '', emergency_kinship: '',
    country: 'Brasil', has_insurance: false, medical_history: '', psychiatric_history: '', medications: '', allergies: '', family_history: '',
    therapy_goals: '', lead_source: '', lead_details: '', observations: '', previous_therapy: 'Não', previous_therapy_notes: '',
    referred_by: '', general_observations: '', meeting_link: ''
  })

  // EFEITOS E FUNÇÕES DE VOZ / IA
  useEffect(() => {
    if (isListening || transcript) {
      const separator = contentBeforeRecordingRef.current && !contentBeforeRecordingRef.current.endsWith(' ') && !contentBeforeRecordingRef.current.endsWith('\n') ? ' ' : ''
      setNewEvolution(contentBeforeRecordingRef.current + separator + transcript)
    }
  }, [transcript, isListening])

  const handleToggleRecording = () => {
    if (isListening) {
      stopListening()
    } else {
      contentBeforeRecordingRef.current = newEvolution
      startListening()
    }
  }

  const handleRefineEvolution = async (modo: 'simples' | 'inteligente' | 'soap') => {
      if (!newEvolution || newEvolution.length < 10) {
        toast({ variant: "destructive", title: "Texto muito curto", description: "O relato precisa ter algum conteúdo para ser refinado." })
        return
      }

      setIsGeneratingEvolution(true)
      try {
        let promptInteligente = "";

        // CÉREBRO 1: S.O.A.P (Organizado em 4 tópicos)
        if (modo === 'soap') {
          promptInteligente = `ATENÇÃO IA: O texto a seguir é um relato clínico livre. Analise as informações e reescreva o texto organizando-o RIGOROSAMENTE no formato S.O.A.P. Extraia do texto do profissional e separe nas categorias exatas:\nS (Subjetivo): [O que o paciente relatou]\nO (Objetivo): [O que o profissional observou]\nA (Avaliação): [A análise clínica]\nP (Plano): [Os próximos passos].\nSeja direto e clínico. NÃO use formatação markdown como negritos (**) ou hashtags (#):\n\n${newEvolution}`;
        } 
        // CÉREBRO 2: SIMPLES (1 parágrafo super rápido)
        else if (modo === 'simples') {
          promptInteligente = `ATENÇÃO IA: O texto a seguir é um relato clínico livre. Transforme-o em um resumo clínico extremamente breve, objetivo e em PARÁGRAFO ÚNICO. Remova floreios. NÃO use formatação markdown (sem negritos, sem hashtags, sem tópicos). Foque APENAS no estritamente essencial para arquivamento:\n\n${newEvolution}`;
        } 
        // CÉREBRO 3: INTELIGENTE (Texto profissional, 2 a 3 parágrafos fluidos)
        else {
          promptInteligente = `ATENÇÃO IA: O texto a seguir é um relato clínico livre. Organize e reescreva-o com vocabulário técnico e profissional da área da saúde. Crie um texto coeso, lógico e claro, estruturado em texto corrido (pode ter 2 ou 3 parágrafos curtos). Ele deve ser mais bem escrito e detalhado que um resumo simples, mas muito profissional. NÃO use formatação markdown (sem negritos, sem tópicos, sem hashtags):\n\n${newEvolution}`;
        }

        const res = await fetch('/api/generate-evolution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: promptInteligente,
            patientName: paciente.full_name
          })
        })

        if (!res.ok) {
          throw new Error(`Erro na API (${res.status})`);
        }

        const data = await res.json()
        
        if (data.text) {
          setNewEvolution(data.text)
          toast({ title: "✨ Relato Profissionalizado!", description: "A IA organizou sua evolução." })
        } else {
          throw new Error(data.error || "A IA não retornou conteúdo.")
        }
      } catch (error: any) {
        console.error("Erro na IA Mistral:", error)
        toast({ variant: "destructive", title: "Erro no Refinamento", description: error.message || "Erro ao conectar com a IA." })
      } finally {
        setIsGeneratingEvolution(false)
      }
    }

  // NOVO: Função isolada para buscar evoluções (Paginação Otimizada com Busca DB e Datas)
  const fetchEvolutions = useCallback(async (pageIndex: number, start: string, end: string, searchStr: string) => {
    setLoadingMoreEvolutions(true)
    try {
      let query = supabase
        .from('clinical_evolutions')
        .select('*', { count: 'exact' })
        .eq('patient_id', id as string)
        .order('created_at', { ascending: false })

      if (start) query = query.gte('created_at', `${start}T00:00:00.000Z`)
      if (end) query = query.lte('created_at', `${end}T23:59:59.999Z`)

      if (searchStr) {
        query = query.ilike('content', `%${searchStr}%`)
      }

      const from = pageIndex * 10
      const to = from + 9 // Limit de 10

      const { data, count, error } = await query.range(from, to)
      if (error) throw error

      if (data) {
        setTotalEvolutions(count || 0)
        setHasMoreEvolutions(data.length === 10)
        setEvolutions(data)
      }
    } catch (error: any) {
      console.error("Erro ao buscar evoluções:", error)
      toast({ variant: "destructive", title: "Erro de Conexão", description: "Não foi possível carregar as evoluções." })
    } finally {
      setLoadingMoreEvolutions(false)
    }
  }, [id, supabase, toast])

  //  LOGICA DE CARGA CENTRALIZADA PARA ATUALIZAÇÃO INSTANTÂNEA
  const loadAllData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.id) {
        router.push('/login')
        return
      }

    // 🔒 TRAVA DE SEGURANÇA: Filtra explicitamente pelo ID do psicólogo logado
    const patientQuery = supabase.from('patients').select('*').eq('id', id).eq('psychologist_id', user.id).single()

    const [patientRes, aptRes, journalRes, docsRes, settingsRes, matsRes, transRes, goalsRes, reportsRes] = await Promise.all([
      patientQuery,
      supabase.from('appointments').select('*').eq('patient_id', id).order('start_time', { ascending: false }),
      supabase.from('emotion_journal').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('patient_documents').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('portal_settings').select('*').eq('patient_id', id).maybeSingle(),
      supabase.from('therapeutic_materials').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('financial_transactions').select('*').eq('patient_id', id),
      supabase.from('patient_goals').select('*').eq('patient_id', id).order('created_at', { ascending: false }),
      supabase.from('official_reports').select('*').eq('patient_id', id).order('created_at', { ascending: false })
    ])

    if (patientRes.error || !patientRes.data) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Paciente não encontrado ou você não tem permissão." })
      router.push('/pacientes')
      return
    }

    if (patientRes.data) {
      // 💉 MERGE SEGURO: Garante que campos novos não fiquem undefined se o banco retornar null
      setPaciente(prev => ({ 
        ...prev, 
        ...patientRes.data,
        address: patientRes.data.address_street || patientRes.data.address // Sincroniza logradouro
      }))
      // ESTE É O SEGREDO: Pega o valor real do banco de dados (os 600,00 ou 30,00)
      setStats(prev => ({ ...prev, credit: Number(patientRes.data.credit_balance) || 0 }))
      setSessionAgenda(patientRes.data.next_session_agenda || "Nenhuma pauta enviada para a próxima sessão.")

      const { data: prof } = await supabase.from('professional_profile')
        .select('full_name, clinic_name, logo_url, city, crp, appointment_label, specialty')
        .eq('user_id', patientRes.data.psychologist_id)
        .maybeSingle()
      setProfessional(prof)
    }

    if (settingsRes.data) setPortalSettings(settingsRes.data)
    if (matsRes.data) setMaterials(matsRes.data)
    if (goalsRes.data) setMetas(goalsRes.data)
    if (transRes.data) setTransactions(transRes.data)

    if (aptRes.data) {
      const apts = aptRes.data
      setAppointments(apts)

      // 🕒 CONSTANTE DE TOLERÂNCIA (90 min)
      const tempoToleranciaMs = 90 * 60 * 1000
      const now = Date.now()

      // 🔍 LÓGICA DE STATUS EFETIVO
      const isFinalized = (a: any) => {
        if (a.status === 'Realizada') return true
        if (a.status === 'Agendado') {
           const startTime = new Date(a.start_time).getTime()
           return (startTime + tempoToleranciaMs) < now
        }
        return false
      }

      setStats(prev => ({ 
        ...prev, 
        // 💉 CORREÇÃO: Matemática de Centavos para Dívida
        debt: apts.filter((a: any) => {
          const finalized = isFinalized(a)
          return finalized && a.payment_status !== 'Pago' && a.payment_status !== 'paid'
        }).reduce((acc: number, curr: any) => {
          const price = Math.round(Number(curr.price) * 100)
          const paid = Math.round(Number(curr.amount_paid || 0) * 100)
          return acc + (price - paid)
        }, 0) / 100,
        
        // 💉 CORREÇÃO: Matemática de Centavos para Total Pago
        paid: (transRes.data || [])
          .filter((t: any) => t.type === 'income' && t.status === 'CONCLUIDO')
          .reduce((acc: number, curr: any) => acc + Math.round(Number(curr.amount) * 100), 0) / 100,
        
        done: apts.filter((a: any) => isFinalized(a)).length,
        scheduled: apts.filter((a: any) => a.status === 'Agendado' && !isFinalized(a)).length,
        cancelled: apts.filter((a: any) => a.status === 'Cancelado' || a.status === 'Desmarcada').length
      }))
    }
    if (journalRes.data) setEmotions(journalRes.data)
    if (docsRes.data) {
      // 📂 SEPARAÇÃO DE LISTAS: Exibe apenas documentos anexados/assinados (patient_documents)
      setDocuments(docsRes.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    }
    } catch (e) {
      console.warn("Aviso na carga de dados do paciente:", e)
    } finally {
      setLoading(false)
    }
  }, [id, supabase, router, toast])

  useEffect(() => { loadAllData() }, [loadAllData])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // NOVO: Gatilho inicial para carregar as evoluções paginadas
  useEffect(() => {
    if (id && isMounted) {
      // Adicionamos um pequeno delay (debounce implícito) para não travar o banco enquanto digita
      const timer = setTimeout(() => {
        setEvolutionPage(0)
        setHasMoreEvolutions(true)
        fetchEvolutions(0, evoStartDate, evoEndDate, evoSearch)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [id, evoStartDate, evoEndDate, evoSearch, fetchEvolutions, isMounted])

  useEffect(() => {
    setCurrentPage(1)
  }, [startDate, endDate, sessaoFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab])

  // 🔔 EFEITO: Navegação Inteligente via URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams])

  useEffect(() => {
    if (viewDoc?.title) document.title = `${viewDoc.title} - ${viewDoc.clinic_name || viewDoc.professional_name || 'Documento Oficial'}`
    return () => { document.title = "MentePsi" }
  }, [viewDoc])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('patient-materials').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('patient-materials').getPublicUrl(fileName)
      const { data, error: dbError } = await supabase.from('therapeutic_materials').insert({
        patient_id: id, psychologist_id: paciente.psychologist_id, title: file.name, file_url: publicUrl
      }).select().single()
      if (!dbError && data) {
        setMaterials(prev => [data, ...prev])
        toast({ title: "Arquivo enviado!" })
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: err.message })
    } finally { setUploading(false) }
  }

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}/docs/${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName)
      
      const { data, error: dbError } = await supabase.from('patient_documents').insert({
        patient_id: id, 
        psychologist_id: paciente.psychologist_id, 
        title: file.name, 
        file_url: publicUrl,
        status: 'Enviado'
      }).select().single()
      
      if (!dbError && data) {
        setDocuments(prev => [data, ...prev])
        toast({ title: "Documento anexado!" })
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: err.message })
    } finally { setUploading(false) }
  }

  const handleDeleteMaterial = async (material: any) => {
    try {
      if (material.file_url.includes('patient-materials')) {
        const filePath = material.file_url.split('patient-materials/')[1]
        await supabase.storage.from('patient-materials').remove([filePath])
      }
      const { error } = await supabase.from('therapeutic_materials').delete().eq('id', material.id)
      if (!error) {
        setMaterials(prev => prev.filter(m => m.id !== material.id))
        toast({ title: "Material removido" })
      }
    } catch (e) { toast({ variant: "destructive", title: "Erro ao excluir" }) }
  }

  const handleDeleteDocument = async (doc: any) => {
    if (!window.confirm("Tem certeza que deseja excluir este arquivo?")) return;
    try {
      if (doc.file_url && doc.file_url.includes('patient-documents')) {
        const filePath = doc.file_url.split('patient-documents/')[1];
        await supabase.storage.from('patient-documents').remove([filePath]);
      }
      
      const { error: docError } = await supabase.from('patient_documents').delete().eq('id', doc.id);
      if (docError) throw docError;

      if (doc.file_url) {
        const { error: transError } = await supabase
          .from('financial_transactions')
          .delete()
          .eq('receipt_url', doc.file_url)
          .eq('psychologist_id', paciente.psychologist_id);
        
        if (transError) throw transError;
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      setTransactions(prev => prev.filter(t => t.receipt_url !== doc.file_url));
      toast({ title: "Arquivo excluído com sucesso!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir arquivo", description: `Erro ao deletar no banco: ${error.message || 'Erro desconhecido'}` });
    }
  };

  const handleDeleteArchivedAgenda = async (evoId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta pauta do histórico?")) return;
    try {
      const { error } = await supabase.from('clinical_evolutions').delete().eq('id', evoId);
      if (!error) {
        setEvolutions(prev => prev.filter(e => e.id !== evoId));
        toast({ title: "Histórico excluído com sucesso!" });
      } else throw error;
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao excluir histórico" });
    }
  };

  const handleAddMaterial = async () => {
    if (!materialTitle || !materialUrl) return
    try {
      const { data, error } = await supabase.from('therapeutic_materials').insert({
        patient_id: id, psychologist_id: paciente.psychologist_id, title: materialTitle, file_url: materialUrl
      }).select().single()
      if (error) throw error;
      if (data) {
        setMaterials(prev => [data, ...prev])
        setMaterialTitle(""); setMaterialUrl("");
        toast({ title: "Link compartilhado!" })
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao adicionar link", description: e.message })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Preparação do Payload Explícito (Mapeamento 1:1 com o Banco)
      const payload = {
        full_name: paciente.full_name,
        cpf: paciente.cpf,
        rg: paciente.rg,
        birth_date: paciente.birth_date,
        gender: paciente.gender,
        marital_status: paciente.marital_status,
        profession: paciente.profession,
        education: paciente.education,
        nationality: paciente.nationality,
        religion: paciente.religion,
        
        // Financeiro e Status
        session_value: paciente.session_value ? parseFloat(String(paciente.session_value)) : null,
        status: paciente.status,
        
        // Contato
        phone: paciente.phone,
        email: paciente.email,
        
        // Endereço
        cep: String(paciente.cep || ''), // Garante envio como texto
        city: paciente.city,
        state: paciente.state,
        country: paciente.country,
        address: paciente.address, // Ajustado para coincidir com a coluna 'address'
        address_number: paciente.address_number,
        neighborhood: paciente.neighborhood,
        complement: paciente.complement,
        
        // Saúde e Histórico
        has_insurance: paciente.has_insurance,
        medical_history: paciente.medical_history,
        psychiatric_history: paciente.psychiatric_history,
        family_history: paciente.family_history,
        medications: paciente.medications,
        allergies: paciente.allergies,
        previous_therapy: paciente.previous_therapy,
        previous_therapy_notes: paciente.previous_therapy_notes,
        
        // Info Adicional
        lead_source: paciente.lead_source,
        referred_by: paciente.referred_by,
        general_observations: paciente.general_observations,
        therapy_goals: paciente.therapy_goals,
        meeting_link: paciente.meeting_link
      }

      // 2. Execução do Update
      const { data, error } = await supabase
        .from('patients')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        alert(JSON.stringify(error)) // 🚨 Alerta visual solicitado para depuração
        throw error
      }

      // 3. Atualização do Estado Local
      if (data) {
        setPaciente(prev => ({ ...prev, ...data }))
        toast({ title: "Sucesso!", description: "Dados salvos permanentemente." })
        router.refresh() // 🔄 Força a atualização do cache do Next.js
        await loadAllData()
      }

    } catch (error: any) {
      console.warn('Aviso ao salvar paciente no Supabase:', error)
      toast({ 
        variant: "destructive", 
        title: "Erro ao salvar", 
        description: `Banco de Dados: ${error.message || error.details || "Erro desconhecido"}`
      })
    } finally {
      setSaving(false)
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);
  
      if (updateError) {
        toast({ variant: "destructive", title: "Erro ao atualizar status", description: updateError.message });
      } else {
        toast({ title: "Status Atualizado com Sucesso!" });
        await loadAllData();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Falha na comunicação", description: e.message });
    } finally {
      setSaving(false);
    }
  }

  const handleSaveEvolution = async () => {
    if (!newEvolution.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('clinical_evolutions').insert({
        patient_id: id,
        psychologist_id: paciente.psychologist_id,
        content: newEvolution
      })
      if (error) throw error;
      
      if (!error) {
        toast({ title: "Evolução salva!" })
        setNewEvolution("")
        setEvolutionPage(0)
        setHasMoreEvolutions(true)
        setEvoSearch("") // Limpa a busca para exibir a evolução recém-criada
        await fetchEvolutions(0, evoStartDate, evoEndDate, "")
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de conexão", description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMeta = async () => {
    if (!newGoal.title) return
    setSaving(true)

    try {
      // 🔐 Garante que o ID do psicólogo vem da sessão autenticada (Segurança RLS)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Sessão expirada. Faça login novamente.")

      const { data, error } = await supabase.from('patient_goals').insert({
        patient_id: id,
        psychologist_id: user.id,
        title: newGoal.title,
        description: newGoal.description,
        deadline: newGoal.deadline || null,
        status: 'Ativa'
      }).select().single()

      if (error) throw error

      if (data) {
        toast({ title: "Meta criada com sucesso!" })
        setMetas(prev => [data, ...prev])
        setNewGoal({ title: '', description: '', deadline: '' })
        setNewGoalOpen(false)
      }
    } catch (error: any) {
      console.warn("Aviso ao salvar meta:", error)
      toast({ 
        variant: "destructive", 
        title: "Erro ao salvar", 
        description: error.message || "Verifique se a tabela 'patient_goals' existe no Supabase." 
      })
    }
    setSaving(false)
  }

  const handleUpdateMetaStatus = async (goalId: string, newStatus: string) => {
    try {
      setMetas(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g))
      const { error } = await supabase.from('patient_goals').update({ status: newStatus }).eq('id', goalId)
      if (error) throw error;
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao atualizar status", description: e.message })
    }
  }

  const handleDeletePatient = async () => {
    const confirmMessage = "⚠️ AVISO LEGAL E DEONTOLÓGICO (CFP e LGPD):\n\nSegundo as resoluções do Conselho Federal de Psicologia (CFP), é obrigatória a guarda do prontuário por, no mínimo, 5 anos.\n\nA exclusão permanente apagará IRREVERSIVELMENTE todas as evoluções clínicas, agendamentos, documentos e histórico financeiro deste paciente.\n\nVocê assume total responsabilidade legal por esta ação. Deseja EXCLUIR PERMANENTEMENTE este registro?";
    
    const confirmDelete = window.confirm(confirmMessage);
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);

      if (error) throw error;

      toast({ title: "Registro Excluído", description: "O paciente e seus dados foram apagados permanentemente." });
      router.push('/pacientes');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } finally {
      setSaving(false);
    }
  }

  const handleGenerateLGPD = async () => {
    setLoading(true)
    try {
      const { data: prof } = await supabase.from('professional_profile').select('*').eq('id', paciente.psychologist_id).single();
      
      const content = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA E TERMO DE CONSENTIMENTO (LGPD)

IDENTIFICAÇÃO DAS PARTES:
CONTRATANTE (PACIENTE): ${paciente.full_name}, CPF: ${paciente.cpf || 'Não informado'}.
CONTRATADO (PSICÓLOGO): ${prof?.full_name || 'Profissional'}, CRP: ${prof?.crp || '...'}, estabelecido em ${prof?.city || 'Cidade'}.

DO OBJETO:
O presente contrato tem por objeto a prestação de serviços de psicologia clínica, realizados em sessões de aproximadamente 50 minutos.

DOS HONORÁRIOS E PAGAMENTO:
O valor acordado por sessão é de R$ ${paciente.session_value ? Number(paciente.session_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : 'A combinar'}. O pagamento deverá ser efetuado conforme combinado entre as partes (por sessão ou pacote mensal).

DO CANCELAMENTO E FALTAS:
O cancelamento ou reagendamento de sessões deve ser comunicado com antecedência mínima de 24 horas. O não comparecimento sem aviso prévio ou cancelamento fora do prazo implicará na cobrança integral da sessão, visto que o horário estava reservado exclusivamente para o paciente.

DO SIGILO E PROTEÇÃO DE DADOS (LGPD):
Em conformidade com o Código de Ética Profissional do Psicólogo e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o profissional compromete-se a manter o sigilo absoluto de todas as informações tratadas em sessão.

AUTORIZAÇÃO DE TRATAMENTO DE DADOS:
Eu, ${paciente.full_name}, autorizo o tratamento dos meus dados pessoais sensíveis (saúde) para fins exclusivos de prestação de serviços psicológicos, evolução de prontuário e cumprimento de obrigações legais.

DO FORO:
As partes elegem o foro da comarca de ${prof?.city || 'desta cidade'} para dirimir quaisquer dúvidas oriundas deste contrato.

${prof?.city || 'Local'}, ${new Date().toLocaleDateString('pt-BR')}.
`;

      const { data, error } = await supabase.from('patient_documents').insert({
        patient_id: id, psychologist_id: paciente.psychologist_id, title: 'Termo de Consentimento e Contrato', content, status: 'Pendente'
      }).select().single()
      if (!error) { setDocuments(prev => [data, ...prev]); toast({ title: "Contrato Gerado!" }) }
    } catch (e) { toast({ variant: "destructive", title: "Erro ao gerar termo" }) } finally { setLoading(false) }
  }

  const handleOpenPaymentModal = (item: any) => {
    setSelectedTransaction(item)
    const amt = item.amount ? Number(item.amount) : 0
    setPaymentAmount(amt > 0 ? amt.toFixed(2).replace('.', ',') : '')
    setPaymentModalOpen(true)
  }

  const handleProcessPayment = async () => {
    if (!selectedTransaction) return
    setSaving(true)
    try {
      const finalAmount = parseFloat(paymentAmount.replace(/\./g, '').replace(',', '.'))
      const docUrl = selectedTransaction.receipt_url || selectedTransaction.file_url

      let txFound = null
      if (docUrl) {
        const { data } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('receipt_url', docUrl)
          .maybeSingle()
        txFound = data
      } else if (selectedTransaction.id && selectedTransaction.amount) {
        txFound = selectedTransaction
      }

      // A. OBRIGATÓRIO: Registrar a transação como 'CONCLUIDO'
      if (txFound && txFound.id) {
        const { error: txError } = await supabase
          .from('financial_transactions')
          .update({ status: 'CONCLUIDO', amount: finalAmount })
          .eq('id', txFound.id)

        if (txError) throw txError
      } else {
        // Se a transação não existir na memória, força a inserção para garantir que o Dashboard/Cards recebam o valor exato
        await supabase.from('financial_transactions').insert({
          psychologist_id: paciente.psychologist_id,
          patient_id: id,
          amount: finalAmount,
          type: 'income',
          category: 'Sessão',
          status: 'CONCLUIDO',
          description: 'Baixa via Ficha do Paciente',
          receipt_url: docUrl
        })
      }

      // B. OBRIGATÓRIO: Atualizar o documento para 'Confirmado' (Isso ativa o AppShell instantaneamente)
      if (selectedTransaction?.id && !selectedTransaction?.receipt_url) {
         await supabase.from('patient_documents').update({ status: 'Confirmado' }).eq('id', selectedTransaction.id);
      }
      if (docUrl) {
         await supabase.from('patient_documents')
           .update({ status: 'Confirmado' })
           .eq('file_url', docUrl)
      }

      // Fallback de Segurança Global: Garante que todos os comprovantes pendentes deste paciente sumam
      await supabase.from('patient_documents')
        .update({ status: 'Confirmado' })
        .eq('patient_id', id)
        .ilike('title', '%Comprovante%')
        .eq('status', 'Pendente')

      // 3. Amortização Automática (Lógica Financeira Padrão)
      let remainingAmount = finalAmount
      
      const { data: pendingApts } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', id)
        // Busca tudo que não está totalmente pago (compatibilidade com legado 'Pago' e novo 'paid')
        .not('payment_status', 'in', '("Pago","paid")')
        .order('start_time', { ascending: true })

      if (pendingApts) {
        for (const apt of pendingApts) {
          try {
            if (remainingAmount <= 0.01) break
  
            const price = Number(apt.price)
            const paid = Number(apt.amount_paid || 0)
            const debt = price - paid
  
            if (debt > 0) {
              const payNow = Math.min(remainingAmount, debt)
              const newPaid = paid + payNow
              const isFullyPaid = Math.round(newPaid * 100) >= Math.round(price * 100)
  
              const { error: aptUpdateError } = await supabase.from('appointments').update({ 
                  amount_paid: newPaid, 
                  payment_status: isFullyPaid ? 'Pago' : 'Pendente' 
                }).eq('id', apt.id)
              
              if (aptUpdateError) throw aptUpdateError
  
              remainingAmount -= payNow
            }
          } catch (err) {
            console.warn("Erro ao amortizar agendamento:", apt.id, err)
            // Ignora o erro desta sessão específica e avança para tentar na próxima
          }
        }
      }

      // 4. Sobra vai para crédito
      if (remainingAmount > 0) {
         const { data: pat, error: fetchErr } = await supabase.from('patients').select('credit_balance').eq('id', id).single()
         if (pat && !fetchErr) {
           const currentCredit = Number(pat.credit_balance || 0)
           const newCredit = Math.round((currentCredit + remainingAmount) * 100) / 100
           const { error: creditError } = await supabase.from('patients').update({ credit_balance: newCredit }).eq('id', id)
           if (!creditError) {
             await loadAllData()
           } else {
             console.error("[CRÍTICO] Falha ao atualizar saldo no portal:", creditError)
           }
         }
      }

      // 5. Geração Automática do Recibo em PDF
      if (paciente && professional) {
          let receiptNumber = 1
          let { data: counter } = await supabase.from('receipt_counters').select('current_count').eq('psychologist_id', paciente.psychologist_id).single()
          if (!counter) {
            const { data: newCounter } = await supabase.from('receipt_counters').insert({ psychologist_id: paciente.psychologist_id, current_count: 0 }).select().single()
            counter = newCounter
          }
          receiptNumber = (counter?.current_count || 0) + 1
          await supabase.from('receipt_counters').update({ current_count: receiptNumber }).eq('psychologist_id', paciente.psychologist_id)

          // ⚡ PERFORMANCE: Importação dinâmica do jsPDF
          const { jsPDF } = (await import('jspdf')).default ? await import('jspdf') : { jsPDF: (await import('jspdf')).jsPDF };
          
          const doc = new jsPDF()
          doc.setFontSize(16); doc.setTextColor(13, 148, 136);
          doc.text(`RECIBO DE PAGAMENTO Nº ${String(receiptNumber).padStart(3, '0')}`, 105, 20, { align: "center" })
          doc.setTextColor(0, 0, 0); doc.setFontSize(10);
          doc.text(professional.full_name || "Profissional", 105, 30, { align: "center" }); 
          doc.text(`CRP: ${professional.crp || "..."}`, 105, 35, { align: "center" })
          doc.setFontSize(12);
          const servicoDesc = `${labels.singular} de ${professional.specialty || 'Atendimento Clínico'}`;
          doc.text(`Recebi de ${paciente.full_name}, CPF ${paciente.cpf || '...'}`, 14, 50)
          doc.text(`a importância de ${finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 57)
          doc.text(`referente a ${servicoDesc.toLowerCase()}.`, 14, 64)
          const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
          doc.text(`${professional.city || "Local"}, ${dateStr}`, 105, 120, { align: "center" })
          
          const pdfBlob = doc.output('blob')
          const fileName = `${id}/recibo_${receiptNumber}_${Date.now()}.pdf`
          const { error: uploadError } = await supabase.storage.from('patient-documents').upload(fileName, pdfBlob)
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(fileName)
            await supabase.from('patient_documents').insert({
              patient_id: id, psychologist_id: paciente.psychologist_id, title: `Recibo Nº ${String(receiptNumber).padStart(3, '0')}`, file_url: publicUrl, status: 'Gerado'
            })
          }
      }

      toast({ title: 'Baixa efetuada e totais atualizados' })
      router.refresh() // 🔄 Força atualização dos Server Components
      await loadAllData()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message })
    } finally {
      setSaving(false)
      setPaymentModalOpen(false)
    }
  }

  const handleArchiveAgenda = async () => {
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('clinical_evolutions').insert({
          patient_id: id,
          psychologist_id: paciente.psychologist_id,
          content: `[PAUTA ENVIADA PELO PACIENTE VIA PORTAL]\n${sessionAgenda}`
      });
      if (insertError) throw insertError;
      
      const { error: updateError } = await supabase.from('patients').update({ next_session_agenda: "" }).eq('id', id);
      if (updateError) throw updateError;
      
      setSessionAgenda("Pauta lida e arquivada nas Evoluções.");
      toast({ title: "Pauta arquivada no histórico!" });
      loadAllData();
      setEvolutionPage(0);
      setHasMoreEvolutions(true);
      setEvoSearch("");
      fetchEvolutions(0, evoStartDate, evoEndDate, "");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao arquivar pauta", description: e.message })
    } finally {
      setSaving(false);
    }
  };

  // 💬 FUNÇÃO PARA ENVIAR ACOLHIMENTO (RESPOSTA) AO PACIENTE
  const handleReplyEmotion = async (emotionId: string) => {
    if (!emotionReplyText.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('emotion_journal')
        .update({
          psychologist_reply: emotionReplyText,
          reply_read: false
        })
        .eq('id', emotionId)

      if (error) throw error

      toast({ title: "Acolhimento enviado!", description: "O paciente receberá a notificação no portal." })
      setReplyingEmotionId(null)
      setEmotionReplyText("")
      await loadAllData()
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao responder", description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const getMoodIcon = (score: number) => {
    const icons: any = { 1: Frown, 2: ThumbsDown, 3: Meh, 4: ThumbsUp, 5: Smile }
    return icons[score] || Meh
  }

  const filteredAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(apt.start_time);
      const dateMatch = (!startDate || aptDate >= new Date(startDate)) && 
                        (!endDate || aptDate <= new Date(endDate + 'T23:59:59'));
      
      // 🕒 Lógica de 90 min (Status Efetivo)
      const now = new Date();
      const tempoToleranciaMs = 90 * 60 * 1000;
      const isPastTolerance = now.getTime() > (aptDate.getTime() + tempoToleranciaMs);
      
      const effectiveStatus = (apt.status === 'Agendado' && isPastTolerance) ? 'Realizada' : apt.status;
      const statusMatch = sessaoFilter === 'Todas' ? true : effectiveStatus === sessaoFilter;
      
      return dateMatch && statusMatch;
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const indexOfLastSession = currentPage * sessionsPerPage;
  const indexOfFirstSession = indexOfLastSession - sessionsPerPage;
  const currentSessions = filteredAppointments.slice(indexOfFirstSession, indexOfLastSession);

  const PaginationControls = ({ totalCount }: { totalCount: number }) => {
    const totalPages = Math.ceil(totalCount / sessionsPerPage) || 1
    if (totalCount <= sessionsPerPage) return null
    
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 gap-4">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-full sm:w-auto">
          <ChevronLeft className="h-4 w-4 mr-2"/> Anterior
        </Button>
        <span className="text-xs text-slate-500 font-medium">Página {currentPage} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-full sm:w-auto">
          Próximo <ChevronRight className="h-4 w-4 ml-2"/>
        </Button>
      </div>
    )
  }

  // 🛡️ BLINDAGEM DA ABA DOCS: Exibe apenas uploads e comprovantes, ignorando documentos gerados pelo sistema
  const receivedFiles = documents.filter(doc => 
    !doc.title.toLowerCase().includes('termo') && 
    !doc.title.toLowerCase().includes('contrato')
  )

  const filteredMetas = metas.filter(g => {
    if (metaFilter === 'ATIVAS') return g.status === 'Ativa'
    if (metaFilter === 'CONCLUÍDAS') return g.status === 'Concluída'
    if (metaFilter === 'SUSPENSAS') return g.status === 'Suspensa'
    return true
  })

  if (!isMounted) return null

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-teal-600" /></div>

  return (
    <div className="p-4 md:p-6 space-y-4 bg-slate-100 min-h-[100dvh]">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-[24px] shadow-md border border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-2xl h-10 w-10 p-0"><ArrowLeft size={20} className="text-slate-600"/></Button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Ficha Clínica Digital</h1>
            <p className="text-sm font-medium text-slate-500">Paciente: <span className="text-[var(--primary-color)] font-bold uppercase">{paciente.full_name}</span></p>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => router.back()} className="flex-1 md:flex-none rounded-2xl h-10 font-bold border-slate-300 text-slate-600">Cancelar</Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className="text-white font-bold flex-1 md:flex-none rounded-2xl h-10 shadow-sm border-0 transition-all"
            style={{ 
              backgroundColor: 'var(--primary-color)',
              opacity: saving ? 0.7 : 1
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(0.9)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <CardStat title="Saldo Devedor" value={stats.debt} icon={<DollarSign />} color="red" />
        <CardStat title="Total Pago" value={stats.paid} icon={<CheckCircle />} color="emerald" />
        {/* 💉 Card de Haver Corrigido */}
        <CardStat title={`${labels.plural} em Haver`} value={stats.credit} icon={<Clock />} color="blue" />
        <Card className="flex flex-col justify-center p-4 space-y-3 bg-white shadow-md border border-slate-200 rounded-[32px]">
           <div className="flex justify-between items-center"><span className="text-sm flex items-center gap-2 font-medium"><CheckCircle size={14} className="text-[var(--primary-color)]"/> Realizadas</span><Badge className="bg-[var(--secondary-color)] text-[var(--primary-color)] border-none">{stats.done}</Badge></div>
           <div className="flex justify-between items-center"><span className="text-sm flex items-center gap-2 font-medium"><CalendarIcon size={14} className="text-emerald-600"/> Agendadas</span><Badge variant="outline" className="border-blue-200 text-blue-600">{stats.scheduled}</Badge></div>
           <div className="flex justify-between items-center"><span className="text-sm flex items-center gap-2 font-medium"><XCircle size={14} className="text-red-600"/> Desmarcadas</span><Badge variant="outline" className="border-red-200 text-red-600">{stats.cancelled}</Badge></div>
        </Card>
      </div>

      {/* NAVEGAÇÃO MANUAL */}
      <div className="w-full flex flex-wrap gap-2 h-auto relative mb-8 p-2 bg-brand-secondary/60 rounded-2xl shadow-inner">
          {[
            { val: "pessoal", icon: <User className="w-3 h-3 mr-1"/>, label: "Pessoal" },
            { val: "sessoes", icon: <CalendarIcon className="w-3 h-3 mr-1"/>, label: labels.plural },
            { val: "financeiro", icon: <CreditCard className="w-3 h-3 mr-1"/>, label: "Financeiro" },
            { val: "evolucoes", icon: <FileText className="w-3 h-3 mr-1"/>, label: "Evoluções", color: "text-[var(--primary-color)] bg-[var(--secondary-color)] border-[var(--primary-color)]" },
            { val: "portal", icon: <Smartphone className="w-3 h-3 mr-1"/>, label: "Portal", color: "text-[var(--primary-color)] bg-[var(--secondary-color)] border-[var(--primary-color)]" },
            { val: "emocoes", icon: <Activity className="w-3 h-3 mr-1"/>, label: "Emoções" },
            { val: "documentos", icon: <FileText className="w-3 h-3 mr-1"/>, label: "Docs" },
            { val: "metas", icon: <Target className="w-3 h-3 mr-1"/>, label: "Metas" },
            { val: "contato", icon: <MapPin className="w-3 h-3 mr-1"/>, label: "Contato" },
            { val: "saude", icon: <Heart className="w-3 h-3 mr-1"/>, label: "Saúde" },
            { val: "adicional", icon: <Info className="w-3 h-3 mr-1"/>, label: "Info" },
          ].map((tab) => (
            <Button 
              key={tab.val}
              variant={activeTab === tab.val ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.val)}
              className={`h-10 text-xs px-4 rounded-xl font-bold shadow-sm transition-all ${activeTab === tab.val ? 'text-white hover:brightness-90 shadow-md border-0' : 'text-slate-600 bg-white/70 border-transparent hover:bg-white hover:brightness-90'}`}
              style={{ backgroundColor: activeTab === tab.val ? 'var(--primary-color)' : '' }}
            >
              {tab.icon} {tab.label}
            </Button>
          ))}
      </div>

      {/* PESSOAL */}
      {activeTab === 'pessoal' && (
        <div className="w-full block clear-both animate-in fade-in">
          <Card className="border border-slate-200 shadow-md rounded-[24px] bg-white"><CardContent className="p-4 md:p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 w-full block clear-both pt-4 mb-6" style={{ color: 'var(--primary-color)' }}><User size={16} style={{ color: 'var(--primary-color)' }}/> Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Nome Completo *</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.full_name || ''} onChange={e => setPaciente({...paciente, full_name: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">CPF</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.cpf || ''} onChange={handleCPFChange} placeholder="000.000.000-00" maxLength={14} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">RG</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.rg || ''} onChange={e => setPaciente({...paciente, rg: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Data de Nascimento</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" type="date" value={paciente.birth_date || ''} onChange={e => setPaciente({...paciente, birth_date: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Gênero</Label>
                  <select value={paciente.gender || ''} onChange={e => setPaciente({...paciente, gender: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                    <option value="" disabled>Selecione</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Estado Civil</Label>
                  <select value={paciente.marital_status || ''} onChange={e => setPaciente({...paciente, marital_status: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                    <option value="" disabled>Selecione</option>
                    <option value="solteiro">Solteiro</option>
                    <option value="casado">Casado</option>
                    <option value="divorciado">Divorciado</option>
                    <option value="uniao_estavel">União Estável</option>
                  </select>
                </div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Nacionalidade</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.nationality || ''} onChange={e => setPaciente({...paciente, nationality: e.target.value})} /></div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Religião / Crença</Label>
                  <Input 
                    className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" 
                    value={paciente.religion || ''} 
                    onChange={e => setPaciente({...paciente, religion: e.target.value})} 
                    placeholder="Ex: Católica, Evangélica, Espírita..."
                  />
                </div>
                
                {/* NOVOS CAMPOS: STATUS E FINANCEIRO */}
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Status do Paciente</Label>
                  <select value={paciente.status || 'Ativo'} onChange={e => setPaciente({...paciente, status: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer">
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Valor da Sessão (R$)</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl font-bold" value={paciente.session_value ? Number(paciente.session_value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''} onChange={e => { const cleanValue = e.target.value.replace(/\D/g, ""); const formattedValue = (Number(cleanValue) / 100).toFixed(2); setPaciente({...paciente, session_value: formattedValue}); }} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Profissão</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.profession || ''} onChange={e => setPaciente({...paciente, profession: e.target.value})} /></div>
              </div>

              {/* NOVA SEÇÃO: CONTATO E LOCALIZAÇÃO */}
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6" style={{ color: 'var(--primary-color)' }}><MapPin size={16} style={{ color: 'var(--primary-color)' }}/> Contato e Localização</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Telefone / WhatsApp</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.phone || ''} onChange={handlePhoneChange} placeholder="(00) 00000-0000 ou +1..." /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">CEP</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.cep || ''} onChange={e => setPaciente({...paciente, cep: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">País</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.country || 'Brasil'} onChange={e => setPaciente({...paciente, country: e.target.value})} /></div>
                  <div className="md:col-span-2 space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Logradouro (Rua)</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.address || ''} onChange={e => setPaciente({...paciente, address: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Número</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.address_number || ''} onChange={e => setPaciente({...paciente, address_number: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Bairro</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.neighborhood || ''} onChange={e => setPaciente({...paciente, neighborhood: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Cidade</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.city || ''} onChange={e => setPaciente({...paciente, city: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Estado</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.state || ''} onChange={e => setPaciente({...paciente, state: e.target.value})} /></div>
              </div>
            </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* SESSÕES */}
      {activeTab === 'sessoes' && (
        <div className="w-full block clear-both animate-in fade-in">
          <Card className="border border-slate-200 shadow-md overflow-hidden rounded-[24px] bg-white">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 border-b border-slate-200 p-6 gap-4">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>HISTÓRICO DE {labels.plural.toUpperCase()}</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 gap-2 shadow-sm">
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
                  <span className="text-slate-300">|</span>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent" />
                </div>
                <select value={sessaoFilter} onChange={e => setSessaoFilter(e.target.value)} className="flex h-9 w-40 items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                  <option value="Todas">Exibir Todas</option>
                  <option value="Agendado">Agendadas</option>
                  <option value="Realizada">Realizadas</option>
                  <option value="Cancelado">Canceladas</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-slate-200 p-0 overflow-x-auto w-full">
              {currentSessions.length > 0 ? currentSessions.map(apt => {
                const now = new Date(); const aptTime = new Date(apt.start_time);
                const isPastTolerance = now.getTime() > (aptTime.getTime() + 90 * 60 * 1000);
                const displayStatus = (apt.status === 'Agendado' && isPastTolerance) ? 'Realizada' : apt.status;
                const isPaid = Math.round(Number(apt.amount_paid || 0) * 100) >= Math.round(Number(apt.price || 0) * 100);
                const remaining = Math.max(0, Number(apt.price || 0) - Number(apt.amount_paid || 0));
                return (
                  <div key={apt.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[var(--secondary-color)] transition-all border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center bg-white px-3 py-1 rounded-xl border min-w-[65px] shadow-sm text-center">
                        <span className="text-[10px] font-black uppercase" style={{ color: 'var(--primary-color)' }}>{aptTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{apt.modality || 'Individual'}</p>
                        <div className="flex flex-wrap gap-2 items-center mt-1">
                          <Badge className={`text-[9px] uppercase font-bold rounded-full border-none shadow-none hover:bg-opacity-100 ${
                            displayStatus === 'Realizada' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 
                            displayStatus === 'Cancelado' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 
                            'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          }`}>
                            {displayStatus}
                          </Badge>
                          {/* Badge do Status Financeiro Adicionado Abaixo */}
                          <Badge className={`text-[9px] uppercase font-bold rounded-full border-none shadow-none hover:bg-opacity-100 ${
                            isPaid ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          }`}>
                            {isPaid ? 'PAGO' : `PENDENTE (-R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <select value={displayStatus || ''} onChange={(e) => updateAppointmentStatus(apt.id, e.target.value)} className={`w-full sm:w-[140px] h-8 text-[10px] font-bold rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer ${displayStatus === 'Realizada' ? 'text-emerald-600 bg-emerald-50' : displayStatus === 'Cancelado' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50'}`}>
                      <option value="Agendado">Agendado</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                )
              }) : (
                <div className="p-10 text-center text-slate-400 italic text-sm">Nenhuma sessão encontrada.</div>
              )}
            </CardContent>
            
            {/* CONTROLES DE PAGINAÇÃO */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 gap-4 mt-4">
               <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="w-full sm:w-auto">
                  <ChevronLeft className="h-4 w-4 mr-2"/> ANTERIOR
               </Button>
               <span className="text-xs text-slate-500 font-medium">Página {currentPage} de {Math.ceil(filteredAppointments.length / sessionsPerPage) || 1}</span>
               <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => prev + 1)} disabled={indexOfLastSession >= filteredAppointments.length} className="w-full sm:w-auto">
                  PRÓXIMO <ChevronRight className="h-4 w-4 ml-2"/>
               </Button>
            </div>
          </Card>
        </div>
      )}

      {/* FINANCEIRO */}
      {activeTab === 'financeiro' && (
        <div className="w-full block clear-both animate-in fade-in">
          {/* Componente integrado com o saldo calculado (stats.credit vem do banco) */}
          <PatientCreditLog patientId={id as string} currentBalance={stats.credit || 0} />
        </div>
      )}

      {/* EVOLUÇÕES */}
      {activeTab === 'evolucoes' && (
        <div className="w-full block clear-both animate-in fade-in space-y-6">
            <>
              <Card className="border border-slate-200 shadow-md rounded-[24px] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b border-slate-200 p-6">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}><Plus size={16} style={{ color: 'var(--primary-color)' }}/> Registrar Evolução Clínica</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  {/* NOVA BARRA DE FERRAMENTAS (NO TOPO) */}
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-[var(--secondary-color)] p-3 rounded-xl border border-[var(--primary-color)] gap-4 mb-2">
                    <Label className="text-[11px] font-bold text-[var(--primary-color)] uppercase tracking-tight flex items-center gap-2">
                      <Sparkles size={14} /> Ferramentas de Registro
                    </Label>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-2">
                      {/* 1. BOTÃO DITAR (Microfone) */}
                      <Button 
                        onClick={handleToggleRecording} 
                        className={`flex-1 sm:flex-none font-bold transition-all shadow-md rounded-xl h-9 text-[11px] border-none ${isListening ? 'bg-red-600 text-white hover:brightness-90' : 'bg-[var(--primary-color)] text-white hover:brightness-90'}`}
                      >
                        {isListening ? (
                          <><span className="relative flex h-2 w-2 mr-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span> Gravando...</>
                        ) : (
                          <><Mic className="mr-2 h-4 w-4" /> Ditar</>
                        )}
                      </Button>
                      
                      {/* 2. BOTÃO IA SIMPLES (Amarelo) */}
                      <Button 
                        onClick={() => handleRefineEvolution('simples')} 
                        disabled={isGeneratingEvolution || !newEvolution.trim()}
                        className="flex-1 sm:flex-none font-bold transition-all shadow-md rounded-xl h-9 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 text-white hover:brightness-90 border-none"
                      >
                        {isGeneratingEvolution ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Resumo Simples
                      </Button>

                      {/* 3. BOTÃO IA INTELIGENTE (Roxo/Indigo) */}
                      <Button 
                        onClick={() => handleRefineEvolution('inteligente')} 
                        disabled={isGeneratingEvolution || !newEvolution.trim()}
                        className="flex-1 sm:flex-none font-bold transition-all shadow-md rounded-xl h-9 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-500 text-white hover:brightness-90 border-none"
                      >
                        {isGeneratingEvolution ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Texto Profissional
                      </Button>

                      {/* 4. BOTÃO IA S.O.A.P (Azul) */}
                      <Button 
                        onClick={() => handleRefineEvolution('soap')} 
                        disabled={isGeneratingEvolution || !newEvolution.trim()}
                        className="flex-1 sm:flex-none font-bold transition-all shadow-md rounded-xl h-9 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 text-white hover:brightness-90 border-none"
                      >
                        {isGeneratingEvolution ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                        Gerar S.O.A.P
                      </Button>
                    </div>
                  </div>

                  {/* ÁREA DE TEXTO AMPLIADA */}
                  <div className="relative">
                    <Textarea 
                      placeholder="Descreva o atendimento de forma livre. A IA pode organizar para você depois..." 
                      className="min-h-[400px] md:min-h-[500px] text-sm text-slate-700 bg-white border-slate-300 rounded-xl resize-y leading-relaxed p-4" 
                      value={newEvolution} 
                      onChange={e => setNewEvolution(e.target.value)} 
                    />
                  </div>
                  
                  {/* BOTÃO SALVAR */}
                  <Button onClick={handleSaveEvolution} disabled={saving || !newEvolution.trim() || isGeneratingEvolution} className="w-full h-12 text-[12px] font-black uppercase rounded-xl px-4 tracking-wider transition-all shadow-sm bg-[var(--primary-color)] text-white hover:brightness-90 mt-2 border-0">
                    {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />} Salvar Evolução
                  </Button>
                </CardContent>
              </Card>
              <div className="space-y-4">
                {/* CABEÇALHO DO HISTÓRICO COM FILTROS PADRONIZADOS */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 mt-8 gap-4 border-t border-slate-200 pt-6">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight whitespace-nowrap ml-2">
                    Histórico Cronológico
                  </Label>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* CAMPO DE BUSCA */}
                    <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="Buscar palavra ou nome..." 
                        className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-xl w-full sm:w-56 focus-visible:ring-[var(--primary-color)] shadow-sm"
                        value={evoSearch}
                        onChange={(e) => setEvoSearch(e.target.value)}
                      />
                    </div>

                    {/* FILTRO DE PERÍODO (Idêntico ao de Sessões) */}
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 gap-2 shadow-sm w-full sm:w-auto">
                      <Input 
                        type="date" 
                        value={evoStartDate} 
                        onChange={e => setEvoStartDate(e.target.value)} 
                        className="h-9 border-none focus-visible:ring-0 text-xs w-full sm:w-[120px] bg-transparent px-0" 
                      />
                      <span className="text-slate-300">|</span>
                      <Input 
                        type="date" 
                        value={evoEndDate} 
                        onChange={e => setEvoEndDate(e.target.value)} 
                        className="h-9 border-none focus-visible:ring-0 text-xs w-full sm:w-[120px] bg-transparent px-0" 
                      />
                    </div>
                  </div>
                </div>
                {evolutions.map((evo) => (
                  <Card key={evo.id} className="border border-slate-200 shadow-md rounded-[24px] border-l-4 border-l-[var(--primary-color)] bg-white">
                    <div className="bg-slate-50 px-4 md:px-6 py-3 border-b border-slate-200 text-[10px] font-bold text-slate-500 flex justify-between">
                      <span><CalendarIcon size={12} className="inline mr-1"/> {new Date(evo.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <CardContent className="p-4 md:p-6 text-xs italic text-slate-500 leading-relaxed whitespace-pre-wrap">{evo.content}</CardContent>
                  </Card>
                ))}
                
                {evolutions.length === 0 && !loadingMoreEvolutions && (
                  <p className="text-center text-xs text-slate-400 mt-6 font-medium">
                    Nenhuma evolução encontrada.
                  </p>
                )}

                {/* CONTROLES DE PAGINAÇÃO (Idêntico a Sessões) */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-200 gap-4 mt-6 bg-slate-50/50 rounded-b-[24px]">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { 
                      setEvolutionPage(p => p - 1); 
                      fetchEvolutions(evolutionPage - 1, evoStartDate, evoEndDate, evoSearch); 
                    }} 
                    disabled={evolutionPage === 0} 
                    className="w-full sm:w-auto rounded-xl h-9 font-bold text-[10px] uppercase text-slate-600 shadow-sm border-slate-300 bg-white hover:bg-slate-100"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2"/> ANTERIOR
                  </Button>
                  
                  <span className="text-xs text-slate-500 font-medium">
                    Página {evolutionPage + 1} de {Math.max(1, Math.ceil(totalEvolutions / 10))}
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { 
                      setEvolutionPage(p => p + 1); 
                      fetchEvolutions(evolutionPage + 1, evoStartDate, evoEndDate, evoSearch); 
                    }} 
                    disabled={(evolutionPage + 1) * 10 >= totalEvolutions} 
                    className="w-full sm:w-auto rounded-xl h-9 font-bold text-[10px] uppercase text-slate-600 shadow-sm border-slate-300 bg-white hover:bg-slate-100"
                  >
                    PRÓXIMO <ChevronRight className="h-4 w-4 ml-2"/>
                  </Button>
                </div>
              </div>
            </>
        </div>
      )}

      {/* PORTAL */}
      {activeTab === 'portal' && (
        <div className="w-full block clear-both animate-in fade-in space-y-6">
            <>
              {/* --- NOVO: CONFIGURAÇÃO DA SALA ONLINE --- */}
              <Card className="border border-slate-200 shadow-md bg-white rounded-[24px] mb-6">
                <CardHeader className="bg-slate-50 border-b border-slate-200 p-4 md:p-6">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>
                    <Video size={16} style={{ color: 'var(--primary-color)' }} /> Sala de Atendimento Online
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full space-y-2">
                      <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Link da Sala (Google Meet, Zoom, etc)</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={paciente.meeting_link || ''} onChange={e => setPaciente({...paciente, meeting_link: e.target.value})} placeholder="Ex: https://meet.google.com/xyz-abc-foo" className="pl-9 bg-white border-slate-300 rounded-xl" />
                      </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="bg-[var(--primary-color)] text-white hover:brightness-90 transition-all font-bold shadow-sm rounded-xl h-10 shrink-0 border-0">
                      {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Link
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border rounded-[24px] shadow-md" style={{ borderColor: 'var(--primary-color)', backgroundColor: 'var(--secondary-color)' }}>
                <CardHeader className="pb-2 p-4 md:p-6"><CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}><MessageSquarePlus size={16} style={{ color: 'var(--primary-color)' }} /> Pauta do Paciente</CardTitle></CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="bg-white p-4 rounded-2xl border border-blue-200 italic text-slate-600 shadow-sm">"{sessionAgenda}"</div>
                <Button variant="ghost" size="sm" disabled={saving} className="mt-3 text-[var(--primary-color)] hover:bg-[var(--secondary-color)] font-bold" onClick={handleArchiveAgenda}>
                    {saving ? <Loader2 className="animate-spin h-3 w-3 mr-2"/> : null}
                    Marcar como lida e Arquivar
                  </Button>
                </CardContent>
              </Card>
              
              {/* HISTÓRICO DE PAUTAS ARQUIVADAS (LIDAS) */}
              <details className="group mt-6 border-t border-slate-200 pt-6">
                <summary className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center justify-between cursor-pointer hover:text-[var(--primary-color)] transition-colors list-none select-none outline-none">
                  <div className="flex items-center gap-2"><Clock size={16} /> Histórico de Pautas Lidas</div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full group-open:hidden border border-slate-200">Clique para expandir</span>
                </summary>
                <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                  {evolutions.filter(e => e.content?.includes('[PAUTA ENVIADA')).length === 0 ? (
                    <p className="text-xs text-slate-400 italic bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">Nenhum histórico de pautas arquivadas.</p>
                  ) : (
                    evolutions.filter(e => e.content?.includes('[PAUTA ENVIADA')).map(evo => (
                      <div key={evo.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-slate-600 whitespace-pre-wrap shadow-sm">
                         <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                           <div className="flex items-center gap-2">
                             <CheckCircle2 size={16} className="text-emerald-500" />
                             <span className="text-[10px] font-bold text-[var(--primary-color)] uppercase">
                               Arquivado em {new Date(evo.created_at).toLocaleDateString('pt-BR')}
                             </span>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={(e) => { e.stopPropagation(); handleDeleteArchivedAgenda(evo.id); }} 
                             className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 rounded-md p-0 transition-colors"
                             title="Excluir Pauta"
                           >
                             <Trash2 size={14} />
                           </Button>
                         </div>
                         {/* Remove a tag estrutural apenas da visualização */}
                         {evo.content.replace('[PAUTA ENVIADA PELO PACIENTE VIA PORTAL]\n', '')}
                      </div>
                    ))
                  )}
                </div>
              </details>

              {/* --- SEÇÃO 1: MATERIAIS ENVIADOS (VERDE/TEAL) --- */}
              <Card className="border border-slate-200 shadow-md bg-white rounded-[24px] overflow-hidden mt-6">
                <CardHeader className="pb-4 p-4 md:p-6" style={{ backgroundColor: 'var(--secondary-color)' }}>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>
                    <Upload size={16} /> Compartilhar Materiais Terapêuticos
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <input id="material-upload" type="file" className="hidden" onChange={handleFileUpload} />
                    <Button variant="outline" onClick={() => document.getElementById('material-upload')?.click()} disabled={uploading} className="border-[var(--primary-color)] text-[var(--primary-color)] hover:bg-[var(--secondary-color)] font-bold rounded-xl h-10 shadow-sm">
                      {uploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
                      {uploading ? "Enviando arquivo..." : "Selecionar PDF ou Imagem"}
                    </Button>
                  </div>
                  
                  {/* Campo de Link Adicional */}
                  <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <Input placeholder="Título do Link" className="h-9 text-xs bg-white border border-slate-300 rounded-xl" value={materialTitle} onChange={e => setMaterialTitle(e.target.value)} />
                    <Input placeholder="https://..." className="h-9 text-xs bg-white border border-slate-300 rounded-xl" value={materialUrl} onChange={e => setMaterialUrl(e.target.value)} />
                    <Button size="sm" className="h-9 w-9 rounded-xl bg-[var(--primary-color)] text-white hover:brightness-90 transition-all p-0 border-0" onClick={handleAddMaterial}><Plus size={16}/></Button>
                  </div>

                  <details className="group mt-6 border-t border-slate-200 pt-4">
                    <summary className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between cursor-pointer hover:text-[var(--primary-color)] list-none select-none outline-none">
                      Ver Materiais Enviados ({materials.length})
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full group-open:hidden border border-slate-200">Expandir</span>
                    </summary>
                    <div className="space-y-2 mt-4 animate-in fade-in">
                      {materials.map(mat => (
                        <div key={mat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-3"><FileText size={16} className="text-slate-400" /><span className="text-xs font-medium truncate max-w-[200px]">{mat.title}</span></div>
                          <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 h-8 w-8 rounded-xl p-0" onClick={() => handleDeleteMaterial(mat)}><Trash2 size={14}/></Button>
                        </div>
                      ))}
                    </div>
                  </details>
                </CardContent>
              </Card>

              {/* --- SEÇÃO 2: ARQUIVOS RECEBIDOS (AZUL) --- */}
              <Card className="border border-slate-200 shadow-md bg-white rounded-[24px] overflow-hidden mt-6">
                <CardHeader className="pb-4 p-4 md:p-6" style={{ backgroundColor: 'var(--secondary-color)' }}>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>
                    <Download size={16} /> Comprovantes e Arquivos do Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <details className="group">
                    <summary className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between cursor-pointer hover:text-[var(--primary-color)] list-none select-none outline-none">
                      Ver Arquivos Recebidos ({receivedFiles.length})
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full group-open:hidden border border-slate-200">Expandir</span>
                    </summary>
                    <div className="mt-4 animate-in fade-in">
                      {receivedFiles.length === 0 ? (
                        <p className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-200">Nenhum arquivo recebido.</p>
                      ) : (
                        <div className="space-y-2">
                          {receivedFiles.map(file => {
                            // Busca se existe uma transação pendente ligada a este arquivo
                            const linkedTransaction = transactions.find(t => t.receipt_url === file.file_url && t.status === 'pending_review')
                            
                            return (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg text-emerald-600"><FileText size={16} /></div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{file.title || 'Comprovante'}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(file.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => window.open(file.file_url, '_blank')} className="text-blue-600 font-bold text-xs h-8">
                                  Visualizar
                                </Button>
                                <div className="w-px h-4 bg-slate-200 mx-1"></div> {/* Separador visual */}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteDocument(file); }} 
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 rounded-xl p-0 transition-colors"
                                  title="Excluir Arquivo"
                                >
                                    <Trash2 size={14}/>
                                </Button>
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                    </div>
                  </details>
                </CardContent>
              </Card>
            </>
        </div>
      )}

      {/* EMOÇÕES */}
      {activeTab === 'emocoes' && (
        <div className="w-full block clear-both animate-in fade-in">
            <Card className="border border-slate-200 shadow-md rounded-[24px] bg-white">
              <CardHeader className="bg-slate-50 border-b border-slate-200 p-6 rounded-t-[24px]">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>
                  <Activity size={16} style={{ color: 'var(--primary-color)' }} /> Diário de Emoções do Paciente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
              {emotions.slice((currentPage - 1) * 10, currentPage * 10).map(e => {
                const MoodIcon = getMoodIcon(Number(e.mood_score));
                return (
                  <div key={e.id} className="flex flex-col gap-3 p-4 border border-slate-200 rounded-2xl bg-slate-50 transition-all hover:bg-white shadow-sm">
                    {/* Relato do Paciente */}
                    <div className="flex gap-4 items-start">
                      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                        <MoodIcon className="h-8 w-8 text-[var(--primary-color)] shrink-0" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-slate-800">{new Date(e.created_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</p>
                        <p className="text-sm italic text-slate-600 mt-2 bg-white p-3 rounded-xl border border-slate-100">"{e.notes}"</p>
                      </div>
                    </div>
                    
                    {/* Resposta do Psicólogo */}
                    {e.psychologist_reply ? (
                      <div className="mt-2 ml-2 sm:ml-16 bg-[var(--secondary-color)] border border-[var(--primary-color)] p-4 rounded-2xl flex items-start gap-3 relative">
                        <div className="absolute -left-3 top-4 w-3 h-px bg-[var(--primary-color)] hidden sm:block"></div>
                        <CheckCircle2 className="h-5 w-5 text-[var(--primary-color)] shrink-0 mt-0.5" />
                        <div className="w-full">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-widest">Seu Acolhimento</p>
                            {!e.reply_read ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] shadow-sm"><Activity className="w-3 h-3 mr-1 animate-pulse"/> Não lido</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] shadow-sm"><CheckCircle2 className="w-3 h-3 mr-1"/> Lido</Badge>
                            )}
                          </div>
                          <p className="text-sm text-[var(--primary-color)] leading-relaxed whitespace-pre-wrap">{e.psychologist_reply}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 ml-2 sm:ml-16">
                        {replyingEmotionId === e.id ? (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 bg-white p-4 rounded-2xl border border-[var(--primary-color)] shadow-sm">
                            <Label className="text-[10px] font-black text-[var(--primary-color)] uppercase tracking-widest">Escrever Acolhimento</Label>
                            <Textarea 
                              placeholder="Escreva uma mensagem de apoio ou orientação para o paciente..." 
                              className="text-sm min-h-[100px] border-slate-200 focus-visible:ring-[var(--primary-color)] bg-slate-50"
                              value={emotionReplyText}
                              onChange={(e) => setEmotionReplyText(e.target.value)}
                            />
                            <div className="flex flex-col sm:flex-row justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setReplyingEmotionId(null)} className="h-10 text-xs font-bold text-slate-500 rounded-xl">Cancelar</Button>
                              <Button size="sm" onClick={() => handleReplyEmotion(e.id)} disabled={saving} className="h-10 text-xs bg-[var(--primary-color)] text-white hover:brightness-90 transition-all font-bold rounded-xl shadow-sm border-0">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquarePlus className="h-4 w-4 mr-2" />} Enviar ao Portal
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => { setReplyingEmotionId(e.id); setEmotionReplyText(""); }} className="h-9 text-xs font-bold text-[var(--primary-color)] border-[var(--primary-color)] hover:bg-[var(--secondary-color)] rounded-xl shadow-sm">
                            <MessageSquarePlus className="h-4 w-4 mr-2" /> Responder Paciente
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <PaginationControls totalCount={emotions.length} />
              {emotions.length === 0 && <div className="p-10 text-center text-slate-400 italic">Nenhum registro de emoção ainda.</div>}
            </CardContent>
            </Card>
        </div>
      )}

      {/* DOCUMENTOS */}
      {activeTab === 'documentos' && (
        <div className="w-full block clear-both animate-in fade-in">
            <Card className="border border-slate-200 shadow-md rounded-[24px] bg-white"><CardContent className="p-6 md:p-10 border-2 border-dashed rounded-3xl text-center space-y-4 border-slate-200">
              <FileText className="h-12 w-12 mx-auto text-slate-200" />
              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 mb-2" style={{ color: 'var(--primary-color)' }}>Documentos e Contratos</h3>
                <p className="text-xs text-slate-400">Gere documentos legais ou visualize assinaturas do paciente.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Button onClick={handleOpenLgpdEditor} className="w-full sm:w-auto h-auto min-h-[36px] py-2 text-[10px] font-black uppercase rounded-xl px-4 tracking-wider transition-all shadow-sm bg-[var(--primary-color)] text-white hover:brightness-90 whitespace-normal text-center border-0">Gerar e Editar Termo LGPD</Button>
                <div className="relative w-full sm:w-auto">
                  <Button variant="outline" className="w-full h-auto min-h-[36px] py-2 text-[10px] font-black uppercase rounded-xl px-4 tracking-wider border-slate-300 text-slate-600 hover:bg-slate-50 whitespace-normal text-center" onClick={() => document.getElementById('doc-upload')?.click()}>
                    <Upload className="mr-2 h-3 w-3 shrink-0" /> Upload Manual
                  </Button>
                  <input id="doc-upload" type="file" className="hidden" onChange={handleDocUpload} disabled={uploading} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                {documents.slice((currentPage - 1) * 10, currentPage * 10).map(doc => {
                  const linkedTransaction = transactions.find(t => t.receipt_url === doc.file_url && t.status === 'pending_review');
                  return (
                  <Card key={doc.id} className="p-4 border border-slate-200 shadow-md text-left relative rounded-[24px] group flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={`text-[10px] border-none ${doc.status === 'Assinado' ? 'bg-green-100 text-green-700' : doc.status === 'Confirmado' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status}</Badge>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" onClick={() => handleDeleteDocument(doc)} title="Excluir Documento">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <h4 className="font-bold text-xs truncate mb-4 text-slate-800">{doc.title}</h4>
                    </div>
                    <div className="flex flex-col gap-2 mt-auto">
                      <Button variant="outline" size="sm" className="w-full h-8 rounded-xl text-[10px] uppercase font-bold border-slate-300 text-slate-600 hover:bg-slate-50" onClick={() => setViewDoc(doc)}>Ver Documento</Button>
                    </div>
                  </Card>
                )})}
              </div>
              <PaginationControls totalCount={documents.length} />
            </CardContent></Card>
        </div>
      )}

      {/* METAS */}
      {activeTab === 'metas' && (
        <div className="w-full block clear-both animate-in fade-in">
            <Card className="border border-slate-200 shadow-md rounded-[24px] overflow-hidden bg-white">
              <CardContent className="p-4 md:p-6 bg-white">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
                  <div className="flex flex-wrap gap-2">
                      {['ATIVAS', 'CONCLUÍDAS', 'SUSPENSAS'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setMetaFilter(status)}
                          className={`rounded-full h-8 px-4 text-[10px] font-bold uppercase border transition-all ${metaFilter === status ? 'bg-[var(--secondary-color)] text-[var(--primary-color)] border-[var(--primary-color)]' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}`}
                        >
                          {status}
                        </button>
                      ))}
                  </div>
                  <Dialog open={newGoalOpen} onOpenChange={setNewGoalOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full sm:w-auto text-white hover:brightness-90 transition-all font-black text-xs uppercase tracking-widest h-12 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-2 border-0" style={{ backgroundColor: 'var(--primary-color)' }}>
                          <Plus size={16} /> NOVA META
                      </Button>
                    </DialogTrigger>
                    <DialogContent aria-describedby={undefined} className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle>Nova Meta Terapêutica</DialogTitle>
                        <DialogDescription className="sr-only">Defina uma nova meta.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Título da Meta</Label><Input value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} placeholder="Ex: Melhorar qualidade do sono" className="border-slate-300" /></div>
                        <div className="space-y-2"><Label>Descrição / Estratégia</Label><Textarea value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} placeholder="Detalhes de como alcançar..." className="border-slate-300" /></div>
                        <div className="space-y-2"><Label>Prazo (Opcional)</Label><Input type="date" value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})} className="border-slate-300" /></div>
                        <Button onClick={handleSaveMeta} disabled={saving} className="w-full bg-[var(--primary-color)] text-white hover:brightness-90 transition-all font-bold h-12 rounded-xl border-0">{saving ? <Loader2 className="animate-spin"/> : "Salvar Meta"}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-4">
                  {filteredMetas.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-2xl">Nenhuma meta encontrada neste status.</div>
                  ) : (
                    filteredMetas.slice((currentPage - 1) * 10, currentPage * 10).map(goal => (
                      <div key={goal.id} className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${goal.status === 'Concluída' ? 'text-emerald-500' : goal.status === 'Suspensa' ? 'text-amber-500' : 'text-blue-500'}`}>
                              {goal.status === 'Concluída' ? <CheckCircle2 size={20} /> : goal.status === 'Suspensa' ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                            </div>
                            <div>
                              <h4 className={`font-bold text-sm ${goal.status === 'Concluída' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{goal.title}</h4>
                              {goal.deadline && <p className="text-[10px] text-slate-400 font-medium mt-1">Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>}
                            </div>
                          </div>
                          <select value={goal.status} onChange={(e) => handleUpdateMetaStatus(goal.id, e.target.value)} className={`h-7 w-[110px] text-[10px] font-bold rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer ${goal.status === 'Concluída' ? 'bg-emerald-50 text-emerald-700' : goal.status === 'Suspensa' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                            <option value="Ativa">Ativa</option>
                            <option value="Concluída">Concluída</option>
                            <option value="Suspensa">Suspensa</option>
                          </select>
                        </div>
                        {goal.description && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed">{goal.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <PaginationControls totalCount={filteredMetas.length} />
              </CardContent>
            </Card>
        </div>
      )}

      {/* CONTATO */}
      {activeTab === 'contato' && (
        <div className="w-full block clear-both animate-in fade-in">
          <Card className="border border-slate-200 shadow-md rounded-[24px] bg-white"><CardContent className="p-4 md:p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Telefone Principal *</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.phone || ''} onChange={handlePhoneChange} placeholder="(00) 00000-0000 ou +1..." /></div>
              <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Email de Contato</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.email || ''} onChange={e => setPaciente({...paciente, email: e.target.value})} /></div>
            </div>
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6" style={{ color: 'var(--primary-color)' }}><MapPin size={16} style={{ color: 'var(--primary-color)' }}/> Endereço Completo</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">CEP</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.cep || ''} onChange={e => setPaciente({...paciente, cep: e.target.value})} /></div>
                <div className="md:col-span-2 space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Logradouro</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.address || ''} onChange={e => setPaciente({...paciente, address: e.target.value})} /></div>
                <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Cidade</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.city || ''} onChange={e => setPaciente({...paciente, city: e.target.value})} /></div>
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* SAÚDE */}
      {activeTab === 'saude' && (
        <div className="w-full block clear-both animate-in fade-in">
          <Card className="border border-slate-200 shadow-md rounded-[24px] bg-white">
            <CardContent className="p-4 md:p-6 space-y-8">
              
              {/* Bloco 1: Histórico Clínico & Psiquiátrico */}
              <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-200">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6" style={{ color: 'var(--primary-color)' }}>Histórico Clínico</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Histórico Psiquiátrico</Label><Textarea className="min-h-[100px] text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.psychiatric_history || ''} onChange={e => setPaciente({...paciente, psychiatric_history: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Histórico Familiar</Label><Textarea className="min-h-[100px] text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.family_history || ''} onChange={e => setPaciente({...paciente, family_history: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Outras Doenças / Condições</Label><Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.medical_history || ''} onChange={e => setPaciente({...paciente, medical_history: e.target.value})} /></div>
                </div>
              </div>

              {/* Bloco 2: Histórico Terapêutico */}
              <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-200">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6" style={{ color: 'var(--primary-color)' }}>Histórico Terapêutico</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Já realizou terapias anteriores?</Label>
                    <select value={paciente.previous_therapy || 'Não'} onChange={e => setPaciente({...paciente, previous_therapy: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>
                  </div>
                  {paciente.previous_therapy === 'Sim' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Motivo da interrupção / Experiência</Label><Textarea className="min-h-[100px] text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.previous_therapy_notes || ''} onChange={e => setPaciente({...paciente, previous_therapy_notes: e.target.value})} /></div>
                  )}
                </div>
              </div>

              {/* Bloco 3: Segurança & Farmacologia */}
              <div className="bg-slate-50 p-4 rounded-[24px] border border-slate-200">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6" style={{ color: 'var(--primary-color)' }}>Medicamentos e Alergias</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Uso de Medicamentos Contínuos</Label><Textarea className="min-h-[100px] text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.medications || ''} onChange={e => setPaciente({...paciente, medications: e.target.value})} /></div>
                  <div className="space-y-2"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Alergias</Label><Input className="text-sm text-red-700 bg-red-50 border-red-200 rounded-xl focus-visible:ring-red-200 placeholder:text-red-300" placeholder="Nenhuma conhecida" value={paciente.allergies || ''} onChange={e => setPaciente({...paciente, allergies: e.target.value})} /></div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
                    <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Paciente possui Convênio Médico?</Label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={paciente.has_insurance} 
                        onChange={(e) => setPaciente({...paciente, has_insurance: e.target.checked})} 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--primary-color)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary-color)]"></div>
                    </label>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

      {/* ADICIONAL */}
      {activeTab === 'adicional' && (
        <div className="w-full block clear-both animate-in fade-in">
          <Card className="border border-slate-200 shadow-md rounded-[24px] bg-white"><CardContent className="p-4 md:p-6 space-y-8">
            
            {/* SEÇÃO LEAD / ORIGEM */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest mb-6" style={{ color: 'var(--primary-color)' }}>Origem e Captação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Como conheceu a clínica?</Label>
                  <select value={paciente.lead_source || ''} onChange={e => setPaciente({...paciente, lead_source: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] cursor-pointer">
                    <option value="" disabled>Selecione</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Quem indicou?</Label>
                  <Input className="text-sm text-slate-700 bg-white border-slate-300 rounded-xl" value={paciente.referred_by || ''} onChange={e => setPaciente({...paciente, referred_by: e.target.value})} />
                </div>
              </div>
            </div>

            {/* SEÇÃO NOTAS */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6" style={{ color: 'var(--primary-color)' }}>Notas Gerais</h3>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1.5">Observações Gerais</Label>
                <Textarea 
                  className="min-h-[200px] rounded-2xl border-slate-300 focus:ring-[var(--primary-color)] text-sm text-slate-700" 
                  value={paciente.general_observations || ''} 
                  onChange={e => setPaciente({...paciente, general_observations: e.target.value})} 
                />
              </div>
            </div>
          </CardContent></Card>
        </div>
      )}

      <Button variant="ghost" onClick={handleDeletePatient} disabled={saving} className="mt-8 text-red-500 hover:text-red-700 hover:bg-red-50 font-bold text-xs h-10 rounded-xl transition-all items-center flex"><Trash2 className="mr-2 h-3 w-3"/> Excluir Registro Permanente</Button>

      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent aria-describedby={undefined} className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border-none p-0 bg-slate-50">
          <DialogDescription className="sr-only">Visualização do documento.</DialogDescription>
          <div id="print-area" className="document-container p-8 bg-white m-4 rounded-2xl shadow-md border border-slate-200 min-h-[80vh]">
            {/* HEADER DINÂMICO (PAPEL TIMBRADO) */}
            <div className="flex flex-col items-center text-center mb-6 border-b border-slate-200 pb-6 select-none">
               {(viewDoc?.clinic_logo_url || professional?.logo_url) && (
                 <img src={viewDoc?.clinic_logo_url || professional?.logo_url} alt="Logo Clínica" className="h-20 max-w-[200px] object-contain mb-2 mix-blend-multiply" />
               )}
               <h2 className="font-black text-xl text-slate-800 uppercase tracking-wide">
                 {viewDoc?.clinic_name || viewDoc?.professional_name || professional?.clinic_name || professional?.full_name || 'DOCUMENTO OFICIAL'}
               </h2>
               <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium mt-1">
                  <span>{professional?.city}</span>
                  {professional?.crp && <span>• CRP: {professional.crp}</span>}
               </div>
            </div>

            <div className="flex flex-row justify-between items-center border-b border-slate-200 pb-4 mb-6">
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-800">{viewDoc?.title}</DialogTitle>
              <Button variant="outline" size="sm" className="print:hidden bg-slate-50 font-bold border-slate-300" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir / PDF</Button>
            </div>
            <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-800 text-justify px-4">{viewDoc?.content}</div>
            
            {/* VISUALIZAÇÃO DA ASSINATURA DIGITAL */}
            {viewDoc?.signature_data && (
              <div className="mt-8 px-4 break-inside-avoid">
                <img src={viewDoc.signature_data} alt="Assinatura" className="h-16 object-contain mb-2" />
                <div className="border-t border-slate-300 w-48 pt-1">
                  <p className="text-xs font-bold text-slate-600 uppercase">Assinatura do Paciente</p>
                  <p className="text-[10px] text-slate-400">{viewDoc.signed_at ? new Date(viewDoc.signed_at).toLocaleString('pt-BR') : 'Data não registrada'}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={lgpdModalOpen} onOpenChange={setLgpdModalOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-[var(--primary-color)]">Revisar e Editar Contrato</DialogTitle>
            <DialogDescription className="sr-only">Edite o termo de consentimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-500 font-medium">Altere o texto abaixo conforme necessário para este paciente específico. Ao salvar, ele será enviado para o Portal do Paciente para assinatura.</p>
            <Textarea 
              className="min-h-[50vh] font-serif text-sm leading-relaxed p-4 border-slate-300 rounded-2xl focus:ring-[var(--primary-color)]" 
              value={lgpdContent} 
              onChange={e => setLgpdContent(e.target.value)} 
            />
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setLgpdModalOpen(false)} className="rounded-xl border-slate-300">Cancelar</Button>
              <Button onClick={handleSaveLGPD} disabled={saving} className="bg-[var(--primary-color)] text-white hover:brightness-90 transition-all font-bold rounded-xl shadow-md border-0">
                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                Salvar e Enviar para Assinatura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function CardStat({ title, value, icon, color }: any) {
  const colors: any = { 
    red: 'bg-red-50 text-red-600 border-red-200', 
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200', 
    blue: 'bg-[var(--secondary-color)] text-[var(--primary-color)] border-[var(--primary-color)]/30' // 💉 Visu de sucesso para crédito
  }
  return (
    <Card className="p-6 border border-slate-200 shadow-md bg-white rounded-[24px] transition-all hover:shadow-lg">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] uppercase text-slate-400 font-black tracking-widest">{title}</p>
          <h3 className={`text-2xl font-black mt-1 ${color === 'blue' && value > 0 ? 'text-[var(--primary-color)]' : 'text-slate-800'}`}>
            {Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>
        <div className={`p-4 rounded-2xl border ${colors[color]}`}>{icon}</div>
      </div>
    </Card>
  )
}