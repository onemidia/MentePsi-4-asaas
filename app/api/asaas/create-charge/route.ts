import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  try {
    // 1. Pegamos os dados do corpo da requisição APENAS UMA VEZ
    const body = await req.json()
    const { userId, value, type, customerId } = body 

    // 2. Verificação de ID (Se não vier pelo body, tenta buscar na sessão)
    let finalUserId = userId
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      finalUserId = user?.id
    }

    if (!finalUserId) {
      console.warn('⚠️ [CHECKOUT] Falha ao identificar o usuário.')
      return NextResponse.json({ error: 'Usuário não identificado.' }, { status: 401 })
    }

    // 3. Configuração da URL Base e Chaves
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const asaasUrl = process.env.ASAAS_API_URL
    const asaasKey = process.env.ASAAS_API_KEY

    // 4. Chamada à API do Asaas
    const response = await fetch(`${asaasUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasKey!
      },
      body: JSON.stringify({
        customer: customerId, 
        billingType: type,
        value: value,
        dueDate: new Date().toISOString().split('T')[0],
        
        // --- PONTOS CRÍTICOS ---
        externalReference: finalUserId, // ✅ Usando o ID garantido (body ou session)
        description: `Assinatura MentePsi - Plano Profissional`,
        
        // ✅ Redirecionamentos
        callbackUrl: `${baseUrl}/api/webhooks/asaas`, 
        redirectUrl: `${baseUrl}/dashboard`, 
      })
    })

    const data = await response.json()

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