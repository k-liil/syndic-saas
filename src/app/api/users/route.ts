import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";
import { normalizeRole } from "@/lib/roles";

const allowedRoles = ["MANAGER"] as const;

function isAllowedRole(role: unknown): role is (typeof allowedRoles)[number] {
  return typeof role === "string" && allowedRoles.includes(role as (typeof allowedRoles)[number]);
}

export async function GET() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      organizations: {
        select: {
          organizationId: true,
          role: true,
          organization: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      organizations: user.organizations.map((uo) => ({
        organizationId: uo.organizationId,
        organizationName: uo.organization?.name,
        role: normalizeRole(uo.role),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;
  const isActive = body.isActive !== false;
  const requestedOrganizationId =
    typeof body.organizationId === "string" && body.organizationId.trim()
      ? body.organizationId.trim()
      : "";

  if (!email || !password || !isAllowedRole(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const organizationId = requestedOrganizationId;

  if (!organizationId) {
    return NextResponse.json(
      { error: "ORGANIZATION_REQUIRED" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "ORGANIZATION_NOT_FOUND" },
      { status: 404 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name || email,
      email,
      passwordHash,
      role: "MANAGER",
      isActive,
      organizations: organizationId ? {
        create: {
          organizationId,
          role: "MANAGER",
        },
      } : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      organizations: organizationId ? [{ organizationId, role: "MANAGER" }] : [],
    },
  });
}

export async function PUT(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : "";
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

  if (!id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentUserId = gate.userId;
  if (id === currentUserId) {
    if (isActive === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }
  }

  const data: {
    name?: string;
    email?: string;
    isActive?: boolean;
    passwordHash?: string;
  } = {};

  if (name) {
    data.name = name;
  }

  if (typeof body.email === "string" && body.email.trim()) {
    const newEmail = body.email.trim().toLowerCase();
    if (newEmail !== target.email) {
      const existing = await prisma.user.findUnique({
        where: { email: newEmail },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ error: "Email already exists" }, { status: 409 });
      }
      data.email = newEmail;
    }
  }

  if (typeof isActive === "boolean") {
    data.isActive = isActive;
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const userOrgs = await prisma.userOrganization.findMany({
    where: { userId: id },
    select: {
      organizationId: true,
      role: true,
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return NextResponse.json({
    user: {
      ...user,
      role: normalizeRole(user.role),
      createdAt: user.createdAt.toISOString(),
      organizations: userOrgs.map((uo) => ({
        organizationId: uo.organizationId,
        organizationName: uo.organization?.name,
        role: normalizeRole(uo.role),
      })),
    },
  });
}
