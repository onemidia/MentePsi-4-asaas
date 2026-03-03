import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const authToken = req.headers.get('asaas-access-token') || req.headers.get('asaas-token') || req.headers.get('Asaas-Token')
    const secretToken = process.env.ASAAS_WEBHOOK_TOKEN

    if (secretToken && authToken !== secretToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, payment } = body

    const successEvents = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_AUTHORIZED']

    if (successEvents.includes(event)) {
      const userId = payment?.externalReference
      const asaasCustomerId = payment?.customer

      // 1. BUSCA DADOS DO CLIENTE NO ASAAS (Para ter o e-mail atualizado na hora do pagamento)
      const customerResponse = await fetch(`${process.env.ASAAS_API_URL}/customers/${asaasCustomerId}`, {
        headers: { 'access_token': process.env.ASAAS_API_KEY! }
      })
      const customerData = await customerResponse.json()
      const currentAsaasEmail = customerData.email

      console.log(`[WEBHOOK] Tentando ativar: ID=${userId} | Email=${currentAsaasEmail}`)

      // 2. LÓGICA DE BUSCA EM CAMADAS (FALLBACK)
      let profileToUpdate = null

      // Camada 1: Busca pelo ID (Mais seguro, evita erro se o e-mail mudar)
      if (userId) {
        const { data } = await supabaseAdmin.from('profiles').select('id, email').eq('id', userId).single()
        if (data) profileToUpdate = data
      }

      // Camada 2: Busca pelo E-mail (Se o ID falhar ou for cliente antigo)
      if (!profileToUpdate && currentAsaasEmail) {
        const { data } = await supabaseAdmin.from('profiles').select('id, email').eq('email', currentAsaasEmail).single()
        if (data) profileToUpdate = data
      }

      if (!profileToUpdate) {
        console.error("❌ [WEBHOOK] Cliente não localizado por ID ou E-mail.")
        return NextResponse.json({ received: true }, { status: 200 })
      }

      // 3. ATUALIZAÇÃO FINAL
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_status: 'active',
          plan: 'professional',
          updated_at: new Date().toISOString(),
          asaas_customer_id: asaasCustomerId // Guardamos o ID do Asaas para futuras cobranças
        })
        .eq('id', profileToUpdate.id)

      if (error) {
        console.error("❌ [WEBHOOK] Erro ao salvar no banco:", error.message)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      console.log(`✅ [WEBHOOK] Usuário ${profileToUpdate.email} ativado com sucesso.`)
    }

    return NextResponse.json({ received: true }, { status: 200 })

  } catch (error: any) {
    console.error('💥 [WEBHOOK ERROR]:', error.message)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}