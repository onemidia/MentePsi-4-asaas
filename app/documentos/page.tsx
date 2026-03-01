'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import { Search, FileText, User, Printer, Loader2, Trash2, MessageCircle, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { NewDocumentModal } from '@/components/new-document-modal'
import { useToast } from "@/hooks/use-toast"

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [professionalData, setProfessionalData] = useState<any>(null)
  
  // Controle de Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const supabase = createClient()
  const { toast } = useToast()

  const fetchDocuments = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`)
    }

    const { data, count } = await query
    if (data) setReports(data)
    if (count !== null) setTotalCount(count)
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
  }, [searchTerm, currentPage, itemsPerPage])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Busca dados do perfil profissional do psicólogo logado
      const { data } = await supabase
        .from('professional_profile')
        .select('*')
        .eq('id', user.id)
        .single()
        
      if (data) setProfessionalData(data)
    }
    fetchProfile()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento? Esta ação é irreversível.")) return

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
    if (professionalData?.city) {
      content = content.replace(/\[CIDADE\]/g, professionalData.city)
    }

    const patientName = doc.patients?.full_name || 'Paciente'
    const patientCpf = doc.patients?.cpf || 'Não informado'

    const clinicName = doc.clinic_name || professionalData?.clinic_name || professionalData?.full_name || 'Documento Oficial'
    const logoUrl = doc.clinic_logo_url || professionalData?.logo_url
    const docTitle = doc.title || 'Documento'

    const signatureName = professionalData?.full_name || doc.professional_name || 'Profissional'
    const signatureCrp = professionalData?.crp || doc.professional_crp || ''
    const signatureCpf = professionalData?.cpf || ''

    printWindow.document.write(`
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page { size: A4; margin: 0; }
            body { 
              font-family: 'Georgia', serif; 
              font-size: 12pt; 
              line-height: 1.6; 
              color: #1a1a1a;
              margin: 1cm;
              padding: 40px;
            }
            .header { text-align: center; margin-bottom: 60px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
            .header img { height: 80px; max-width: 200px; object-fit: contain; margin-bottom: 10px; mix-blend-mode: multiply; }
            .header h1 { font-size: 20pt; margin: 0; color: #1f2937; text-transform: uppercase; letter-spacing: 1px; }
            .patient-info { margin-bottom: 30px; font-size: 10pt; color: #666; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .content { text-align: justify; white-space: pre-wrap; min-height: 400px; }
            .footer { margin-top: 60px; text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 300px; margin: 0 auto 10px; }
            .prof-name { font-weight: bold; text-transform: uppercase; }
            .prof-details { font-size: 10pt; color: #000; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
            <h1>${clinicName}</h1>
          </div>
          <div class="patient-info">
            <strong>Paciente:</strong> ${patientName} | <strong>CPF:</strong> ${patientCpf}
          </div>
          <div class="content">${content}</div>
          <div class="footer">
            <div class="signature-line"></div>
            <div class="prof-name">${signatureName}</div>
            <div class="prof-details">
              ${signatureCrp ? `CRP: ${signatureCrp}` : ''}
              ${signatureCpf ? ` • CPF: ${signatureCpf}` : ''}
            </div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `)
    printWindow.document.close()
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
            <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Novo Documento
            </Button>
          }
        />
      </div>

      <Card className="border border-slate-200 shadow-md bg-white">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="text-lg">Filtros de Busca</CardTitle>
          <div className="relative max-w-md mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por título do documento..." 
              className="pl-10 bg-white border-slate-300"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center py-10 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
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
              {reports.slice(0, itemsPerPage).map(report => (
                <div key={report.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-white group gap-4 w-full overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[200px] text-sm">{report.title || report.type}</p>
                      <div className="flex gap-2 text-xs text-slate-500 mt-0.5 items-center">
                        <span className="flex items-center gap-1 font-medium text-slate-700 truncate max-w-[120px] sm:max-w-[200px]">
                          <User className="h-3 w-3 shrink-0" /> {report.patients?.full_name}
                        </span>
                        <span className="shrink-0 hidden sm:inline">•</span>
                        <span className="shrink-0 hidden sm:inline">Criado em {new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleWhatsApp(report)} className="shrink-0 text-green-600 hover:bg-green-50 border-slate-200 h-8 w-8 p-0" title="Enviar no WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handlePrint(report)} className="shrink-0 hover:bg-teal-50 border-slate-200 text-slate-600 h-8 w-8 p-0 sm:w-auto sm:px-3">
                      <Printer className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Imprimir</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)} className="shrink-0 text-red-500 hover:bg-red-50 border-slate-200 h-8 w-8 p-0" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Interface de Navegação (Paginação) */}
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