import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import type { ImportUnitRow, ImportUnitError } from "@/lib/imports/units-csv";

type StartBody = {
  action: "start";
  totalRows: number;
};

type BatchBody = {
  action: "batch";
  jobId: string;
  rows: ImportUnitRow[];
  isLastBatch?: boolean;
  offset?: number;
};

type Body = StartBody | BatchBody;

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as Body;

    if (body.action === "start") {
      const totalRows = Number(body.totalRows ?? 0);

      if (!Number.isInteger(totalRows) || totalRows < 0) {
        return NextResponse.json({ error: "totalRows invalide" }, { status: 400 });
      }

      const job = await prisma.importJob.create({
        data: {
          organizationId: gate.organizationId,
          type: "units",
          totalRows,
          processed: 0,
          status: "processing",
        },
      });

      return NextResponse.json({
        ok: true,
        jobId: job.id,
        totalRows: job.totalRows,
        processed: job.processed,
        status: job.status,
      });
    }

    if (body.action !== "batch") {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const { jobId, rows, isLastBatch = false } = body;

    if (!jobId || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Payload batch invalide" }, { status: 400 });
    }

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.organizationId !== gate.organizationId) {
      return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
    }

    const buildings = await prisma.building.findMany({
      where: { organizationId: gate.organizationId },
      select: { id: true, name: true },
    });

    const byName = new Map<string, string>();
    for (const b of buildings) {
      byName.set(b.name.trim().toLowerCase(), b.id);
    }

    const existingUnits = await prisma.unit.findMany({
      where: { organizationId: gate.organizationId },
      select: { lotNumber: true },
    });

    const existingLotNumbers = new Set(existingUnits.map((u) => String(u.lotNumber)));
    const seenInBatch = new Set<string>();

    let imported = 0;
    let processedInBatch = 0;
    const errors: ImportUnitError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNo = (body.offset ?? 0) + i + 2;

      try {
        if (seenInBatch.has(r.lotNumber)) {
          errors.push({
            row: rowNo,
            error: `lotNumber dupliqué dans le batch: ${r.lotNumber}`,
          });
          processedInBatch++;
          continue;
        }

        if (existingLotNumbers.has(r.lotNumber)) {
          errors.push({
            row: rowNo,
            error: `lotNumber déjà existant: ${r.lotNumber}`,
          });
          processedInBatch++;
          continue;
        }

        let buildingId: string | null = null;

        if (r.type === "APARTMENT") {
          if (!r.buildingName) {
            errors.push({
              row: rowNo,
              error: "building obligatoire pour APARTMENT",
            });
            processedInBatch++;
            continue;
          }

          const id = byName.get(r.buildingName.trim().toLowerCase());

          if (!id) {
            errors.push({
              row: rowNo,
              error: `building introuvable: ${r.buildingName}`,
            });
            processedInBatch++;
            continue;
          }

          buildingId = id;
        }

        await prisma.unit.create({
          data: {
            organizationId: gate.organizationId,
            lotNumber: r.lotNumber,
            reference: r.reference?.trim() || `Lot ${r.lotNumber}`,
            type: r.type,
            ...(buildingId ? { buildingId } : {}),
            monthlyDueAmount: r.monthlyDueAmount ?? null,
          },
        });

        seenInBatch.add(r.lotNumber);
        existingLotNumbers.add(r.lotNumber);
        imported++;
        processedInBatch++;
      } catch (e: any) {
        errors.push({
          row: rowNo,
          error: e?.message ?? "Create failed",
        });
        processedInBatch++;
      }
    }

    const nextProcessed = Math.min(job.processed + processedInBatch, job.totalRows);
    const nextStatus = isLastBatch || nextProcessed >= job.totalRows ? "done" : "processing";

    const updatedJob = await prisma.importJob.update({
      where: { id: job.id },
      data: {
        processed: nextProcessed,
        status: nextStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      jobId: updatedJob.id,
      imported,
      processed: updatedJob.processed,
      totalRows: updatedJob.totalRows,
      status: updatedJob.status,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Import failed" },
      { status: 500 }
    );
  }
}
