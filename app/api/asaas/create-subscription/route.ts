import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {

    const { userId, planId, billingType, creditCard } = await req.json()

    if (!userId || !planId) {
      return NextResponse.json(
        { error: 'userId and planId are required' },
        { status: 400 }
      )
    }

    // 1️⃣ Buscar plano
    const { data: plan, error: planError } =
      await supabaseAdmin
        .from('saas_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    // 2️⃣ Buscar subscription
    const { data: subscription } =
      await supabaseAdmin
        .from('subscriptions')
        .select('asaas_customer_id, asaas_subscription_id')
        .eq('user_id', userId)
        .maybeSingle()

    if (!subscription?.asaas_customer_id) {
      return NextResponse.json(
        { error: 'Customer not found. Create customer first.' },
        { status: 400 }
      )
    }

    // 3️⃣ Evitar duplicação
    if (subscription.asaas_subscription_id) {
      return NextResponse.json({
        message: 'Subscription already exists',
        subscriptionId: subscription.asaas_subscription_id
      })
    }

    // 4️⃣ Criar assinatura no Asaas
    const payload: any = {
      customer: subscription.asaas_customer_id,
      billingType: billingType || 'PIX',
      value: plan.price_monthly,
      nextDueDate: new Date().toISOString().split('T')[0],
      cycle: 'MONTHLY',
      description: `Assinatura MentePsi - ${plan.name}`,
      externalReference: userId
    }

    if (billingType === 'CREDIT_CARD' && creditCard) {
      payload.creditCard = creditCard
      payload.creditCardHolderInfo = creditCard.holderInfo
    }

    const asaasResponse = await fetch(
      `${process.env.ASAAS_API_URL}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': process.env.ASAAS_API_KEY!
        },
        body: JSON.stringify(payload)
      }
    )

    const asaasData = await asaasResponse.json()

    if (!asaasResponse.ok) {
      return NextResponse.json(
        { error: asaasData.errors?.[0]?.description || 'Erro ao criar assinatura' },
        { status: 400 }
      )
    }

    // 5️⃣ Atualizar subscription
    await supabaseAdmin
      .from('subscriptions')
      .update({
        asaas_subscription_id: asaasData.id,
        plan_id: planId,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    return NextResponse.json({
      subscriptionId: asaasData.id,
      status: asaasData.status,
      invoiceUrl: asaasData.invoiceUrl
    })

  } catch (error: any) {

    console.error('Create Subscription Error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}