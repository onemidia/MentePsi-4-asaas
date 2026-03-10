import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const authToken =
    const supabaseAdmin = createAdminClient()
      req.headers.get('asaas-access-token') ||
      req.headers.get('asaas-token') ||
      req.headers.get('Asaas-Token')

    const secretToken = process.env.ASAAS_WEBHOOK_TOKEN

    if (secretToken && authToken !== secretToken) {
      console.error('❌ [WEBHOOK] Token inválido')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, payment } = body

    console.log('📩 [WEBHOOK] Evento recebido:', event)

    const successEvents = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED',
      'PAYMENT_AUTHORIZED'
    ]

    if (successEvents.includes(event) && payment) {
      const userId = payment.externalReference
      const asaasCustomerId = payment.customer

      if (!userId) {
        console.error('❌ [WEBHOOK] externalReference não encontrado')
        return NextResponse.json({ received: true }, { status: 200 })
      }

      let profileToUpdate: any = null

      // 🔎 Busca por ID (Sua lógica original mantida)
      const { data: profileById } = await supabaseAdmin
        .from('professional_profile')
        .select('user_id, email')
        .eq('user_id', userId)
        .maybeSingle()

      if (profileById) {
        profileToUpdate = profileById
      }

      // 🔎 Fallback por e-mail (Sua lógica original mantida)
      if (!profileToUpdate && asaasCustomerId) {
        const customerResponse = await fetch(
          `${process.env.ASAAS_API_URL}/customers/${asaasCustomerId}`,
          { headers: { access_token: process.env.ASAAS_API_KEY! } }
        )
        const customerData = await customerResponse.json()
        const currentAsaasEmail = customerData?.email?.toLowerCase()

        if (currentAsaasEmail) {
          const { data: userAuth } = await supabaseAdmin
            .from('professional_profile')
            .select('user_id, email')
            .ilike('email', currentAsaasEmail)
            .maybeSingle()
          
          if (userAuth) profileToUpdate = userAuth
        }
      }

      if (!profileToUpdate) {
        console.error('❌ [WEBHOOK] Cliente não localizado.')
        return NextResponse.json({ received: true }, { status: 200 })
      }

      console.log(`🚀 [WEBHOOK] Ativando assinatura profissional para: ${profileToUpdate.email}`)

      // --- INÍCIO DA CIRURGIA PREMIUM ---

      // 1. Busca o ID do plano Professional
      const { data: planPro } = await supabaseAdmin
        .from('saas_plans')
        .select('id')
        .eq('slug', 'professional')
        .single()

      if (!planPro) throw new Error('Plano Professional não encontrado no banco.')

      // 2. Cancela qualquer assinatura anterior (Trial ou outra) para este usuário
      await supabaseAdmin
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', profileToUpdate.user_id)
        .in('status', ['trialing', 'active'])

      // 3. Insere a nova assinatura ativa na tabela correta
      const { error: subError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          user_id: profileToUpdate.user_id,
          plan_id: planPro.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
          asaas_customer_id: asaasCustomerId,
          asaas_subscription_id: payment.subscription || null,
          billing_type: payment.billingType || 'CREDIT_CARD',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (subError) {
        console.error('❌ [WEBHOOK] Erro ao criar assinatura:', subError.message)
        return NextResponse.json({ received: true }, { status: 200 })
      }

      console.log('✅ [WEBHOOK] Assinatura Subscriptions ativada com sucesso.')
      // --- FIM DA CIRURGIA PREMIUM ---
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error('💥 [WEBHOOK ERROR]:', error.message)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}