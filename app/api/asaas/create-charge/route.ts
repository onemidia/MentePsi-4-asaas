import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, value, type, name, email, cpfCnpj, phone } = body 

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
    
    // Se o cliente já existir ou for criado, pegamos o ID. 
    // O Asaas pode retornar erro se o CPF já existir, mas geralmente retorna o cliente.
    const customerId = customerData.id || customerData.errors?.[0]?.description?.match(/cus_[a-zA-Z0-0]+/)?.[0];

    if (!customerId && !customerData.id) {
       // Se der erro de CPF duplicado, o ideal é buscar o cliente, mas para este teste:
       console.error('Erro ao processar cliente:', customerData)
       return NextResponse.json({ error: 'Erro ao identificar cliente no Asaas.' }, { status: 400 })
    }

    const finalCustomerId = customerData.id;

    // 2. CRIAR A COBRANÇA USANDO O ID DO CLIENTE
    const response = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'access_token': asaasKey 
      },
      body: JSON.stringify({
        customer: finalCustomerId, 
        billingType: type || 'PIX',
        value: value,
        dueDate: new Date().toISOString().split('T')[0],
        externalReference: userId,
        description: `Assinatura MentePsi - Plano Profissional`,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
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