import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

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
        description: `Assinatura MentePsi - Plano Profissional`,
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

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('💥 Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}