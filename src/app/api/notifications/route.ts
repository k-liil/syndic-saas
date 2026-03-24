import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { canManage } from "@/lib/roles";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }

  const role = gate.session.user?.role;
  if (!canManage(role)) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }

  const userId = gate.userId;
  if (!userId) {
    return NextResponse.json({ items: [], unreadCount: 0 });
  }

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        claim: {
          select: { id: true, title: true, status: true },
        },
      },
    }),
    prisma.notification.count({
      where: { userId, organizationId: orgId, isRead: false },
    }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

export async function PATCH(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });
  }

  const role = gate.session.user?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const userId = gate.userId;
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const id = asString(body?.id);
  const markAll = Boolean(body?.markAll);

  if (!id && !markAll) {
    return NextResponse.json({ error: "NOTIFICATION_ID_REQUIRED" }, { status: 400 });
  }

  if (markAll) {
    await prisma.notification.updateMany({
      where: {
        userId,
        organizationId: orgId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.notification.findFirst({
    where: { id, userId, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
  }

  const notification = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return NextResponse.json(notification);
}
