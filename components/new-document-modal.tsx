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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const { planLimits, loading: subscriptionLoading } = useSubscription()
  
  const [patients, setPatients] = useState<any[]>([])
  const [professional, setProfessional] = useState<any>(null)
  const [headerTitle, setHeaderTitle] = useState("")
  
  const [formData, setFormData] = useState({
    patient_id: preSelectedPatientId || '',
    type: '',
    title: '',
    content: ''
  })

  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: prof } = await supabase.from('professional_profile').select('*').eq('id', user.id).single()
        if (prof) {
          setProfessional(prof)
          setHeaderTitle(prof.clinic_name || prof.full_name || "")
        }

        const { data: pats } = await supabase.from('patients').select('id, full_name, cpf, phone').eq('psychologist_id', user.id).order('full_name')
        if (pats) setPatients(pats)

        if (preSelectedPatientId) {
          setFormData(prev => ({ ...prev, patient_id: preSelectedPatientId }))
        }
      }
      fetchData()
    }
  }, [open, preSelectedPatientId])

  const fillTemplate = (type: string, patientId: string) => {
    const template = TEMPLATES[type] || ""
    const patient = patients.find(p => p.id === patientId)
    const today = new Date().toLocaleDateString('pt-BR')
    
    return template
      .replace(/\[NOME\]/g, patient?.full_name || "...")
      .replace(/\[CPF\]/g, patient?.cpf || "...")
      .replace(/\[NOME DO PACIENTE\]/g, patient?.full_name || "...")
      .replace(/\[CPF DO PACIENTE\]/g, patient?.cpf || "...")
      .replace(/\[NOME DO PROFISSIONAL\]/g, professional?.full_name || "...")
      .replace(/\[CRP\]/g, professional?.crp || "...")
      .replace(/\[CIDADE\]/g, professional?.city || "Sua Cidade")
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

    setGenerating(true)
    const supabase = createClient()
    
    try {
      const selectedPatient = patients.find(p => p.id === formData.patient_id);
      if (!selectedPatient) throw new Error("Paciente não selecionado corretamente.");

      const { data: evolutions, error: evolError } = await supabase
        .from('clinical_evolutions')
        .select('content, created_at')
        .eq('patient_id', formData.patient_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (evolError) throw evolError;

      const { data, error } = await supabase.functions.invoke('generate-document-ia', {
        body: {
          documentType: formData.type,
          template: TEMPLATES[formData.type] || "",
          patientData: {
            full_name: selectedPatient.full_name || "Não informado",
            cpf: selectedPatient.cpf || "Não informado"
          },
          professionalData: {
            full_name: professional?.full_name || "Não informado",
            crp: professional?.crp || "Não informado",
            city: professional?.city || "Sua Cidade"
          },
          evolutions: evolutions || [],
          extraInstructions: "Utilize linguagem técnica e formal. Respeite as normas do CFP."
        }
      });

      if (error) {
        console.error("ERRO SUPABASE:", error);
        throw error;
      }

      // O erro pode estar aqui: a IA as vezes retorna uma string direta ou um objeto
      const generatedContent = data?.content || data?.generatedText || (typeof data === 'string' ? data : null);

      if (generatedContent) {
        setFormData(prev => ({ 
          ...prev, 
          content: generatedContent 
        }));
        toast({ title: "✨ Sucesso!", description: "O documento foi preenchido pela IA." });
      } else {
        throw new Error("A IA respondeu, mas o conteúdo veio vazio.");
      }
    } catch (error: any) {
      console.error("Erro detalhado na IA:", error);
      toast({ 
        variant: "destructive", 
        title: "Erro na IA", 
        description: error.message || "A Edge Function falhou (Status 500)." 
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleRefineWithAI = async () => {
    if (!formData.content || formData.content.length < 10) {
      toast({ variant: "destructive", title: "Texto muito curto", description: "Digite algo para a IA poder refinar." });
      return;
    }

    setGenerating(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-document-ia', {
        body: {
          documentType: "Refinamento",
          contentToRefine: formData.content, // Passamos o conteúdo atual
          extraInstructions: `
            Aja como um revisor jurídico e clínico. 
            1. Corrija gramática e ortografia.
            2. Aplique termos oficiais (ex: 'Em observância ao', 'Declaro para os devidos fins', 'Pelo presente parecer').
            3. Mantenha o conteúdo original, mas eleve o tom para formal/premium.
            4. Respeite as normas do CFP e a estrutura de documentos oficiais.
          `
        }
      });

      if (error) throw error;
      if (data?.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
        toast({ title: "✨ Documento Refinado!", description: "Termos oficiais aplicados com sucesso." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no Refinamento", description: "Verifique sua conexão ou créditos da IA." });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Constrói o cabeçalho textual para o corpo do documento
    const headerText = [
      headerTitle.toUpperCase(),
      [professional?.city, professional?.crp ? `CRP: ${professional.crp}` : ""].filter(Boolean).join(" • ")
    ].filter(Boolean).join("\n")

    // 2. Importante: Inserimos a URL da LOGO e o NOME DA CLÍNICA como campos separados
    // para que o gerador de PDF consiga renderizar a imagem e não o nome do SAAS.
    const { error } = await supabase.from('official_reports').insert({
      psychologist_id: user?.id,
      patient_id: formData.patient_id,
      title: formData.title,
      type: formData.type,
      content: `${headerText}\n\n${formData.content}`,
      professional_name: professional?.full_name, // Usa o nome pessoal para a assinatura
      professional_crp: professional?.crp,
      clinic_logo_url: professional?.logo_url, // NOVO CAMPO: Salva a URL da logo no registro
      clinic_name: headerTitle // NOVO CAMPO: Garante que o nome da clínica seja o personalizado
    })

    if (!error) {
      toast({ title: "Documento arquivado com sucesso!" })
      if (onDocumentCreated) onDocumentCreated()
      setOpen(false)
    } else {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message })
    }
    setLoading(false)
  }

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
              <Select onValueChange={handlePatientChange} value={formData.patient_id}>
                <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo de Documento</Label>
              <Select onValueChange={handleTypeChange} value={formData.type}>
                <SelectTrigger><SelectValue placeholder="Escolha o tipo..." /></SelectTrigger>
                <SelectContent>
                  {Object.keys(TEMPLATES).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Título do Arquivo</Label>
            <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
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
                 <img src={professional.logo_url} alt="Logo Clínica" className="h-20 max-w-[200px] object-contain mb-2 mix-blend-multiply" />
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