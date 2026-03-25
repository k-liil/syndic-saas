import { prisma } from "@/lib/prisma";
import { normalizeRole } from "@/lib/roles";

const DEFAULT_ORG_SLUG = "default";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || DEFAULT_ORG_SLUG;
}

async function ensureDefaultOrganizationRecord() {
  const existing = await prisma.organization.findFirst({
    where: { slug: DEFAULT_ORG_SLUG },
    select: { id: true, name: true, slug: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.organization.create({
    data: {
      name: "Organisation par defaut",
      slug: DEFAULT_ORG_SLUG,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

async function ensureFiscalYearsForOrganization(organizationId: string) {
  const [settings, lastReceipt, lastPayment, existingYears] = await Promise.all([
    prisma.appSettings.findFirst({
      where: { organizationId },
      select: { startYear: true },
    }),
    prisma.receipt.findFirst({
      where: { organizationId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.payment.findFirst({
      where: { organizationId },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.fiscalYear.findMany({
      where: { organizationId },
      select: { year: true },
    }),
  ]);

  const years = new Set<number>(existingYears.map((item) => item.year));
  const fallbackYear = settings?.startYear ?? new Date().getUTCFullYear();
  years.add(fallbackYear);

  if (lastReceipt?.date) {
    years.add(new Date(lastReceipt.date).getUTCFullYear());
  }

  if (lastPayment?.date) {
    years.add(new Date(lastPayment.date).getUTCFullYear());
  }

  for (const year of years) {
    await prisma.fiscalYear.upsert({
      where: {
        organizationId_year: {
          organizationId,
          year,
        },
      },
      update: {},
      create: {
        organizationId,
        year,
        startsAt: new Date(Date.UTC(year, 0, 1)),
        endsAt: new Date(Date.UTC(year, 11, 31)),
      },
    });
  }
}

export async function ensureOrganizationForUser(userId?: string | null) {
  if (!userId) {
    const org = await ensureDefaultOrganizationRecord();
    await ensureFiscalYearsForOrganization(org.id);
    return org;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      organizations: {
        select: {
          organizationId: true,
        },
      },
    },
  });

  if (!user) {
    const org = await ensureDefaultOrganizationRecord();
    await ensureFiscalYearsForOrganization(org.id);
    return org;
  }

  if (normalizeRole(user.role) === "SUPER_ADMIN") {
    return { id: "", name: "Super Admin", slug: "" };
  }

  if (user.organizations.length > 0) {
    const orgId = user.organizations[0].organizationId;
    return { id: orgId, name: "", slug: "" };
  }

  const organization = await ensureDefaultOrganizationRecord();

  await prisma.userOrganization.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: (normalizeRole(user.role) === "GUEST" ? "OWNER" : normalizeRole(user.role)) as any,
    },
  });

  return organization;
}

export async function getOrganizationForUser(userId?: string | null) {
  if (!userId) {
    const organization = await ensureDefaultOrganizationRecord();
    return organization;
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId },
    include: {
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (userOrg?.organization) {
    return userOrg.organization;
  }

  const organization = await ensureDefaultOrganizationRecord();
  return organization;
}

export async function syncOrganizationName(
  organizationId: string,
  name: string
) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const current = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true },
  });

  if (!current) return;

  const nextSlug =
    current.slug === DEFAULT_ORG_SLUG ? slugify(trimmedName) : current.slug;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: trimmedName,
      slug: nextSlug,
    },
  });
}
