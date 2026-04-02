import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    
    // Na v2 Go, o nome da instância vem em body.instance
    const instanceName = body.instance || "";
    
    // Extraímos o ID que enviamos na criação (mentepsi_ID)
    const userId = instanceName.includes('_') ? instanceName.split('_')[1] : null;

    // Se não tiver ID de usuário, ignoramos webhooks genéricos do sistema
    if (!userId) return NextResponse.json({ ok: true });

    console.log(`📩 Webhook Evolution [${body.event}]: Instância ${instanceName}`);

    /**
     * 1. EVENTO: QRCODE_UPDATED (Padronizado v2 Go)
     * Ocorre quando a API gera um novo QR ou ele expira.
     */
    if (body.event === 'QRCODE_UPDATED') {
      const qrBase64 = body.data?.qrcode?.base64 || body.data?.base64;
      
      await supabase
        .from('whatsapp_instances')
        .upsert({ 
          user_id: userId,
          instance_name: instanceName,
          qr_code: qrBase64,
          status: 'qrcode', // Status amigável para o seu front-end
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    }

    /**
     * 2. EVENTO: CONNECTION_UPDATE (Padronizado v2 Go)
     * Ocorre quando o status muda (open, connecting, close)
     */
    if (body.event === 'CONNECTION_UPDATE') {
      const state = body.data?.status || body.data?.state;

      // 'open' significa que o psicólogo leu o QR Code com sucesso
      if (state === 'open') {
        await supabase
          .from('whatsapp_instances')
          .update({ 
            status: 'connected', 
            qr_code: null, // Limpa para não exibir QR antigo
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
        
        console.log(`✅ Psicólogo ${userId} conectou o WhatsApp com sucesso.`);
      }

      // Se a conexão foi fechada (deslogou pelo celular)
      if (state === 'close' || state === 'refused') {
        await supabase
          .from('whatsapp_instances')
          .update({ 
            status: 'disconnected', 
            qr_code: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
    }

    // Retornamos sempre 200 OK para a Evolution não ficar tentando reenviar
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("❌ Erro no Webhook MentePsi:", e.message);
    // Mesmo com erro, retornamos OK para a API não entrar em loop
    return NextResponse.json({ ok: true });
  }
}