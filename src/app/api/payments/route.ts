import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { ensureFiscalYear } from "@/lib/fiscalYear";

export async function GET(req: Request) {
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
              date: {
                gte: startDate,
                lt: endDate,
              },
            }
          : undefined,
      orderBy: [{ date: "desc" }, { paymentNumber: "desc" }],
      include: {
        supplier: true,
        category: true,
      },
    }),

    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.internalBank.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),

    prisma.appSettings.findFirst(),
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

    const amount = Number(body.amount ?? 0);

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

    const settings = await prisma.appSettings.findFirst();

    const paymentStartNumber = settings?.paymentStartNumber ?? 1;

    const lastPayment = await prisma.payment.findFirst({
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
await ensureFiscalYear(prisma, paymentDate);

const payment = await prisma.payment.create({
  data: {
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

  await prisma.payment.delete({
    where: { id },
  });

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

  const amount = Number(body.amount ?? 0);

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

  const payment = await prisma.payment.update({
    where: { id },
    data: {
      supplierId,
      categoryId,
      method: body.method ?? "CASH",
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