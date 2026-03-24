import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { canManage, isSuperAdmin } from "@/lib/roles";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

const claimInclude = {
  unit: { select: { lotNumber: true, reference: true } },
  owner: { select: { name: true, firstName: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          role: true,
          owner: { select: { firstName: true, name: true } },
        },
      },
    },
  },
};

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

    const userId = gate.userId;
    const role = gate.session.user?.role;

    if (!canManage(role)) {
      const owner = await prisma.owner.findFirst({
        where: { userId, organizationId: orgId },
        select: { id: true },
      });

      if (!owner) {
        return NextResponse.json([]);
      }

      const claims = await prisma.claim.findMany({
        where: { organizationId: orgId, ownerId: owner.id },
        orderBy: { createdAt: "desc" },
        include: claimInclude,
      });

      return NextResponse.json(claims);
    }

    const claims = await prisma.claim.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: claimInclude,
    });

    return NextResponse.json(claims);
  } catch (error: unknown) {
    console.error("GET claims crash:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Crash" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    const title = asString(body.title).trim();
    const description = asString(body.description).trim();
    const category = asString(body.category).trim() || "General";
    const requestedUnitId = asString(body.unitId).trim();
    const role = gate.session.user?.role;
    const userId = gate.userId;

    let ownerId = asString(body.ownerId).trim();
    let finalUnitId: string | null = requestedUnitId || null;

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    const linkedOwner = await prisma.owner.findFirst({
      where: { userId, organizationId: orgId },
      include: {
        ownerships: {
          where: { endDate: null, unit: { organizationId: orgId } },
          select: { unitId: true },
        },
      },
    });

    if (!canManage(role) && linkedOwner) {
      ownerId = linkedOwner.id;

      const isTheirUnit = linkedOwner.ownerships.some((ownership) => ownership.unitId === requestedUnitId);
      finalUnitId = isTheirUnit ? requestedUnitId : (linkedOwner.ownerships[0]?.unitId ?? null);
    } else if (!canManage(role) && !linkedOwner) {
      return NextResponse.json({ error: "No owner profile found" }, { status: 403 });
    } else if (!ownerId) {
      return NextResponse.json({ error: "OWNER_ID_REQUIRED" }, { status: 400 });
    }

    if (!canManage(role) && !linkedOwner) {
      const owner = await prisma.owner.findFirst({
        where: { userId, organizationId: orgId },
        include: {
          ownerships: {
            where: { endDate: null, unit: { organizationId: orgId } },
            select: { unitId: true },
          },
        },
      });

      if (!owner) {
        return NextResponse.json({ error: "No owner profile found" }, { status: 403 });
      }
    }

    if (finalUnitId) {
      const validUnit = await prisma.unit.findFirst({
        where: {
          id: finalUnitId,
          organizationId: orgId,
          ...(!canManage(role) ? { ownerships: { some: { ownerId, endDate: null } } } : {}),
        },
        select: { id: true },
      });

      if (!validUnit) {
        return NextResponse.json({ error: "INVALID_UNIT" }, { status: 400 });
      }
    }

    const claim = await prisma.claim.create({
      data: {
        organizationId: orgId,
        ownerId,
        unitId: finalUnitId,
        title,
        description,
        category,
        status: "OPEN",
        priority: "NORMAL",
      },
      include: claimInclude,
    });

    const recipients = await prisma.userOrganization.findMany({
      where: { organizationId: orgId },
      select: { userId: true, role: true },
    });

    const notificationUserIds = Array.from(
      new Set(
        recipients
          .filter((recipient) => canManage(recipient.role))
          .map((recipient) => recipient.userId)
          .filter((recipientUserId) => recipientUserId && recipientUserId !== userId),
      ),
    );

    if (notificationUserIds.length > 0) {
      await prisma.notification.createMany({
        data: notificationUserIds.map((recipientUserId) => ({
          userId: recipientUserId,
          organizationId: orgId,
          claimId: claim.id,
          type: "CLAIM_CREATED",
          title: "Nouvelle reclamation",
          message: `${claim.owner?.firstName ? `${claim.owner.firstName} ` : ""}${claim.owner?.name ?? "Un coproprietaire"} a cree "${claim.title}"`,
          link: "/organisation/claims",
        })),
      });
    }

    return NextResponse.json(claim);
  } catch (error: unknown) {
    console.error("POST claim crash:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Crash" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const id = asString(body?.id).trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const role = gate.session.user?.role;
    const isAdmin = canManage(role);
<<<<<<< HEAD
=======
    const actorUserId = gate.userId;

    if (!actorUserId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
>>>>>>> 6d9402c (Fix claim comments user id typing)

    const existing = await prisma.claim.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (!isAdmin) {
      const owner = await prisma.owner.findFirst({
        where: { userId: gate.userId, organizationId: orgId },
      });
      if (!owner || existing.ownerId !== owner.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (existing.status !== "OPEN") {
        return NextResponse.json({ error: "Cannot update non-open claim" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body?.status && isAdmin) data.status = asString(body.status).trim();
    if (body?.priority && isAdmin) data.priority = asString(body.priority).trim();
    if (body?.title && (isAdmin || existing.status === "OPEN")) data.title = asString(body.title).trim();
    if (body?.description && (isAdmin || existing.status === "OPEN")) data.description = asString(body.description).trim();
    if (body?.category && (isAdmin || existing.status === "OPEN")) data.category = asString(body.category).trim();

    const commentText = asString(body?.comment).trim();

    const updated = await prisma.$transaction(async (tx) => {
      if (commentText) {
        await tx.claimComment.create({
          data: {
            claimId: id,
            organizationId: orgId,
<<<<<<< HEAD
            userId: gate.userId,
=======
            userId: actorUserId,
>>>>>>> 6d9402c (Fix claim comments user id typing)
            message: commentText,
          },
        });
      }

      return tx.claim.update({
        where: { id },
        data,
        include: claimInclude,
      });
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PATCH claim crash:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Crash" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const gate = await requireAuth();
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    if (!isSuperAdmin(gate.session.user?.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const orgId = await getOrgIdFromRequest(req, gate);
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const id = asString(body?.id).trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.claim.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    await prisma.notification.deleteMany({
      where: { claimId: id },
    });

    await prisma.claim.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("DELETE claim crash:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Crash" }, { status: 500 });
  }
}
