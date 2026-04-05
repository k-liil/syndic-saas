"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Owner = { id: string; name: string };

export function OwnerCreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (owner: Owner) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function createOwner() {
    if (!canCreate || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Owner create failed");

      onCreated(data);
      setName("");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau copropriétaire" zIndex={60}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Nom</label>
          <input
            className="h-10 rounded-md border border-zinc-200 px-3"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button onClick={createOwner}
            disabled={!canCreate || loading}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            Créer le copropriétaire
          </button>
        </div>
      </div>
    </Modal>
  );
}