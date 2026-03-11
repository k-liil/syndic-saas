import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await prisma.appSettings.findFirst();

  return (
    <AppShell brandName={settings?.brandName ?? "Syndic"}>
      {children}
    </AppShell>
  );
}