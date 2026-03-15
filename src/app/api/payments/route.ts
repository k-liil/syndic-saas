import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ensureFiscalYear } from "@/lib/fiscalYear";

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : null;

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
              organizationId: gate.organizationId,
              date: {
                gte: startDate,
                lt: endDate,
              },
            }
          : { organizationId: gate.organizationId },
      orderBy: [{ date: "desc" }, { paymentNumber: "desc" }],
      include: {
        supplier: true,
        category: true,
      },
    }),

    prisma.supplier.findMany({
      where: { organizationId: gate.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.internalBank.findMany({
      where: { organizationId: gate.organizationId, isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.appSettings.findFirst({ where: { organizationId: gate.organizationId } }),
  ]);

  return NextResponse.json({
    payments,
    suppliers,
    banks,
    settings,
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = await req.json();

    const supplierId =
      typeof body.supplierId === "string" ? body.supplierId : "";

    const categoryId =
      typeof body.categoryId === "string" && body.categoryId.trim()
        ? body.categoryId
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
      where: { id: supplierId, organizationId: gate.organizationId },
      select: { id: true },
    });

    if (!supplier) {
      return NextResponse.json({ error: "SUPPLIER_NOT_FOUND" }, { status: 404 });
    }

    if (categoryId) {
      const category = await prisma.paymentCategory.findFirst({
        where: { id: categoryId, organizationId: gate.organizationId },
        select: { id: true },
      });

      if (!category) {
        return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
      }
    }

    const settings = await prisma.appSettings.findFirst({
      where: { organizationId: gate.organizationId },
    });

    const paymentStartNumber = settings?.paymentStartNumber ?? 1;

    const lastPayment = await prisma.payment.findFirst({
      where: { organizationId: gate.organizationId },
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
await ensureFiscalYear(prisma, gate.organizationId, paymentDate);

const payment = await prisma.payment.create({
  data: {
    organizationId: gate.organizationId,
    supplierId,
    categoryId,
    method: body.method ?? "CASH",
    amount,
    note: typeof body.note === "string" ? body.note : null,
    bankName: typeof body.bankName === "string" ? body.bankName : null,
    bankRef: typeof body.bankRef === "string" ? body.bankRef : null,
    date: paymentDate,
    paymentNumber: nextNumber,
  },
  include: {
    supplier: true,
    category: true,
  },
});

    return NextResponse.json(payment);
  } catch (e: any) {
    console.error("POST /api/payments failed:", e);

    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
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
    where: { id, organizationId: gate.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }

  await prisma.payment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
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

  const categoryId =
    typeof body.categoryId === "string" && body.categoryId.trim()
      ? body.categoryId
      : null;

  const amount = Number(
  String(body.amount ?? "0")
    .replace(/\s/g, "")
    .replace(",", ".")
);

console.log("BODY AMOUNT:", body.amount);
console.log("PARSED AMOUNT:", amount);

  const method =
  typeof body.method === "string" ? body.method : "CASH";

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

  if (!["CASH", "TRANSFER", "CHECK", "DEBIT"].includes(body.method ?? "CASH")) {
  return NextResponse.json(
    { error: "INVALID_METHOD" },
    { status: 400 }
  );
}

  if (body.method !== "CASH" && !body.bankName) {
    return NextResponse.json(
      { error: "BANK_REQUIRED" },
      { status: 400 }
    );
  }

  if (body.method === "CHECK" && !body.bankRef) {
    return NextResponse.json(
      { error: "CHECK_REF_REQUIRED" },
      { status: 400 }
    );
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId: gate.organizationId },
    select: { id: true },
  });

  if (!supplier) {
    return NextResponse.json({ error: "SUPPLIER_NOT_FOUND" }, { status: 404 });
  }

  if (categoryId) {
    const category = await prisma.paymentCategory.findFirst({
      where: { id: categoryId, organizationId: gate.organizationId },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json({ error: "CATEGORY_NOT_FOUND" }, { status: 404 });
    }
  }

  const existing = await prisma.payment.findFirst({
    where: { id, organizationId: gate.organizationId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      supplierId,
      categoryId,
      method,
      amount,
      note: typeof body.note === "string" ? body.note : null,
      bankName: typeof body.bankName === "string" ? body.bankName : null,
      bankRef: typeof body.bankRef === "string" ? body.bankRef : null,
      date: body.date ? new Date(body.date) : undefined,
    },
    include: {
      supplier: true,
      category: true,
    },
  });

  return NextResponse.json(payment);
}
