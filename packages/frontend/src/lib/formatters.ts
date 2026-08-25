export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);
}

export function toMonthlyAmount(amount: number, frequency: 'monthly' | 'quarterly' | 'yearly'): number {
  switch (frequency) {
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
  }
}

export const frequencyLabels: Record<string, string> = {
  monthly: 'Mensuel',
  quarterly: 'Trimestriel',
  yearly: 'Annuel',
};

export const categoryLabels: Record<string, string> = {
  housing: 'Logement',
  energy: 'Énergie',
  food: 'Alimentation',
  insurance: 'Assurance',
  credit: 'Crédit',
  subscription: 'Abonnement',
  tax: 'Taxes',
  transport: 'Transport',
  health: 'Santé',
  childcare: 'Enfants',
  sport: 'Sport',
  education: 'Éducation',
  clothing: 'Vêtements',
  telecom: 'Téléphonie',
  other: 'Autre',
};

export const categoryIcons: Record<string, string> = {
  housing: '🏠',
  energy: '⚡',
  food: '🛒',
  insurance: '🛡️',
  credit: '💳',
  subscription: '📺',
  tax: '🏛️',
  transport: '🚌',
  health: '🏥',
  childcare: '👶',
  sport: '🏋️',
  education: '📚',
  clothing: '👕',
  telecom: '📱',
  other: '📦',
};

export const savingsTypeLabels: Record<string, string> = {
  livret: 'Livret',
  pea: 'PEA',
  assurance_vie: 'Assurance Vie',
  crypto: 'Crypto',
  other: 'Autre',
};

export const accountTypeLabels: Record<string, string> = {
  checking: 'Compte courant',
  savings: 'Épargne',
  investment: 'Investissement',
};
