/**
 * POST /api/mobile/token
 * Mobile-only authentication endpoint.
 * Validates credentials with bcrypt and returns a signed JWT
 * compatible with the NextAuth secret — usable as a Bearer token.
 */
import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "EMAIL_PASSWORD_REQUIRED" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    // Fetch the user's primary organization
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
      include: { organization: { select: { id: true, name: true } } },
    });

    // Fetch the associated owner record (if OWNER role)
    const owner = await prisma.owner.findFirst({
      where: { userId: user.id },
      include: {
        ownerships: {
          where: { endDate: null },
          include: { unit: { select: { id: true, reference: true, lotNumber: true } } },
          take: 1,
        },
      },
    });

    const role = normalizeRole(user.role);
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
    const maxAge = 30 * 24 * 60 * 60; // 30 days

    const token = await encode({
      token: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email,
        role,
        organizationId: userOrg?.organizationId ?? undefined,
        organizationName: userOrg?.organization?.name ?? undefined,
        ownerId: owner?.id ?? undefined,
        unitId: owner?.ownerships?.[0]?.unit?.id ?? undefined,
        unitRef: owner?.ownerships?.[0]?.unit?.reference ?? owner?.ownerships?.[0]?.unit?.lotNumber ?? undefined,
      },
      secret,
      maxAge,
    });

    return NextResponse.json({
      token,
      expiresIn: maxAge,
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email,
        role,
        organizationId: userOrg?.organizationId ?? null,
        organizationName: userOrg?.organization?.name ?? null,
        ownerId: owner?.id ?? null,
        unitId: owner?.ownerships?.[0]?.unit?.id ?? null,
        unitRef: owner?.ownerships?.[0]?.unit?.reference ?? owner?.ownerships?.[0]?.unit?.lotNumber ?? null,
      },
    });
  } catch (err) {
    console.error("[MOBILE_TOKEN]", err);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
