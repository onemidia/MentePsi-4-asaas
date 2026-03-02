import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function POST(req: Request) {
    try {
      const body = await req.json()
      const { userId, value, type, name, email, cpfCnpj, phone } = body 

      const asaasKey = process.env.ASAAS_API_KEY
      const asaasUrl = process.env.ASAAS_API_URL

      // 1. CRIAR O CLIENTE NO ASAAS (Obrigatório)
      const customerResponse = await fetch(`${asaasUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasKey! },
        body: JSON.stringify({
          name: name || 'Usuário MentePsi',
          email: email,
          cpfCnpj: cpfCnpj,
          phone: phone,
          externalReference: userId
        })
      })
      
      const customerData = await customerResponse.json()
      const customerId = customerData.id // Aqui pegamos o ID gerado pelo Asaas

      if (!customerId) {
        return NextResponse.json({ error: 'Falha ao criar cliente no Asaas' }, { status: 400 })
      }

      // 2. CRIAR A COBRANÇA USANDO O ID DO CLIENTE
      const response = await fetch(`${asaasUrl}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': asaasKey! },
        body: JSON.stringify({
          customer: customerId, // ✅ Agora enviamos o ID real criado acima
          billingType: type || 'PIX',
          value: value,
          dueDate: new Date().toISOString().split('T')[0],
          externalReference: userId,
          description: `Assinatura MentePsi - Plano Profissional`,
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        })
      })

      const data = await response.json()
      return NextResponse.json(data)

    } catch (error) { ... }

    // 5. Validação da Resposta do Asaas
    if (!response.ok) {
      console.error('❌ Erro API Asaas:', data)
      const errorMsg = data.errors?.[0]?.description || 'Erro desconhecido no Asaas'
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    return NextResponse.json(data)

  } catch (error: any) {
    console.error('💥 Erro ao criar cobrança:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}