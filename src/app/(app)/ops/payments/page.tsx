"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Supplier = {
  id: string;
  name: string;
};

type Bank = {
  id: string;
  name: string;
};

type PaymentCategory = {
  id: string;
  name: string;
  isActive: boolean;
};

type Payment = {
  id: string;
  paymentNumber: number;
  amount: number;
  method: "CASH" | "TRANSFER" | "CHECK" | "DEBIT";
  date: string;
  note: string | null;
  bankName?: string | null;
  bankRef?: string | null;
  categoryId?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  supplier: Supplier;
};

type Settings = {
  paymentUsePrefix?: boolean;
  paymentPrefix?: string | null;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-FR").format(amount) + " MAD";
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR");
}

function toInputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fmtElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year") ?? new Date().getFullYear();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<PaymentCategory[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [search, setSearch] = useState("");
  const [filterSupplierId, setFilterSupplierId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [openCreate, setOpenCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [method, setMethod] = useState<"CASH" | "TRANSFER" | "CHECK" | "DEBIT">("CASH");
  const [bankName, setBankName] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [note, setNote] = useState("");

  const [toast, setToast] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
const [importOpen, setImportOpen] = useState(false);
const [importFile, setImportFile] = useState<File | null>(null);
const [importBusy, setImportBusy] = useState(false);
const [importResult, setImportResult] = useState<null | {
  imported: number;
  errors: { row: number; error: string }[];
  durationMs?: number;
}>(null);
const [importProgress, setImportProgress] = useState(0);
const [importTotal, setImportTotal] = useState(0);
const [importPercent, setImportPercent] = useState(0);
const [importStartedAt, setImportStartedAt] = useState<number | null>(null);

  function showToast(message: string) {
    setToast(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToast("");
      toastTimeoutRef.current = null;
    }, 2500);
  }

async function importPayments() {
  if (!importFile) return;

  setImportBusy(true);
  setImportResult(null);

  const text = await importFile.text();

  const rows = text
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map((line) => {
      const cols = line.split(",");

      return {
        supplierName: cols[0] ?? "",
        categoryName: cols[1] ?? "",
        method: cols[2] ?? "",
        amount: Number(cols[3] ?? 0),
        date: cols[4] ?? "",
        bankName: cols[5] ?? "",
        bankRef: cols[6] ?? "",
        note: cols[7] ?? "",
      };
    });

  const res = await fetch("/api/imports/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "batch",
      rows,
      offset: 0,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    showToast(json?.error ?? "Import échoué");
    setImportBusy(false);
    return;
  }

  setImportResult({
    imported: Number(json?.imported ?? 0),
    errors: Array.isArray(json?.errors) ? json.errors : [],
  });

  await load();
  setImportBusy(false);
}

  async function load() {
    const res = await fetch(`/api/payments?year=${year}`);
    const json = await res.json();

    const resCat = await fetch("/api/payment-categories");
    const jsonCat = await resCat.json();

    setPayments(Array.isArray(json.payments) ? json.payments : []);
    setSelectedPayments([]);
    setSuppliers(Array.isArray(json.suppliers) ? json.suppliers : []);
    setBanks(Array.isArray(json.banks) ? json.banks : []);
    setCategories(Array.isArray(jsonCat.categories) ? jsonCat.categories : []);
    setSettings(json.settings ?? null);
  }

useEffect(() => {
  load();

  return () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
  };
}, [year]);

