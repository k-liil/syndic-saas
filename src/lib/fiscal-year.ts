import { prisma } from "@/lib/prisma";

export async function getOrCreateFiscalYear(tx: any, buildingId: string, year: number) {
  const startsAt = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const endsAt = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  return tx.fiscalYear.upsert({
    where: { buildingId_year: { buildingId, year } },
    update: {},
    create: { buildingId, year, startsAt, endsAt },
  });
}