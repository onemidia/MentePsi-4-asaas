import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {

  try {

    const authToken =
      req.headers.get('asaas-access-token') ||
      req.headers.get('asaas-token')

    const secretToken = process.env.ASAAS_WEBHOOK_TOKEN

    if (secretToken && authToken !== secretToken) {
      console.error('Webhook unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, payment } = body

    console.log('Webhook event:', event)

    if (!payment) {
      return NextResponse.json({ received: true })
    }

    const userId = payment.externalReference

    if (!userId) {
      console.log('Webhook without externalReference')
      return NextResponse.json({ received: true })
    }

    const activationEvents = [
      'PAYMENT_CONFIRMED',
      'PAYMENT_RECEIVED'
    ]

    // 🔥 ATIVAÇÃO DA ASSINATURA (PIX ou Cartão Confirmado)
    if (activationEvents.includes(event)) {
      const startDate = new Date()
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 dias

      // Buscamos o ID do plano profissional para garantir o vínculo correto
      const { data: planPro } = await supabaseAdmin
        .from('saas_plans')
        .select('id')
        .eq('slug', 'professional')
        .single()

      const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planPro?.id, // Garante que o plano esteja vinculado
          status: 'active',
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          asaas_customer_id: payment.customer,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id' // Se já existir esse user_id, ele apenas atualiza
        })

      if (upsertError) {
        console.error('❌ Erro ao ativar assinatura no Supabase:', upsertError)
      } else {
        console.log('✅ Assinatura ativada/atualizada para:', userId)
      }
    }

    // ⚠️ PAGAMENTO ATRASADO
    if (event === 'PAYMENT_OVERDUE') {

      await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      console.log('Subscription overdue for', userId)

    }

    return NextResponse.json({ received: true })

  } catch (error: any) {

    console.error('Webhook error:', error)

    return NextResponse.json({ received: true })

  }
}