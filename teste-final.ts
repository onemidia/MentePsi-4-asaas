import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega as variáveis do arquivo .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Usa a chave de serviço para permissão total

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis de ambiente não encontradas. Verifique se o arquivo .env.local existe e tem a SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarTesteFinal() {
  console.log('--- INICIANDO TESTE DIRETO DE LÓGICA DE BANCO ---');

  const emailAlvo = 'marronmidia563@gmail.com';

  // 1. Buscar o ID do usuário (Simulando o que o Checkout faria ao passar o externalReference)
  // O Webhook precisa desse ID, então buscamos pelo e-mail primeiro.
  console.log(`🔍 1. Buscando ID do usuário para: ${emailAlvo}`);
  
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', emailAlvo)
    .single();

  if (userError || !user) {
    console.error('❌ Usuário não encontrado no banco profiles:', userError?.message);
    return;
  }

  console.log(`✅ Usuário encontrado. ID: ${user.id}`);

  // 2. Simular o Objeto do Webhook (Payload)
  const mockWebhookBody = {
    event: 'PAYMENT_CONFIRMED',
    payment: {
      id: 'pay_teste_manual_123',
      externalReference: user.id, // Aqui vai o ID que recuperamos
      value: 29.90,
      dateCreated: new Date().toISOString(),
      email: emailAlvo
    }
  };

  console.log('📦 2. Payload Simulado:', JSON.stringify(mockWebhookBody, null, 2));

  // 3. Executar a Lógica de Atualização (Réplica exata do Webhook)
  console.log('🔄 3. Executando atualizações no Supabase...');

  // Atualiza profiles
  const { error: errProfile } = await supabase
    .from('profiles')
    .update({ subscription_status: 'active', plan_type: 'profissional', updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (errProfile) console.error('❌ Erro ao atualizar profiles:', errProfile);
  else console.log('✅ Tabela "profiles" atualizada para ACTIVE.');

  // Atualiza professional_profile
  const { error: errProf } = await supabase
    .from('professional_profile')
    .update({ subscription_status: 'active', plan_type: 'profissional' })
    .eq('id', user.id);

  if (errProf) console.error('❌ Erro ao atualizar professional_profile:', errProf);
  else console.log('✅ Tabela "professional_profile" atualizada para ACTIVE.');

  console.log('🚀 TESTE FINALIZADO! Verifique se o acesso foi liberado no painel.');
}

executarTesteFinal();