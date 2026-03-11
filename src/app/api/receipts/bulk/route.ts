import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DueStatus } from "@prisma/client";

export async function DELETE(req: Request) {

  const { ids } = await req.json();

  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {

    const allocations = await tx.receiptAllocation.findMany({
      where: { receiptId: { in: ids } },
      include: { due: true },
    });

    for (const alloc of allocations) {

      const newPaid = alloc.due.paidAmount - alloc.amount;

      await tx.monthlyDue.update({
        where: { id: alloc.dueId },
        data: {
          paidAmount: newPaid,
          status:
            newPaid <= 0
              ? DueStatus.UNPAID
              : newPaid < alloc.due.amountDue
              ? DueStatus.PARTIAL
              : DueStatus.PAID,
        },
      });
    }

    await tx.receiptAllocation.deleteMany({
      where: { receiptId: { in: ids } },
    });

    await tx.receipt.deleteMany({
      where: { id: { in: ids } },
    });

  });

  return NextResponse.json({ ok: true });
}