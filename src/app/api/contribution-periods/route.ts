import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const unitId = searchParams.get("unitId");
  const global = searchParams.get("global");

  let periods;

  if (global === "true") {
    periods = await prisma.contributionPeriod.findMany({
      where: {
        organizationId: orgId!,
        contributionType: "GLOBAL_FIXED",
        groupId: null,
        unitId: null,
      },
      orderBy: { startPeriod: "asc" },
    });
  } else if (groupId) {
    periods = await prisma.contributionPeriod.findMany({
      where: { groupId, contributionType: "GROUP_FIXED" },
      orderBy: { startPeriod: "asc" },
    });
  } else if (unitId) {
    periods = await prisma.contributionPeriod.findMany({
      where: { unitId, contributionType: "SURFACE" },
      orderBy: { startPeriod: "asc" },
    });
  } else {
    periods = await prisma.contributionPeriod.findMany({
      where: { organizationId: orgId! },
      orderBy: { startPeriod: "asc" },
    });
  }

  return NextResponse.json(periods);
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const body = await req.json();
  const { contributionType, groupId, unitId, startPeriod, endPeriod, amount } = body;

  if (!contributionType || !startPeriod || amount === undefined) {
    return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });
  }

  if (contributionType === "GLOBAL_FIXED" && (groupId || unitId)) {
    return NextResponse.json({ error: "GLOBAL_FIXED ne peut pas avoir de groupId ou unitId" }, { status: 400 });
  }

  if (contributionType === "GROUP_FIXED" && !groupId) {
    return NextResponse.json({ error: "GROUP_FIXED nécessite un groupId" }, { status: 400 });
  }

  if (contributionType === "SURFACE" && !unitId) {
    return NextResponse.json({ error: "SURFACE nécessite un unitId" }, { status: 400 });
  }

  const startDate = new Date(startPeriod + "-01");
  const endDate = endPeriod ? new Date(endPeriod + "-01") : null;
  const amountNum = Number(amount);

  if (isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Date de début invalide" }, { status: 400 });
  }

  if (endPeriod && isNaN(endDate!.getTime())) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }

  if (isNaN(amountNum) || amountNum < 0) {
    return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
  }

  const period = await prisma.contributionPeriod.create({
    data: {
      organizationId: orgId!,
      contributionType,
      groupId: groupId || null,
      unitId: unitId || null,
      startPeriod: startDate,
      endPeriod: endDate,
      amount: Math.round(amountNum),
    },
  });

  return NextResponse.json(period, { status: 201 });
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 });
  }

  await prisma.contributionPeriod.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
