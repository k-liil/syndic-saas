import { prisma } from "@/lib/prisma";
import { MaintenanceContent } from "./MaintenanceContent";
import { requireSuperAdmin } from "@/lib/authz";
import { redirect } from "next/navigation";

export default async function MaintenancePage() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    redirect("/dashboard");
  }

  const settings = await prisma.systemSettings.findFirst({
    where: { id: "global" },
  });

  const isLoggingEnabled = settings?.prismaLogging ?? true;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">
          Maintenance & Système
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Gérer les paramètres globaux du serveur et du débogage.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <MaintenanceContent initialLogging={isLoggingEnabled} />
      </div>
    </div>
  );
}
