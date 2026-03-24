import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import bcrypt from "bcryptjs";
import { canManage } from "@/lib/roles";

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function parseContributionStartAt(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed}-01T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function linkOwnerToUser(tx: any, ownerId: string, email: string, name: string, organizationId: string) {
  const cleanEmail = email.trim().toLowerCase();
  let user = await tx.user.findUnique({ where: { email: cleanEmail } });

  if (!user) {
    const passwordHash = await bcrypt.hash("Syndic1234", 12);
    user = await tx.user.create({
      data: {
        email: cleanEmail,
        name: name,
        passwordHash,
        role: "OWNER",
        organizations: {
          create: {
            organizationId,
            role: "OWNER",
          },
        },
      },
    });
  } else {
    const uo = await tx.userOrganization.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId } }
    });
    if (!uo) {
      await tx.userOrganization.create({
        data: { userId: user.id, organizationId, role: "OWNER" }
      });
    }
  }

  await tx.owner.update({
    where: { id: ownerId },
    data: { userId: user.id }
  });
}

export async function GET(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");

    const canViewAllOwners = canManage(gate.session.user?.role);

    const items = await prisma.owner.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        organizationId: orgId,
        ...(!canViewAllOwners ? { userId: gate.userId } : {}),
        ...(unitId
          ? {
              ownerships: {
                some: { unitId, endDate: null, organizationId: orgId },
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        cin: true,
        email: true,
        phone: true,
        notes: true,
        contributionStartAt: true,
        ownerships: {
          where: { endDate: null },
          orderBy: { startDate: "desc" },
          select: {
            unit: {
              select: {
                id: true,
                lotNumber: true,
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
          .map((x: any) => x.unit)
          .filter(Boolean)
          .map((u: any) => ({
            id: u.id,
            lotNumber: u.lotNumber,
            reference: u.reference,
            type: u.type,
            buildingId: u.buildingId ?? null,
            buildingName: u.building?.name ?? null,
          }));

        const primary = units.find((u: any) => u.type === "APARTMENT") ?? units[0] ?? null;

        return {
          id: o.id,
          name: o.name,
          firstName: o.firstName,
          cin: o.cin,
          email: o.email,
          phone: o.phone,
          notes: o.notes,
          contributionStartAt: o.contributionStartAt,
          units,
          primaryBuildingName: primary?.buildingName ?? null,
          primaryUnitRef: primary?.lotNumber ?? primary?.reference ?? null,
        };
      })
      .sort((a: any, b: any) => {
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
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  const unitId = asString(body.unitId);
  const lotNumber = asString(body.lotNumber);
  const firstName = asString(body.firstName).trim();
  const name = asString(body.name).trim();
  const cin = asString(body.cin).trim();
  const email = asString(body.email).trim();
  const phone = asString(body.phone).trim();
  const notes = asString(body.notes).trim();
  const contributionStartAt = parseContributionStartAt(body.contributionStartMonth);

  if (!unitId && !lotNumber) return NextResponse.json({ error: "unitId or lotNumber is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const unit = unitId
      ? await prisma.unit.findFirst({
          where: { id: unitId, organizationId: orgId },
          select: { id: true },
        })
      : await prisma.unit.findFirst({
          where: { lotNumber, organizationId: orgId },
          select: { id: true },
        });

    if (!unit) return NextResponse.json({ error: "Unit not found" }, { status: 400 });

    const created = await prisma.$transaction(async (tx) => {
      const owner = await tx.owner.upsert({
        where: {
          organizationId_cin: {
            organizationId: orgId,
            cin,
          },
        },
        update: {
          name,
          firstName: firstName || null,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          contributionStartAt,
        },
        create: {
          organizationId: orgId,
          cin: cin || null,
          firstName: firstName || null,
          name,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          contributionStartAt,
        },
        select: { id: true, name: true, firstName: true, cin: true, email: true, phone: true, notes: true },
      });

      const existing = await tx.ownership.findFirst({
        where: { ownerId: owner.id, unitId: unit.id, endDate: null },
        select: { id: true },
      });

      if (!existing) {
        await tx.ownership.create({
          data: {
            organizationId: orgId,
            ownerId: owner.id,
            unitId: unit.id,
          },
        });
      }

      if (email) {
        await linkOwnerToUser(tx, owner.id, email, `${firstName} ${name}`.trim(), orgId);
      }

      return owner;
    });

    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Create failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();

  const id = asString(body.id);
  const unitId = asString(body.unitId);
  const lotNumber = asString(body.lotNumber);
  const firstName = asString(body.firstName).trim();
  const name = asString(body.name).trim();
  const cin = asString(body.cin).trim();
  const email = asString(body.email).trim();
  const phone = asString(body.phone).trim();
  const notes = asString(body.notes);
  const contributionStartAt = parseContributionStartAt(body.contributionStartMonth);

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (!unitId && !lotNumber) return NextResponse.json({ error: "unitId or lotNumber is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const unit = unitId
        ? await tx.unit.findFirst({
            where: { id: unitId, organizationId: orgId },
            select: { id: true },
          })
        : await tx.unit.findFirst({
            where: { lotNumber, organizationId: orgId },
            select: { id: true },
          });

      if (!unit) throw new Error("Unit not found");

      const existingOwner = await tx.owner.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true },
      });

      if (!existingOwner) throw new Error("Owner not found");

      const owner = await tx.owner.update({
        where: { id },
        data: {
          name,
          firstName: firstName || null,
          cin: cin || null,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          contributionStartAt,
        },
        select: { id: true, name: true, firstName: true, cin: true, email: true, phone: true, notes: true },
      });

      await tx.ownership.updateMany({
        where: {
          organizationId: orgId,
          ownerId: owner.id,
          endDate: null,
          unitId: { not: unit.id },
        },
        data: { endDate: new Date() },
      });

      const existing = await tx.ownership.findFirst({
        where: {
          organizationId: orgId,
          ownerId: owner.id,
          unitId: unit.id,
          endDate: null,
        },
        select: { id: true },
      });

      if (!existing) {
        await tx.ownership.create({
          data: {
            organizationId: orgId,
            ownerId: owner.id,
            unitId: unit.id,
          },
        });
      }

      if (email) {
        await linkOwnerToUser(tx, owner.id, email, `${firstName} ${name}`.trim(), orgId);
      }

      return owner;
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

  const body = await req.json();
  const id = asString(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const existingOwner = await tx.owner.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true },
      });

      if (!existingOwner) {
        throw new Error("Owner not found");
      }

      await tx.ownership.updateMany({
        where: { organizationId: orgId, ownerId: id, endDate: null },
        data: { endDate: new Date() },
      });
      await tx.owner.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Delete failed" }, { status: 500 });
  }
}
