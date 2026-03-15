import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DueStatus, Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/authz";

type DeleteBody = {
  ids?: string[];
  deleteAll?: boolean;
  type?: string;
  method?: string;
  year?: string | number;
};

function buildReceiptWhere(body: DeleteBody): Prisma.ReceiptWhereInput {
  const where: Prisma.ReceiptWhereInput = {};

  if (typeof body.type === "string" && body.type.trim()) {
    where.type = body.type.trim() as any;
  }

  if (typeof body.method === "string" && body.method.trim()) {
    where.method = body.method.trim() as any;
  }

  const year =
    typeof body.year === "string" || typeof body.year === "number"
      ? Number(body.year)
      : null;

  if (year && Number.isFinite(year)) {
    where.date = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  return where;
}

async function deleteReceiptsByIds(ids: string[], organizationId: string) {
  if (ids.length === 0) {
    return 0;
  }

  const allocations = await prisma.receiptAllocation.findMany({
    where: { receipt: { organizationId }, receiptId: { in: ids } },
    select: {
      dueId: true,
      amount: true,
    },
  });

  const allocationsByDue = new Map<string, number>();
  for (const allocation of allocations) {
    const current = allocationsByDue.get(allocation.dueId) ?? 0;
    allocationsByDue.set(allocation.dueId, current + Number(allocation.amount));
  }

  const dueIds = Array.from(allocationsByDue.keys());
  const dueUpdates: Prisma.PrismaPromise<any>[] = [];

  if (dueIds.length > 0) {
    const dues = await prisma.monthlyDue.findMany({
      where: { organizationId, id: { in: dueIds } },
      select: {
        id: true,
        amountDue: true,
        paidAmount: true,
      },
    });

    for (const due of dues) {
      const allocatedAmount = allocationsByDue.get(due.id) ?? 0;
      const newPaid = Number(due.paidAmount) - allocatedAmount;
      const normalizedPaid = newPaid < 0 ? 0 : newPaid;
      const amountDue = Number(due.amountDue);

      dueUpdates.push(
        prisma.monthlyDue.update({
          where: { id: due.id },
          data: {
            paidAmount: normalizedPaid,
            status:
              normalizedPaid <= 0
                ? DueStatus.UNPAID
                : normalizedPaid < amountDue
                ? DueStatus.PARTIAL
                : DueStatus.PAID,
          },
        })
      );
    }
  }

  await prisma.$transaction([
    ...dueUpdates,
    prisma.receiptAllocation.deleteMany({
      where: { receiptId: { in: ids } },
    }),
    prisma.receipt.deleteMany({
      where: { id: { in: ids } },
    }),
  ]);

  return ids.length;
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as DeleteBody;
    const ids = Array.isArray(body?.ids) ? body.ids : null;
    const organizationId = gate.organizationId;

    if (body?.deleteAll) {
      const where = buildReceiptWhere(body);
      where.organizationId = organizationId;
      let deleted = 0;

      while (true) {
        const receipts = await prisma.receipt.findMany({
          where,
          orderBy: [{ date: "desc" }, { receiptNumber: "desc" }],
          take: 200,
          select: { id: true },
        });

        if (receipts.length === 0) {
          break;
        }

        deleted += await deleteReceiptsByIds(
          receipts.map((receipt) => receipt.id),
          organizationId
        );
      }

      return NextResponse.json({ ok: true, deleted });
    }

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const scopedIds = await prisma.receipt.findMany({
      where: {
        organizationId,
        id: { in: ids },
      },
      select: { id: true },
    });

    const deleted = await deleteReceiptsByIds(
      scopedIds.map((item) => item.id),
      organizationId
    );
    return NextResponse.json({ ok: true, deleted });
  } catch (error: any) {
    console.error("DELETE /api/receipts/bulk failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "BULK_DELETE_FAILED" },
      { status: 500 }
    );
  }
}
