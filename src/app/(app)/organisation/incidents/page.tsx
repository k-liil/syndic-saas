"use client";

import { AlertCircle, Info } from "lucide-react";

export default function IncidentsPage() {
  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div className="pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Incidents</h1>
        <p className="text-sm text-slate-500">Signaler and suivre les incidents techniques dans la copropriété.</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-slate-50 text-slate-400">
          <AlertCircle size={28} />
        </div>
        <h3 className="text-base font-semibold text-slate-900">Module Incidents</h3>
        <p className="mt-1 max-w-xs text-sm text-slate-500">
          Cette section permettra de notifier le syndic de tout incident (fuite, panne ascenseur, etc.) en temps réel.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-md bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700">
          <Info size={14} />
          Bientôt disponible
        </div>
      </div>
    </div>
  );
}
