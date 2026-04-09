'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from 'next/image'
import { Plus, Loader2, Sparkles, FileText, Lock, Mic, History } from "lucide-react"
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"
import { useSubscription } from '@/hooks/use-subscription'

const getRegistryLabel = (occupation?: string) => {
  return ['psiquiatra', 'ortopedista', 'medico'].includes(occupation || '') ? 'CRM' :
    ['fisioterapeuta', 'terapeuta_ocupacional'].includes(occupation || '') ? 'CREFITO' :
    occupation === 'odontologista' ? 'CRO' :
    occupation === 'nutricionista' ? 'CRN' :
    occupation === 'fonoaudiologo' ? 'CRFa' :
    occupation === 'terapeuta_holistico' ? 'CRT' :
    occupation === 'psicanalista' ? 'RNTP/RP' :
    occupation === 'psicopedagogo' ? 'ABPp/CBO' :
    occupation === 'quiropraxista' ? 'Registro' :
    occupation === 'outro' ? 'Registro' : 'CRP';
}

const TEMPLATES: Record<string, string> = {
  "Atestado": "ATESTADO DE SAÚDE\n\nAtesto para os devidos fins que o(a) paciente [NOME], inscrito(a) no CPF [CPF], encontra-se em acompanhamento clínico sob meus cuidados, necessitando de [DIAS] dias de afastamento de suas atividades para tratamento de saúde.\n\nCID-10: [CID]\n\n[CIDADE], [DATA].",
  "Declaração": "DECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro que o(a) paciente [NOME], inscrito(a) no CPF [CPF], compareceu a atendimento clínico neste consultório no dia [DATA] das [HORA_INICIO] às [HORA_FIM].\n\n[CIDADE], [DATA].",
  "Contrato": "CONTRATO DE PRESTAÇÃO DE SERVIÇOS CLÍNICOS\n\nCONTRATANTE: [NOME], CPF [CPF].\nCONTRATADO: [NOME_PROFISSIONAL], [NOME_REGISTRO] [REGISTRO_PROFISSIONAL].\n\nCLÁUSULA 1 - DO OBJETO\nO presente contrato tem por objeto a prestação de serviços clínicos...\n\n[DATA].",
  "Recibo de Pagamento": "RECIBO\n\nRecebi de [NOME], CPF [CPF], a importância de R$ [VALOR] referente a atendimentos clínicos realizados em [DATA].\n\n[CIDADE], [DATA].",
  "Recibo Anual IRPF": "RECIBO PARA FINS DE IMPOSTO DE RENDA\n\nRecebi de [NOME], CPF [CPF], o valor total de R$ [VALOR_TOTAL] referente a atendimentos clínicos realizados durante o ano de 2025.\n\n[DATA].",
  "Avaliação Clínica": "PROTOCOLO DE AVALIAÇÃO CLÍNICA\n\nPACIENTE: [NOME]\nDATA: [DATA]\n\nINSTRUMENTOS UTILIZADOS:\n1. ...\n\nRESULTADOS OBTIDOS:\n...",
  "Anamnese": "FICHA DE ANAMNESE\n\nPACIENTE: [NOME]\nDATA: [DATA]\n\nQUEIXA PRINCIPAL:\n...\n\nHISTÓRICO:\n...",
  "Prontuários Gerais": "REGISTRO DE PRONTUÁRIO\n\nPACIENTE: [NOME]\nDATA: [DATA]\n\nDESCRIÇÃO DO ATENDIMENTO:\n...",
  "Laudo": "LAUDO TÉCNICO\n\n1. IDENTIFICAÇÃO\nNome: [NOME]\nCPF: [CPF]\n\n2. DEMANDA\n...\n\n3. PROCEDIMENTO\n...\n\n4. ANÁLISE\n...\n\n5. CONCLUSÃO\n...\n\n[CIDADE], [DATA].",
  "Relatórios Clínicos": "RELATÓRIO CLÍNICO\n\n1. IDENTIFICAÇÃO\nNome: [NOME]\n\n2. DESCRIÇÃO DA DEMANDA\n...\n\n3. PROCEDIMENTO\n...\n\n4. ANÁLISE\n...\n\n5. CONCLUSÃO\n...\n\n[DATA].",
  "Parecer": "PARECER TÉCNICO\n\nSOLICITANTE: ...\nASSUNTO: ...\n\n1. EXPOSIÇÃO DE MOTIVOS\n...\n\n2. ANÁLISE TÉCNICA\n...\n\n3. CONCLUSÃO\n...\n\n[DATA].",
  "Comprovante de Sessões": "COMPROVANTE DE SESSÕES\n\nCertifico que [NOME] realizou os seguintes atendimentos clínicos:\n\n- Data: [DATA]\n\n[CIDADE], [DATA].",
  "Termo LGPD": `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO PARA TRATAMENTO DE DADOS (LGPD)

Eu, [NOME DO PACIENTE], inscrito(a) no CPF sob o nº [CPF DO PACIENTE], autorizo o(a) profissional [NOME DO PROFISSIONAL], inscrito(a) no [NOME_REGISTRO] [REGISTRO_PROFISSIONAL], a realizar o tratamento dos meus dados pessoais sensíveis, coletados durante os atendimentos clínicos, para fins exclusivos de prestação de serviços de saúde, evolução de prontuário e cumprimento de obrigações legais e regulatórias, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).

Estou ciente de que:
1. Os dados serão armazenados em ambiente seguro e com acesso restrito.
2. O sigilo profissional será mantido conforme o Código de Ética Profissional.
3. Poderei revogar este consentimento a qualquer momento, mediante manifestação expressa.

[CIDADE], [DATA].`
}

