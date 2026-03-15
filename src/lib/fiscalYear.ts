import { PrismaClient } from "@prisma/client";

export async function ensureFiscalYear(
  tx: PrismaClient,
  organizationId: string,
  date: Date
) {
  const year = date.getUTCFullYear();

  await tx.fiscalYear.upsert({
    where: { organizationId_year: { organizationId, year } },
    update: {},
    create: {
      organizationId,
      year,
      startsAt: new Date(Date.UTC(year, 0, 1)),
      endsAt: new Date(Date.UTC(year, 11, 31)),
    },
  });

  return year;
}
