import { prisma } from "@/lib/prisma";

function isValidYear(year: number) {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export function parseYearValue(value: string | null | undefined) {
  if (!value) return undefined;

  const year = Number(value);
  return isValidYear(year) ? year : undefined;
}

export async function resolveActiveFiscalYear(
  organizationId: string,
  requestedYear?: string | number | null
) {
  const parsedRequestedYear =
    typeof requestedYear === "number"
      ? requestedYear
      : parseYearValue(requestedYear ?? undefined);

  if (parsedRequestedYear && isValidYear(parsedRequestedYear)) {
    return parsedRequestedYear;
  }

  const [latestFiscalYear, settings] = await Promise.all([
    prisma.fiscalYear.findFirst({
      where: { organizationId },
      orderBy: { year: "desc" },
      select: { year: true },
    }),
    prisma.appSettings.findFirst({
      where: { organizationId },
      select: { startYear: true },
    }),
  ]);

  if (latestFiscalYear?.year && isValidYear(latestFiscalYear.year)) {
    return latestFiscalYear.year;
  }

  if (settings?.startYear && isValidYear(settings.startYear)) {
    return settings.startYear;
  }

  return undefined;
}
