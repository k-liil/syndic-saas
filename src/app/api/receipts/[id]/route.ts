import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { DueStatus, Prisma } from "@prisma/client";
import { reallocateUnitContributions } from "@/lib/allocation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  console.time(`[RECEIPT_DETAIL] HighPerf Load ${id}`);

  // Fetch only the core receipt data first (very fast)
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
      owner: { select: { id: true, name: true, cin: true, email: true, phone: true } },
      building: { select: { id: true, name: true } },
      unit: { select: { id: true, lotNumber: true, reference: true, type: true } },
      allocations: {
        orderBy: { due: { period: "asc" } },
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
            },
          },
        },
      },
    },
  });

  if (!item) {
    console.timeEnd(`[RECEIPT_DETAIL] HighPerf Load ${id}`);
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const json = item as any;

  if (json.allocations && json.allocations.length > 0) {
    const dueIds = json.allocations.map((a: any) => a.due.id);
    
    console.time(`[RECEIPT_DETAIL] DB Sums ${id}`);
    // Ultra-optimized SQL query to get all previous sums for these dues in one go
    // This uses a subquery to sum up all allocations that happen before our receipt
    const otherAllocs: any[] = await prisma.$queryRaw`
      SELECT 
        "dueId", 
        SUM("amount")::float as "total"
      FROM "ReceiptAllocation" ra
      JOIN "Receipt" r ON ra."receiptId" = r.id
      WHERE ra."dueId" IN (${Prisma.join(dueIds)})
        AND ra."receiptId" != ${id}
        AND (
          r."date" < ${item.date}::timestamp 
          OR (r."date" = ${item.date}::timestamp AND r."receiptNumber" < ${item.receiptNumber})
        )
      GROUP BY "dueId"
    `;
    console.timeEnd(`[RECEIPT_DETAIL] DB Sums ${id}`);

    // Map the sums per dueId
    const sumsMap = new Map<string, number>();
    otherAllocs.forEach(row => {
      sumsMap.set(row.dueId, row.total || 0);
    });

    // Apply the pre-calculated sums
    for (const alloc of json.allocations) {
      const previousTotal = sumsMap.get(alloc.due.id) || 0;
      alloc.previousTotal = previousTotal;
      alloc.afterTotal = previousTotal + Number(alloc.amount);
    }
  }

  console.timeEnd(`[RECEIPT_DETAIL] HighPerf Load ${id}`);
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
      select: { id: true, unitId: true, type: true, date: true },
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

    if (existing.unitId && existing.type === "CONTRIBUTION" && existing.date.getTime() !== date.getTime() && gate.organizationId) {
      // Re-allocate if date changed because FIFO order might have changed
      await reallocateUnitContributions(prisma, existing.unitId, gate.organizationId);
    }

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
        select: { id: true, unitId: true, type: true },
      });

      if (!receipt) {
        throw new Error("Receipt not found");
      }

      await tx.receipt.delete({
        where: { id },
      });

      if (receipt.unitId && receipt.type === "CONTRIBUTION" && gate.organizationId) {
        await reallocateUnitContributions(tx, receipt.unitId, gate.organizationId);
      }
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json({ ok: true });

  } catch (e: any) {

    console.error(e);

    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}
