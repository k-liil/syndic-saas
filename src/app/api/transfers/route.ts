import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { ensureFiscalYear } from "@/lib/fiscalYear";
import { PaymentMethod, ReceiptType } from "@prisma/client";

export const dynamic = "force-dynamic";

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
    const { sourceBankId, destinationBankId, amount, date, note } = body;

    const transferAmount = Number(amount);
    const transferDate = date ? new Date(date) : new Date();

    if (!transferAmount || transferAmount <= 0) {
      return NextResponse.json({ error: "INVALID_AMOUNT" }, { status: 400 });
    }

    if (sourceBankId === destinationBankId) {
      return NextResponse.json({ error: "SAME_SOURCE_DESTINATION" }, { status: 400 });
    }

    // Resolve system supplier and accounting post
    const [supplier, post, settings] = await Promise.all([
      prisma.supplier.findFirst({ where: { organizationId: orgId, name: "Virement Interne" } }),
      prisma.accountingPost.findFirst({ where: { organizationId: orgId, code: "VI" } }),
      prisma.appSettings.findFirst({ where: { organizationId: orgId } }),
      ensureFiscalYear(prisma, orgId, transferDate),
    ]);

    if (!supplier) throw new Error("SYSTEM_SUPPLIER_MISSING");

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Source Payment (Expense)
      const lastPayment = await tx.payment.findFirst({
        where: { organizationId: orgId },
        orderBy: { paymentNumber: "desc" },
        select: { paymentNumber: true },
      });
      const paymentStartNumber = settings?.paymentStartNumber ?? 1;
      const nextPaymentNumber = lastPayment ? Math.max(lastPayment.paymentNumber + 1, paymentStartNumber) : paymentStartNumber;

      const payment = await tx.payment.create({
        data: {
          organizationId: orgId,
          supplierId: supplier.id,
          accountingPostId: post?.id,
          method: "INTERNAL_TRANSFER" as PaymentMethod,
          amount: transferAmount,
          date: transferDate,
          paymentNumber: nextPaymentNumber,
          bankId: sourceBankId || null, // null = Caisse
          note: note || `Transfert vers ${destinationBankId ? 'Banque' : 'Caisse'}`,
        }
      });

      // 2. Create Destination Receipt (Income)
      const lastReceipt = await tx.otherReceipt.findFirst({
        where: { organizationId: orgId },
        orderBy: { receiptNumber: "desc" },
        select: { receiptNumber: true },
      });
      const nextReceiptNumber = lastReceipt ? lastReceipt.receiptNumber + 1 : 1;

      const receipt = await tx.otherReceipt.create({
        data: {
          organizationId: orgId,
          receiptNumber: nextReceiptNumber,
          type: ReceiptType.OTHER,
          description: `Transfert depuis ${sourceBankId ? 'Banque' : 'Caisse'}`,
          amount: transferAmount,
          method: "INTERNAL_TRANSFER" as PaymentMethod,
          date: transferDate,
          bankId: destinationBankId || null, // null = Caisse
          note: note || null,
        }
      });

      return { payment, receipt };
    });

    return NextResponse.json(result);

  } catch (e: any) {
    console.error("Transfer failed:", e);
    return NextResponse.json({ error: "TRANSFER_FAILED", detail: e.message }, { status: 500 });
  }
}
