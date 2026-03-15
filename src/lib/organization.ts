import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_ID = "org_default";
const DEFAULT_ORG_NAME = "Organisation par defaut";
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
    where: { id: DEFAULT_ORG_ID },
    select: { id: true, name: true, slug: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.organization.create({
    data: {
      id: DEFAULT_ORG_ID,
      name: DEFAULT_ORG_NAME,
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
  const organization = await ensureDefaultOrganizationRecord();
  await ensureFiscalYearsForOrganization(organization.id);

  if (!userId) {
    return organization;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true,
      organizationId: true,
    },
  });

  if (!user) {
    return organization;
  }

  if (!user.organizationId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { organizationId: organization.id },
    });
  }

  return organization;
}

export async function getOrganizationForUser(userId?: string | null) {
  if (!userId) {
    const organization = await ensureDefaultOrganizationRecord();
    await ensureFiscalYearsForOrganization(organization.id);
    return organization;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  const organization = user?.organization ?? (await ensureDefaultOrganizationRecord());
  await ensureFiscalYearsForOrganization(organization.id);
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
