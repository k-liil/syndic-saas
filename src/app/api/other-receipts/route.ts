import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );
  }

  const { searchParams } = new URL(req.url);

  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 50)));
  const type = asString(searchParams.get("type")).trim();
  const rawYear = searchParams.get("year");
  const year = rawYear ? Number(rawYear) : null;
  const q = asString(searchParams.get("q")).trim();

  const method = asString(searchParams.get("method")).trim();

  const skip = (page - 1) * pageSize;

  const where: any = {};
  where.organizationId = gate.organizationId;
if (method) {
  where.method = method;
}

  if (type) {
    where.type = type;
  }

  if (year && Number.isFinite(year)) {
    where.date = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  if (q) {
    where.OR = [
      { description: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
      { bankName: { contains: q, mode: "insensitive" } },
      { bankRef: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.otherReceipt.findMany({
      where,
      orderBy: [
        { date: "desc" },
        { receiptNumber: "desc" },
      ],
      skip,
      take: pageSize,
    }),
    prisma.otherReceipt.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

export async function POST(req: Request) {

  const gate = await requireAdmin();

  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );
  }

  try {

    const body = await req.json();

    const type = asString(body.type);
    const description = asString(body.description).trim();

    const amount = Number(body.amount);
    const method = asString(body.method);

    const date = body.date ? new Date(body.date) : new Date();

    const bankName = asString(body.bankName).trim();
    const bankRef = asString(body.bankRef).trim();

    const note = asString(body.note).trim();

    if (!["RENT","OTHER"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      );
    }

    if (!["CASH","TRANSFER","CHECK"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid method" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    if ((method === "TRANSFER" || method === "CHECK") && !bankName) {
      return NextResponse.json(
        { error: "Bank required" },
        { status: 400 }
      );
    }

    if (method === "CHECK" && !bankRef) {
      return NextResponse.json(
        { error: "Check number required" },
        { status: 400 }
      );
    }

    const last = await prisma.otherReceipt.findFirst({
      where: { organizationId: gate.organizationId },
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true }
    });

    const receiptNumber = last
      ? last.receiptNumber + 1
      : 1;

    const created = await prisma.otherReceipt.create({
      data: {
        organizationId: gate.organizationId,
        receiptNumber,
        type: type as any,
        description,
        amount,
        method: method as any,
        date,
        bankName: bankName || null,
        bankRef: bankRef || null,
        note: note || null
      }
    });

    return NextResponse.json(created);

  } catch (e) {

    console.error(e);

    return NextResponse.json(
      { error: "Creation failed" },
      { status: 500 }
    );
  }
}
