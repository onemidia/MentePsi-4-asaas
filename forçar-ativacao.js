// Arquivo: forçar-ativacao.js

// Se estiver usando Node.js versão 18 ou superior, o fetch é nativo.
// Se for anterior, instale: npm install node-fetch e descomente a linha abaixo:
// const fetch = require('node-fetch');

async function testarWebhook() {
  console.log('--- INICIANDO SIMULAÇÃO DE WEBHOOK ---');

  // URL do seu Webhook local (Verifique se a pasta é 'webhook' ou 'webhooks')
  const url = 'http://localhost:3000/api/webhooks/asaas';
  
  // Token definido no seu código (app/api/webhook/asaas/route.ts)
  const token = 'whsec_hL9Z8Y8VYfU9ax_RLzZjCejBPSaJN0jQBkmvwl5u6sw';

  const payload = {
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "customer": "cus_000163882455",
      "value": 5.90,
      "status": "CONFIRMED",
      // "externalReference": "ID_DO_USUARIO_AQUI" // <--- O BANCO SÓ ATUALIZA SE VOCÊ MANDAR O ID AQUI!
    },
    "customerEmail": "marronmidia563@gmail.com"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'asaas-access-token': token
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`Status da Resposta: ${response.status}`);
    console.log('Corpo da Resposta:', JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log('✅ Sucesso! O Webhook recebeu a requisição.');
    } else {
      console.log('❌ Erro! Verifique o status e a mensagem acima.');
    }

  } catch (error) {
    console.error('❌ Erro ao tentar conectar com localhost:', error.message);
    console.log('Dica: Verifique se o servidor Next.js está rodando (npm run dev).');
  }
}

testarWebhook();
