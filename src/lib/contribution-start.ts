export function firstDayOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function buildContributionStartPeriod(
  ownerContributionStartAt: Date | null | undefined,
  settingsStartYear: number | null | undefined,
  settingsStartMonth: number | null | undefined,
) {
  if (ownerContributionStartAt) {
    return firstDayOfMonthUTC(ownerContributionStartAt);
  }

  const startYear = settingsStartYear ?? new Date().getUTCFullYear();
  const startMonth = settingsStartMonth ?? 1;
  return new Date(Date.UTC(startYear, startMonth - 1, 1));
}

