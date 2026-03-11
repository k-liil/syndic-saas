import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

type Row = {
  cin: string;
  name: string;
  lotNumber: string;
  email?: string | null;
  phone?: string | null;
};

type Body =
  | { action: "start"; totalRows: number }
  | { action: "batch"; jobId: string; rows: Row[]; offset?: number; isLastBatch?: boolean };

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json() as Body;

  if (body.action === "start") {
    const job = await prisma.importJob.create({
      data: {
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

  if (!job) {
    return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
  }

  let imported = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i];
    const rowNo = (body.offset ?? 0) + i + 2;

    try {
      await prisma.$transaction(async (tx) => {
        const unit = await tx.unit.findUnique({
          where: { lotNumber: r.lotNumber },
          select: { id: true },
        });

        if (!unit) {
          errors.push({ row: rowNo, error: `Lot introuvable: ${r.lotNumber}` });
          return;
        }

        const owner = await tx.owner.upsert({
          where: { cin: r.cin },
          update: {
            name: r.name,
            email: r.email ?? null,
            phone: r.phone ?? null,
          },
          create: {
            cin: r.cin,
            name: r.name,
            email: r.email ?? null,
            phone: r.phone ?? null,
          },
          select: { id: true },
        });

        const existing = await tx.ownership.findFirst({
          where: {
            ownerId: owner.id,
            unitId: unit.id,
            endDate: null,
          },
        });

        if (!existing) {
          await tx.ownership.create({
            data: {
              ownerId: owner.id,
              unitId: unit.id,
            },
          });
        }

        imported++;
      });
    } catch (e: any) {
      errors.push({ row: rowNo, error: e?.message ?? "Import failed" });
    }
  }

  const processed = job.processed + body.rows.length;

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