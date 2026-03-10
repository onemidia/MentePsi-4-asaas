import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supabaseAdmin = createAdminClient()
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 })
    }

    const apiKey = String(process.env.ASAAS_API_KEY || '').replace(/'/g, '')
    const ASAAS_URL = process.env.ASAAS_API_URL

    if (!apiKey || !ASAAS_URL) {
      throw new Error("Configuração do Asaas (API Key ou URL) não encontrada no servidor.")
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'MentePsi'
    }

    // 1. BUSCAR CLIENTE (Supabase -> Asaas)
    let asaasCustomerId = null

    // Tenta buscar ID salvo no perfil
    const { data: dbSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('asaas_customer_id')
      .eq('user_id', userId)
      .single()

    if (dbSubscription?.asaas_customer_id) {
      asaasCustomerId = dbSubscription.asaas_customer_id
    } else {
      // Fallback: Busca o email do usuário no Auth ou Profile para pesquisar no Asaas
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
      const userEmail = user?.email

      if (userEmail) {
        const customerRes = await fetch(`${ASAAS_URL}/customers?email=${encodeURIComponent(userEmail)}`, { headers })
        const customerData = await customerRes.json()
        if (customerData.data && customerData.data.length > 0) {
          asaasCustomerId = customerData.data[0].id
        }
      }
    }

    if (!asaasCustomerId) {
      return NextResponse.json({ error: 'Cliente não encontrado no sistema de pagamentos.' }, { status: 404 })
    }

    // 2. BUSCAR ASSINATURA ATIVA
    const subRes = await fetch(`${ASAAS_URL}/subscriptions?customer=${asaasCustomerId}&status=ACTIVE`, { headers })
    const subData = await subRes.json()

    if (!subData.data || subData.data.length === 0) {
      return NextResponse.json({ status: 'inactive', message: 'Nenhuma assinatura ativa.' })
    }

    const subscription = subData.data[0]

    // 3. BUSCAR HISTÓRICO DE PAGAMENTOS (Últimos 3)
    // Ordenamos por data de vencimento decrescente para pegar os mais recentes
    const payRes = await fetch(`${ASAAS_URL}/payments?subscription=${subscription.id}&limit=3&sort=dueDate&order=desc`, { headers })
    const payData = await payRes.json()

    // 4. FORMATAR RETORNO
    const responseData = {
      status: 'active',
      planName: subscription.description || 'Plano MentePsi',
      value: subscription.value,
      nextDueDate: subscription.nextDueDate,
      cycle: subscription.cycle,
      history: payData.data?.map((p: any) => ({
        id: p.id,
        date: p.paymentDate || p.dueDate, // Data do pagamento ou vencimento se não pago
        value: p.value,
        status: p.status, // PENDING, RECEIVED, OVERDUE
        invoiceUrl: p.invoiceUrl
      })) || []
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error("Erro na API de Assinatura:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
