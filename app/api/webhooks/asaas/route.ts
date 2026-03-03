import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const authToken =
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

      // 🔎 Busca por ID
      const { data: profileById, error: idError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('id', userId)
        .maybeSingle()

      if (idError) {
        console.error('❌ [WEBHOOK] Erro buscando por ID:', idError.message)
      }

      if (profileById) {
        profileToUpdate = profileById
      }

      // 🔎 Fallback por e-mail (caso necessário)
      if (!profileToUpdate && asaasCustomerId) {
        const customerResponse = await fetch(
          `${process.env.ASAAS_API_URL}/customers/${asaasCustomerId}`,
          {
            headers: {
              access_token: process.env.ASAAS_API_KEY!
            }
          }
        )

        const customerData = await customerResponse.json()
        const currentAsaasEmail = customerData?.email?.toLowerCase()

        if (currentAsaasEmail) {
          const { data: profileByEmail, error: emailError } =
            await supabaseAdmin
              .from('profiles')
              .select('id, email')
              .ilike('email', currentAsaasEmail)
              .maybeSingle()

          if (emailError) {
            console.error(
              '❌ [WEBHOOK] Erro buscando por email:',
              emailError.message
            )
          }

          if (profileByEmail) {
            profileToUpdate = profileByEmail
          }
        }
      }

      if (!profileToUpdate) {
        console.error('❌ [WEBHOOK] Cliente não localizado.')
        return NextResponse.json({ received: true }, { status: 200 })
      }

      console.log(
        `🚀 [WEBHOOK] Ativando usuário: ${profileToUpdate.email}`
      )

      // ✅ Atualiza profiles
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_type: 'professional',
          subscription_status: 'active',
          role: 'professional',
          trial_ends_at: null,
          asaas_customer_id: asaasCustomerId
        })
        .eq('id', profileToUpdate.id)

      // ✅ Atualiza professional_profile
      const { error: profError } = await supabaseAdmin
        .from('professional_profile')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', profileToUpdate.id)

      if (updateError || profError) {
        console.error(
          '❌ [WEBHOOK] Erro ao atualizar:',
          updateError?.message || profError?.message
        )
        return NextResponse.json({ received: true }, { status: 200 })
      }

      console.log('✅ [WEBHOOK] Usuário ativado com sucesso.')
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error: any) {
    console.error('💥 [WEBHOOK ERROR]:', error.message)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}