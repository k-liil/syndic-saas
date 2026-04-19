import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  try {
    const banks = await prisma.internalBank.findMany({
      where: { organizationId: orgId! },
      orderBy: { name: "asc" },
    });

    // Normalize Decimal to number for JSON serialization
    const normalizedBanks = banks.map(bank => ({
      ...bank,
      openingBalance: Number(bank.openingBalance)
    }));

    return NextResponse.json(normalizedBanks);
  } catch (error: any) {
    console.error("[INTERNAL_BANKS_GET] Error:", error);

    // Self-healing: if columns are missing, try to add them
    if (error.message?.includes("column") || error.code === "P2021") {
      console.log("[INTERNAL_BANKS_GET] Attempting self-healing for missing columns...");
      try {
        // We try to add all potential missing columns
        const columnsToAdd = [
          { name: "agency", type: "TEXT" },
          { name: "city", type: "TEXT" },
          { name: "accountNumber", type: "TEXT" },
          { name: "openingBalanceDate", type: "TIMESTAMP" }
        ];

        for (const col of columnsToAdd) {
          try {
            await prisma.$executeRawUnsafe(
              `ALTER TABLE "InternalBank" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};`
            );
            console.log(`[INTERNAL_BANKS_GET] Column "${col.name}" added or already exists.`);
          } catch (e) {
            console.error(`[INTERNAL_BANKS_GET] Failed to add column "${col.name}":`, e);
          }
        }

        // Retry the fetch
        const banks = await prisma.internalBank.findMany({
          where: { organizationId: orgId! },
          orderBy: { name: "asc" },
        });
        return NextResponse.json(banks.map(bank => ({
          ...bank,
          openingBalance: Number(bank.openingBalance)
        })));
      } catch (retryError) {
        console.error("[INTERNAL_BANKS_GET] Self-healing failed:", retryError);
      }
    }

    return NextResponse.json(
      { error: "Impossible de charger les banques internes" },
      { status: 500 }
    );
  }
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

  const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "NAME_REQUIRED" }, { status: 400 });
  }

  const bank = await prisma.internalBank.create({
    data: {
      organizationId: orgId!,
      name: body.name.trim(),
      agency: typeof body.agency === "string" ? body.agency.trim() : null,
      city: typeof body.city === "string" ? body.city.trim() : null,
      accountNumber: typeof body.accountNumber === "string" ? body.accountNumber.trim() : null,
      openingBalance: typeof body.openingBalance === "number" ? body.openingBalance : 0,
      openingBalanceDate: typeof body.openingBalanceDate === "string" ? new Date(body.openingBalanceDate) : null,
    },
  });

  return NextResponse.json(bank);
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

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.internalBank.findFirst({
    where: { id: body.id, organizationId: orgId! },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "BANK_NOT_FOUND" }, { status: 404 });
  }

  const bank = await prisma.internalBank.update({
    where: { id: body.id },
    data: {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      agency: typeof body.agency === "string" ? body.agency.trim() : undefined,
      city: typeof body.city === "string" ? body.city.trim() : undefined,
      accountNumber: typeof body.accountNumber === "string" ? body.accountNumber.trim() : undefined,
      isActive:
        typeof body.isActive === "boolean" ? body.isActive : undefined,
      openingBalance:
        typeof body.openingBalance === "number" ? body.openingBalance : undefined,
      openingBalanceDate:
        typeof body.openingBalanceDate === "string" ? new Date(body.openingBalanceDate) : undefined,
    },
  });

  return NextResponse.json(bank);
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

  if (!body.id) {
    return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.internalBank.findFirst({
    where: { id: body.id, organizationId: orgId! },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "BANK_NOT_FOUND" }, { status: 404 });
  }

  try {
    const bank = await prisma.internalBank.delete({
      where: { id: body.id }
    });
    return NextResponse.json(bank);
  } catch (e: unknown) {
    return NextResponse.json({ error: "INTERNAL_ERROR_OR_IN_USE" }, { status: 400 });
  }
}
