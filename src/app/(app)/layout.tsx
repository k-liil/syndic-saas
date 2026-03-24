import { AppShell } from "@/components/AppShell";
import { OrgProvider } from "@/lib/org-context";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await prisma.appSettings.findFirst();

  return (
    <OrgProvider>
      <AppShell brandName={settings?.brandName ?? "Syndic"}>
        {children}
      </AppShell>
    </OrgProvider>
  );
}