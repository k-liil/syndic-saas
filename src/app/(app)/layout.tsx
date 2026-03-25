import { cookies } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await prisma.appSettings.findFirst();
  const gate = await requireAuth();
  const cookieStore = await cookies();
  const initialOrgId = cookieStore.get("syndic-org-id")?.value;
  
  let initialOrgs: any[] = [];
  if (gate.ok) {
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
  }

  return (
    <OrgProvider initialOrgs={initialOrgs} initialOrgId={initialOrgId}>
      <AppShell brandName={settings?.brandName ?? "Syndic"}>
        {children}
      </AppShell>
    </OrgProvider>
  );
}