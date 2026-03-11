import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function GET() {

  const gate = await requireAdmin();

  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.error },
      { status: gate.status }
    );
  }

  const items = await prisma.otherReceipt.findMany({
    orderBy: [
      { date: "desc" },
      { receiptNumber: "desc" }
    ]
  });

  return NextResponse.json(items);
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
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true }
    });

    const receiptNumber = last
      ? last.receiptNumber + 1
      : 1;

    const created = await prisma.otherReceipt.create({
      data: {
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