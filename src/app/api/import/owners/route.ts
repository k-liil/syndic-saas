import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

type Row = {
  cin: string;
  name: string;
  lotNumber: string;
  email?: string | null;
  phone?: string | null;
};

type Body =
  | { action: "start"; totalRows: number }
  | {
      action: "batch";
      jobId: string;
      rows: Row[];
      offset?: number;
      isLastBatch?: boolean;
    };

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as Body;

  if (body.action === "start") {
    const job = await prisma.importJob.create({
      data: {
        organizationId: gate.organizationId ?? "",
        type: "owners",
        totalRows: body.totalRows,
        processed: 0,
        status: "processing",
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      totalRows: job.totalRows,
      processed: job.processed,
    });
  }

  const job = await prisma.importJob.findUnique({
    where: { id: body.jobId },
  });

  if (!job || job.organizationId !== gate.organizationId) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  const errors: { row: number; error: string }[] = [];

  const lotNumbers = Array.from(
    new Set(rows.map((row) => row.lotNumber?.trim()).filter(Boolean))
  ) as string[];
  const cins = Array.from(
    new Set(rows.map((row) => row.cin?.trim()).filter(Boolean))
  ) as string[];

  const [units, existingOwners] = await Promise.all([
    prisma.unit.findMany({
      where: {
        organizationId: gate.organizationId ?? "",
        lotNumber: {
          in: lotNumbers,
        },
      },
      select: {
        id: true,
        lotNumber: true,
      },
    }),
    prisma.owner.findMany({
      where: {
        organizationId: gate.organizationId ?? "",
        cin: {
          in: cins,
        },
      },
      select: {
        id: true,
        cin: true,
      },
    }),
  ]);

  const unitsByLotNumber = new Map<string, (typeof units)[number]>();
  for (const unit of units) {
    if (unit.lotNumber) {
      unitsByLotNumber.set(unit.lotNumber, unit);
    }
  }

  const existingOwnerCins = new Set(existingOwners.map((owner) => owner.cin).filter(Boolean));
  const newOwners = new Map<
    string,
    { cin: string; name: string; email: string | null; phone: string | null }
  >();

  for (const row of rows) {
    const cin = row.cin?.trim();
    if (!cin || existingOwnerCins.has(cin) || newOwners.has(cin)) continue;

    newOwners.set(cin, {
      cin,
      name: row.name?.trim() || cin,
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
    });
  }

  if (newOwners.size > 0) {
    await prisma.owner.createMany({
      data: Array.from(newOwners.values()).map((owner) => ({
        ...owner,
        organizationId: gate.organizationId ?? "",
      })),
      skipDuplicates: true,
    });
  }

  const owners = await prisma.owner.findMany({
    where: {
      organizationId: gate.organizationId ?? "",
      cin: {
        in: cins,
      },
    },
    select: {
      id: true,
      cin: true,
    },
  });

  const ownersByCin = new Map<string, (typeof owners)[number]>();
  for (const owner of owners) {
    if (owner.cin) {
      ownersByCin.set(owner.cin, owner);
    }
  }

  const ownerIds = owners.map((owner) => owner.id);
  const unitIds = units.map((unit) => unit.id);

  const existingOwnerships = await prisma.ownership.findMany({
    where: {
      ownerId: {
        in: ownerIds,
      },
      organizationId: gate.organizationId ?? "",
      unitId: {
        in: unitIds,
      },
      endDate: null,
    },
    select: {
      ownerId: true,
      unitId: true,
    },
  });

  const existingOwnershipKeys = new Set(
    existingOwnerships.map((ownership) => `${ownership.ownerId}:${ownership.unitId}`)
  );

  let imported = 0;
  const ownershipsToCreate: Array<{
    organizationId: string;
    ownerId: string;
    unitId: string;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNo = (body.offset ?? 0) + i + 2;

    const lotNumber = row.lotNumber?.trim();
    const cin = row.cin?.trim();

    if (!lotNumber) {
      errors.push({ row: rowNo, error: "Lot manquant" });
      continue;
    }

    if (!cin) {
      errors.push({ row: rowNo, error: "CIN manquante" });
      continue;
    }

    const unit = unitsByLotNumber.get(lotNumber);
    if (!unit) {
      errors.push({ row: rowNo, error: `Lot introuvable: ${lotNumber}` });
      continue;
    }

    const owner = ownersByCin.get(cin);
    if (!owner) {
      errors.push({ row: rowNo, error: `Proprietaire introuvable: ${cin}` });
      continue;
    }

    await prisma.owner.update({
      where: { id: owner.id },
      data: {
        name: row.name?.trim() || cin,
        email: row.email?.trim() || null,
        phone: row.phone?.trim() || null,
      },
    });

    const ownershipKey = `${owner.id}:${unit.id}`;
    if (!existingOwnershipKeys.has(ownershipKey)) {
      existingOwnershipKeys.add(ownershipKey);
      ownershipsToCreate.push({
        organizationId: gate.organizationId ?? "",
        ownerId: owner.id,
        unitId: unit.id,
      });
    }

    imported += 1;
  }

  if (ownershipsToCreate.length > 0) {
    await prisma.ownership.createMany({
      data: ownershipsToCreate,
    });
  }

  const processed = job.processed + rows.length;

  const updated = await prisma.importJob.update({
    where: { id: job.id },
    data: {
      processed,
      status: body.isLastBatch ? "done" : "processing",
    },
  });

  return NextResponse.json({
    ok: true,
    imported,
    errors,
    processed: updated.processed,
    totalRows: updated.totalRows,
    status: updated.status,
  });
}
