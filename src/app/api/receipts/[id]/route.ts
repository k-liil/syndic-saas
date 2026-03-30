import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { DueStatus, Prisma } from "@prisma/client";
import { reallocateUnitContributions } from "@/lib/allocation";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const orgId = await getOrgIdFromRequest(req, gate);
  const isSuperAdmin = gate.isSuperAdmin === true;

  console.time(`[RECEIPT_DETAIL] ZeroLat Total ${id}`);

  try {
    const rows: any[] = await prisma.$queryRaw`
      WITH TargetReceipt AS (
        SELECT id, date, "receiptNumber"
        FROM "Receipt"
        WHERE id = ${id}
      ),
      PrevSums AS (
        SELECT 
          ra2."dueId",
          SUM(ra2.amount)::float as "total"
        FROM "ReceiptAllocation" ra2
        JOIN "Receipt" r2 ON ra2."receiptId" = r2.id
        JOIN TargetReceipt tr ON (
          r2.date < tr.date 
          OR (r2.date = tr.date AND r2."receiptNumber" < tr."receiptNumber")
        )
        WHERE ra2."dueId" IN (
          SELECT "dueId" FROM "ReceiptAllocation" WHERE "receiptId" = ${id}
        )
        GROUP BY ra2."dueId"
      )
      SELECT 
        r.id as "r_id", r."receiptNumber" as "r_number", r.date as "r_date", r.amount as "r_amount", 
        r.method as "r_method", r.note as "r_note", r."bankName" as "r_bankName", r."bankRef" as "r_bankRef", 
        r."unallocatedAmount" as "r_unallocated",
        o.id as "o_id", o.name as "o_name", o."firstName" as "o_firstName", o.cin as "o_cin", o.email as "o_email", o.phone as "o_phone",
        b.id as "b_id", b.name as "b_name",
        u.id as "u_id", u."lotNumber" as "u_lotNumber", u.reference as "u_reference", u.type as "u_type",
        ra.id as "ra_id", ra.amount as "ra_amount",
        d.id as "d_id", d.period as "d_period", d."amountDue" as "d_amountDue", d."paidAmount" as "d_paidAmount", d.status as "d_status",
        COALESCE(ps."total", 0) as "prevTotal"
      FROM "Receipt" r
      LEFT JOIN "Owner" o ON r."ownerId" = o.id
      LEFT JOIN "Building" b ON r."buildingId" = b.id
      LEFT JOIN "Unit" u ON r."unitId" = u.id
      LEFT JOIN "ReceiptAllocation" ra ON r.id = ra."receiptId"
      LEFT JOIN "MonthlyDue" d ON ra."dueId" = d.id
      LEFT JOIN PrevSums ps ON ra."dueId" = ps."dueId"
      WHERE r.id = ${id} 
        AND (${isSuperAdmin} OR r."organizationId" = ${orgId ?? ''})
      ORDER BY d.period ASC NULLS LAST
    `;

    if (!rows.length) {
      console.timeEnd(`[RECEIPT_DETAIL] ZeroLat Load ${id}`);
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Reconstruct the JSON object from flat rows
    const first = rows[0];
    const receipt: any = {
      id: first.r_id,
      receiptNumber: Number(first.r_number),
      date: first.r_date,
      amount: Number(first.r_amount),
      method: first.r_method,
      note: first.r_note,
      bankName: first.r_bankName,
      bankRef: first.r_bankRef,
      unallocatedAmount: Number(first.r_unallocated),
      owner: first.o_id ? {
        id: first.o_id,
        name: first.o_name,
        cin: first.o_cin,
        email: first.o_email,
        phone: first.o_phone,
      } : null,
      building: first.b_id ? {
        id: first.b_id,
        name: first.b_name,
      } : null,
      unit: first.u_id ? {
        id: first.u_id,
        lotNumber: first.u_lotNumber,
        reference: first.u_reference,
        type: first.u_type,
      } : null,
      allocations: []
    };

    // Process all allocations including their previous balances
    for (const row of rows) {
      if (row.ra_id) {
        receipt.allocations.push({
          id: row.ra_id,
          amount: Number(row.ra_amount),
          previousTotal: Number(row.prevTotal || 0),
          afterTotal: Number(row.prevTotal || 0) + Number(row.ra_amount),
          due: {
            id: row.d_id,
            period: row.d_period,
            amountDue: Number(row.d_amountDue),
            paidAmount: Number(row.d_paidAmount),
            status: row.d_status,
          }
        });
      }
    }

    console.timeEnd(`[RECEIPT_DETAIL] ZeroLat Total ${id}`);
    return NextResponse.json(receipt);
  } catch (error: any) {
    console.error(`[RECEIPT_DETAIL] Error:`, error);
    console.timeEnd(`[RECEIPT_DETAIL] ZeroLat Total ${id}`);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
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
