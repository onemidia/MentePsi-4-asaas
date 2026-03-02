import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function enviarAvisoConfirmacao(email: string) {
  console.log(`📧 [AVISO] Enviando confirmação de pagamento para: ${email}`)
}

export async function POST(req: Request) {
  try {
    // 1. VALIDAÇÃO DE SEGURANÇA CORRIGIDA (asaas-token)
    const authToken = req.headers.get('asaas-token') // ✅ Corrigido o nome do header
    
    if (process.env.ASAAS_WEBHOOK_TOKEN && authToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.warn('⚠️ [WEBHOOK] Token inválido ou não autorizado.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, payment, subscription } = body

    console.log(`📩 [WEBHOOK RECEBIDO] Evento: ${event} para ID: ${payment?.externalReference || subscription?.externalReference}`)

    // 2. FILTRAR PAGAMENTOS (Adicionado AUTHORIZED para Cartão)
    const eventosSucesso = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_AUTHORIZED']
    
    if (eventosSucesso.includes(event)) {
      const userId = payment?.externalReference || subscription?.externalReference
      
      if (!userId) {
        console.error("❌ [WEBHOOK] ID de usuário não encontrado no externalReference.")
        return NextResponse.json({ error: 'No user ID' }, { status: 400 })
      }

      // 3. ATUALIZAÇÃO DO BANCO (Profiles)
      const { data: profileData, error: errorProfiles } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_status: 'active', // ✅ Garanta que sua coluna no banco é esse nome
          plan: 'professional',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('email')
        .single()

      if (errorProfiles) {
        console.error("❌ [WEBHOOK] Erro ao atualizar profiles:", errorProfiles)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      if (profileData?.email) {
        console.log(`✅ [WEBHOOK] Usuário ${profileData.email} ativado com sucesso!`)
        await enviarAvisoConfirmacao(profileData.email)
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error: any) {
    console.error('💥 [WEBHOOK ERROR]:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}