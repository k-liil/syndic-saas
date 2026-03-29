import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { resolveActiveFiscalYear } from "@/lib/active-fiscal-year";

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
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const parsedYear = await resolveActiveFiscalYear(orgId, yearParam);

  if (parsedYear === undefined || !Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100) {
    return NextResponse.json(
      { error: "Invalid year parameter" },
      { status: 400 }
    );
  }

  const year = parsedYear;

  const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  const [settings, earliestFiscalYear] = await Promise.all([
    prisma.appSettings.findFirst({ where: { organizationId: orgId } }),
    prisma.fiscalYear.findFirst({
      where: { organizationId: orgId },
      orderBy: { year: "asc" },
      select: { year: true },
    }),
  ]);

  const firstExerciseYearCandidates = [
    settings?.startYear,
    earliestFiscalYear?.year,
  ].filter((value): value is number => typeof value === "number" && Number.isInteger(value));

  const firstExerciseYear =
    firstExerciseYearCandidates.length > 0
      ? Math.min(...firstExerciseYearCandidates)
      : year;
  const firstExerciseStartDate = new Date(
    Date.UTC(firstExerciseYear, 0, 1, 0, 0, 0, 0)
  );
  const carryForwardDateFilter =
    year > firstExerciseYear
      ? { gte: firstExerciseStartDate, lt: startDate }
      : { gte: startDate, lt: startDate };

  const [
    receiptsAgg,
    otherReceiptsAgg,
    paymentsAgg,
    ownersCount,
    paidOwners,
    expensesByCategory,
    // Add these for monthly breakdown - still findMany but minimal fields
    receiptsMonths,
    otherReceiptsMonths,
    paymentsMonths,
    // Pre-year carry-forward for opening balance of requested year
    preYearReceiptsCashAgg,
    preYearReceiptsBankAgg,
    preYearOtherReceiptsCashAgg,
    preYearOtherReceiptsBankAgg,
    preYearPaymentsCashAgg,
    preYearPaymentsBankAgg,
  ] = await Promise.all([
    prisma.receipt.aggregate({
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
      _sum: { amount: true },
    }),
    prisma.otherReceipt.aggregate({
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
      _sum: { amount: true },
    }),
    prisma.owner.count({ where: { organizationId: orgId! } }),
    prisma.receipt.groupBy({
      by: ["ownerId"],
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
    }),
    prisma.payment.groupBy({
      by: ["accountingPostId"],
      _sum: { amount: true },
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
    }),
    // Minimal fetch for month calculation
    prisma.receipt.findMany({
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
      select: { amount: true, date: true, method: true },
    }),
    prisma.otherReceipt.findMany({
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
      select: { amount: true, date: true, method: true },
    }),
    prisma.payment.findMany({
      where: { organizationId: orgId!, date: { gte: startDate, lt: endDate } },
      select: { amount: true, date: true, method: true },
    }),
    prisma.receipt.aggregate({
      where: {
        organizationId: orgId!,
        date: carryForwardDateFilter,
        method: "CASH",
      },
      _sum: { amount: true },
    }),
    prisma.receipt.aggregate({
      where: {
        organizationId: orgId!,
        date: carryForwardDateFilter,
        method: { in: ["TRANSFER", "CHECK", "DEBIT"] },
      },
      _sum: { amount: true },
    }),
    prisma.otherReceipt.aggregate({
      where: {
        organizationId: orgId!,
        date: carryForwardDateFilter,
        method: "CASH",
      },
      _sum: { amount: true },
    }),
    prisma.otherReceipt.aggregate({
      where: {
        organizationId: orgId!,
        date: carryForwardDateFilter,
        method: { in: ["TRANSFER", "CHECK", "DEBIT"] },
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId: orgId!,
        date: carryForwardDateFilter,
        method: "CASH",
      },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        organizationId: orgId!,
        date: carryForwardDateFilter,
        method: { in: ["TRANSFER", "CHECK", "DEBIT"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const receiptsByMonth = new Array(12).fill(0);
  const paymentsByMonth = new Array(12).fill(0);

  let receiptsCash = 0;
  let receiptsBank = 0;

  for (const r of receiptsMonths) {
    const month = new Date(r.date).getUTCMonth();
    const amount = toNumber(r.amount);
    receiptsByMonth[month] += amount;
    if (r.method === "CASH") receiptsCash += amount;
    else receiptsBank += amount;
  }

  for (const r of otherReceiptsMonths) {
    const month = new Date(r.date).getUTCMonth();
    const amount = toNumber(r.amount);
    receiptsByMonth[month] += amount;
    if (r.method === "CASH") receiptsCash += amount;
    else receiptsBank += amount;
  }

  let paymentsCash = 0;
  let paymentsBank = 0;

  for (const p of paymentsMonths) {
    const month = new Date(p.date).getUTCMonth();
    const amount = toNumber(p.amount);
    paymentsByMonth[month] += amount;
    if (p.method === "CASH") paymentsCash += amount;
    else paymentsBank += amount;
  }

  const openingCash = toNumber(settings?.openingCashBalance);
  const openingBank = toNumber(settings?.openingBankBalance);
  const openingCashForYear =
    openingCash +
    toNumber(preYearReceiptsCashAgg._sum.amount) +
    toNumber(preYearOtherReceiptsCashAgg._sum.amount) -
    toNumber(preYearPaymentsCashAgg._sum.amount);
  const openingBankForYear =
    openingBank +
    toNumber(preYearReceiptsBankAgg._sum.amount) +
    toNumber(preYearOtherReceiptsBankAgg._sum.amount) -
    toNumber(preYearPaymentsBankAgg._sum.amount);
  const openingTotal = openingCashForYear + openingBankForYear;

  const cumulativeBalanceByMonth = new Array(12).fill(0);
  let runningBalance = openingTotal;
  for (let i = 0; i < 12; i += 1) {
    runningBalance += (receiptsByMonth[i] ?? 0) - (paymentsByMonth[i] ?? 0);
    cumulativeBalanceByMonth[i] = runningBalance;
  }

  const cashBalance = openingCashForYear + receiptsCash - paymentsCash;
  const bankBalance = openingBankForYear + receiptsBank - paymentsBank;

  const totalReceipts = receiptsCash + receiptsBank;
  const totalPayments = paymentsCash + paymentsBank;

  const paidOwnersCount = paidOwners.length;

  const collectionRate =
    ownersCount === 0
      ? 0
      : Math.round((paidOwnersCount / ownersCount) * 100);

  const postIds = expensesByCategory
    .map((c) => c.accountingPostId)
    .filter((id): id is string => id !== null);

  const accountingPosts = postIds.length
    ? await prisma.accountingPost.findMany({
        where: {
          organizationId: orgId!,
          id: { in: postIds },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      })
    : [];

  const expensesByCategoryFormatted = expensesByCategory.map((c) => ({
    categoryName:
      accountingPosts.find((ap) => ap.id === c.accountingPostId)?.name ??
      "Sans poste",
    amount: toNumber(c._sum.amount),
  }));

  return NextResponse.json({
    year,
    totalReceipts: Number(totalReceipts),
    totalPayments: Number(totalPayments),
    cashBalance: Number(cashBalance),
    bankBalance: Number(bankBalance),
    openingTotal: Number(openingTotal),
    receiptsByMonth: receiptsByMonth.map(Number),
    paymentsByMonth: paymentsByMonth.map(Number),
    cumulativeBalanceByMonth: cumulativeBalanceByMonth.map(Number),
    collectionRate: Number(collectionRate),
    ownersCount,
    paidOwnersCount,
    expensesByCategory: expensesByCategoryFormatted.map((e) => ({
      ...e,
      amount: Number(e.amount),
    })),
  });
}
