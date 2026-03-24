import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((x: any) => typeof x === "string" && x.length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  try {
    // Vérifier si des encaissements existent
const receipts = await prisma.receipt.findMany({
  where: { ownerId: { in: ids } },
  select: { ownerId: true },
});

if (receipts.length > 0) {
  const blockedOwners = [...new Set(receipts.map(r => r.ownerId))];

  return NextResponse.json(
    {
      error: "Impossible de supprimer : certains copropriétaires ont des encaissements.",
      blockedOwners
    },
    { status: 400 }
  );
}
    const result = await prisma.$transaction(async (tx) => {
      // 1) Supprimer les dépendances qui bloquent (FK)
      const deletedOwnerships = await tx.ownership.deleteMany({
        where: { ownerId: { in: ids } },
      });

      // Si tu as aussi une table Payment avec ownerId FK, décommente:
      // const deletedPayments = await tx.payment.deleteMany({
      //   where: { ownerId: { in: ids } },
      // });

      // 2) Supprimer les owners
      const deletedOwners = await tx.owner.deleteMany({
        where: { id: { in: ids } },
      });

      return {
        deletedOwners: deletedOwners.count,
        deletedOwnerships: deletedOwnerships.count,
        // deletedPayments: deletedPayments.count,
      };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Bulk delete failed" },
      { status: 500 }
    );
  }
}
