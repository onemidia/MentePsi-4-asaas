import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
// Tenta usar a Service Role Key (Admin) para garantir permissão de escrita
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    // 1. Segurança: Validação do Token
    // Este token garante que a requisição veio realmente do Asaas
    const ASAAS_WEBHOOK_TOKEN = 'whsec_1_ami9VB3wWcsqUUbEBruKds1ipwX1o-XlXb7ZuPkeM'; // <--- COLE O TOKEN DO PAINEL AQUI
    
    const receivedToken = request.headers.get('asaas-access-token');

    if (receivedToken !== ASAAS_WEBHOOK_TOKEN) {
      console.error('[WEBHOOK] Acesso negado: Token inválido.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Leitura do Evento
    const body = await request.json();
    const { event, payment } = body;

    console.log(`[WEBHOOK] Evento recebido: ${event} | ID: ${payment?.id}`);

    // 3. Lógica de Ativação
    if (event === 'PAYMENT_CONFIRMED') {
      // O externalReference foi enviado no checkout contendo o ID do usuário (userId)
      const userId = payment.externalReference;
      const email = payment.email || 'Email não enviado no payload';

      if (userId) {
        // Atualiza o status do usuário para 'active'
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'active',
            updated_at: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('user_id', userId);

        if (error) {
          console.error('[WEBHOOK] Erro ao atualizar banco de dados:', error);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // Logs de Sucesso
        console.log('✅ WEBHOOK: Pagamento confirmado para o usuário:', email);
        console.log(`[SUCCESS] Status atualizado para ACTIVE no perfil: ${userId}`);
      } else {
        console.warn('[WEBHOOK] Aviso: Pagamento sem externalReference (userId).');
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('[WEBHOOK] Erro interno:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}