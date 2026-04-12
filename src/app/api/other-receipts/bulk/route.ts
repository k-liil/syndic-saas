import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { Prisma } from "@prisma/client";

type DeleteBody = {
  ids?: string[];
  deleteAll?: boolean;
  type?: string;
  method?: string;
  year?: string | number;
  month?: string | number;
  search?: string;
};

function buildOtherReceiptWhere(body: DeleteBody): Prisma.OtherReceiptWhereInput {
  const where: Prisma.OtherReceiptWhereInput = {};

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
  
  const month =
    typeof body.month === "string" || typeof body.month === "number"
      ? Number(body.month)
      : null;

  if (month && Number.isFinite(month) && month > 0 && year) {
    where.date = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)),
    };
  }

  if (body.search) {
    const s = body.search.trim();
    where.OR = [
      { description: { contains: s, mode: "insensitive" } },
      { note: { contains: s, mode: "insensitive" } },
      { bankName: { contains: s, mode: "insensitive" } },
      { bankRef: { contains: s, mode: "insensitive" } },
    ];
  }

  return where;
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as DeleteBody;
    const ids = Array.isArray(body?.ids) ? body.ids : null;

    if (body?.deleteAll) {
      const where = buildOtherReceiptWhere(body);
      where.organizationId = orgId;

      const deleted = await prisma.otherReceipt.deleteMany({
        where,
      });

      return NextResponse.json({ ok: true, deleted: deleted.count });
    }

    if (!Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const deleted = await prisma.otherReceipt.deleteMany({
      where: {
        organizationId: orgId,
        id: { in: ids },
      },
    });

    return NextResponse.json({ ok: true, deleted: deleted.count });
  } catch (error: any) {
    console.error("DELETE /api/other-receipts/bulk failed:", error);
    return NextResponse.json(
      { error: error?.message ?? "BULK_DELETE_FAILED" },
      { status: 500 }
    );
  }
}
