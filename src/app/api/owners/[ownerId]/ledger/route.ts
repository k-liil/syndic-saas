import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DueStatus } from "@prisma/client";

function firstDayOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ ownerId: string }> }
) {
  try {
    const { ownerId } = await ctx.params;

    if (!ownerId || typeof ownerId !== "string") {
      return NextResponse.json({ error: "ownerId missing" }, { status: 400 });
    }

    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: { id: true, name: true, buildingId: true },
    });

    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 404 });
    }

    const dues = await prisma.monthlyDue.findMany({
      where: { unit: { ownerships: { some: { ownerId } } } },
      orderBy: { period: "asc" },
      select: {
        id: true,
        period: true,
        amountDue: true,
        paidAmount: true,
        status: true,
        unit: { select: { reference: true, type: true } },
      },
    });

    const currentPeriod = firstDayOfMonth(new Date());

    const unpaidOrPartial = dues.filter((d) => d.status !== DueStatus.PAID);

    const dueNow = unpaidOrPartial.filter(
      (d) => new Date(d.period).getTime() <= currentPeriod.getTime()
    );

    const future = unpaidOrPartial.filter(
      (d) => new Date(d.period).getTime() > currentPeriod.getTime()
    );

    const remainingDueNowTotal = dueNow.reduce(
      (sum, d) => sum + (d.amountDue - d.paidAmount),
      0
    );

    const remainingFutureTotal = future.reduce(
      (sum, d) => sum + (d.amountDue - d.paidAmount),
      0
    );

    const payments = await prisma.payment.findMany({
      where: { ownerId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        method: true,
        amount: true,
        unallocatedAmount: true,
        allocations: {
          select: {
            id: true,
            amount: true,
            due: {
              select: {
                period: true,
                unit: { select: { reference: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      owner,
      currentPeriod,
      remainingDueNowTotal,
      remainingFutureTotal,
      dueNow,
      future,
      payments,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Ledger error" }, { status: 500 });
  }
}