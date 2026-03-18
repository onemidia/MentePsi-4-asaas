import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Apenas leitura, não precisamos setar cookies nesta rota
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const psychologistId = user.id

    // Busca o perfil do profissional para o cabeçalho dos PDFs
    const { data: profile } = await supabase
      .from('professional_profile')
      .select('*')
      .eq('user_id', psychologistId)
      .single()

    // 1. Busca os pacientes vinculados ao psicólogo
    const { data: patients } = await supabase
      .from('patients')
      .select('*')
      .eq('psychologist_id', psychologistId)

    const patientIds = patients?.map(p => p.id) || []

    // 2. Busca outras tabelas baseadas no psychologist_id ou patient_id
    const { data: appointments } = await supabase.from('appointments').select('*').eq('psychologist_id', psychologistId)
    const { data: financial } = await supabase.from('financial_transactions').select('*').eq('psychologist_id', psychologistId)
    
    let evolutions = [], goals = [], documents = []
    
    if (patientIds.length > 0) {
      const [evoRes, goalsRes, docsRes] = await Promise.all([
        supabase.from('clinical_evolutions').select('*').in('patient_id', patientIds),
        supabase.from('patient_goals').select('*').in('patient_id', patientIds),
        supabase.from('patient_documents').select('*').in('patient_id', patientIds)
      ])
      evolutions = evoRes.data || []
      goals = goalsRes.data || []
      documents = docsRes.data || []
    }

    // 3. Monta um arquivo de texto com as URLs dos documentos no Storage
    const documentUrls = documents.map(d => d.file_url || d.url || d.file_path).filter(Boolean)

    // 4. Cria e popula o arquivo ZIP com o JSZip
    const zip = new JSZip()
    zip.file('pacientes.json', JSON.stringify(patients || [], null, 2))
    zip.file('agendamentos.json', JSON.stringify(appointments || [], null, 2))
    zip.file('transacoes_financeiras.json', JSON.stringify(financial || [], null, 2))
    zip.file('evolucoes_clinicas.json', JSON.stringify(evolutions || [], null, 2))
    zip.file('metas_pacientes.json', JSON.stringify(goals || [], null, 2))
    zip.file('documentos_pacientes.json', JSON.stringify(documents || [], null, 2))
    zip.file('urls_arquivos_storage.txt', documentUrls.length > 0 ? documentUrls.join('\n') : 'Nenhum arquivo vinculado no momento.')

    // 5. Cria a pasta para os PDFs e gera um PDF de prontuário por paciente
    const pdfFolder = zip.folder('Prontuarios_PDF')
    
    for (const patient of patients || []) {
      const doc = new jsPDF()
      let currentY = 20
      
      // Cabeçalho do PDF
      doc.setFontSize(16)
      doc.setTextColor(13, 148, 136) // Cor Teal do MentePsi
      doc.text(`Prontuário Clínico - ${profile?.clinic_name || profile?.full_name || 'Clínica MentePsi'}`, 14, currentY)
      currentY += 10

      // 1. Dados Pessoais e Contato
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.text(`Nome: ${patient.full_name || 'Não informado'}`, 14, currentY)
      doc.text(`Nascimento: ${patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : 'N/A'}`, 120, currentY)
      currentY += 6

      doc.text(`CPF: ${patient.cpf || 'N/A'}`, 14, currentY)
      doc.text(`RG: ${patient.rg || 'N/A'}`, 120, currentY)
      currentY += 6

      doc.text(`Telefone: ${patient.phone || 'N/A'}`, 14, currentY)
      currentY += 6

      const enderecoCompleto = [patient.address, patient.address_number, patient.neighborhood, patient.city, patient.state].filter(Boolean).join(', ')
      doc.text(`Endereço: ${enderecoCompleto || 'N/A'}`, 14, currentY)
      currentY += 10

      // Função auxiliar para evitar quebra de página errada nos títulos
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > 270) {
          doc.addPage()
          currentY = 20
        }
      }

      // 4. Dados de Saúde
      if (patient.medical_history || patient.medications) {
        checkPageBreak(30)
        doc.setFontSize(12)
        doc.setTextColor(13, 148, 136)
        doc.text('Dados de Saúde', 14, currentY)
        
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Histórico Médico', 'Medicamentos em Uso']],
          body: [[
            patient.medical_history || 'Nenhum registro.',
            patient.medications || 'Nenhum registro.'
          ]],
          styles: { fontSize: 9 },
          headStyles: { fillColor: [71, 85, 105] },
          theme: 'grid'
        })
        currentY = (doc as any).lastAutoTable.finalY + 10
      }

      // 3. Histórico de Sessões (Agenda)
      const patientApts = (appointments || [])
        .filter((a: any) => a.patient_id === patient.id)
        .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()) // Recentes primeiro

      if (patientApts.length > 0) {
        checkPageBreak(30)
        doc.setFontSize(12)
        doc.setTextColor(13, 148, 136)
        doc.text('Histórico de Sessões', 14, currentY)
        
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Data', 'Horário', 'Status', 'Modalidade']],
          body: patientApts.map((a: any) => {
            const d = new Date(a.start_time)
            return [
              d.toLocaleDateString('pt-BR'),
              d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              a.status || 'Agendado',
              a.modality || 'Individual'
            ]
          }),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [13, 148, 136] }
        })
        currentY = (doc as any).lastAutoTable.finalY + 10
      }

      // Histórico de Evoluções
      const patientEvolutions = evolutions
        .filter((e: any) => e.patient_id === patient.id)
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      
      if (patientEvolutions.length > 0) {
        checkPageBreak(30)
        doc.setFontSize(12)
        doc.setTextColor(13, 148, 136)
        doc.text('Evoluções Clínicas', 14, currentY)

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Data', 'Evolução Clínica']],
          body: patientEvolutions.map((e: any) => [
            new Date(e.created_at).toLocaleDateString('pt-BR'),
            e.content
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [13, 148, 136] }
        })
        currentY = (doc as any).lastAutoTable.finalY + 10
      }

      // Metas Terapêuticas
      const patientGoals = goals.filter((g: any) => g.patient_id === patient.id)
      
      if (patientGoals.length > 0) {
        checkPageBreak(30)
        doc.setFontSize(12)
        doc.setTextColor(13, 148, 136)
        doc.text('Metas Terapêuticas', 14, currentY)
        
        autoTable(doc, {
          startY: currentY + 4,
          head: [['Status', 'Meta', 'Descrição']],
          body: patientGoals.map((g: any) => [
            g.status,
            g.title,
            g.description || ''
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [71, 85, 105] }
        })
        currentY = (doc as any).lastAutoTable.finalY + 10
      }

      // 2. Seção Financeira
      const patientFinancial = (financial || [])
        .filter((t: any) => t.patient_id === patient.id)
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Mais recentes primeiro

      if (patientFinancial.length > 0) {
        checkPageBreak(30)
        doc.setFontSize(12)
        doc.setTextColor(13, 148, 136)
        doc.text('Histórico Financeiro', 14, currentY)

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Data', 'Descrição', 'Valor (R$)', 'Status']],
          body: patientFinancial.map((t: any) => {
            const situacao = t.status === 'paid' || t.status === 'Pago' ? 'Pago' : 'Pendente'
            return [
              new Date(t.created_at).toLocaleDateString('pt-BR'),
              t.description || 'Sessão',
              Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
              situacao
            ]
          }),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [71, 85, 105] }
        })
      }

      // Gera o buffer e salva o arquivo no formato ArrayBuffer no ZIP
      const pdfArrayBuffer = doc.output('arraybuffer')
      const safeFileName = `Prontuario_${patient.full_name.trim().replace(/[^a-zA-Z0-9À-ÿ]/g, '_')}.pdf`
      pdfFolder?.file(safeFileName, pdfArrayBuffer)
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' })

    return new NextResponse(zipContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="backup_mentepsi_${new Date().toISOString().split('T')[0]}.zip"`
      }
    })

  } catch (error: any) {
    console.error('Erro na exportação do backup:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
