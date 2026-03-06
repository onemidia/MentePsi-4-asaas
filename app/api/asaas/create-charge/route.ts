import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // CORREÇÃO: Pegamos 'cpf' (do seu botão) e 'cpfCnpj' para garantir
    const { 
      userId, 
      value, 
      price, 
      type, 
      name, 
      email, 
      cpf,      // Nome vindo do seu formulário
      cpfCnpj,  // Nome padrão da API
      phone, 
      creditCard, 
      creditCardHolderInfo 
    } = body 

    // Define qual CPF usar (prioriza o que não estiver vazio)
    const finalCpf = cpf || cpfCnpj
    const finalValue = value || price

    const asaasKey = process.env.ASAAS_API_KEY
    const asaasUrl = process.env.ASAAS_API_URL

    if (!asaasKey || !asaasUrl) {
      return NextResponse.json({ error: 'Configuração do Asaas ausente.' }, { status: 500 })
    }

    // 1. CRIAR OU IDENTIFICAR O CLIENTE NO ASAAS
    const customerResponse = await fetch(`${asaasUrl}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': asaasKey },
      body: JSON.stringify({
        name: name || 'Usuário MentePsi',
        email: email,
        cpfCnpj: finalCpf, // ✅ Agora enviamos o CPF correto
        phone: phone,
        externalReference: userId
      })
    })
    
    const customerData = await customerResponse.json()
    
    // Captura o ID do cliente (seja novo ou já existente)
    const customerId = customerData.id || customerData.errors?.[0]?.description?.match(/cus_[a-zA-Z0-9]+/)?.[0];

    if (!customerId) {
       console.error('❌ Falha ao processar cliente:', customerData)
       return NextResponse.json({ error: 'CPF inválido ou não informado.' }, { status: 400 })
    }

    // 2. CRIAR A COBRANÇA
    const response = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': asaasKey },
      body: JSON.stringify({
        customer: customerId, 
        billingType: type || 'CREDIT_CARD',
        value: finalValue,
        dueDate: new Date().toISOString().split('T')[0],
        externalReference: userId,
        description: `Assinatura MentePsi - Plano Profissional Ilimitado`,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        creditCard: creditCard,
        creditCardHolderInfo: creditCardHolderInfo,
        remoteIp: req.headers.get('x-forwarded-for') || '127.0.0.1'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Erro na cobrança:', data)
      return NextResponse.json({ error: data.errors?.[0]?.description }, { status: 400 })
    }

    // 3. ATUALIZAÇÃO PREVENTIVA DA ASSINATURA (Libera acesso imediato enquanto processa)
    // Busca o ID do plano Professional
    const { data: planPro } = await supabaseAdmin
      .from('saas_plans')
      .select('id')
      .eq('slug', 'professional')
      .single()

    if (planPro) {
      const { error: upsertError } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planPro.id,
          status: 'active', // Libera acesso preventivamente
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
          asaas_customer_id: customerId,
          asaas_subscription_id: data.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (upsertError) {
        console.error('⚠️ Erro ao atualizar assinatura preventiva:', upsertError)
      }
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('💥 Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}