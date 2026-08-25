export type BudgetMethod = '50-30-20' | '75-15-10';

export interface BudgetAdvice {
  method: BudgetMethod;
  totalIncome: number;
  theoretical: {
    needs: { percentage: number; amount: number };
    wants: { percentage: number; amount: number };
    savings: { percentage: number; amount: number };
  };
  actual: {
    needs: { amount: number; percentage: number };
    wants: { amount: number; percentage: number };
    savings: { amount: number; percentage: number };
  };
  gaps: {
    needs: { amount: number; status: 'ok' | 'under' | 'over' };
    wants: { amount: number; status: 'ok' | 'under' | 'over' };
    savings: { amount: number; status: 'ok' | 'under' | 'over' };
  };
  recommendedSavingsThisMonth: number;
  availableForLeisure: number;
  tips: string[];
}

// Besoins : dépassement = mauvais (positif = over budget)
function getNeedsStatus(rel: number): 'ok' | 'under' | 'over' {
  if (Math.abs(rel) < 0.01) return 'ok';
  return rel > 0 ? 'over' : 'ok';
}
// Épargne : sous-objectif = mauvais (négatif = sous-objectif)
function getSavingsStatus(rel: number): 'ok' | 'under' | 'over' {
  if (Math.abs(rel) < 0.01) return 'ok';
  return rel < 0 ? 'over' : 'ok';
}
// Loisirs : écart = conséquence des charges, juste informatif (jaune)
function getWantsStatus(rel: number): 'ok' | 'under' | 'over' {
  if (Math.abs(rel) < 0.01) return 'ok';
  return rel < 0 ? 'under' : 'ok';
}

export function computeAdvice(
  method: BudgetMethod,
  totalIncome: number,
  needsAmount: number,
  wantsAmount: number,
  savingsAmount: number
): BudgetAdvice {
  let needsPct: number, wantsPct: number, savingsPct: number;

  if (method === '50-30-20') {
    needsPct = 50; wantsPct = 30; savingsPct = 20;
  } else {
    needsPct = 75; wantsPct = 10; savingsPct = 15;
  }

  const thNeeds = totalIncome * (needsPct / 100);
  const thWants = totalIncome * (wantsPct / 100);
  const thSavings = totalIncome * (savingsPct / 100);

  const actualNeedsPct = totalIncome > 0 ? (needsAmount / totalIncome) * 100 : 0;
  const actualWantsPct = totalIncome > 0 ? (wantsAmount / totalIncome) * 100 : 0;
  const actualSavingsPct = totalIncome > 0 ? (savingsAmount / totalIncome) * 100 : 0;

  const needsGap = needsAmount - thNeeds;
  const wantsGap = wantsAmount - thWants;
  const savingsGap = savingsAmount - thSavings;

  const tips: string[] = [];

  if (savingsGap < -50) {
    tips.push(`Votre épargne est en dessous de l'objectif de ${Math.abs(savingsGap).toFixed(0)} €. Essayez d'augmenter vos versements ce mois-ci.`);
  } else if (savingsGap >= 0) {
    tips.push(`Bravo ! Votre épargne dépasse l'objectif de ${savingsGap.toFixed(0)} €.`);
  }

  if (needsGap > 100) {
    tips.push(`Vos charges fixes représentent ${actualNeedsPct.toFixed(0)}% de vos revenus, au-dessus du seuil de ${needsPct}%. Identifiez des abonnements à réduire.`);
  } else if (needsGap < -100) {
    tips.push(`Vos charges fixes sont bien maîtrisées, bravo !`);
  }

  if (wantsAmount < thWants * 0.7) {
    tips.push(`Votre budget loisirs réel (${wantsAmount.toFixed(0)} €) est inférieur à l'objectif. Vos charges dépassent le seuil conseillé.`);
  } else if (wantsAmount > thWants * 1.3) {
    tips.push(`Vous disposez de ${wantsAmount.toFixed(0)} € pour les loisirs ce mois — au-dessus de l'objectif.`);
  }

  if (tips.length === 0) {
    tips.push('Votre budget est bien équilibré ce mois-ci. Continuez ainsi !');
  }

  return {
    method,
    totalIncome,
    theoretical: {
      needs: { percentage: needsPct, amount: thNeeds },
      wants: { percentage: wantsPct, amount: thWants },
      savings: { percentage: savingsPct, amount: thSavings },
    },
    actual: {
      needs: { amount: needsAmount, percentage: actualNeedsPct },
      wants: { amount: wantsAmount, percentage: actualWantsPct },
      savings: { amount: savingsAmount, percentage: actualSavingsPct },
    },
    gaps: {
      needs: { amount: needsGap, status: getNeedsStatus(needsGap / (thNeeds || 1)) },
      wants: { amount: wantsGap, status: getWantsStatus(wantsGap / (thWants || 1)) },
      savings: { amount: savingsGap, status: getSavingsStatus(savingsGap / (thSavings || 1)) },
    },
    recommendedSavingsThisMonth: thSavings,
    availableForLeisure: wantsAmount,
    tips,
  };
}
