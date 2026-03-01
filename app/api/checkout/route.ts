import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Diagnóstico Inicial e Leitura de Variáveis
    console.log("--- INICIANDO CHECKOUT (DEBUG) ---");
    
    const body = await request.json();
    const { planName, price, userId, userEmail, cpf } = body;
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

    // Tratamento da Chave: Remove aspas simples/duplas e espaços
    const rawApiKey = process.env.ASAAS_API_KEY || '';
    const finalApiKey = String(rawApiKey).replace(/['"]/g, '').trim();
    
    // Tratamento da URL: Garante que não tenha barra no final para concatenação
    const rawUrl = process.env.ASAAS_API_URL || '';
    // Remove /api/v3 se estiver na env var para padronizar, e remove barra final
    const baseUrl = rawUrl.replace(/\/api\/v3\/?$/, '').replace(/\/+$/, '');
    const ASAAS_API_URL = `${baseUrl}/api/v3`;

    // Logs de Diagnóstico
    console.log(`[DEBUG] API Key Length: ${finalApiKey.length}`);
    // Mostra inicio e fim da chave para conferencia sem expor tudo
    console.log(`[DEBUG] API Key Preview: ${finalApiKey.substring(0, 5)}...${finalApiKey.substring(finalApiKey.length - 5)}`);
    console.log(`[DEBUG] Base URL: ${ASAAS_API_URL}`);
    console.log(`[DEBUG] User: ${userEmail} | CPF: ${cleanCpf}`);

    if (!finalApiKey || !baseUrl) {
      throw new Error("Configuração do Asaas inválida (API Key ou URL ausente).");
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': finalApiKey,
      'User-Agent': 'MentePsi-Checkout'
    };

    // 2. Buscar ou Criar Cliente
    console.log("[STEP 1] Buscando cliente...");
    const customerSearchRes = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(userEmail)}`, { headers });
    
    if (!customerSearchRes.ok) {
      const err = await customerSearchRes.json();
      console.error("[ASAAS ERROR] Falha ao buscar cliente:", JSON.stringify(err, null, 2));
      throw new Error(`Erro Asaas (Buscar Cliente): ${err.errors?.[0]?.description || 'Erro desconhecido'}`);
    }

    const customerData = await customerSearchRes.json();
    let customerId = customerData.data?.[0]?.id;

    if (customerId) {
      console.log(`[STEP 1] Cliente encontrado: ${customerId}`);
    } else {
      console.log("[STEP 1] Cliente não encontrado. Criando novo...");
      const createCustomerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: userEmail.split('@')[0],
          email: userEmail,
          cpfCnpj: cleanCpf
        })
      });

      if (!createCustomerRes.ok) {
        const err = await createCustomerRes.json();
        console.error("[ASAAS ERROR] Falha ao criar cliente:", JSON.stringify(err, null, 2));
        throw new Error(`Erro Asaas (Criar Cliente): ${err.errors?.[0]?.description || 'Erro desconhecido'}`);
      }

      const newCustomer = await createCustomerRes.json();
      customerId = newCustomer.id;
      console.log(`[STEP 1] Novo cliente criado: ${customerId}`);
    }

    // 3. Criar Assinatura
    console.log("[STEP 2] Criando assinatura...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const subscriptionPayload = {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number(price),
      nextDueDate: dueDate,
      cycle: 'MONTHLY',
      description: `Plano ${planName} - MentePsi`,
      externalReference: userId
    };

    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(subscriptionPayload)
    });

    if (!subRes.ok) {
      const err = await subRes.json();
      console.error("[ASAAS ERROR] Falha ao criar assinatura:", JSON.stringify(err, null, 2));
      throw new Error(`Erro Asaas (Criar Assinatura): ${err.errors?.[0]?.description || 'Erro desconhecido'}`);
    }

    const subscription = await subRes.json();
    console.log(`[STEP 2] Assinatura criada: ${subscription.id}`);

    // 4. Buscar Link de Pagamento (Fatura)
    console.log("[STEP 3] Buscando link de pagamento...");
    const payRes = await fetch(`${ASAAS_API_URL}/payments?subscription=${subscription.id}`, { headers });

    if (!payRes.ok) {
      const err = await payRes.json();
      console.error("[ASAAS ERROR] Falha ao buscar pagamentos:", JSON.stringify(err, null, 2));
      throw new Error(`Erro Asaas (Buscar Pagamento): ${err.errors?.[0]?.description || 'Erro desconhecido'}`);
    }

    const payData = await payRes.json();
    const invoiceUrl = payData.data?.[0]?.invoiceUrl;

    if (!invoiceUrl) {
      console.error("[LOGIC ERROR] Assinatura criada mas sem fatura gerada.", JSON.stringify(payData, null, 2));
      throw new Error("Assinatura criada, mas o link de pagamento não foi retornado pelo Asaas.");
    }

    console.log(`[SUCCESS] Link gerado: ${invoiceUrl}`);
    return NextResponse.json({ invoiceUrl });

  } catch (error: any) {
    console.error("[CRITICAL ERROR] Checkout Failed:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno no servidor durante o checkout." },
      { status: 500 }
    );
  }
}