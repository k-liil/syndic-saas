import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

function asString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function asNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

type Row = {
  supplierName?: string;
  postName?: string;
  postCode?: string;
  method?: string;
  amount?: number;
  date?: string;
  bankName?: string;
  bankRef?: string;
  note?: string;
};

type Body =
  | { action: "start"; totalRows: number }
  | {
      action: "batch";
      jobId?: string;
      rows: Row[];
      offset?: number;
      isLastBatch?: boolean;
    };

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    if (body.action === "start") {
      const job = await prisma.importJob.create({
        data: {
          organizationId: gate.organizationId ?? "",
          type: "payments",
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

    if (body.action !== "batch") {
      return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
    }

    const job = body.jobId
      ? await prisma.importJob.findUnique({
          where: { id: body.jobId },
        })
      : null;

    if (body.jobId && (!job || job.organizationId !== gate.organizationId)) {
      return NextResponse.json({ error: "JOB_NOT_FOUND" }, { status: 404 });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    const offset = asNumber(body.offset);
    const errors: { row: number; error: string }[] = [];

    const [suppliers, posts, settings, lastPayment] = await Promise.all([
      prisma.supplier.findMany({
        where: { organizationId: gate.organizationId ?? "" },
        select: { id: true, name: true },
      }),
      prisma.accountingPost.findMany({
        where: { organizationId: gate.organizationId ?? "" },
        select: { id: true, code: true, name: true },
      }),
      prisma.appSettings.findFirst({ where: { organizationId: gate.organizationId ?? "" } }),
      prisma.payment.findFirst({
        where: { organizationId: gate.organizationId ?? "" },
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      }),
    ]);

    const suppliersByName = new Map(
      suppliers.map((supplier) => [supplier.name.toLowerCase(), supplier])
    );
    const postsByCode = new Map(
      posts.map((post) => [post.code.toLowerCase(), post])
    );
    const postsByName = new Map(
      posts.map((post) => [post.name.toLowerCase(), post])
    );

    const paymentStartNumber = settings?.paymentStartNumber ?? 1;
    let nextPaymentNumber = lastPayment?.paymentNumber
      ? Math.max(lastPayment.paymentNumber + 1, paymentStartNumber)
      : paymentStartNumber;

    const validRows: Array<{
      supplierId: string;
      accountingPostId: string | null;
      method: "CASH" | "TRANSFER" | "CHECK" | "DEBIT";
      amount: number;
      date: Date;
      bankName: string | null;
      bankRef: string | null;
      note: string | null;
      paymentNumber: number;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = offset + i + 2;

      const supplierName = asString(row.supplierName);
      const postCode = asString(row.postCode);
      const postName = asString(row.postName);
      const method = asString(row.method).toUpperCase();
      const bankName = asString(row.bankName);
      const bankRef = asString(row.bankRef);
      const note = asString(row.note);
      const amount = asNumber(row.amount);
      const paymentDate = row.date ? new Date(row.date) : new Date();

      if (!supplierName) {
        errors.push({ row: rowNumber, error: "SUPPLIER_REQUIRED" });
        continue;
      }

      if (!["CASH", "TRANSFER", "CHECK", "DEBIT"].includes(method)) {
        errors.push({ row: rowNumber, error: "INVALID_METHOD" });
        continue;
      }

      if (amount <= 0) {
        errors.push({ row: rowNumber, error: "INVALID_AMOUNT" });
        continue;
      }

      if ((method === "TRANSFER" || method === "CHECK" || method === "DEBIT") && !bankName) {
        errors.push({ row: rowNumber, error: "BANK_REQUIRED" });
        continue;
      }

      if (method === "CHECK" && !bankRef) {
        errors.push({ row: rowNumber, error: "CHECK_REF_REQUIRED" });
        continue;
      }

      if (Number.isNaN(paymentDate.getTime())) {
        errors.push({ row: rowNumber, error: "INVALID_DATE" });
        continue;
      }

      const supplier = suppliersByName.get(supplierName.toLowerCase());
      if (!supplier) {
        errors.push({ row: rowNumber, error: `SUPPLIER_NOT_FOUND: ${supplierName}` });
        continue;
      }

      let accountingPostId: string | null = null;
      if (postCode || postName) {
        const post = postCode 
          ? postsByCode.get(postCode.toLowerCase())
          : postsByName.get(postName.toLowerCase());
        if (!post) {
          errors.push({ row: rowNumber, error: `POST_NOT_FOUND: ${postCode || postName}` });
          continue;
        }
        accountingPostId = post.id;
      }

      validRows.push({
        supplierId: supplier.id,
        accountingPostId,
        method: method as "CASH" | "TRANSFER" | "CHECK" | "DEBIT",
        amount,
        date: paymentDate,
        bankName: method !== "CASH" ? bankName || null : null,
        bankRef: method === "CHECK" ? bankRef || null : null,
        note: note || null,
        paymentNumber: nextPaymentNumber,
      });

      nextPaymentNumber += 1;
    }

    if (validRows.length > 0) {
      const fiscalYears = Array.from(
        new Set(validRows.map((row) => row.date.getUTCFullYear()))
      );

      await prisma.$transaction(async (tx) => {
        for (const fiscalYear of fiscalYears) {
          await tx.fiscalYear.upsert({
            where: {
              organizationId_year: {
                organizationId: gate.organizationId ?? "",
                year: fiscalYear,
              },
            },
            update: {},
            create: {
              organizationId: gate.organizationId ?? "",
              year: fiscalYear,
              startsAt: new Date(Date.UTC(fiscalYear, 0, 1)),
              endsAt: new Date(Date.UTC(fiscalYear, 11, 31)),
            },
          });
        }

        await tx.payment.createMany({
          data: validRows.map((row) => ({
            ...row,
            organizationId: gate.organizationId ?? "",
          })),
        });
      });
    }

    const processed = (job?.processed ?? 0) + rows.length;

    const updated = job
      ? await prisma.importJob.update({
          where: { id: job.id },
          data: {
            processed,
            status: body.isLastBatch ? "done" : "processing",
          },
        })
      : null;

    return NextResponse.json({
      ok: true,
      imported: validRows.length,
      errors,
      processed: updated?.processed ?? processed,
      totalRows: updated?.totalRows ?? rows.length,
      status: updated?.status ?? "done",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "IMPORT_FAILED" },
      { status: 500 }
    );
  }
}
