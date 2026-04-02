import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    const apiKey = process.env.EVOLUTION_API_KEY;
    // Garante que não haja barra no final da URL
    const baseUrl = process.env.NEXT_PUBLIC_EVOLUTION_URL?.replace(/\/$/, ""); 
    
    const instanceName = `mentepsi_${userId.slice(0, 8)}`;

    // 🎯 WEBHOOK ATUALIZADO (mentepsi.com.br é o seu SaaS)
    const WEBHOOK_URL = "https://mentepsi.com.br/api/whatsapp/webhook";

    console.log(`🚀 MentePsi: Integrando Instância ${instanceName}`);

    // 1. Tenta criar a instância (Endpoint v2: /instance/create)
    const response = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: apiKey, 
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        reject_call: true,
        groups_ignore: true,
        webhook_url: WEBHOOK_URL,
        webhook_by_events: false, // Na Go v2, 'false' envia todos os eventos pro mesmo URL
        events: [
          "QRCODE_UPDATED",
          "CONNECTION_UPDATE",
          "MESSAGES_UPSERT"
        ]
      })
    });

    const data = await response.json();

    // 2. Se a instância já existir (Erro 400 ou 403)
    if (!response.ok) {
      console.log(`ℹ️ Buscando conexão para instância ${instanceName}...`);
      
      // 🚀 ENDPOINT CORRIGIDO PARA V2: /instance/connect/{name}
      const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { 'apikey': apiKey! }
      });
      
      const connectData = await connectRes.json();
      return NextResponse.json(connectData);
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error("❌ Erro MentePsi:", error.message);
    return NextResponse.json({ error: "Erro na Evolution API" }, { status: 500 });
  }
}