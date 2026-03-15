"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";

type PaymentCategory = {
  id: string;
  name: string;
  note: string | null;
  isActive: boolean;
};

export type PaymentCategoriesPageHandle = {
  submit: () => Promise<boolean>;
};

type PaymentCategoriesPageProps = {
  hidePageHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onStatusChange?: (msg: string) => void;
};

const PaymentCategoriesPage = forwardRef<
  PaymentCategoriesPageHandle,
  PaymentCategoriesPageProps
>(function PaymentCategoriesPage(
  { hidePageHeader = false, onDirtyChange, onStatusChange },
  ref
) {
  const [items, setItems] = useState<PaymentCategory[]>([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(() => name.trim().length > 0, [name]);

  async function load() {
    const res = await fetch("/api/payment-categories");
    const json = await res.json();
    setItems(Array.isArray(json.categories) ? json.categories : []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  async function createCategory() {
    const trimmed = name.trim();
    if (!trimmed || saving) return false;

    setSaving(true);
    onStatusChange?.("Enregistrement...");

    const res = await fetch("/api/payment-categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      onStatusChange?.(`Erreur: ${err?.error ?? "create failed"}`);
      setSaving(false);
      return false;
    }

    setName("");
    await load();
    onStatusChange?.("Categorie enregistree.");
    setSaving(false);
    return true;
  }

  useImperativeHandle(ref, () => ({
    submit: createCategory,
  }));

  return (
    <div className="space-y-6">
      {!hidePageHeader ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">
            Categories de depenses
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Parametre les categories utilisees dans les paiements sortants.
          </p>
        </div>
      ) : null}

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            Nom de la categorie
          </label>
          <input
            className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Depenses courantes"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-500">
            Aucune categorie configuree.
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
});

export default PaymentCategoriesPage;
