import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((x: any) => typeof x === "string" && x.length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ownerships peuvent bloquer
      await tx.ownership.deleteMany({ where: { unitId: { in: ids } } });

      // payments peuvent bloquer si tu as des FK unitId (à ajuster si besoin)
      // await tx.payment.deleteMany({ where: { unitId: { in: ids } } });

      const deleted = await tx.unit.deleteMany({ where: { id: { in: ids } } });
      return { deleted: deleted.count };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Bulk delete failed" }, { status: 500 });
  }
}