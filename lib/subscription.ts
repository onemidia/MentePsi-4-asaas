import { supabaseAdmin } from './supabase-admin'

type CreateManualSubscriptionParams = {
  userId: string
  planId: string
  expiresAt: string
}

export async function createManualSubscription({
  userId,
  planId,
  expiresAt,
}: CreateManualSubscriptionParams) {
  // cancela assinaturas ativas anteriores
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'CANCELED' })
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      status: 'ACTIVE',
      billing_type: 'MANUAL',
      current_period_start: new Date().toISOString(),
      current_period_end: expiresAt,
      next_due_date: expiresAt,
    })
    .select()
    .single()

  if (error) throw error

  return data
}

type CreateAsaasSubscriptionParams = {
  userId: string
  planId: string
  asaasCustomerId: string
  asaasSubscriptionId: string
}

export async function createAsaasSubscription({
  userId,
  planId,
  asaasCustomerId,
  asaasSubscriptionId,
}: CreateAsaasSubscriptionParams) {
  // cancela assinaturas ativas anteriores
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'CANCELED' })
    .eq('user_id', userId)
    .eq('status', 'ACTIVE')

  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      status: 'PENDING',
      billing_type: 'ASAAS',
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId,
      current_period_start: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  return data
}
