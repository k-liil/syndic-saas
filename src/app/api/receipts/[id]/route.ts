import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { DueStatus } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  const item = await prisma.receipt.findFirst({
    where: { id, organizationId: gate.organizationId ?? undefined },
    select: {
      id: true,
      receiptNumber: true,
      date: true,
      amount: true,
      method: true,
      note: true,
      bankName: true,
      bankRef: true,
      unallocatedAmount: true,
      owner: {
        select: {
          id: true,
          name: true,
          cin: true,
          email: true,
          phone: true,
        },
      },
      building: {
        select: {
          id: true,
          name: true,
        },
      },
      unit: {
        select: {
          id: true,
          lotNumber: true,
          reference: true,
          type: true,
        },
      },
      allocations: {
        orderBy: {
          due: {
            period: "asc",
          },
        },
        select: {
          id: true,
          amount: true,
          due: {
            select: {
              id: true,
              period: true,
              amountDue: true,
              paidAmount: true,
              status: true,
              unit: {
                select: {
                  id: true,
                  lotNumber: true,
                  reference: true,
                  type: true,
                  building: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const json = item as any;

  if (json.allocations) {
    for (const alloc of json.allocations) {
      const others = await prisma.receiptAllocation.findMany({
        where: {
          dueId: alloc.due.id,
          receipt: {
            OR: [
              { date: { lt: item.date } },
              {
                date: item.date,
                receiptNumber: { lt: item.receiptNumber },
              },
            ],
          },
        },
        select: { amount: true },
      });

      const previousTotal = others.reduce(
        (sum, a) => sum + Number(a.amount),
        0
      );
      alloc.previousTotal = previousTotal;
      alloc.afterTotal = previousTotal + Number(alloc.amount);
    }
  }

  return NextResponse.json(json);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    const method = typeof body.method === "string" ? body.method : "";
    const date = body.date ? new Date(body.date) : null;
    const bankName =
      typeof body.bankName === "string" ? body.bankName.trim() : "";
    const bankRef =
      typeof body.bankRef === "string" ? body.bankRef.trim() : "";
const note =
  typeof body.note === "string" ? body.note.trim() : "";
    if (!["CASH", "TRANSFER", "CHECK"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid method" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    if ((method === "TRANSFER" || method === "CHECK") && !bankName) {
      return NextResponse.json(
        { error: "Bank required" },
        { status: 400 }
      );
    }

    if (method === "CHECK" && !bankRef) {
      return NextResponse.json(
        { error: "Check number required" },
        { status: 400 }
      );
    }

    const existing = await prisma.receipt.findFirst({
      where: { id, organizationId: gate.organizationId ?? undefined },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const updated = await prisma.receipt.update({
      where: { id },
data: {
  method: method as any,
  date,
  bankName: bankName || null,
  bankRef: bankRef || null,
  note: note || null,
},
      select: {
        id: true,
        receiptNumber: true,
        method: true,
        date: true,
        bankName: true,
        bankRef: true,
      },
    });

    return NextResponse.json({
      ok: true,
      receipt: updated,
    });

  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 }
    );
  }
}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.findFirst({
        where: { id, organizationId: gate.organizationId ?? undefined },
        select: { id: true },
      });

      if (!receipt) {
        throw new Error("Receipt not found");
      }

      const allocations = await tx.receiptAllocation.findMany({
        where: {
          receiptId: id,
          receipt: { organizationId: gate.organizationId ?? undefined },
        },
        include: { due: true },
      });

      for (const alloc of allocations) {
        const newPaid = Number(alloc.due.paidAmount) - Number(alloc.amount);
        const amountDue = Number(alloc.due.amountDue);

        await tx.monthlyDue.update({
          where: { id: alloc.dueId },
          data: {
            paidAmount: newPaid,
            status:
              newPaid <= 0
                ? DueStatus.UNPAID
                : newPaid < amountDue
                ? DueStatus.PARTIAL
                : DueStatus.PAID,
          },
        });
      }

      await tx.receiptAllocation.deleteMany({
        where: { receiptId: id },
      });

      await tx.receipt.delete({
        where: { id },
      });

    });

    return NextResponse.json({ ok: true });

  } catch (e: any) {

    console.error(e);

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
