export function getMonthlyContributionAmount(annualAmount: number | null | undefined) {
  const normalized = Number(annualAmount ?? 0);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 0;
  }

  return normalized / 12;
}
