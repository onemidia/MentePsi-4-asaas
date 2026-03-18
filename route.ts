import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import JSZip from 'jszip'

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