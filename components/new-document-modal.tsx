'use client'

import React, { useState, useEffect } from 'react'
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
import { Plus, Loader2, Sparkles, FileText, Lock } from "lucide-react"
import { createClient } from '@/lib/client'
import { useToast } from "@/hooks/use-toast"
import { useSubscription } from '@/hooks/use-subscription'

const TEMPLATES: Record<string, string> = {
  "Atestado": "ATESTADO PSICOLÓGICO\n\nAtesto para os devidos fins que o(a) paciente [NOME], inscrito(a) no CPF [CPF], encontra-se em acompanhamento psicológico sob meus cuidados, necessitando de [DIAS] dias de afastamento de suas atividades para tratamento de saúde.\n\nCID-10: [CID]\n\n[CIDADE], [DATA].",
  "Declaração": "DECLARAÇÃO DE COMPARECIMENTO\n\nDeclaro que o(a) paciente [NOME], inscrito(a) no CPF [CPF], compareceu a atendimento psicológico neste consultório no dia [DATA] das [HORA_INICIO] às [HORA_FIM].\n\n[CIDADE], [DATA].",
  "Contrato": "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PSICOLOGIA\n\nCONTRATANTE: [NOME], CPF [CPF].\nCONTRATADO: [NOME_PROFISSIONAL], CRP [CRP_PROFISSIONAL].\n\nCLÁUSULA 1 - DO OBJETO\nO presente contrato tem por objeto a prestação de serviços de psicologia clínica...\n\n[DATA].",
  "Recibo de Pagamento": "RECIBO\n\nRecebi de [NOME], CPF [CPF], a importância de R$ [VALOR] referente a sessões de psicoterapia realizadas em [DATA].\n\n[CIDADE], [DATA].",
  "Recibo Anual IRPF": "RECIBO PARA FINS DE IMPOSTO DE RENDA\n\nRecebi de [NOME], CPF [CPF], o valor total de R$ [VALOR_TOTAL] referente a atendimentos psicológicos realizados durante o ano de 2025.\n\n[DATA].",
  "Testes Psicológicos": "PROTOCOLO DE AVALIAÇÃO PSICOLÓGICA\n\nPACIENTE: [NOME]\nDATA: [DATA]\n\nINSTRUMENTOS UTILIZADOS:\n1. ...\n\nRESULTADOS OBTIDOS:\n...",
  "Anamnese": "FICHA DE ANAMNESE\n\nPACIENTE: [NOME]\nDATA: [DATA]\n\nQUEIXA PRINCIPAL:\n...\n\nHISTÓRICO:\n...",
  "Prontuários Gerais": "REGISTRO DE PRONTUÁRIO\n\nPACIENTE: [NOME]\nDATA: [DATA]\n\nDESCRIÇÃO DO ATENDIMENTO:\n...",
  "Laudo": "LAUDO PSICOLÓGICO\n\n1. IDENTIFICAÇÃO\nNome: [NOME]\nCPF: [CPF]\n\n2. DEMANDA\n...\n\n3. PROCEDIMENTO\n...\n\n4. ANÁLISE\n...\n\n5. CONCLUSÃO\n...\n\nTaquaritinga, [DATA].",
  "Relatórios Psicológicos": "RELATÓRIO PSICOLÓGICO\n\n1. IDENTIFICAÇÃO\nNome: [NOME]\n\n2. DESCRIÇÃO DA DEMANDA\n...\n\n3. PROCEDIMENTO\n...\n\n4. ANÁLISE\n...\n\n5. CONCLUSÃO\n...\n\n[DATA].",
  "Parecer": "PARECER TÉCNICO\n\nSOLICITANTE: ...\nASSUNTO: ...\n\n1. EXPOSIÇÃO DE MOTIVOS\n...\n\n2. ANÁLISE TÉCNICA\n...\n\n3. CONCLUSÃO\n...\n\n[DATA].",
  "Comprovante de Sessões": "COMPROVANTE DE SESSÕES\n\nCertifico que [NOME] realizou as seguintes sessões de psicoterapia:\n\n- Data: [DATA]\n\n[CIDADE], [DATA].",
  "Termo LGPD": `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO PARA TRATAMENTO DE DADOS (LGPD)

Eu, [NOME DO PACIENTE], inscrito(a) no CPF sob o nº [CPF DO PACIENTE], autorizo o(a) Psicólogo(a) [NOME DO PROFISSIONAL], inscrito(a) no CRP [CRP], a realizar o tratamento dos meus dados pessoais sensíveis, especificamente os dados de saúde mental, coletados durante os atendimentos psicológicos, para fins exclusivos de prestação de serviços de psicologia, evolução de prontuário e cumprimento de obrigações legais e regulatórias, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais - LGPD).

Estou ciente de que:
1. Os dados serão armazenados em ambiente seguro e com acesso restrito.
2. O sigilo profissional será mantido conforme o Código de Ética Profissional do Psicólogo.
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
    
    const safeReplace = (val: string | undefined | null) => val ? val.trim() : "_______"

    return template
      .replace(/\[NOME\]/g, safeReplace(patient?.full_name))
      .replace(/\[CPF\]/g, safeReplace(patient?.cpf))
      .replace(/\[NOME DO PACIENTE\]/g, safeReplace(patient?.full_name))
      .replace(/\[CPF DO PACIENTE\]/g, safeReplace(patient?.cpf))
      .replace(/\[NOME DO PROFISSIONAL\]/g, safeReplace(professional?.full_name))
      .replace(/\[CRP\]/g, safeReplace(professional?.crp))
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

  const handleSubmit = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Pega os dados reais para substituição
    const nomeReal = professional?.full_name || "";
    const crpReal = professional?.crp || "";

    // 2. LIMPEZA SEGURA: Substitui apenas os termos entre colchetes
    // Não usamos mais o comando que apaga tudo do final para não perder conteúdo
    let conteudoFinal = formData.content
      .replace(/\[Nome do Psicólogo\]/gi, nomeReal)
      .replace(/\[Número do CRP\]/gi, crpReal)
      .replace(/\[CRP\]/gi, crpReal)
      .replace(/\[DATA\]/g, new Date().toLocaleDateString('pt-BR'))
      // Remove apenas se houver uma assinatura IDENTICA à que vamos colocar ou placeholders
      .replace(/Nome: {nomeReal}/g, '')
      .replace(/CRP: {crpReal}/g, '')
      .trim();

    // 3. Salvamento
    // Salvamos exatamente o que está no editor (já limpo de colchetes)
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
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold"><Plus className="mr-2 h-4 w-4" /> Novo Documento</Button>}
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-[800px] h-auto max-h-[95vh] bg-white dark:bg-slate-900 flex flex-col">
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
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
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

          <div className="space-y-2 mb-4 bg-teal-50/50 p-3 rounded-lg border border-teal-100">
            <Label className="text-teal-800 font-bold flex items-center gap-2">
              <Sparkles size={16} /> Instruções Especiais para a IA
            </Label>
            <div className="flex gap-2">
              <Input 
                placeholder="Ex: Foque na queixa de insônia e use tom mais formal..." 
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                className="bg-white border-teal-200 focus:ring-teal-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Limite: 30 documentos/mês. Use este campo para refinar o resultado.
            </p>
          </div>

          <div className="space-y-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
              <Label>Corpo do Documento</Label>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleGenerateAI} 
                  disabled={generating || !formData.type}
                  className="w-full sm:w-auto bg-white hover:bg-teal-50 text-teal-600 border-teal-200 font-bold transition-all"
                >
                  {generating ? <Loader2 className="animate-spin mr-2 h-3 w-3" /> : <Sparkles className="mr-2 h-3 w-3" />}
                  Gerar do Zero
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefineWithAI} 
                  disabled={generating || !formData.content}
                  className="w-full sm:w-auto bg-white hover:bg-amber-50 text-amber-600 border-amber-200 font-bold transition-all"
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
                    {professional?.crp && <span>• CRP: {professional.crp}</span>}
                 </div>
               </div>
            </div>

            <Textarea className="min-h-[300px] max-w-full font-serif leading-relaxed text-base rounded-t-none border-slate-200 focus-visible:ring-0 focus-visible:border-teal-500" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
          </div>
        </div>
        </div>

        <DialogFooter className="mt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black h-12 shadow-lg shadow-teal-100 !opacity-100"
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