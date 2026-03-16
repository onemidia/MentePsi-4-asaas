export type UserStatusData = {
  subscriptionStatus?: string | null;
  trialEndsAt?: string | Date | null;
  hasOverdueInvoice?: boolean;
};

export function getUserStatus(user: UserStatusData): string {
  const status = user.subscriptionStatus?.toLowerCase() || '';

  // 1º Inadimplente/Carência: Se houver fatura vencida no Asaas ou status overdue
  if (status === 'overdue' || user.hasOverdueInvoice) {
    return 'EM CARÊNCIA';
  }

  // 2º Assinante Ativo: Status recebidos do Asaas ou confirmados
  const activeStatuses = ['active', 'confirmed', 'received', 'pago'];
  if (activeStatuses.includes(status)) {
    return 'PAGO/ATIVO';
  }

  // 3º Trial: Em teste grátis ou dentro do prazo de 7/30 dias
  const now = new Date();
  if (status === 'trialing' || (user.trialEndsAt && new Date(user.trialEndsAt) > now)) {
    return 'EM TESTE';
  }

  // 4º Vencido: Passou do trial e não pagou
  return 'VENCIDO';
}