import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { ensureFiscalYear } from "@/lib/fiscalYear";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { resolveActiveFiscalYear } from "@/lib/active-fiscal-year";

function getErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

type PaymentAttachment = {
  name: string;
  url: string;
  type: string;
};

function parseAttachments(value: unknown): PaymentAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as {
        name?: unknown;
        url?: unknown;
        type?: unknown;
      };

      if (typeof candidate.name !== "string" || typeof candidate.url !== "string") {
        return null;
      }

      const name = candidate.name.trim();
      const url = candidate.url.trim();
      const type =
        typeof candidate.type === "string" ? candidate.type.trim() : "";

      if (!name || !url) {
        return null;
      }

      return {
        name,
        url,
        type,
      };
    })
    .filter((item): item is PaymentAttachment => item !== null);
}

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ payments: [], suppliers: [], banks: [], settings: null });
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = await resolveActiveFiscalYear(orgId, yearParam);

  const startDate =
    year && Number.isFinite(year) ? new Date(Date.UTC(year, 0, 1)) : undefined;

  const endDate =
    year && Number.isFinite(year)
      ? new Date(Date.UTC(year + 1, 0, 1))
      : undefined;

  const [payments, suppliers, banks, settings] = await Promise.all([
    prisma.payment.findMany({
      where:
        startDate && endDate
          ? {
              organizationId: orgId!,
              date: {
                gte: startDate,
                lt: endDate,
              },
            }
          : { organizationId: orgId! },
      orderBy: [{ date: "desc" }, { paymentNumber: "desc" }],
      select: {
        id: true,
        paymentNumber: true,
        date: true,
        amount: true,
        method: true,
        note: true,
        bankName: true,
        bankRef: true,
        supplier: { select: { id: true, name: true } },
        accountingPost: { select: { id: true, name: true, code: true } },
      },
    }),

    prisma.supplier.findMany({
      where: { organizationId: orgId!, isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.internalBank.findMany({
      where: { organizationId: orgId!, isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.appSettings.findFirst({ where: { organizationId: orgId! } }),
  ]);

  return NextResponse.json({
    payments,
    suppliers,
    banks,
    settings,
  });
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();

    const supplierId =
      typeof body.supplierId === "string" ? body.supplierId : "";

    const accountingPostId =
      typeof body.accountingPostId === "string" && body.accountingPostId.trim()
        ? body.accountingPostId
        : null;

    const amount = Number(
      String(body.amount ?? "0")
        .replace(/\s/g, "")
        .replace(",", ".")
    );

    if (!supplierId) {
      return NextResponse.json(
        { error: "SUPPLIER_REQUIRED" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "INVALID_AMOUNT" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, organizationId: orgId! },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "SUPPLIER_NOT_FOUND" }, { status: 404 });
    }

    if (accountingPostId) {
      const post = await prisma.accountingPost.findFirst({
        where: { id: accountingPostId, organizationId: orgId! },
        select: { id: true },
      });

      if (!post) {
        return NextResponse.json({ error: "POST_NOT_FOUND" }, { status: 404 });
      }
    }

    const settings = await prisma.appSettings.findFirst({
      where: { organizationId: orgId! },
    });

    const paymentStartNumber = settings?.paymentStartNumber ?? 1;

    const lastPayment = await prisma.payment.findFirst({
      where: { organizationId: orgId! },
      orderBy: { paymentNumber: "desc" },
      select: { paymentNumber: true },
    });

    let nextNumber: number;

    if (!lastPayment) {
      nextNumber = paymentStartNumber;
    } else if (lastPayment.paymentNumber < paymentStartNumber) {
      nextNumber = paymentStartNumber;
    } else {
      nextNumber = lastPayment.paymentNumber + 1;
    }

    const paymentDate = body.date ? new Date(body.date) : new Date();
    const attachments = parseAttachments(body.attachments) as Prisma.InputJsonValue;
    await ensureFiscalYear(prisma, orgId!, paymentDate);

    const payment = await prisma.payment.create({
      data: {
        organizationId: orgId!,
        supplierId,
        accountingPostId,
        method: body.method ?? "CASH",
        amount,
        note: typeof body.note === "string" ? body.note : null,
        attachments,
        bankName: typeof body.bankName === "string" ? body.bankName : null,
        bankRef: typeof body.bankRef === "string" ? body.bankRef : null,
        date: paymentDate,
        paymentNumber: nextNumber,
      },
      include: {
        supplier: true,
        accountingPost: true,
      },
    });

    return NextResponse.json(payment);
  } catch (e) {
    console.error("POST /api/payments failed:", e);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
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

  const body = await req.json();

  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id
      : null;

  if (!id) {
    return NextResponse.json(
      { error: "PAYMENT_ID_REQUIRED" },
      { status: 400 }
    );
  }

  const existing = await prisma.payment.findFirst({
    where: { id, organizationId: orgId! },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }

  await prisma.payment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json();

  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id
      : null;

  if (!id) {
    return NextResponse.json(
      { error: "PAYMENT_ID_REQUIRED" },
      { status: 400 }
    );
  }

  const supplierId =
    typeof body.supplierId === "string" && body.supplierId.trim()
      ? body.supplierId
      : null;

  const accountingPostId =
    typeof body.accountingPostId === "string" && body.accountingPostId.trim()
      ? body.accountingPostId
      : null;

  const amount = Number(
    String(body.amount ?? "0")
      .replace(/\s/g, "")
      .replace(",", ".")
  );

  const method =
    typeof body.method === "string" ? body.method : "CASH";
  const attachments = parseAttachments(body.attachments) as Prisma.InputJsonValue;

  if (!["CASH", "TRANSFER", "CHECK", "DEBIT"].includes(method)) {
    return NextResponse.json(
      { error: "INVALID_METHOD" },
      { status: 400 }
    );
  }

  if (method !== "CASH" && !body.bankName) {
    return NextResponse.json(
      { error: "BANK_REQUIRED" },
      { status: 400 }
    );
  }

  if (method === "CHECK" && !body.bankRef) {
    return NextResponse.json(
      { error: "CHECK_REF_REQUIRED" },
      { status: 400 }
    );
  }

  if (!supplierId) {
    return NextResponse.json(
      { error: "SUPPLIER_REQUIRED" },
      { status: 400 }
    );
  }

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: "INVALID_AMOUNT" },
      { status: 400 }
    );
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId: orgId! },
    select: { id: true },
  });

  if (!supplier) {
    return NextResponse.json({ error: "SUPPLIER_NOT_FOUND" }, { status: 404 });
  }

  if (accountingPostId) {
    const post = await prisma.accountingPost.findFirst({
      where: { id: accountingPostId, organizationId: orgId! },
      select: { id: true },
    });

    if (!post) {
      return NextResponse.json({ error: "POST_NOT_FOUND" }, { status: 404 });
    }
  }

  const existing = await prisma.payment.findFirst({
    where: { id, organizationId: orgId! },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      supplierId,
      accountingPostId,
      method,
      amount,
      note: typeof body.note === "string" ? body.note : null,
      attachments,
      bankName: typeof body.bankName === "string" ? body.bankName : null,
      bankRef: typeof body.bankRef === "string" ? body.bankRef : null,
      date: body.date ? new Date(body.date) : undefined,
    },
    include: {
      supplier: true,
      accountingPost: true,
    },
  });

  return NextResponse.json(payment);
}
