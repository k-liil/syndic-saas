import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

export async function GET(req: Request) {
  try {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");

    const items = await prisma.owner.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        organizationId: gate.organizationId,
        ...(unitId
          ? {
              ownerships: {
                some: { unitId, endDate: null, organizationId: gate.organizationId },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        cin: true,
        email: true,
        phone: true,
        ownerships: {
          where: { endDate: null },
          orderBy: { startDate: "desc" },
          select: {
            unit: {
              select: {
                id: true,
                reference: true,
                type: true,
                buildingId: true,
                building: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    const shaped = items
      .map((o) => {
        const units = (o.ownerships ?? [])
          .map((x) => x.unit)
          .filter(Boolean)
          .map((u) => ({
            id: u.id,
            reference: u.reference,
            type: u.type,
            buildingId: u.buildingId ?? null,
            buildingName: u.building?.name ?? null,
          }));

        const primary = units.find((u) => u.type === "APARTMENT") ?? units[0] ?? null;

        return {
          id: o.id,
          name: o.name,
          cin: o.cin,
          email: o.email,
          phone: o.phone,
          units,
          primaryBuildingName: primary?.buildingName ?? null,
          primaryUnitRef: primary?.reference ?? null,
        };
      })
      .sort((a, b) => {
        const ab = (a.primaryBuildingName ?? "ZZZZZZ").localeCompare(
          b.primaryBuildingName ?? "ZZZZZZ",
          undefined,
          { sensitivity: "base" }
        );
        if (ab !== 0) return ab;

        return (a.primaryUnitRef ?? "").localeCompare(b.primaryUnitRef ?? "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });

    return NextResponse.json(shaped);
  } catch (e: any) {
    console.error("GET owners crash:", e);
    return NextResponse.json({ error: e?.message ?? "Crash" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();

const unitId = asString(body.unitId);
const lotNumber = asString(body.lotNumber);
const name = asString(body.name).trim();
const cin = asString(body.cin).trim();
const email = asString(body.email).trim();
const phone = asString(body.phone).trim();

if (!unitId && !lotNumber) return NextResponse.json({ error: "unitId or lotNumber is required" }, { status: 400 });
if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
if (!cin) return NextResponse.json({ error: "CIN is required" }, { status: 400 });

  try {
    const unit = unitId
      ? await prisma.unit.findFirst({
          where: { id: unitId, organizationId: gate.organizationId },
          select: { id: true },
        })
      : await prisma.unit.findFirst({
          where: { lotNumber, organizationId: gate.organizationId },
          select: { id: true },
        });

    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const owner = await tx.owner.upsert({
        where: {
          organizationId_cin: {
            organizationId: gate.organizationId,
            cin,
          },
        },
        update: {
          name,
          email: email || null,
          phone: phone || null,
        },
        create: {
          organizationId: gate.organizationId,
          cin,
          name,
          email: email || null,
          phone: phone || null,
        },
        select: { id: true, name: true, cin: true, email: true, phone: true },
      });

      const existing = await tx.ownership.findFirst({
        where: { ownerId: owner.id, unitId: unit.id, endDate: null },
        select: { id: true },
      });

      if (!existing) {
        await tx.ownership.create({
          data: {
            organizationId: gate.organizationId,
            ownerId: owner.id,
            unitId: unit.id,
          },
        });
      }

      return owner;
    });

    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();

  const id = asString(body.id);
  const unitId = asString(body.unitId);
  const lotNumber = asString(body.lotNumber);
  const name = asString(body.name).trim();
  const cin = asString(body.cin).trim();
  const email = asString(body.email).trim();
  const phone = asString(body.phone).trim();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!unitId && !lotNumber) return NextResponse.json({ error: "unitId or lotNumber is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!cin) return NextResponse.json({ error: "CIN is required" }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const unit = unitId
        ? await tx.unit.findFirst({
            where: { id: unitId, organizationId: gate.organizationId },
            select: { id: true },
          })
        : await tx.unit.findFirst({
            where: { lotNumber, organizationId: gate.organizationId },
            select: { id: true },
          });

      if (!unit) throw new Error("Unit not found");

      const existingOwner = await tx.owner.findFirst({
        where: { id, organizationId: gate.organizationId },
        select: { id: true },
      });

      if (!existingOwner) throw new Error("Owner not found");

      const owner = await tx.owner.update({
        where: { id },
        data: {
          name,
          cin,
          email: email || null,
          phone: phone || null,
        },
        select: { id: true, name: true, cin: true, email: true, phone: true },
      });

      await tx.ownership.updateMany({
        where: {
          organizationId: gate.organizationId,
          ownerId: owner.id,
          endDate: null,
          unitId: { not: unit.id },
        },
        data: { endDate: new Date() },
      });

      const existing = await tx.ownership.findFirst({
        where: {
          organizationId: gate.organizationId,
          ownerId: owner.id,
          unitId: unit.id,
          endDate: null,
        },
        select: { id: true },
      });

      if (!existing) {
        await tx.ownership.create({
          data: {
            organizationId: gate.organizationId,
            ownerId: owner.id,
            unitId: unit.id,
          },
        });
      }

      return owner;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await req.json();
  const id = asString(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const existingOwner = await tx.owner.findFirst({
        where: { id, organizationId: gate.organizationId },
        select: { id: true },
      });

      if (!existingOwner) {
        throw new Error("Owner not found");
      }

      await tx.ownership.updateMany({
        where: { organizationId: gate.organizationId, ownerId: id, endDate: null },
        data: { endDate: new Date() },
      });
      await tx.owner.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
