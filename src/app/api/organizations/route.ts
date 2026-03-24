import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { ensureOrganizationAccountingPosts } from "@/lib/accounting-post-defaults";

export async function GET() {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const whereClause = gate.isSuperAdmin
    ? {}
    : {
        userOrganizations: {
          some: {
            userId: gate.userId,
          },
        },
      };

  const organizations = await prisma.organization.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
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

  return NextResponse.json(organizations);
}

export async function POST(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (gate.session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Seul le super admin peut creer une organisation" },
      { status: 403 },
    );
  }

  const body = await req.json();
  const {
    name,
    slug,
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

  if (!name || !slug) {
    return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
  }

  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return NextResponse.json(
      { error: "Le slug doit etre en minuscules, sans espaces" },
      { status: 400 },
    );
  }

  const existingOrg = await prisma.organization.findUnique({ where: { slug } });
  if (existingOrg) {
    return NextResponse.json({ error: "Ce slug est deja utilise" }, { status: 409 });
  }

  const organization = await prisma.$transaction(async (tx) => {
    const createdOrganization = await tx.organization.create({
      data: {
        name,
        slug,
        isActive: true,
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
        userOrganizations: {
          create: {
            userId: gate.userId!,
            role: "MANAGER",
          },
        },
        settings: {
          create: {
            brandName: name,
            contributionType: "GLOBAL_FIXED",
            globalFixedAmount: 0,
            startYear: new Date().getFullYear(),
            startMonth: 1,
          },
        },
      },
    });

    await ensureOrganizationAccountingPosts(tx, createdOrganization.id);

    return createdOrganization;
  });

  return NextResponse.json(organization, { status: 201 });
}
