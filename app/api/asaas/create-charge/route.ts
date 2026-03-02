import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // CORREÇÃO 1: Pegamos 'price' também, pois é o nome que vem do seu botão
    const { userId, value, price, type, name, email, cpfCnpj, phone, creditCard, creditCardHolderInfo } = body 

    // Define o valor final (se value for nulo, usa price)
    const finalValue = value || price

    const asaasKey = process.env.ASAAS_API_KEY
    const asaasUrl = process.env.ASAAS_API_URL

    if (!asaasKey || !asaasUrl) {
      return NextResponse.json({ error: 'Configuração do Asaas ausente na Vercel.' }, { status: 500 })
    }

    // 1. CRIAR OU IDENTIFICAR O CLIENTE NO ASAAS
    const customerResponse = await fetch(`${asaasUrl}/customers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'access_token': asaasKey 
      },
      body: JSON.stringify({
        name: name || 'Usuário MentePsi',
        email: email,
        cpfCnpj: cpfCnpj,
        phone: phone,
        externalReference: userId
      })
    })
    
    const customerData = await customerResponse.json()
    
    // CORREÇÃO 2: Garantimos que o ID do cliente seja capturado mesmo se ele já existir
    const customerId = customerData.id || (customerData.errors?.[0]?.description?.match(/cus_[a-zA-Z0-9]+/)?.[0]);

    if (!customerId) {
       console.error('Erro ao processar cliente:', customerData)
       return NextResponse.json({ error: 'Erro ao identificar cliente no Asaas.' }, { status: 400 })
    }

    // 2. CRIAR A COBRANÇA USANDO O ID DO CLIENTE
    const response = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'access_token': asaasKey 
      },
      body: JSON.stringify({
        customer: customerId, // Usando a variável corrigida
        billingType: type || 'PIX',
        value: finalValue, // ✅ Usando o valor garantido (value ou price)
        dueDate: new Date().toISOString().split('T')[0],
        externalReference: userId,
        description: `Assinatura MentePsi - Plano Profissional`,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        // Campos necessários para Cartão de Crédito:
        creditCard: creditCard,
        creditCardHolderInfo: creditCardHolderInfo,
        remoteIp: req.headers.get('x-forwarded-for') || '127.0.0.1'
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro na cobrança:', data)
      return NextResponse.json({ error: data.errors?.[0]?.description || 'Erro no checkout' }, { status: 400 })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
  }
}