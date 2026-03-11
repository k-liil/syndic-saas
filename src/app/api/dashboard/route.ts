import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
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

    prisma.appSettings.findFirst(),

    prisma.owner.count(),

    prisma.receipt.groupBy({
      by: ["ownerId"],
      where: {
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
    receiptsByMonth[month] += r.amount;

    if (r.method === "CASH") {
      receiptsCash += r.amount;
    } else {
      receiptsBank += r.amount;
    }
  }

  let paymentsCash = 0;
  let paymentsBank = 0;

  for (const p of payments) {
    const month = new Date(p.date).getMonth();
    paymentsByMonth[month] += p.amount;

    if (p.method === "CASH") {
      paymentsCash += p.amount;
    } else {
      paymentsBank += p.amount;
    }
  }

  const openingCash = settings?.openingCashBalance ?? 0;
  const openingBank = settings?.openingBankBalance ?? 0;

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
  .filter((id): id is number => id !== null);

const categories = categoryIds.length
  ? await prisma.paymentCategory.findMany({
      where: {
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
  amount: c._sum.amount ?? 0,
}));

  return NextResponse.json({
    year,
    totalReceipts,
    totalPayments,
    cashBalance,
    bankBalance,
    receiptsByMonth,
    paymentsByMonth,
    collectionRate,
    ownersCount,
    paidOwnersCount,
    expensesByCategory: expensesByCategoryFormatted,
  });
}