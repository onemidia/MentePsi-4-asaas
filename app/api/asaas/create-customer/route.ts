import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {

    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // 1️⃣ Buscar usuário no Supabase
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId)

    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const userEmail = userData.user.email

    // 2️⃣ Verificar se já existe cliente Asaas
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('asaas_customer_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (subscription?.asaas_customer_id) {
      return NextResponse.json({
        customerId: subscription.asaas_customer_id
      })
    }

    // 3️⃣ Criar cliente no Asaas
    const asaasResponse = await fetch(
      `${process.env.ASAAS_API_URL}/customers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': process.env.ASAAS_API_KEY!
        },
        body: JSON.stringify({
          name: userData.user.user_metadata?.full_name || userEmail,
          email: userEmail,
          externalReference: userId
        })
      }
    )

    const asaasData = await asaasResponse.json()

    if (!asaasResponse.ok) {
      return NextResponse.json(
        { error: asaasData.errors?.[0]?.description || 'Erro ao criar cliente Asaas' },
        { status: 400 }
      )
    }

    // 4️⃣ Atualizar subscription com customer id
    await supabaseAdmin
      .from('subscriptions')
      .update({
        asaas_customer_id: asaasData.id
      })
      .eq('user_id', userId)

    return NextResponse.json({
      customerId: asaasData.id
    })

  } catch (error: any) {

    console.error('Create Asaas Customer Error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}