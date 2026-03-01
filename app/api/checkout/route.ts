import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { planName, price, userId, userEmail, cpf } = await request.json();
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';

    // Use o trim() em todas as chaves de ambiente.
    const asaasKey = process.env.ASAAS_API_KEY?.replace(/'/g, '').trim();const ASAAS_API_KEY = process.env.ASAAS_API_KEY?.trim();
    const rawAsaasUrl = process.env.ASAAS_API_URL?.trim();

    // Higienização rigorosa da URL: garante que termine em /api/v3 e não tenha barras duplicadas
    const baseUrl = rawAsaasUrl ? rawAsaasUrl.replace(/\/+$/, '').replace(/\/api\/v3\/?$/, '') : '';
    const ASAAS_API_URL = `${baseUrl}/api/v3`;

    if (!ASAAS_API_KEY || !baseUrl) {
      throw new Error("Variáveis de ambiente da Asaas não configuradas");
    }

    const headers = {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
      'User-Agent': 'MentePsi'
    };

    // Log detalhado de segurança e configuração
    console.log("--- INICIANDO CRIAÇÃO DE ASSINATURA ---");
    console.log(`Target URL: ${ASAAS_API_URL}`);
    console.log(`Token Status: ${ASAAS_API_KEY ? `Presente (Inicia com ${ASAAS_API_KEY.substring(0, 4)}...)` : 'AUSENTE'}`);

    // 1. CRIAR OU LOCALIZAR CLIENTE
    const customerSearchUrl = `${ASAAS_API_URL}/customers?email=${encodeURIComponent(userEmail)}`;
    const customerRes = await fetch(customerSearchUrl, { headers });

    // Adicione logs de erro detalhados usando JSON.stringify(errorData) quando a resposta do Asaas não for 'ok'
    if (!customerRes.ok) {
      const errorData = await customerRes.json();
      console.error('ERRO AO BUSCAR CLIENTE ASAAS:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.errors?.[0]?.description || "Falha ao comunicar com o gateway de pagamento para buscar cliente.");
    }
    
    const customerData = await customerRes.json();
    
    let customerId;
    if (customerData.data && customerData.data.length > 0) {
      customerId = customerData.data[0].id;
      console.log(`Cliente localizado: ${customerId}`);
    } else {
      console.log("Cliente não encontrado, criando novo...");
      const newCustomerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: userEmail.split('@')[0], email: userEmail, cpfCnpj: cleanCpf })
      });
      
      const newCustomer = await newCustomerRes.json();

      // se a criação do novo cliente falhar, retorne o erro específico do Asaas para o frontend.
      if (!newCustomerRes.ok) {
        console.error('ERRO AO CRIAR CLIENTE ASAAS (Detalhes):', JSON.stringify(newCustomer, null, 2));
        // Retorna o erro JSON diretamente para o frontend para depuração
        return NextResponse.json({ 
          error: "Falha ao criar cliente no Asaas", 
          details: newCustomer 
        }, { status: newCustomerRes.status });
      }

      customerId = newCustomer.id;
      console.log(`Novo cliente criado: ${customerId}`);
    }

    // 2. CRIAR A ASSINATURA (SUBSCRIPTION)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = tomorrow.toISOString().split('T')[0];

    const subscriptionPayload = {
      customer: customerId,
      billingType: 'UNDEFINED', // Garanta que o billingType da assinatura seja enviado como uma string
      value: Number(price), // Garanta que o price como número.
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

    const subscription = await subRes.json();

    // Adicione logs de erro detalhados e verifique a resposta
    if (!subRes.ok || subscription.errors) {
      console.error('ERRO AO CRIAR ASSINATURA ASAAS:', JSON.stringify(subscription, null, 2));
      const errorMessage = subscription.errors?.[0]?.description || "Falha ao criar a assinatura no gateway de pagamento.";
      throw new Error(errorMessage);
    }

    // 3. BUSCAR O LINK DE PAGAMENTO DA PRIMEIRA FATURA
    console.log("Assinatura criada! Buscando link de pagamento...");
    const payRes = await fetch(`${ASAAS_API_URL}/payments?subscription=${subscription.id}`, { headers });

    if (!payRes.ok) {
      const errorData = await payRes.json();
      console.error('ERRO AO BUSCAR LINK DE PAGAMENTO ASAAS:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.errors?.[0]?.description || "Assinatura criada, mas falha ao buscar o link de pagamento.");
    }

    const payData = await payRes.json();

    if (payData.data && payData.data.length > 0) {
      console.log("SUCESSO! Link gerado.");
      return NextResponse.json({ invoiceUrl: payData.data[0].invoiceUrl });
    }

    // Se a resposta for OK, mas não vier o link, é um erro de lógica
    console.error("ERRO LÓGICO: Link de pagamento não encontrado na resposta da Asaas", JSON.stringify(payData, null, 2));
    throw new Error("Assinatura criada, mas o link de pagamento não foi encontrado.");

  } catch (error: any) {
    console.error('ERRO NO PROCESSO DE CHECKOUT:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}