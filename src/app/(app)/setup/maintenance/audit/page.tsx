import { ClipboardList } from "lucide-react";
import AuditContent from "./AuditContent";
import Link from "next/link";

export default function AuditPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link 
          href="/setup/maintenance" 
          className="text-xs font-medium text-slate-500 hover:text-primary transition-colors mb-2 block"
        >
          ← Retour à la maintenance
        </Link>
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