async function deleteSelected() {
  if (selectedPayments.length === 0) return;

  const results = await Promise.all(
    selectedPayments.map((id) =>
      fetch(`/api/payments?year=${year}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })
    )
  );

  const hasError = results.some((r) => !r.ok);

  if (hasError) {
    showToast("Erreur suppression");
    return;
  }

  setSelectedPayments([]);
  await load();
  showToast("Dépenses supprimées");
}

function toggleSelectAll() {
  if (selectedPayments.length === filteredPayments.length) {
    setSelectedPayments([]);
  } else {
    setSelectedPayments(filteredPayments.map((p) => p.id));
  }
}

function toggleSelect(id: string) {
  setSelectedPayments((prev) =>
    prev.includes(id)
      ? prev.filter((x) => x !== id)
      : [...prev, id]
  );
}

  function resetForm() {
    setTitle("");
    setSupplierId("");
    setCategoryId("");
    setMethod("CASH");
    setBankName("");
    setBankRef("");
    setAmount("");
    setDate(toInputDate(new Date()));
    setNote("");
  }

  function closeCreateModal() {
    setOpenCreate(false);
    setEditingPayment(null);
    resetForm();
  }

  async function createPayment() {
    if (!supplierId || !amount || Number(amount) <= 0) {
      showToast("Champs obligatoires manquants");
      return;
    }

    if (method !== "CASH" && !bankName) {
      showToast("Banque obligatoire");
      return;
    }

    if (method === "CHECK" && !bankRef.trim()) {
      showToast("Numéro de chèque obligatoire");
      return;
    }

    setSubmitting(true);

    const finalNote = [title.trim(), note.trim()].filter(Boolean).join(" — ");

    const res = await fetch("/api/payments?year=${year}", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        supplierId,
        categoryId: categoryId || null,
        method,
        bankName: method !== "CASH" ? bankName : null,
        bankRef: method === "CHECK" ? bankRef : null,
        amount: parseFloat(String(amount)),
        date,
        note: finalNote || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err?.error ?? "Erreur lors de l'enregistrement");
      setSubmitting(false);
      return;
    }

    await load();
    resetForm();
    setSubmitting(false);
    setOpenCreate(false);
    setEditingPayment(null);
    showToast("Paiement ajouté");
  }

  async function updatePayment() {
    if (!editingPayment) return;

    if (!supplierId || !amount || Number(amount) <= 0) {
      showToast("Champs obligatoires manquants");
      return;
    }

    if (method !== "CASH" && !bankName) {
      showToast("Banque obligatoire");
      return;
    }

    if (method === "CHECK" && !bankRef.trim()) {
      showToast("Numéro de chèque obligatoire");
      return;
    }

    setSubmitting(true);

    const finalNote = [title.trim(), note.trim()].filter(Boolean).join(" — ");

    const res = await fetch("/api/payments?year=${year}", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: editingPayment.id,
        supplierId,
        categoryId: categoryId || null,
        method,
        bankName: method !== "CASH" ? bankName : null,
        bankRef: method === "CHECK" ? bankRef : null,
        amount: parseFloat(String(amount)),
        date,
        note: finalNote || null,
      }),
    });

    if (!res.ok) {
      showToast("Erreur lors de la modification");
      setSubmitting(false);
      return;
    }

    await load();
    resetForm();
    setSubmitting(false);
    setEditingPayment(null);
    setOpenCreate(false);
    showToast("Dépense modifiée");
  }

  async function deletePayment() {
    if (!paymentToDelete) return;

    const res = await fetch("/api/payments?year=${year}", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: paymentToDelete.id,
      }),
    });

    if (!res.ok) {
      showToast("Impossible de supprimer la dépense");
      return;
    }

    if (selectedPayment?.id === paymentToDelete.id) {
      setSelectedPayment(null);
    }

    setPaymentToDelete(null);
    await load();
    showToast("Dépense supprimée");
  }

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const normalizedSearch = search.trim().toLowerCase();

      const paymentLabel =
        settings?.paymentUsePrefix && settings?.paymentPrefix
          ? `${settings.paymentPrefix}${p.paymentNumber}`
          : String(p.paymentNumber);

      const haystack = [paymentLabel, p.supplier.name, p.note ?? "", p.method]
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !haystack.includes(normalizedSearch)) {
        return false;
      }

      if (filterSupplierId && p.supplier.id !== filterSupplierId) {
        return false;
      }

      const paymentDate = new Date(p.date);

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (paymentDate < from) return false;
      }

      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (paymentDate > to) return false;
      }

      return true;
    });
  }, [payments, search, filterSupplierId, dateFrom, dateTo, settings]);

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-6 top-6 z-[100] rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Dépenses
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Gérez et suivez les dépenses de la copropriété.
        </p>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <input
            className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none placeholder:text-zinc-400"
            placeholder="Rechercher une dépense..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none xl:w-52"
            value={filterSupplierId}
            onChange={(e) => setFilterSupplierId(e.target.value)}
          >
            <option value="">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none xl:w-44"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <input
            type="date"
            className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-sm outline-none xl:w-44"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

<div className="flex gap-3">
  <button
    type="button"
    onClick={() => {
      setImportOpen(true);
      setImportFile(null);
      setImportResult(null);
    }}
    className="h-12 rounded-2xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700"
  >
    Importer
  </button>

  <button
    type="button"
    onClick={() => {
      resetForm();
      setEditingPayment(null);
      setOpenCreate(true);
    }}
    className="h-12 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white"
  >
    + Ajouter une dépense
  </button>
</div>

        </div>

{selectedPayments.length > 0 && (
  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
    <div className="text-sm text-zinc-600">
      {selectedPayments.length} dépense(s) sélectionnée(s)
    </div>

    <button
      onClick={deleteSelected}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
    >
      Supprimer
    </button>
  </div>
)}

        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-zinc-50">
                <tr className="text-left">
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
  <input
    type="checkbox"
    checked={
      filteredPayments.length > 0 &&
      selectedPayments.length === filteredPayments.length
    }
    onChange={toggleSelectAll}
  />
</th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Date
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Titre
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Prestataire
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Catégorie
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Méthode
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Montant
                  </th>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-zinc-500"
                    >
                      Aucune dépense trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const numberLabel =
                      settings?.paymentUsePrefix && settings?.paymentPrefix
                        ? `${settings.paymentPrefix}${p.paymentNumber}`
                        : String(p.paymentNumber);

                    return (
                      
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPayment(p)}
                        className="cursor-pointer border-t border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        <td className="px-5 py-4">
  <input
    type="checkbox"
    checked={selectedPayments.includes(p.id)}
    onChange={() => toggleSelect(p.id)}
    onClick={(e) => e.stopPropagation()}
  />
</td>
                        <td className="px-5 py-4">{formatDate(p.date)}</td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-zinc-900">
                            {p.note?.split(" — ")[0] || `Paiement ${numberLabel}`}
                          </div>
                          <div className="text-xs text-zinc-500">{numberLabel}</div>
                        </td>
                        <td className="px-5 py-4">{p.supplier.name}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                            {p.category?.name || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                              p.method === "CASH"
                                ? "bg-emerald-100 text-emerald-700"
                                : p.method === "TRANSFER"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {p.method === "CASH"
  ? "Espèces"
  : p.method === "TRANSFER"
  ? "Virement"
  : p.method === "CHECK"
  ? "Chèque"
  : "Prélèvement"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-zinc-900">
                          {formatMoney(p.amount)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentToDelete(p);
                            }}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-zinc-900">
                {editingPayment ? "Modifier la dépense" : "Ajouter une dépense"}
              </h2>

              <button
                type="button"
                onClick={closeCreateModal}
                className="text-2xl leading-none text-zinc-400"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Titre de la dépense
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Montant (MAD)
                  </label>
                  <input
  type="number"
  step="0.01"
  inputMode="decimal"
  className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
  value={amount}
  onChange={(e) => {
  const v = e.target.value;
  console.log("INPUT VALUE:", v);
  console.log("PARSED VALUE:", v === "" ? "" : parseFloat(v));

  setAmount(v === "" ? "" : parseFloat(v));
}}
/>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Date
                  </label>
                  <input
                    type="date"
                    className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Prestataire / Fournisseur
                </label>
                <select
                  className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">Choisir un fournisseur</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Catégorie
                </label>

                <select
                  className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Choisir une catégorie</option>

                  {categories
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Mode de paiement
                </label>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setMethod("CASH")}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                      method === "CASH"
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="text-2xl">💵</div>
                    <div className="mt-3 text-base font-semibold text-zinc-900">
                      Espèces
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Paiement direct
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("TRANSFER")}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                      method === "TRANSFER"
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="text-2xl">🏦</div>
                    <div className="mt-3 text-base font-semibold text-zinc-900">
                      Virement
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Via banque interne
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("CHECK")}
                    className={`rounded-2xl border p-4 text-left shadow-sm transition ${
                      method === "CHECK"
                        ? "border-orange-500 bg-orange-50 shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="text-2xl">🧾</div>
                    <div className="mt-3 text-base font-semibold text-zinc-900">
                      Chèque
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      Banque + numéro de chèque
                    </div>
                  </button>

                  <button
  type="button"
  onClick={() => setMethod("DEBIT")}
  className={`rounded-2xl border p-4 text-left shadow-sm transition ${
    method === "DEBIT"
      ? "border-purple-500 bg-purple-50 shadow-sm"
      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
  }`}
>
  <div className="text-2xl">💳</div>
  <div className="mt-3 text-base font-semibold text-zinc-900">
    Prélèvement
  </div>
  <div className="mt-1 text-sm text-zinc-500">
    Débit direct banque
  </div>
</button>

                </div>
              </div>

              {method !== "CASH" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-700">
                      Banque
                    </label>
                    <select
                      className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    >
                      <option value="">Choisir une banque</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {method === "CHECK" ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-700">
                        Numéro de chèque
                      </label>
                      <input
                        className="h-12 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
                        value={bankRef}
                        onChange={(e) => setBankRef(e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Note
                </label>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-zinc-200 p-4 text-sm outline-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={editingPayment ? updatePayment : createPayment}
                disabled={submitting}
                className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white disabled:opacity-50"
              >
                {editingPayment
                  ? "Enregistrer les modifications"
                  : "Ajouter la dépense"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedPayment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-zinc-900">
                Détails de la dépense
              </h2>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="text-xl text-zinc-400"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="text-lg font-semibold text-zinc-900">
                {selectedPayment.note?.split(" — ")[0] || "Dépense"}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-xs text-zinc-500">Montant</div>
                  <div className="font-medium">
                    {formatMoney(selectedPayment.amount)}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-xs text-zinc-500">Date</div>
                  <div className="font-medium">
                    {formatDate(selectedPayment.date)}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-xs text-zinc-500">Méthode</div>
                  <div className="font-medium">
                    {selectedPayment.method === "CASH"
                      ? "Espèces"
                      : selectedPayment.method === "TRANSFER"
                      ? "Virement"
                      : "Chèque"}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-xs text-zinc-500">Prestataire</div>
                  <div className="font-medium">
                    {selectedPayment.supplier.name}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="text-xs text-zinc-500">Catégorie</div>
                  <div className="font-medium">
                    {selectedPayment.category?.name || "-"}
                  </div>
                </div>

                {selectedPayment.bankName ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-xs text-zinc-500">Banque</div>
                    <div className="font-medium">{selectedPayment.bankName}</div>
                  </div>
                ) : null}

                {selectedPayment.bankRef ? (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-xs text-zinc-500">
                      Référence / Chèque
                    </div>
                    <div className="font-medium">{selectedPayment.bankRef}</div>
                  </div>
                ) : null}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPayment(selectedPayment);
                    setTitle(selectedPayment.note?.split(" — ")[0] || "");
                    setNote(selectedPayment.note?.split(" — ")[1] || "");
                    setSupplierId(selectedPayment.supplier.id);
                    setCategoryId(selectedPayment.category?.id || "");
                    setMethod(selectedPayment.method);
                    setBankName(selectedPayment.bankName || "");
                    setBankRef(selectedPayment.bankRef || "");
                    setAmount(selectedPayment.amount);
                    setDate(selectedPayment.date.slice(0, 10));
                    setSelectedPayment(null);
                    setOpenCreate(true);
                  }}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700"
                >
                  Modifier
                </button>
              </div>

              {selectedPayment.note ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                  {selectedPayment.note}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {paymentToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-zinc-900">
                Supprimer la dépense
              </h2>

              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="text-2xl leading-none text-zinc-400"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-base leading-7 text-zinc-600">
                Êtes-vous sûr de vouloir supprimer la dépense{" "}
                <span className="font-semibold text-zinc-900">
                  "
                  {paymentToDelete.note?.split(" — ")[0] ||
                    `N°${paymentToDelete.paymentNumber}`}
                  "
                </span>{" "}
                ? Cette action est irréversible.
              </p>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentToDelete(null)}
                  className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 shadow-sm"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={deletePayment}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {importOpen ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
        <h2 className="text-2xl font-semibold text-zinc-900">
          Importer des dépenses
        </h2>

        <button
          type="button"
          onClick={() => {
            setImportOpen(false);
            setImportFile(null);
            setImportResult(null);
          }}
          className="text-2xl leading-none text-zinc-400"
        >
          ×
        </button>
      </div>

      <div className="space-y-4 px-6 py-6">
        <div className="text-sm text-zinc-600">
          CSV attendu : <b>supplierName, categoryName, method, amount, date, bankName, bankRef, note</b>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />

        <div className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">
          supplierName,categoryName,method,amount,date,bankName,bankRef,note
          <br />
          Plombier Ahmed,Plomberie,CASH,350,2024-02-02,,,"Réparation fuite"
          <br />
          Electricien Sami,Electricité,TRANSFER,1200,2024-02-10,Attijari,,"Remplacement disjoncteur"
        </div>

        <button
          onClick={importPayments}
          disabled={!importFile || importBusy}
          className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-50"
        >
          {importBusy ? "Import en cours..." : "Importer"}
        </button>

        {importResult ? (
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                ✓ {importResult.imported} importé{importResult.imported > 1 ? "s" : ""}
              </span>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                  importResult.errors.length > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {importResult.errors.length > 0 ? "⚠" : "✓"} {importResult.errors.length} erreur
                {importResult.errors.length > 1 ? "s" : ""}
              </span>
            </div>

            {importResult.errors.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3">
                <div className="mb-2 text-sm font-medium text-zinc-900">Détail des erreurs</div>
                <ul className="max-h-48 space-y-1 overflow-auto text-sm text-zinc-700">
                  {importResult.errors.map((e, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="w-16 shrink-0 text-zinc-500">Ligne {e.row}</span>
                      <span className="break-words">{e.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  </div>
) : null}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
            Chargement des depenses...
          </div>
        </div>
      }
    >
      <PaymentsPageContent />
    </Suspense>
  );
}
