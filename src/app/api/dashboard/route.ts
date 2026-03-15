import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

function toNumber(value: unknown): number {
  if (value == null) return 0;

  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }

  return Number(value) || 0;
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(req.url);
const yearParam = searchParams.get("year");

let parsedYear: number;

if (yearParam) {
  parsedYear = Number(yearParam);
} else {
  const lastReceipt = await prisma.receipt.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  parsedYear = lastReceipt
    ? new Date(lastReceipt.date).getFullYear()
    : new Date().getFullYear();
}

  if (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return NextResponse.json(
      { error: "Invalid year parameter" },
      { status: 400 }
    );
  }

  const year = parsedYear;

  // Bornes locales de l'exercice
  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(year + 1, 0, 1, 0, 0, 0, 0);

  const [
    receipts,
    payments,
    settings,
    ownersCount,
    paidOwners,
    expensesByCategory,
  ] = await Promise.all([
    prisma.receipt.findMany({
      where: {
        organizationId: gate.organizationId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        amount: true,
        method: true,
        date: true,
      },
    }),

    prisma.payment.findMany({
      where: {
        organizationId: gate.organizationId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        amount: true,
        method: true,
        date: true,
      },
    }),

    prisma.appSettings.findFirst({ where: { organizationId: gate.organizationId } }),

    prisma.owner.count({ where: { organizationId: gate.organizationId } }),

    prisma.receipt.groupBy({
      by: ["ownerId"],
      where: {
        organizationId: gate.organizationId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    }),

    prisma.payment.groupBy({
      by: ["categoryId"],
      _sum: {
        amount: true,
      },
      where: {
        organizationId: gate.organizationId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    }),
  ]);

  const receiptsByMonth = new Array(12).fill(0);
  const paymentsByMonth = new Array(12).fill(0);

  let receiptsCash = 0;
  let receiptsBank = 0;

for (const r of receipts) {
  const month = new Date(r.date).getMonth();
  const amount = toNumber(r.amount);

  receiptsByMonth[month] += amount;

  if (r.method === "CASH") {
    receiptsCash += amount;
  } else {
    receiptsBank += amount;
  }
}

  let paymentsCash = 0;
  let paymentsBank = 0;

for (const p of payments) {
  const month = new Date(p.date).getMonth();
  const amount = toNumber(p.amount);

  paymentsByMonth[month] += amount;

  if (p.method === "CASH") {
    paymentsCash += amount;
  } else {
    paymentsBank += amount;
  }
}

const openingCash = toNumber(settings?.openingCashBalance);
const openingBank = toNumber(settings?.openingBankBalance);

  const cashBalance = openingCash + receiptsCash - paymentsCash;
  const bankBalance = openingBank + receiptsBank - paymentsBank;

  const totalReceipts = receiptsCash + receiptsBank;
  const totalPayments = paymentsCash + paymentsBank;

  const paidOwnersCount = paidOwners.length;

  const collectionRate =
    ownersCount === 0
      ? 0
      : Math.round((paidOwnersCount / ownersCount) * 100);

const categoryIds = expensesByCategory
  .map((c) => c.categoryId)
  .filter((id): id is string => id !== null);

const categories = categoryIds.length
  ? await prisma.paymentCategory.findMany({
      where: {
        organizationId: gate.organizationId,
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
      },
    })
  : [];

const expensesByCategoryFormatted = expensesByCategory.map((c) => ({
  categoryName:
    categories.find((cat) => cat.id === c.categoryId)?.name ?? "Sans catégorie",
  amount: toNumber(c._sum.amount),
}));

return NextResponse.json({
  year,
  totalReceipts: Number(totalReceipts),
  totalPayments: Number(totalPayments),
  cashBalance: Number(cashBalance),
  bankBalance: Number(bankBalance),
  receiptsByMonth: receiptsByMonth.map(Number),
  paymentsByMonth: paymentsByMonth.map(Number),
  collectionRate: Number(collectionRate),
  ownersCount,
  paidOwnersCount,
  expensesByCategory: expensesByCategoryFormatted.map((e) => ({
    ...e,
    amount: Number(e.amount),
  })),
});
}
