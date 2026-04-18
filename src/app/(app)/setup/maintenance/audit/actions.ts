"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import { Prisma } from "@prisma/client";

export async function getAuditLogsAction(params: {
  page?: number;
  pageSize?: number;
  query?: string;
  actionType?: string;
  organizationId?: string;
}) {
  const gate = await requireAuth();
  if (!gate.ok) throw new Error("Unauthorized");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ActionLogWhereInput = {};

  // Restriction par organisation si pas SuperAdmin
  if (!gate.isSuperAdmin) {
    where.organizationId = gate.organizationId!;
  } else if (params.organizationId) {
    where.organizationId = params.organizationId;
  }

  if (params.actionType) {
    where.action = params.actionType;
  }

  if (params.query) {
    where.OR = [
      { details: { contains: params.query, mode: "insensitive" } },
      { user: { name: { contains: params.query, mode: "insensitive" } } },
      { entityId: { contains: params.query, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.actionLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        organization: { select: { name: true } },
      },
    }),
    prisma.actionLog.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
