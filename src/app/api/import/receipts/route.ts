import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";


type Row = {
  lotNumber: string;
  amount: number;
  method?: string;
  date?: string;
  note?: string;
};

type Body =
  | { action: "start"; totalRows: number }
  | { action: "batch"; jobId: string; rows: Row[]; offset?: number; isLastBatch?: boolean };

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = (await req.json()) as Body;

  if (body.action === "start") {
    const job = await prisma.importJob.create({
      data: {
        type: "receipts",
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
      const unit = await prisma.unit.findUnique({
        where: { lotNumber: r.lotNumber },
        select: {
          id: true,
          buildingId: true,
        },
      });

      if (!unit) {
        errors.push({ row: rowNo, error: `Lot ${r.lotNumber} : lot introuvable` });
        continue;
      }

      if (!unit.buildingId) {
        errors.push({ row: rowNo, error: `Lot ${r.lotNumber} : aucun immeuble lié` });
        continue;
      }

      const ownership = await prisma.ownership.findFirst({
        where: {
          unitId: unit.id,
          endDate: null,
        },
        select: {
          ownerId: true,
        },
      });

      if (!ownership) {
        errors.push({
          row: rowNo,
          error: `Lot ${r.lotNumber} : aucun propriétaire actif`,
        });
        continue;
      }

     const receiptDate = r.date ? new Date(r.date) : new Date();

const res = await fetch(new URL("/api/receipts", req.url), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    cookie: req.headers.get("cookie") ?? "",
  },
  body: JSON.stringify({
    unitId: unit.id,
    amount: Number(r.amount),
    method: (r.method ?? "CASH").toUpperCase(),
    date: receiptDate.toISOString(),
    note: r.note ?? "",
    type: "CONTRIBUTION",
  }),
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  errors.push({
    row: rowNo,
    error: typeof data?.error === "string" ? data.error : "Import failed",
  });
  continue;
}

imported++;
    } catch (e: any) {
      errors.push({
        row: rowNo,
        error: e?.message ?? "Import failed",
      });
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