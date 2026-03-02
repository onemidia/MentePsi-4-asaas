import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin' // 👈 AQUI A MÁGICA ACONTECE

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, value, type, customerId } = body // Agora pegamos o userId direto do corpo

    // 1. Verificação de ID (Se não vier pelo getUser, vem pelo body)
    let finalUserId = userId
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      finalUserId = user?.id
    }

    if (!finalUserId) {
      return NextResponse.json({ error: 'Usuário não identificado.' }, { status: 401 })
    }

    const body = await req.json()
    const { value, type } = body // Ex: value: 29.90, type: 'PIX'

    // 2. Configuração da URL Base (Localhost ou Produção)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 3. Chamada à API do Asaas
    const response = await fetch(`${process.env.ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY!
      },
      body: JSON.stringify({
        customer: body.customerId, // ID do cliente no Asaas
        billingType: type,
        value: value,
        dueDate: new Date().toISOString().split('T')[0],
        
        // --- PONTOS CRÍTICOS SOLICITADOS ---
        externalReference: user.id, // ✅ Garante que o Webhook saiba quem ativar
        description: `Assinatura MentePsi - Plano Profissional`,
        
        // ✅ Redirecionamento automático após pagamento (Cartão/Pix)
        callbackUrl: `${baseUrl}/api/webhooks/asaas`, // Opcional, o Asaas já tem config global, mas bom reforçar
        redirectUrl: `${baseUrl}/dashboard`, // Para onde o usuário vai após pagar
      })
    })

    const data = await response.json()

    // Mudança aqui: Verifica se a resposta foi "OK" antes de tratar os dados
    if (!response.ok) {
      console.error('Erro detalhado do Asaas:', data)
      const errorMsg = data.errors?.[0]?.description || 'Erro desconhecido no Asaas'
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Erro ao criar cobrança:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
