import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

type Row = {
  type?: string;
  description: string;
  amount: number;
  method?: string;
  date?: string;
  bankName?: string;
  bankRef?: string;
  note?: string;
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

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await req.json()) as Body;

  if (body.action === "start") {
    const job = await prisma.importJob.create({
      data: {
        organizationId: gate.organizationId,
        type: "other-receipts",
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

  const errors: { row: number; error: string }[] = [];
  const validRows: Array<{
    type: "RENT" | "OTHER";
    description: string;
    amount: number;
    method: "CASH" | "TRANSFER" | "CHECK";
    date: Date;
    bankName: string | null;
    bankRef: string | null;
    note: string | null;
  }> = [];

  for (let i = 0; i < body.rows.length; i++) {
    const rowNo = (body.offset ?? 0) + i + 2;
    const row = body.rows[i];

    const type = (asString(row.type) || "OTHER").toUpperCase();
    const description = asString(row.description);
    const method = (asString(row.method) || "CASH").toUpperCase();
    const amount = Number(row.amount);
    const bankName = asString(row.bankName);
    const bankRef = asString(row.bankRef);
    const note = asString(row.note);
    const date = row.date ? new Date(row.date) : new Date();

    if (!["RENT", "OTHER"].includes(type)) {
      errors.push({ row: rowNo, error: "Type invalide" });
      continue;
    }

    if (!description) {
      errors.push({ row: rowNo, error: "Description obligatoire" });
      continue;
    }

    if (!["CASH", "TRANSFER", "CHECK"].includes(method)) {
      errors.push({ row: rowNo, error: "Methode invalide" });
      continue;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ row: rowNo, error: "Montant invalide" });
      continue;
    }

    if ((method === "TRANSFER" || method === "CHECK") && !bankName) {
      errors.push({ row: rowNo, error: "Banque obligatoire" });
      continue;
    }

    if (method === "CHECK" && !bankRef) {
      errors.push({ row: rowNo, error: "Numero de cheque obligatoire" });
      continue;
    }

    validRows.push({
      type: type as "RENT" | "OTHER",
      description,
      amount,
      method: method as "CASH" | "TRANSFER" | "CHECK",
      date,
      bankName: bankName || null,
      bankRef: bankRef || null,
      note: note || null,
    });
  }

  let imported = 0;

  if (validRows.length > 0) {
    const last = await prisma.otherReceipt.findFirst({
      where: { organizationId: gate.organizationId },
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true },
    });

    const startNumber = last?.receiptNumber ?? 0;

    await prisma.otherReceipt.createMany({
      data: validRows.map((row, index) => ({
        receiptNumber: startNumber + index + 1,
        organizationId: gate.organizationId,
        type: row.type,
        description: row.description,
        amount: row.amount,
        method: row.method,
        date: row.date,
        bankName: row.bankName,
        bankRef: row.bankRef,
        note: row.note,
      })),
    });

    imported = validRows.length;
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
