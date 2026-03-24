import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { id } = await params;

  const supplier = await prisma.supplier.findFirst({
    where: { id, organizationId: orgId },
    include: {
      payments: {
        orderBy: [{ date: "desc" }, { paymentNumber: "desc" }],
        take: 5,
        include: {
          organization: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!supplier) {
    return NextResponse.json({ error: "SUPPLIER_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    supplier: {
      id: supplier.id,
      name: supplier.name,
      sector: supplier.sector,
      contactName: supplier.contactName,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      note: supplier.note,
      photoUrl: supplier.photoUrl,
      isActive: supplier.isActive,
    },
    recentPayments: supplier.payments.map((payment) => ({
      id: payment.id,
      date: payment.date,
      description: payment.note || `Paiement ${payment.paymentNumber}`,
      organizationName: payment.organization.name,
      amount: Number(payment.amount),
    })),
  });
}
