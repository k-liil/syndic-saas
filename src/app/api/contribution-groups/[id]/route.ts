import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, unitIds, defaultAmount } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name.trim();
  if (defaultAmount !== undefined) updateData.defaultAmount = defaultAmount !== null ? Number(defaultAmount) : null;

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.contributionGroup.update({
      where: { id },
      data: updateData,
    });

    if (unitIds !== undefined) {
      // Sync unit associations: delete old and create new
      await tx.contributionGroupUnit.deleteMany({
        where: { groupId: id },
      });

      if (unitIds.length > 0) {
        await tx.contributionGroupUnit.createMany({
          data: unitIds.map((unitId: string) => ({
            groupId: id,
            unitId,
          })),
        });
      }
    }

    return tx.contributionGroup.findUnique({
      where: { id },
      include: { units: { include: { unit: true } } },
    });
  });

  return NextResponse.json(result);
}

export async function DELETE(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  await prisma.contributionGroup.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
