"use client";

import { useEffect, useState } from "react";

type PaymentCategory = {
  id: string;
  name: string;
  note: string | null;
  isActive: boolean;
};

export default function PaymentCategoriesPage() {
  const [items, setItems] = useState<PaymentCategory[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/payment-categories");
    const json = await res.json();
    setItems(Array.isArray(json.categories) ? json.categories : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setMsg("Création...");

    const res = await fetch("/api/payment-categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(`Erreur: ${err?.error ?? "create failed"}`);
      return;
    }

    setName("");
    await load();
    setMsg("✅ Catégorie ajoutée.");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Catégories de dépenses
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Paramètre les catégories utilisées dans les paiements sortants.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Nom de la catégorie
          </label>
          <input
            className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Dépenses courantes"
          />
        </div>

        <button
          type="button"
          onClick={createCategory}
          className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Ajouter catégorie
        </button>

        {msg ? (
          <div className="text-sm text-zinc-600">{msg}</div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Aucune catégorie configurée.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-zinc-200 px-4 py-4"
              >
                <div className="font-medium text-zinc-900">{item.name}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {item.isActive ? "Active" : "Inactive"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}