import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { event, payment } = body

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      
      const userId = payment.externalReference

      if (!userId) {
        return NextResponse.json({ received: true })
      }

      // 1. Com o modelo de plano único, o plano é sempre 'profissional'.
      const planoComprado = 'profissional';

      // 2. ATUALIZA A TABELA DO SAAS (Admin)
      const { error: errorProfiles } = await supabaseAdmin
        .from('profiles')
        .update({ 
          subscription_status: 'active',
          plan_type: 'profissional',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (errorProfiles) console.error("Erro ao atualizar a tabela 'profiles':", errorProfiles)

      // 3. ATUALIZA A TABELA DO UTILIZADOR (Configurações)
      const { error: errorProf } = await supabaseAdmin
        .from('professional_profile')
        .update({ 
          subscription_status: 'active',
          plan_type: 'profissional',
        })
        .eq('id', userId)

      if (errorProf) console.error("Erro ao atualizar a tabela 'professional_profile':", errorProf)

      // ------------------------------------------------------------------
      // 4. NOVO: GUARDA O REGISTO NO HISTÓRICO DE PAGAMENTOS
      // ------------------------------------------------------------------
      const { error: errorHistory } = await supabaseAdmin
        .from('payment_history')
        .insert({
          user_id: userId,
          amount: payment.value || 0,
          plan_name: planoComprado,
          status: 'CONFIRMADO',
          asaas_payment_id: payment.id || 'N/A'
        })

      if (errorHistory) {
         console.error("Erro ao guardar histórico de pagamento:", errorHistory)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Erro no handler do Webhook:', err)
    return NextResponse.json(
      { error: 'Internal Error' },
      { status: 500 }
    )
  }
}