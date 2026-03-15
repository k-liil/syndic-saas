"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  isActive: boolean;
};

export type SuppliersPageHandle = {
  submit: () => Promise<boolean>;
};

type SuppliersPageProps = {
  hidePageHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onStatusChange?: (msg: string) => void;
};

const SuppliersPage = forwardRef<SuppliersPageHandle, SuppliersPageProps>(
  function SuppliersPage(
    { hidePageHeader = false, onDirtyChange, onStatusChange },
    ref
  ) {
    const [items, setItems] = useState<Supplier[]>([]);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    const isDirty = useMemo(
      () =>
        [name, phone, email, address, note].some(
          (value) => value.trim().length > 0
        ),
      [address, email, name, note, phone]
    );

    async function load() {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    }

    useEffect(() => {
      load();
    }, []);

    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    async function createSupplier() {
      if (!name.trim() || saving) return false;

      setSaving(true);
      onStatusChange?.("Enregistrement...");

      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          email,
          address,
          note,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onStatusChange?.(`Erreur: ${err?.error ?? "create failed"}`);
        setSaving(false);
        return false;
      }

      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNote("");

      await load();
      onStatusChange?.("Fournisseur enregistre.");
      setSaving(false);
      return true;
    }

    async function toggleSupplier(s: Supplier) {
      const res = await fetch("/api/suppliers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: s.id,
          isActive: !s.isActive,
        }),
      });

      if (!res.ok) return;

      await load();
    }

    useImperativeHandle(ref, () => ({
      submit: createSupplier,
    }));

    return (
      <div className="space-y-6">
        {!hidePageHeader ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-zinc-900">
              Fournisseurs
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Configure les prestataires du syndic utilises dans les paiements sortants.
            </p>
          </div>
        ) : null}

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm"
              placeholder="Nom du fournisseur"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm"
              placeholder="Telephone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <input
              className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="h-12 rounded-2xl border border-zinc-200 px-4 text-sm"
              placeholder="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <textarea
            className="w-full rounded-2xl border border-zinc-200 p-4 text-sm"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          {items.length === 0 ? (
            <div className="text-sm text-zinc-500">
              Aucun fournisseur configure.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4"
                >
                  <div>
                    <div className="font-medium text-zinc-900">{s.name}</div>
                    <div className="text-sm text-zinc-500">
                      {s.phone || "-"} · {s.email || "-"}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleSupplier(s)}
                    className={`px-4 py-2 text-sm rounded-xl ${
                      s.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {s.isActive ? "Actif" : "Inactif"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default SuppliersPage;
