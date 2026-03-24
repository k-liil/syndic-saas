import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, organizationId, role } = body;

  if (!organizationId || !["add", "remove"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "add") {
    const allowedRoles = ["MANAGER"] as const;
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await prisma.userOrganization.upsert({
      where: {
        userId_organizationId: { userId: id, organizationId },
      },
      create: { userId: id, organizationId, role },
      update: { role },
    });
  } else if (action === "remove") {
    await prisma.userOrganization.deleteMany({
      where: { userId: id, organizationId },
    });
  }

  const userOrgs = await prisma.userOrganization.findMany({
    where: { userId: id },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json({
    user: {
      id,
      organizations: userOrgs.map((uo) => ({
        organizationId: uo.organizationId,
        organizationName: uo.organization?.name,
        role: uo.role,
      })),
    },
  });
}
