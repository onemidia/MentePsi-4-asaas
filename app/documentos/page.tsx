'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import { Search, FileText, User, Printer, Loader2, Trash2, MessageCircle, ChevronLeft, ChevronRight, Plus, Lock } from "lucide-react"
import { NewDocumentModal } from '@/components/new-document-modal'
import { useToast } from "@/hooks/use-toast"

const THEMES = [
  { id: 'padrao', name: 'Padrão', primary: '#0d9488', secondary: '#f0fdfa' },
  { id: 'oceano', name: 'Oceano', primary: '#1e40af', secondary: '#eff6ff' },
  { id: 'natureza', name: 'Natureza', primary: '#166534', secondary: '#f0fdf4' },
  { id: 'lavanda', name: 'Lavanda', primary: '#6b21a8', secondary: '#faf5ff' },
  { id: 'grafite', name: 'Grafite', primary: '#334155', secondary: '#f8fafc' },
];

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [professionalData, setProfessionalData] = useState<any>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Controle de Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  const fetchDocuments = async () => {
    try {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profTheme } = await supabase
      .from('professional_profile')
      .select('theme_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const fetchedTheme = profTheme?.theme_name || 'padrao';
    const activeTheme = THEMES.find(t => t.id === fetchedTheme) || THEMES[0];

    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--primary-color', activeTheme.primary);
      document.documentElement.style.setProperty('--secondary-color', activeTheme.secondary);
    }
    setIsThemeLoaded(true);

    const from = (currentPage - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    let query = supabase
      .from('official_reports')
      .select(`
        id,
        created_at,
        title,
        type,
        content,
        professional_name,
        professional_crp,
        clinic_name,
        clinic_logo_url,
        patient_id,
        patients (
          full_name,
          cpf,
          phone
        )
      `, { count: 'exact' })
      .eq('psychologist_id', user.id) // CIRURGIA: Trava de segurança SaaS
      .order('created_at', { ascending: false })
      // 🛡️ BLINDAGEM DA PÁGINA DOCUMENTOS: Ignora arquivos de upload/comprovantes
      .not('title', 'ilike', '%Comprovante%')
      .range(from, to)

    // AÇÃO 2: Aplicar trava de segurança para assistentes
    const role = localStorage.getItem('currentView');
    if (role === 'assistant') {
      query = query.eq('is_private', false);
    }

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`)
    }

    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00.000Z`)
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59.999Z`)
    }

    const { data, count } = await query
    if (data) setReports(data)
    if (count !== null) setTotalCount(count)
    } catch (e) {
      console.error('Erro ao buscar documentos:', e)
      toast({ variant: 'destructive', title: 'Erro de conexão', description: 'Não foi possível buscar os documentos. Verifique sua internet.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [searchTerm, startDate, endDate, currentPage, itemsPerPage])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca dados do perfil profissional do psicólogo logado
      const { data } = await supabase
        .from('professional_profile')
        .select('*')
        .eq('user_id', user.id)
        .single()
        
      if (data) {
        setProfessionalData(data)
      }
      } catch (e) {
        console.warn('Erro ao buscar perfil:', e)
      }
    }
    fetchProfile()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento? Esta ação é irreversível.")) return

    try {
    const { error } = await supabase
      .from('official_reports')
      .delete()
      .eq('id', id)

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message })
    } else {
      toast({ title: "Documento excluído com sucesso" })
      setReports(prev => prev.filter(doc => doc.id !== id))
    }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro de conexão", description: e.message })
    }
  }

  const handleWhatsApp = (report: any) => {
    const phone = report.patients?.phone?.replace(/\D/g, '')
    
    if (!phone) {
      toast({ variant: "destructive", title: "Telefone não encontrado", description: "O paciente não possui número cadastrado." })
      return
    }

    const patientName = report.patients?.full_name?.split(' ')[0] || ''
    const clinicName = professionalData?.clinic_name || professionalData?.full_name || 'MentePsi'
    const message = `Olá ${patientName}, aqui está o seu documento (${report.title || report.type} - ${report.patients?.full_name}) enviado por ${clinicName}.`
    
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

    const handlePrint = (doc: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    let content = doc.content || ''
    
    // ✅ PRIORIDADE: Tenta pegar a logo do documento, se não tiver, pega do perfil carregado
    const logoUrl = doc.clinic_logo_url || professionalData?.logo_url
    const clinicName = doc.clinic_name || professionalData?.clinic_name || professionalData?.full_name || 'Documento Oficial'
    
    const patientName = doc.patients?.full_name || 'Paciente'
    const patientCpf = doc.patients?.cpf || 'Não informado'
    const docTitle = doc.title || 'Documento'

    const signatureName = professionalData?.full_name || doc.professional_name || 'Profissional'
    const signatureCrp = professionalData?.crp || doc.professional_crp || ''

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page { size: A4; margin: 1.5cm; size: auto; }
            body { 
              font-family: 'Georgia', serif; 
              font-size: 12pt; 
              line-height: 1.6; 
              color: #1a1a1a;
              padding: 0;
              margin: 0;
              -webkit-print-color-adjust: exact;
            }
            .document-container {
              page-break-inside: avoid;
              width: 100%;
            }
            .long-text {
              page-break-after: auto;
            }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0d9488; padding-bottom: 20px; }
            /* 🟢 AJUSTE DA LOGO: Forçamos a exibição se a URL existir */
            .header img { height: 100px; max-width: 250px; object-fit: contain; margin-bottom: 10px; display: block; margin-left: auto; margin-right: auto; }
            .header h1 { font-size: 18pt; margin: 0; color: #111827; text-transform: uppercase; }
            .patient-info { margin-bottom: 30px; font-size: 10pt; color: #4b5563; text-align: center; background: #f9fafb; padding: 10px; border-radius: 8px; }
            .content { text-align: justify; white-space: pre-wrap; min-height: 500px; }
            .footer { margin-top: 50px; text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 250px; margin: 0 auto 5px; }
            .prof-name { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="document-container">
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />` : ''}
              <h1>${clinicName}</h1>
            </div>
            <div class="patient-info">
              <strong>Paciente:</strong> ${patientName} | <strong>CPF:</strong> ${patientCpf}
            </div>
            <div class="content long-text">${content}</div>
            <div class="footer">
              <div class="signature-line"></div>
              <div class="prof-name">${signatureName}</div>
              <div class="prof-details">CRP: ${signatureCrp}</div>
            </div>
          </div>
          <script>
            // Aguarda a imagem carregar antes de imprimir
            window.onload = () => {
              setTimeout(() => {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (!isThemeLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--primary-color, #94a3b8)' }} />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Carregando Documentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8 print:hidden bg-slate-100 min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Central de Documentos</h1>
          <p className="text-slate-500">Atestados, Laudos e Documentos Oficiais Timbrados.</p>
        </div>
        <NewDocumentModal 
          onDocumentCreated={fetchDocuments} 
          trigger={
            <Button className="w-full sm:w-auto text-white hover:brightness-90 transition-all font-bold shadow-sm border-0" style={{ backgroundColor: 'var(--primary-color)' }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Documento
            </Button>
          }
        />
      </div>

      <Card className="border border-slate-200 shadow-md bg-white">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
          <CardTitle className="text-lg mb-2">Filtros de Busca</CardTitle>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            {/* FILTRO DE DATA PADRONIZADO */}
            <div className="flex items-center bg-white border border-slate-200 focus-within:border-[var(--primary-color)] focus-within:ring-1 focus-within:ring-[var(--primary-color)] rounded-xl px-3 gap-2 shadow-sm w-full md:w-auto transition-all">
              <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent px-1" />
              <span className="text-slate-300">|</span>
              <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="h-9 border-none focus-visible:ring-0 text-xs w-[120px] bg-transparent px-1" />
            </div>

            {/* BARRA DE PESQUISA ALINHADA */}
            <div className="w-full md:flex-1 relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[var(--primary-color)] transition-colors" />
              <Input 
                placeholder="Buscar documento ou paciente..." 
                className="pl-9 w-full bg-white border-slate-300 focus-visible:ring-[var(--primary-color)] focus-visible:border-[var(--primary-color)] rounded-xl h-9 transition-all"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-color)]" />
              <p>Sincronizando arquivos oficiais...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum laudo ou atestado encontrado.</p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-white group gap-4 w-full overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 bg-[var(--secondary-color)] rounded-lg flex items-center justify-center text-[var(--primary-color)] group-hover:bg-[var(--primary-color)] group-hover:text-white transition-colors shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {report.is_private && <Lock size={14} className='text-red-500 shrink-0' />}
                        <p className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[200px] text-sm">{report.title || report.type}</p>
                      </div>
                      <div className="flex gap-2 text-xs text-slate-500 mt-0.5 items-center">
                        <span className="flex items-center gap-1 font-medium text-slate-700 truncate max-w-[120px] sm:max-w-[200px]">
                          <User className="h-3 w-3 shrink-0" /> {report.patients?.full_name}
                        </span>
                        <span className="shrink-0 hidden sm:inline"> • </span>
                        <span className="shrink-0 hidden sm:inline">Criado em {new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleWhatsApp(report)} className="shrink-0 text-green-600 hover:bg-green-50 border-slate-200 h-8 w-8 p-0" title="Enviar no WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePrint(report)} className="shrink-0 border-0 h-8 w-8 p-0 sm:w-auto sm:px-3 hover:brightness-95" style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)' }}>
                      <Printer className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Imprimir</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)} className="shrink-0 text-red-500 hover:bg-red-50 border-slate-200 h-8 w-8 p-0" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* CONTROLES DE PAGINAÇÃO CENTRALIZADOS */}
            {totalCount > itemsPerPage && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 sm:w-auto sm:px-4 sm:h-9"
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                <span className="text-sm text-slate-600 font-medium">
                  Página {currentPage} de {Math.ceil(totalCount / itemsPerPage)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / itemsPerPage)}
                  className="h-8 w-8 p-0 sm:w-auto sm:px-4 sm:h-9"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="h-4 w-4 sm:ml-2" />
                </Button>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}