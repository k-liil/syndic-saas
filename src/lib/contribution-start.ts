export function firstDayOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function buildContributionStartPeriod(
  unitOverride: { overrideStart: boolean; startYear: number | null; startMonth: number | null } | null | undefined,
  settings: { startYear: number; startMonth: number } | null | undefined,
) {
  if (unitOverride?.overrideStart && unitOverride.startYear && unitOverride.startMonth) {
    return new Date(Date.UTC(unitOverride.startYear, unitOverride.startMonth - 1, 1));
  }

  const startYear = settings?.startYear ?? new Date().getUTCFullYear();
  const startMonth = settings?.startMonth ?? 1;
  return new Date(Date.UTC(startYear, startMonth - 1, 1));
}

