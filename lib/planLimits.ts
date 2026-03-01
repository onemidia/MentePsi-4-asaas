export const PLAN_LIMITS = {
  profissional: {
    maxPatients: 99999,
    whatsapp: true,
    ai: true,
    portal: true,
    isBlocked: false // Garante que a flag de bloqueio total esteja desligada
  },
  // Mesmo que o sistema ainda tente ler "iniciante", ele vai ler isso:
  iniciante: {
    maxPatients: 99999,
    whatsapp: true,
    ai: true,
    portal: true,
    isBlocked: false
  }
}

export function getPlanLimits(profile: any) {
  // Retorna sempre o plano desbloqueado (profissional)
  return PLAN_LIMITS.profissional;
}

export function getPlanLimit(profile: any, limitKey: keyof typeof PLAN_LIMITS.profissional) {
  const limits = getPlanLimits(profile);
  return limits[limitKey];
}

export function canUseFeature(profile: any, feature: string) {
  const limits = getPlanLimits(profile);
  
  if (feature === 'hasWhatsAppReminders') return limits.whatsapp;
  if (feature === 'hasAI') return limits.ai;
  if (feature === 'hasPortal') return limits.portal;
  
  return !limits.isBlocked;
}