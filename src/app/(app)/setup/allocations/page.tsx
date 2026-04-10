"use server";

import { requireManager } from "@/lib/authz";
import { redirect } from "next/navigation";
import { AllocationAuditContent } from "./AllocationAuditContent";

export default async function AllocationsPage() {
  const gate = await requireManager();
  if (!gate.ok) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">
          Audit des Allocations (FIFO)
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Visualisez, nettoyez et recalculez les allocations d'encaissement par lot.
        </p>
      </div>

      <div className="max-w-5xl space-y-6">
        <AllocationAuditContent />
      </div>
    </div>
  );
}
