"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { OwnerCreateModal } from "@/components/owners/OwnerCreateModal";

type Owner = { id: string; name: string };
type LotType = "APARTMENT" | "GARAGE" | "OTHER";

export function LotCreateModal({
  open,
  onClose,
  buildingId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  buildingId: string;
  onCreated?: () => void;
}) {
  const [number, setNumber] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [type, setType] = useState<LotType>("APARTMENT");
  const [ownerId, setOwnerId] = useState<string>("");

  const [owners, setOwners] = useState<Owner[]>([]);
  const [openOwner, setOpenOwner] = useState(false);
  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => number.trim().length > 0, [number]);

  async function loadOwners() {
    const res = await fetch("/api/owners", { cache: "no-store" });
    const data = await res.json();
    setOwners(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    if (!open) return;
    loadOwners();
  }, [open]);

  async function createLot() {
    if (!canCreate || loading) return;
    setLoading(true);
    try {
      const payload = {
        buildingId,
        number: number.trim(),
        surface: surface ? Number(surface) : null,
        type,
        ownerId: ownerId || null,
      };

      // Remplace /api/units par /api/lots si ton API est différente
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const created = await res.json();
      if (!res.ok) throw new Error(created?.error ?? "Lot create failed");

      setNumber("");
      setSurface("");
      setType("APARTMENT");
      setOwnerId("");
      onClose();
      onCreated?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Ajouter un Lot" zIndex={50}>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Numéro</label>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Surface (m²)</label>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Type</label>
            <select
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
              value={type}
              onChange={(e) => setType(e.target.value as LotType)}
            >
              <option value="APARTMENT">Appartement</option>
              <option value="GARAGE">Garage</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Copropriétaire</label>
            <select
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              <option value="">Sélectionner un copropriétaire</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOpenOwner(true)}
              className="w-fit text-sm text-indigo-600 hover:underline"
            >
              + Créer un nouveau copropriétaire
            </button>
          </div>

          <button
            onClick={createLot}
            disabled={!canCreate || loading}
            className="mt-2 h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            Ajouter un Lot
          </button>
        </div>
      </Modal>

      <OwnerCreateModal
        open={openOwner}
        onClose={() => setOpenOwner(false)}
        onCreated={(owner) => {
          // refresh list + auto-select
          loadOwners().then(() => setOwnerId(owner.id));
        }}
      />
    </>
  );
}