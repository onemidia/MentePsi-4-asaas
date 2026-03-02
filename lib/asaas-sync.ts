import { supabaseAdmin } from './supabase-admin'

export async function syncUserWithAsaas(userId: string, newData: { email?: string; name?: string; phone?: string }) {
  try {
    // 1. Busca o ID do Asaas que guardamos no banco
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('asaas_customer_id, email')
      .eq('id', userId)
      .single()

    if (!profile?.asaas_customer_id) {
      console.log('Usuário ainda não tem vínculo com Asaas. Sincronização ignorada.')
      return
    }

    // 2. Avisa o Asaas sobre a mudança
    const asaasUrl = process.env.ASAAS_API_URL
    const asaasKey = process.env.ASAAS_API_KEY

    const response = await fetch(`${asaasUrl}/customers/${profile.asaas_customer_id}`, {
      method: 'POST', // O Asaas usa POST no endpoint de ID para atualizar
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasKey!
      },
      body: JSON.stringify({
        email: newData.email,
        name: newData.name,
        mobilePhone: newData.phone
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro ao sincronizar com Asaas:', error)
      return
    }

    console.log(`✅ Asaas atualizado para o cliente ${profile.asaas_customer_id}`)

  } catch (error) {
    console.error('Erro na função de sincronização:', error)
  }
}