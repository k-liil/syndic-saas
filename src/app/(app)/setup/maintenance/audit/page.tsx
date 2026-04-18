import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ClipboardList } from "lucide-react";
import AuditContent from "./AuditContent";

export default function AuditPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Breadcrumbs
          items={[
            { label: "Configuration", href: "/setup" },
            { label: "Maintenance", href: "/setup/maintenance" },
            { label: "Journal d'audit", href: "/setup/maintenance/audit", active: true },
          ]}
        />
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm border border-primary/20">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Journal d'Audit</h1>
            <p className="text-muted-foreground">
              Traçabilité des actions critiques effectuées sur le système.
            </p>
          </div>
        </div>
      </div>

      <AuditContent />
    </div>
  );
}
