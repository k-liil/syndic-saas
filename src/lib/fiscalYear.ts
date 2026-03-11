import { PrismaClient } from "@prisma/client";

export async function ensureFiscalYear(tx: PrismaClient, date: Date) {
  const year = date.getUTCFullYear();

  await tx.fiscalYear.upsert({
    where: { year },
    update: {},
    create: {
      year,
      startsAt: new Date(Date.UTC(year, 0, 1)),
      endsAt: new Date(Date.UTC(year, 11, 31)),
    },
  });

  return year;
}