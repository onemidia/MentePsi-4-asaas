import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const { userId, planId, billingType, creditCard } = await req.json()

    // 1. Buscar detalhes do plano
    const { data: plan } = await supabaseAdmin
      .from('saas_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // 2. Buscar asaas_customer_id
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('asaas_customer_id')
      .eq('user_id', userId)
      .single()

    if (!subscription?.asaas_customer_id) {
      return NextResponse.json({ error: 'Customer ID not found. Create customer first.' }, { status: 400 })
    }

    // 3. Criar assinatura no Asaas
    const subscriptionPayload: any = {
      customer: subscription.asaas_customer_id,
      billingType: billingType || 'CREDIT_CARD',
      value: plan.price_monthly,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias a partir de hoje
      cycle: 'MONTHLY',
      description: `Assinatura MentePsi - ${plan.name}`,
      externalReference: userId
    }

    if (billingType === 'CREDIT_CARD' && creditCard) {
      subscriptionPayload.creditCard = creditCard
      subscriptionPayload.creditCardHolderInfo = creditCard.holderInfo
    }

    const asaasResponse = await fetch(`${process.env.ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY!
      },
      body: JSON.stringify(subscriptionPayload)
    })

    const asaasData = await asaasResponse.json()

    if (asaasData.errors) {
      return NextResponse.json({ error: asaasData.errors[0].description }, { status: 400 })
    }

    // 4. Salvar asaas_subscription_id e atualizar status
    await supabaseAdmin
      .from('subscriptions')
      .update({
        asaas_subscription_id: asaasData.id,
        plan_id: planId,
        status: 'pending', // Aguardando pagamento
        billing_type: billingType,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    return NextResponse.json({ 
      subscriptionId: asaasData.id,
      status: asaasData.status,
      invoiceUrl: asaasData.invoiceUrl // URL para pagamento (boleto/pix)
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}