interface NewDocumentModalProps {
  preSelectedPatientId?: string
  onDocumentCreated?: () => void
  trigger?: React.ReactNode
}

export function NewDocumentModal({ preSelectedPatientId, onDocumentCreated, trigger }: NewDocumentModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()
  const { loading: subscriptionLoading } = useSubscription()
  
  const [patients, setPatients] = useState<any[]>([])
  const [professional, setProfessional] = useState<any>(null)
  const [headerTitle, setHeaderTitle] = useState("")
  const [aiInstruction, setAiInstruction] = useState(""); // Novo estado para o chat
  
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const initialContentRef = useRef<string>("")
  const finalTranscriptRef = useRef<string>("")
  
  const [formData, setFormData] = useState({
    patient_id: preSelectedPatientId || '',
    type: '',
    title: '',
    content: '',
    is_private: false
  })

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (!user?.id) return
  
          // Colunas explícitas blindadas
          const { data: prof } = await supabase.from('professional_profile').select('full_name, crp, clinic_name, city, logo_url').eq('user_id', user.id).maybeSingle()
          if (prof) {
            setProfessional(prof)
            setHeaderTitle(prof.clinic_name || prof.full_name || "")
          }
  
          const { data: pats } = await supabase.from('patients').select('id, full_name, cpf, phone').eq('psychologist_id', user.id).order('full_name')
          if (pats) setPatients(pats)
  
          if (preSelectedPatientId) {
            setFormData(prev => ({ ...prev, patient_id: preSelectedPatientId }))
          }
        } catch (e) {
          console.warn("Aviso ao carregar dados do modal de documento:", e)
        }
      }
      fetchData()
    }
  }, [open, preSelectedPatientId])

  const fillTemplate = (type: string, patientId: string) => {
    const template = TEMPLATES[type] || ""
    const patient = patients.find(p => p.id === patientId)
    const today = new Date().toLocaleDateString('pt-BR')
    const registryLabel = getRegistryLabel(professional?.occupation_type)
    
    const safeReplace = (val: string | undefined | null) => val ? val.trim() : "_______"

    return template
      .replace(/\[NOME\]/g, safeReplace(patient?.full_name))
      .replace(/\[CPF\]/g, safeReplace(patient?.cpf))
      .replace(/\[NOME DO PACIENTE\]/g, safeReplace(patient?.full_name))
      .replace(/\[CPF DO PACIENTE\]/g, safeReplace(patient?.cpf))
      .replace(/\[NOME DO PROFISSIONAL\]/g, safeReplace(professional?.full_name))
      .replace(/\[NOME_PROFISSIONAL\]/g, safeReplace(professional?.full_name))
      .replace(/\[CRP\]/g, safeReplace(professional?.crp))
      .replace(/\[REGISTRO_PROFISSIONAL\]/g, safeReplace(professional?.crp))
      .replace(/\[NOME_REGISTRO\]/g, registryLabel)
      .replace(/\[CRP_PROFISSIONAL\]/g, safeReplace(professional?.crp))
      .replace(/\[CIDADE\]/g, safeReplace(professional?.city))
      .replace(/\[DATA\]/g, today)
  }

  const handleTypeChange = (newType: string) => {
    const filled = fillTemplate(newType, formData.patient_id)
    const patient = patients.find(p => p.id === formData.patient_id)
    setFormData({ ...formData, type: newType, title: `${newType} - ${patient?.full_name || ''}`, content: filled })
  }

  const handlePatientChange = (patientId: string) => {
    const filled = fillTemplate(formData.type, patientId)
    const patient = patients.find(p => p.id === patientId)
    setFormData({ ...formData, patient_id: patientId, title: formData.type ? `${formData.type} - ${patient?.full_name || ''}` : formData.title, content: filled })
  }

  const handleGenerateAI = async () => {
    if (!formData.patient_id || !formData.type) {
      toast({ variant: "destructive", title: "Dados incompletos", description: "Selecione o paciente e o modelo." });
      return;
    }

    setGenerating(true);
    const supabase = createClient();
    
    try {
      // 1. VERIFICA E INCREMENTA COTA NO BANCO
      const { data: { user } } = await supabase.auth.getUser();
      const { data: hasQuota } = await supabase.rpc('check_and_increment_ai_usage', {
        prof_id: user?.id
      });

      if (hasQuota === false) {
        toast({ 
          variant: "destructive", 
          title: "Limite Atingido", 
          description: "Você atingiu o limite de 30 documentos mensais. Sua cota será renovada em breve." 
        });
        setGenerating(false);
        return;
      }

      const selectedPatient = patients.find(p => p.id === formData.patient_id);
      
      // BUSCA AS EVOLUÇÕES NO BANCO
      const { data: evolutionsData, error: evolError } = await supabase
        .from('clinical_evolutions')
        .select('content, created_at')
        .eq('patient_id', formData.patient_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (evolError) throw evolError;

      // CHAMADA PARA A NOSSA API ROUTE DO NEXT.JS
      const res = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.type,
          dadosPaciente: `Nome: ${selectedPatient?.full_name}, CPF: ${selectedPatient?.cpf}`,
          // AQUI ESTÁ A CORREÇÃO: usamos 'evolutionsData' que acabamos de buscar
          evolucoes: evolutionsData?.map(e => ({
            content: e.content,
            date: new Date(e.created_at).toLocaleDateString('pt-BR')
          })) || [],
          instrucoes: aiInstruction
        })
      });

      const data = await res.json();

      if (data.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
        setAiInstruction(""); // Limpa o chat após gerar
        toast({ title: "✨ Sucesso!", description: "O documento foi preenchido pela IA." });
      } else {
        throw new Error(data.error || "A IA não retornou conteúdo.");
      }
    } catch (error: any) {
      console.error("Erro na geração:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro na IA", 
        description: error.message || "Verifique o console do VS Code." 
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!formData.content || formData.content.length < 10) {
      toast({ variant: "destructive", title: "Texto muito curto", description: "O documento precisa de conteúdo para ser refinado." });
      return;
    }

    setGenerating(true);
    
    try {
      // Usamos a mesma rota da API, mas enviamos o conteúdo atual para refinar
      const res = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.type + " (Refinamento)",
          dadosPaciente: formData.title,
          evolucoes: [], // Não precisa de evoluções para refinar o que já foi escrito
          instrucaoEspecial: `Aja como um revisor clínico. Corrija gramática e eleve o tom para formal/premium. Instrução específica: ${aiInstruction}`,
          contentToRefine: formData.content // Enviamos o texto atual para a IA trabalhar em cima dele
        })
      });

      const data = await res.json();

      if (data.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
        setAiInstruction(""); // Limpa o campo após o refinamento
        toast({ title: "✨ Documento Refinado!", description: "Termos oficiais aplicados com sucesso." });
      } else {
        throw new Error(data.error || "Erro ao refinar texto.");
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro no Refinamento", 
        description: "Certifique-se de que a rota da API está ativa." 
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromEvolutions = async () => {
    if (!formData.patient_id) {
      toast({ variant: "destructive", title: "Selecione o paciente", description: "É necessário selecionar um paciente para buscar as evoluções." });
      return;
    }

    setGenerating(true);
    const supabase = createClient();
    
    try {
      // 1. VERIFICA COTA
      const { data: { user } } = await supabase.auth.getUser();
      const { data: hasQuota } = await supabase.rpc('check_and_increment_ai_usage', {
        prof_id: user?.id
      });

      if (hasQuota === false) {
        toast({ variant: "destructive", title: "Limite Atingido", description: "Você atingiu o limite de 30 documentos mensais." });
        setGenerating(false);
        return;
      }

      const selectedPatient = patients.find(p => p.id === formData.patient_id);
      
      // 2. BUSCA AS ÚLTIMAS 8 EVOLUÇÕES
      const { data: evolutionsData, error: evolError } = await supabase
        .from('clinical_evolutions')
        .select('content, created_at')
        .eq('patient_id', formData.patient_id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (evolError) throw evolError;

      if (!evolutionsData || evolutionsData.length === 0) {
        toast({ variant: "destructive", title: "Sem Evoluções", description: "Este paciente não possui evoluções registradas para gerar o documento." });
        setGenerating(false);
        return;
      }

      const isMedico = ['ortopedista', 'medico'].includes(professional?.occupation_type);
      const isPsicologo = professional?.occupation_type === 'psicologo';
      
      let tipoDoc = "Relatório de Evolução";
      let instrucaoBase = "Com base nestas evoluções clínicas do último mês, gere um Relatório de Evolução estruturado e timbrado para este paciente.";

      if (isMedico) {
        tipoDoc = "Evolução Clínica";
        instrucaoBase = "Com base nestas evoluções clínicas do último mês, gere uma Evolução Clínica estruturada e timbrada para este paciente, focando em termos médicos adequados.";
      } else if (isPsicologo) {
        tipoDoc = "Laudo de Evolução Psicológica";
        instrucaoBase = "Com base nestas evoluções clínicas do último mês, gere um Laudo de Evolução Psicológica estruturado e timbrado para este paciente.";
      } else {
        const occ = professional?.occupation_type || 'Clínico';
        const profName = occ.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        tipoDoc = `Relatório de Evolução (${profName})`;
        instrucaoBase = `Com base nestas evoluções clínicas do último mês, gere um ${tipoDoc} estruturado e timbrado para este paciente.`;
      }

      // 3. ENVIA PARA A MISTRAL COM O PROMPT ESPECÍFICO
      const res = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoDoc,
          dadosPaciente: `Nome: ${selectedPatient?.full_name}, CPF: ${selectedPatient?.cpf}`,
          evolucoes: evolutionsData.map(e => ({
            content: e.content,
            date: new Date(e.created_at).toLocaleDateString('pt-BR')
          })),
          instrucaoEspecial: instrucaoBase + (aiInstruction ? ` Observação: ${aiInstruction}` : "")
        })
      });

      const data = await res.json();

      if (data.content) {
        setFormData(prev => ({ 
          ...prev, 
          type: "Relatórios Clínicos", // Altera automaticamente o tipo para encaixar na natureza do documento
          title: formData.title || `${tipoDoc} - ${selectedPatient?.full_name}`,
          content: data.content 
        }));
        setAiInstruction(""); 
        toast({ title: "✨ Laudo Gerado!", description: "O documento foi criado a partir do histórico clínico." });
      } else {
        throw new Error(data.error || "A IA não retornou conteúdo.");
      }
    } catch (error: any) {
      console.error("Erro na geração por evoluções:", error);
      toast({ variant: "destructive", title: "Erro na IA", description: error.message });
    } finally {
      setGenerating(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Não suportado", description: "Seu navegador não suporta reconhecimento de voz." })
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = true
    recognition.interimResults = true

    initialContentRef.current = formData.content
    finalTranscriptRef.current = ""

    recognition.onstart = () => {
      setIsRecording(true)
      toast({ title: "🎤 Ouvindo...", description: "Pode começar a falar. Clique novamente para parar." })
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let currentFinal = ''

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          currentFinal += event.results[i][0].transcript
        } else {
          interimTranscript += event.results[i][0].transcript
        }
      }

      finalTranscriptRef.current += currentFinal

      const separator = initialContentRef.current && !initialContentRef.current.endsWith(' ') && !initialContentRef.current.endsWith('\n') ? ' ' : ''
      const newContent = initialContentRef.current + separator + finalTranscriptRef.current + interimTranscript
      setFormData(prev => ({ ...prev, content: newContent }))
    }

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (finalTranscriptRef.current.trim().length > 0) {
        setTimeout(() => {
          if (window.confirm("Deseja que a IA organize este relato tecnicamente?")) {
             handleVoiceRefinement(finalTranscriptRef.current)
          }
        }, 100)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleVoiceRefinement = async (textToRefine: string) => {
    setGenerating(true);
    
    try {
      const res = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: "Relato Clínico",
          dadosPaciente: formData.title,
          evolucoes: [], 
          instrucaoEspecial: `Organize, formalize tecnicamente e corrija a gramática do seguinte relato transcrito por voz. Mantenha todos os detalhes clínicos importantes descritos.`,
          contentToRefine: textToRefine
        })
      });

      const data = await res.json();

      if (data.content) {
        const separator = initialContentRef.current && !initialContentRef.current.endsWith(' ') && !initialContentRef.current.endsWith('\n') ? ' ' : ''
        setFormData(prev => ({ 
          ...prev, 
          content: initialContentRef.current + separator + data.content 
        }));
        toast({ title: "✨ Relato Refinado!", description: "A IA organizou sua transcrição." });
      } else {
        throw new Error(data.error || "Erro ao refinar texto.");
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Erro no Refinamento", 
        description: "Não foi possível organizar o relato com a IA." 
      });
    } finally {
      setGenerating(false);
    }
  }

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
  
      // 1. Pega os dados reais para substituição
      const nomeReal = professional?.full_name || "";
      const crpReal = professional?.crp || "";
      const registryLabel = getRegistryLabel(professional?.occupation_type);
  
      // 2. LIMPEZA SEGURA: Substitui apenas os termos entre colchetes
      let conteudoFinal = formData.content
        .replace(/\[Nome do Psicólogo\]/gi, nomeReal)
        .replace(/\[Nome do Profissional\]/gi, nomeReal)
        .replace(/\[Número do CRP\]/gi, crpReal)
        .replace(/\[CRP\]/gi, crpReal)
        .replace(/\[REGISTRO_PROFISSIONAL\]/gi, crpReal)
        .replace(/\[NOME_REGISTRO\]/gi, registryLabel)
        .replace(/\[DATA\]/g, new Date().toLocaleDateString('pt-BR'))
        .replace(/Nome: {nomeReal}/g, '')
        .replace(/CRP: {crpReal}/g, '')
        .trim();
  
      // 3. Salvamento
      const { error } = await supabase.from('official_reports').insert({
        psychologist_id: user?.id,
        patient_id: formData.patient_id,
        title: formData.title,
        type: formData.type,
        content: conteudoFinal, 
        professional_name: nomeReal,
        professional_crp: crpReal,
        clinic_logo_url: professional?.logo_url,
        clinic_name: professional?.clinic_name || headerTitle,
        is_private: formData.is_private
      });
  
      if (!error) {
        toast({ title: "✨ Documento arquivado com sucesso!" });
        if (onDocumentCreated) onDocumentCreated();
        setOpen(false);
      } else {
        toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de conexão", description: e.message || "Verifique sua internet." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="text-white hover:brightness-90 transition-all font-bold border-0" style={{ backgroundColor: 'var(--primary-color)' }}><Plus className="mr-2 h-4 w-4" /> Novo Documento</Button>}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="w-[95vw] sm:max-w-[800px] h-auto max-h-[95vh] bg-white dark:bg-slate-900 flex flex-col">
        <DialogHeader>
          <DialogTitle>Emissão de Documento Oficial</DialogTitle>
          <DialogDescription>Os dados do profissional e do paciente serão preenchidos automaticamente.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <select 
                value={formData.patient_id} 
                onChange={(e) => handlePatientChange(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Selecione o paciente</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Modelo de Documento</Label>
              <select 
                value={formData.type} 
                onChange={(e) => handleTypeChange(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Escolha o tipo...</option>
                {Object.keys(TEMPLATES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título do Arquivo</Label>
            <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg bg-red-50 border border-red-100 my-2">
            <input id="is_private" type="checkbox" checked={formData.is_private || false} onChange={(e) => setFormData({...formData, is_private: e.target.checked})} className="w-5 h-5 text-red-600 border-red-300 rounded focus:ring-red-500 cursor-pointer accent-red-600" />
            <Label htmlFor="is_private" className="text-sm font-bold text-red-700 flex items-center gap-2 cursor-pointer">
              <Lock size={14} />
              Marcar como Sigiloso (Invisível para o Assistente)
            </Label>
          </div>

          <div className="space-y-2 mb-4 bg-brand-secondary/50 p-3 rounded-lg border border-brand-primary/30">
            <Label className="text-brand-primary font-bold flex items-center gap-2">
              <Sparkles size={16} /> Instruções Especiais para a IA
            </Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Ex: Foque na queixa de insônia e use tom mais formal..." 
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                className="bg-white border-brand-primary/30 focus:ring-brand-primary"
              />
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Limite: 30 documentos/mês. Use este campo para refinar o resultado.
            </p>
          </div>

          <div className="space-y-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
              <Label>Corpo do Documento</Label>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleRecording} 
                  className={`w-full sm:w-auto font-bold transition-all ${isRecording ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white hover:bg-brand-secondary text-brand-primary border-brand-primary/30'}`}
                >
                  <Mic className="mr-2 h-3 w-3" />
                  {isRecording ? "Gravando..." : "Ditar"}
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateFromEvolutions} 
                  disabled={generating || !formData.patient_id}
                  className="w-full sm:w-auto bg-white hover:bg-brand-secondary text-brand-primary border-brand-primary/30 font-bold transition-all"
                >
                  {generating ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <History className="mr-2 h-3 w-3" />}
                  Gerar a partir das Evoluções
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateAI} 
                  disabled={generating || !formData.type}
                  className="w-full sm:w-auto bg-white hover:bg-brand-secondary text-brand-primary border-brand-primary/30 font-bold transition-all"
                >
                  {generating ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Sparkles className="mr-2 h-3 w-3" />}
                  Gerar do Zero
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefineWithAI} 
                  disabled={generating || !formData.content}
                  className="w-full sm:w-auto bg-white hover:bg-brand-secondary text-brand-primary border-brand-primary/30 font-bold transition-all"
                >
                  {generating ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <FileText className="mr-2 h-3 w-3" />}
                  Refinar Termos Oficiais
                </Button>
              </div>
            </div>
            
            {/* CABEÇALHO AUTOMÁTICO (PAPEL TIMBRADO) */}
            <div className="bg-slate-50 p-4 sm:p-6 rounded-t-xl border border-b-0 border-slate-200 flex flex-col items-center text-center gap-2 select-none">
               {professional?.logo_url && (
                 <div className="relative h-20 w-[200px] mb-2">
                   <Image 
                     src={professional.logo_url} 
                     alt="Logo Clínica" 
                     fill
                     className="object-contain mix-blend-multiply"
                     unoptimized={true}
                   />
                 </div>
               )}
               <div className="w-full">
                 <Input 
                   value={headerTitle} 
                   onChange={(e) => setHeaderTitle(e.target.value)}
                   className="text-center font-black text-lg text-slate-800 uppercase tracking-wide border-none bg-transparent focus-visible:ring-0 p-0 h-auto placeholder:text-slate-300 w-full shadow-none" 
                   placeholder="NOME DA CLÍNICA"
                 />
                 <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium mt-1">
                    <span>{professional?.city}</span>
                    {professional?.crp && <span>• {getRegistryLabel(professional?.occupation_type)}: {professional.crp}</span>}
                 </div>
               </div>
            </div>

            <Textarea className="min-h-[300px] max-w-full font-serif leading-relaxed text-base rounded-t-none border-slate-200 focus-visible:ring-0 focus-visible:border-brand-primary" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
          </div>
        </div>
        </div>

        <DialogFooter className="mt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full text-white hover:brightness-90 transition-all font-black h-12 shadow-lg shadow-brand-primary/20 border-0 !opacity-100"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            FINALIZAR E ARQUIVAR DOCUMENTO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}