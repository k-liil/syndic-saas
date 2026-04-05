"use client";

import { useSession } from "next-auth/react";
import { canManage } from "@/lib/roles";
import { PlusCircle } from "lucide-react";

export default function ExpensesPage() {
  const { data: session } = useSession();
  const canEdit = canManage((session?.user as any)?.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Depenses</h1>
          <p className="text-sm text-zinc-500">Paiements prestataires, charges et depenses de copropriete.</p>
        </div>

        {canEdit ? (
          <button className="flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition-all hover:scale-[1.02] active:scale-[0.98]"><PlusCircle className="h-4 w-4" /> Ajouter une depense</button>
        ) : (
          <div className="text-sm text-zinc-500">Lecture seule</div>
        )}
      </div>

      <div className="rounded-md border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        Aucune depense enregistree.
      </div>
    </div>
  );
}
