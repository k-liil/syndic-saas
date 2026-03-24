import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

async function enforceAccess(id: string) {
  const gate = await requireAuth();
  if (!gate.ok) return gate;

  if (!gate.isSuperAdmin) {
    const membership = gate.userOrganizations?.find((item) => item.organizationId === id);
    if (!membership || membership.role !== "MANAGER") {
      return { ok: false as const, status: 403, error: "Acces refuse" };
    }
  }

  return gate;
}

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const gate = await enforceAccess(id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          userOrganizations: true,
          buildings: true,
          units: true,
          owners: true,
          payments: true,
          receipts: true,
        },
      },
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  }

  return NextResponse.json(organization);
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const gate = await enforceAccess(id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const {
    name,
    slug,
    isActive,
    address,
    city,
    zipCode,
    email,
    phone,
    landTitle,
    srmContact,
    rib,
    logoUrl,
    logoSize,
  } = body;

  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  }

  if (slug && slug !== existing.slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Le slug doit etre en minuscules, sans espaces" },
        { status: 400 },
      );
    }

    const conflict = await prisma.organization.findUnique({ where: { slug } });
    if (conflict) {
      return NextResponse.json({ error: "Ce slug est deja utilise" }, { status: 409 });
    }
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(isActive !== undefined && { isActive }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(zipCode !== undefined && { zipCode }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(landTitle !== undefined && { landTitle }),
      ...(srmContact !== undefined && { srmContact }),
      ...(rib !== undefined && { rib }),
      ...(logoUrl !== undefined && { logoUrl }),
      ...(logoSize !== undefined && { logoSize }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const gate = await enforceAccess(id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const existing = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          units: true,
          owners: true,
          payments: true,
          receipts: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
  }

  if (existing._count.units > 0 || existing._count.owners > 0) {
    return NextResponse.json(
      { error: "Impossible de supprimer une organisation contenant encore des donnees liees." },
      { status: 409 },
    );
  }

  await prisma.organization.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
