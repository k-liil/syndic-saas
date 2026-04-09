import { ContributionType } from "@prisma/client";

/**
 * Moteur unifié de calcul des cotisations.
 * Gère la hiérarchie des montants et la validité temporelle.
 */

export interface UnitForCalculation {
  id: string;
  overrideStart: boolean;
  startYear: number | null;
  startMonth: number | null;
  surface?: any | null;
  groupUnits: Array<{
    group: {
      id: string;
      name: string;
      defaultAmount: any | null;
      periods: Array<{
        startPeriod: Date;
        endPeriod: Date | null;
        amount: any;
      }>;
    };
  }>;
  contributionPeriods: Array<{
    startPeriod: Date;
    endPeriod: Date | null;
    amount: any;
  }>;
}

export interface AppSettingsForCalculation {
  startYear: number;
  startMonth: number;
  contributionType: ContributionType;
  globalFixedAmount: any | null;
}

export interface GlobalPeriod {
  startPeriod: Date;
  endPeriod: Date | null;
  amount: any;
}

/**
 * Détermine le montant de cotisation pour un lot à une date précise.
 */
export function getApplicableContribution(
  unit: UnitForCalculation,
  checkDate: Date,
  settings: AppSettingsForCalculation,
  globalPeriods: GlobalPeriod[] = []
) {
  // 1. Vérifier si la date est avant la date de début de cotisation du lot
  const startPeriod = buildContributionStartPeriod(unit, settings);
  if (checkDate < startPeriod) {
    return { amount: 0, method: "Avant date de début", isActive: false };
  }

  const normalizedCheckDate = new Date(Date.UTC(checkDate.getUTCFullYear(), checkDate.getUTCMonth(), 15));

  // 2. Exception : Période spécifique pour le lot
  const unitSpecificAmount = findInPeriods(unit.contributionPeriods, normalizedCheckDate);
  if (unitSpecificAmount !== null) {
    // Si c'est un calcul à la surface (prorata)
    if (settings.contributionType === "SURFACE" && unit.surface) {
      const total = Number(unit.surface) * unitSpecificAmount;
      return { 
        amount: total, 
        method: `${Number(unit.surface)} m² × ${unitSpecificAmount} (Exception lot)`, 
        isActive: true 
      };
    }
    return { amount: unitSpecificAmount, method: "Exception lot", isActive: true };
  }

  // 3. Logique par Groupe
  if (unit.groupUnits.length > 0) {
    for (const gu of unit.groupUnits) {
       // A. Exception : Période spécifique pour le groupe
       const groupPeriodAmount = findInPeriods(gu.group.periods, normalizedCheckDate);
       if (groupPeriodAmount !== null) {
         return { amount: groupPeriodAmount, method: `Exception groupe: ${gu.group.name}`, isActive: true };
       }

       // B. Montant par défaut du groupe (La Nouveauté)
       if (gu.group.defaultAmount !== null && Number(gu.group.defaultAmount) > 0) {
         return { amount: Number(gu.group.defaultAmount), method: `Défaut groupe: ${gu.group.name}`, isActive: true };
       }
    }
  }

  // 4. Exception : Période spécifique globale
  const globalPeriodAmount = findInPeriods(globalPeriods, normalizedCheckDate);
  if (globalPeriodAmount !== null) {
    return { amount: globalPeriodAmount, method: "Exception globale", isActive: true };
  }

  // 5. Paramètre global par défaut (Global Fixed)
  if (settings.globalFixedAmount !== null && Number(settings.globalFixedAmount) > 0) {
    return { amount: Number(settings.globalFixedAmount), method: "Paramètre global", isActive: true };
  }

  return { amount: 0, method: "Non configuré", isActive: false };
}

/**
 * Fonction interne pour chercher dans une liste de périodes
 */
function findInPeriods(periods: Array<{ startPeriod: Date; endPeriod: Date | null; amount: any }>, checkDate: Date): number | null {
  // On trie par date de début décroissante pour prendre la règle la plus récente qui s'applique
  const sorted = [...periods].sort((a, b) => b.startPeriod.getTime() - a.startPeriod.getTime());
  
  for (const p of sorted) {
    const start = new Date(p.startPeriod);
    const end = p.endPeriod ? new Date(p.endPeriod) : null;
    
    // Normalisation à la mi-mois pour éviter les problèmes de fuseau horaire
    const normalizedStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const normalizedEnd = end ? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 28)) : null;

    if (checkDate >= normalizedStart && (!normalizedEnd || checkDate <= normalizedEnd)) {
      return Number(p.amount);
    }
  }
  return null;
}

/**
 * Recréation de buildContributionStartPeriod pour découplage complet
 */
export function buildContributionStartPeriod(
  unit: { overrideStart: boolean; startYear: number | null; startMonth: number | null },
  settings: { startYear: number; startMonth: number }
) {
  if (unit.overrideStart && unit.startYear && unit.startMonth) {
    return new Date(Date.UTC(unit.startYear, unit.startMonth - 1, 1));
  }
  return new Date(Date.UTC(settings.startYear, settings.startMonth - 1, 1));
}
