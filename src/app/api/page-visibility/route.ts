import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireSuperAdmin } from "@/lib/authz";
import {
  getDefaultPageVisibilityRecords,
  mergePageVisibilitySettings,
} from "@/lib/page-visibility";

function asBoolean(value: unknown) {
  return Boolean(value);
}

type PageVisibilityPayloadItem = {
  href?: unknown;
  title?: unknown;
  section?: unknown;
  icon?: unknown;
  isEnabled?: unknown;
  roles?: {
    SUPER_ADMIN?: unknown;
    MANAGER?: unknown;
    OWNER?: unknown;
  } | null;
};

async function ensureDefaults() {
  const existing = await prisma.pageVisibilitySetting.findMany({
    select: { href: true },
  });

  const existingHrefs = new Set(existing.map((item) => item.href));
  const defaults = getDefaultPageVisibilityRecords().filter((item) => !existingHrefs.has(item.href));

  if (defaults.length === 0) {
    return;
  }

  await prisma.pageVisibilitySetting.createMany({
    data: defaults.map((item) => ({
      href: item.href,
      title: item.title,
      section: item.section,
      icon: item.icon,
      isEnabled: item.isEnabled,
      superAdmin: item.roles.SUPER_ADMIN,
      admin: item.roles.MANAGER,
      manager: item.roles.MANAGER,
      operator: item.roles.MANAGER,
      viewer: item.roles.OWNER,
      owner: item.roles.OWNER,
    })),
    skipDuplicates: true,
  });
}

export async function GET() {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  await ensureDefaults();

  const items = await prisma.pageVisibilitySetting.findMany({
    orderBy: [{ section: "asc" }, { title: "asc" }],
  });

  return NextResponse.json({
    items: mergePageVisibilitySettings(items),
  });
}

export async function PUT(req: Request) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? (body.items as PageVisibilityPayloadItem[]) : null;
  if (!items) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  await ensureDefaults();

  await prisma.$transaction(
    items.map((item) =>
      prisma.pageVisibilitySetting.upsert({
        where: { href: String(item.href) },
        update: {
          title: String(item.title),
          section: String(item.section),
          icon: String(item.icon),
          isEnabled: asBoolean(item.isEnabled),
          superAdmin: asBoolean(item.roles?.SUPER_ADMIN),
          admin: asBoolean(item.roles?.MANAGER),
          manager: asBoolean(item.roles?.MANAGER),
          operator: asBoolean(item.roles?.MANAGER),
          viewer: asBoolean(item.roles?.OWNER),
          owner: asBoolean(item.roles?.OWNER),
        },
        create: {
          href: String(item.href),
          title: String(item.title),
          section: String(item.section),
          icon: String(item.icon),
          isEnabled: asBoolean(item.isEnabled),
          superAdmin: asBoolean(item.roles?.SUPER_ADMIN),
          admin: asBoolean(item.roles?.MANAGER),
          manager: asBoolean(item.roles?.MANAGER),
          operator: asBoolean(item.roles?.MANAGER),
          viewer: asBoolean(item.roles?.OWNER),
          owner: asBoolean(item.roles?.OWNER),
        },
      }),
    ),
  );

  const refreshed = await prisma.pageVisibilitySetting.findMany({
    orderBy: [{ section: "asc" }, { title: "asc" }],
  });

  return NextResponse.json({
    items: mergePageVisibilitySettings(refreshed),
  });
}
