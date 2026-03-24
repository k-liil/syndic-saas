"use client";

import { useSession } from "next-auth/react";
import { canManage } from "@/lib/roles";

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
          <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
            + Ajouter une depense
          </button>
        ) : (
          <div className="text-sm text-zinc-500">Lecture seule</div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        Aucune depense enregistree.
      </div>
    </div>
  );
}
