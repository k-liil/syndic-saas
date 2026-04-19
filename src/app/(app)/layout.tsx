import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return null; // Let middleware handle redirect, avoid HTML/JSON collision
  }

  let settings = null;
  try {
    settings = await prisma.appSettings.findFirst();
  } catch (error) {
    console.error("Failed to load global AppSettings in layout:", error);
  }

  const cookieStore = await cookies();
  const initialOrgId = cookieStore.get("syndic-org-id")?.value;
  
  let initialOrgs: any[] = [];
  if (gate.isSuperAdmin) {
    initialOrgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: { name: "asc" },
    });
  } else {
    const orgIds = (gate.userOrganizations ?? []).map((uo: any) => uo.organizationId);
    initialOrgs = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
  }

  return (
    <OrgProvider initialOrgs={initialOrgs} initialOrgId={initialOrgId}>
      <AppShell brandName={settings?.brandName ?? "Syndicly"}>
        {children}
      </AppShell>
    </OrgProvider>
  );
}