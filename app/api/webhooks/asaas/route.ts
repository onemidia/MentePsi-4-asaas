import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin' // Certifique-se de que o caminho está correto

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function enviarAvisoConfirmacao(email: string) {
  // Log de confirmação - aqui você conectará o Resend/SendGrid no futuro
  console.log(`📧 [AVISO] Enviando confirmação de pagamento para: ${email}`)
}

export async function POST(req: Request) {
  try {
    // 1. VALIDAÇÃO DE SEGURANÇA (Opcional mas recomendado)
    const authToken = req.headers.get('asaas-access-token')
    if (process.env.ASAAS_WEBHOOK_TOKEN && authToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.warn('⚠️ [WEBHOOK] Tentativa de acesso não autorizada.')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, payment, subscription } = body

    // Log para você acompanhar no terminal do VS Code
    console.log(`📩 [WEBHOOK RECEBIDO] Evento: ${event}`)

    // 2. FILTRAR APENAS PAGAMENTOS CONFIRMADOS
    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const userId = payment?.externalReference || subscription?.externalReference
      
      if (!userId) {
        console.error("❌ [WEBHOOK] ID de usuário não encontrado no externalReference.")
        return NextResponse.json({ error: 'No user ID' }, { status: 400 })
      }

      // 3. ATUALIZAÇÃO DO BANCO (Profiles)
      const { data: profileData, error: errorProfiles } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_status: 'active',
          plan: 'professional',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('email')
        .single()

      if (errorProfiles) {
        console.error("❌ [WEBHOOK] Erro ao atualizar profiles:", errorProfiles)
        throw errorProfiles
      }

      if (profileData?.email) {
        console.log(`✅ [WEBHOOK] Usuário ${profileData.email} ativado e Trial removido.`)
        await enviarAvisoConfirmacao(profileData.email)
      }
    }

    // SEMPRE responder 200 para o Asaas não ficar repetindo o aviso
    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error) {
    console.error('💥 [WEBHOOK ERROR]:', error)
    // Mesmo com erro, retornamos 200 para evitar loops de retry do Asaas em erros de lógica
    return NextResponse.json({ received: true }, { status: 200 })
  }
}