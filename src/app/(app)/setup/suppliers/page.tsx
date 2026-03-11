"use client";

import { useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  isActive: boolean;
};

export default function SuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/suppliers");
    const json = await res.json();
    setItems(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createSupplier() {
    if (!name.trim()) return;

    setMsg("Création...");

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
      setMsg(`Erreur: ${err?.error ?? "create failed"}`);
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNote("");

    await load();
    setMsg("✅ Fournisseur ajouté.");
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

  return (
    <div className="space-y-6">

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Fournisseurs
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Configure les prestataires du syndic utilisés dans les paiements sortants.
        </p>
      </div>

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
            placeholder="Téléphone"
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

        <button
          onClick={createSupplier}
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Ajouter fournisseur
        </button>

        {msg ? (
          <div className="text-sm text-zinc-600">{msg}</div>
        ) : null}

      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">

        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Aucun fournisseur configuré.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-zinc-200 p-4"
              >
                <div>
                  <div className="font-medium text-zinc-900">
                    {s.name}
                  </div>
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