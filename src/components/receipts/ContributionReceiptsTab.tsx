"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";

type Method = "CASH" | "TRANSFER" | "CHECK";

type UnitSearch = {
  id: string;
  lotNumber: string;
  reference: string;
  type: string;
  buildingName: string | null;
  ownerName: string | null;
};

type Receipt = {
  id: string;
  receiptNumber: number;
  date: string;
  amount: number;
  method: Method;
  note: string | null;
  owner: { name: string };
  building: { name: string };
  unit: { id?: string; lotNumber?: string; reference: string; type: string } | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function fmtReceiptNumber(
  receiptNumber: number,
  usePrefix: boolean,
  prefix: string
) {
  if (usePrefix && prefix.trim()) {
    return `${prefix.trim()}${receiptNumber}`;
  }

  return String(receiptNumber);
}

export function ContributionReceiptsTab() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const [page, setPage] = useState(1);
const [pageSize] = useState(50);
const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);


  const [methodFilter, setMethodFilter] = useState<
    "ALL" | "CASH" | "TRANSFER" | "CHECK"
  >("ALL");

  const totalAll = receipts.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const totalCash = receipts
    .filter((r) => r.method === "CASH")
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const totalTransfer = receipts
    .filter((r) => r.method === "TRANSFER")
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const totalCheck = receipts
    .filter((r) => r.method === "CHECK")
    .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  const [mode, setMode] = useState<"UNIT" | "OWNER">("UNIT");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [receiptUsePrefix, setReceiptUsePrefix] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [receiptPrefix, setReceiptPrefix] = useState("");
  const [receiptToDelete, setReceiptToDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [units, setUnits] = useState<UnitSearch[]>([]);
  const [unitId, setUnitId] = useState("");

  const [importBusy, setImportBusy] = useState(false);
const [importProgress, setImportProgress] = useState(0);
const [importTotal, setImportTotal] = useState(0);
const [importPercent, setImportPercent] = useState(0);

  const [toast, setToast] = useState<null | { type: "success" | "error"; text: string }>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiptToDeleteNumber, setReceiptToDeleteNumber] = useState<number | null>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [bankName, setBankName] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [editMethod, setEditMethod] = useState<Method>("CASH");
  const [editDate, setEditDate] = useState("");
  const [editBank, setEditBank] = useState("");
  const [editCheck, setEditCheck] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<null | {
  imported: number;
  errors: { row: number; error: string }[];
}>(null);

  const [success, setSuccess] = useState<null | {
    receiptNumber: number;
    receiptPeriod: string;
    firstAllocatedPeriod: string | null;
    lastAllocatedPeriod: string | null;
    monthsTouched: number;
    unallocatedAmount: number;
  }>(null);

async function loadReceipts() {
  const res = await fetch(
    `/api/receipts?page=${page}&pageSize=${pageSize}&type=CONTRIBUTION`
  );

  const data = await res.json();

  setReceipts(data.items);
  setTotalPages(data.pagination.totalPages);
}

async function deleteSelected() {

  if (selectedReceipts.length === 0) return;

  const res = await fetch("/api/receipts/bulk", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ids: selectedReceipts,
    }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    setToast({
      type: "error",
      text: data?.error ?? "Erreur suppression",
    });
    return;
  }

  setSelectedReceipts([]);

  await loadReceipts();

  setToast({
    type: "success",
    text: "Encaissements supprimés",
  });

  setTimeout(() => setToast(null), 2500);
}

function toggleSelectAll() {
  if (selectedReceipts.length === receipts.length) {
    setSelectedReceipts([]);
  } else {
    setSelectedReceipts(receipts.map((r) => r.id));
  }
}

  function toggleSelect(id: string) {
  setSelectedReceipts((prev) =>
    prev.includes(id)
      ? prev.filter((x) => x !== id)
      : [...prev, id]
  );
}

async function importReceipts() {
  if (!importFile) return;

  setImportBusy(true);
  setImportProgress(0);
  setImportTotal(0);
  setImportPercent(0);
setImportResult(null);

  const text = await importFile.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  const rows = lines.slice(1).map((l) => {
    const c = l.split(",");
    return {
      lotNumber: c[0],
      amount: Number(c[1]),
      method: c[2],
      date: c[3],
      note: c[4] ?? "",
    };
  });

  setImportTotal(rows.length);

  const start = await fetch("/api/import/receipts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start",
      totalRows: rows.length,
    }),
  });

  const startData = await start.json();
  const jobId = startData.jobId;

  const batchSize = 5;
  let processed = 0;
let imported = 0;
const errors: { row: number; error: string }[] = [];

  while (processed < rows.length) {
    const batch = rows.slice(processed, processed + batchSize);

    const res = await fetch("/api/import/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "batch",
        jobId,
        rows: batch,
        offset: processed,
        isLastBatch: processed + batchSize >= rows.length,
      }),
    });

const data = await res.json();

imported += Number(data?.imported ?? 0);

if (Array.isArray(data?.errors)) {
  errors.push(...data.errors);
}

processed += batch.length;

    setImportProgress(processed);
    setImportPercent(Math.round((processed / rows.length) * 100));
  }

await loadReceipts();

setImportResult({
  imported,
  errors,
});

setImportFile(null);
setImportBusy(false);

const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
if (input) input.value = "";
}

  async function openDetail(id: string) {
    const res = await fetch(`/api/receipts/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({
        type: "error",
        text: data?.error ?? "Impossible de charger",
      });
      return;
    }

    setDetail(data);
    setEditMethod(data.method);
    setEditDate(data.date.slice(0, 10));
    setEditBank(data.bankName ?? "");
    setEditCheck(data.bankRef ?? "");
    setEditMode(false);
    setDetailOpen(true);
  }

  async function openEditInForm(id: string) {
    const res = await fetch(`/api/receipts/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({
        type: "error",
        text: data?.error ?? "Impossible de charger",
      });
      return;
    }

    setEditingReceiptId(data.id);
    setUnitId(data.unit?.id ?? "");
    setQuery(
      data.unit?.lotNumber
        ? `${data.unit.lotNumber} • ${data.owner?.name ?? ""}`
        : data.owner?.name ?? ""
    );
    setUnits([]);
    setAmount(String(data.amount ?? ""));
    setMethod(data.method);
    setDate(String(data.date).slice(0, 10));
    setNote(data.note ?? "");
    setBankName(data.bankName ?? "");
    setCheckNumber(data.bankRef ?? "");
    setSuccess(null);
    setOpen(true);
  }

  function askDelete(id: string, receiptNumber: number) {
    setReceiptToDelete(id);
    setReceiptToDeleteNumber(receiptNumber);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!receiptToDelete || deleting) return;

    setDeleting(true);

    const res = await fetch(`/api/receipts/${receiptToDelete}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({
        type: "error",
        text: data?.error ?? "Erreur suppression",
      });
      setDeleting(false);
      return;
    }

    setDeleteOpen(false);
    setReceiptToDelete(null);
    setReceiptToDeleteNumber(null);
    setDeleting(false);

    await loadReceipts();

    setToast({
      type: "success",
      text: "Encaissement supprimé",
    });

    setTimeout(() => {
      setToast(null);
    }, 2500);
  }

  async function updateReceipt() {
    if (!detail) return;

    const res = await fetch(`/api/receipts/${detail.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: editMethod,
        date: editDate,
        bankName: editBank,
        bankRef: editCheck,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setToast({
        type: "error",
        text: data?.error ?? "Erreur modification",
      });
      return;
    }

    setEditMode(false);
    setDetail({
      ...detail,
      method: editMethod,
      date: editDate,
      bankName: editBank,
      bankRef: editCheck,
    });

    setToast({
      type: "success",
      text: "Encaissement modifié",
    });

    await loadReceipts();

    setTimeout(() => setToast(null), 2500);
  }

  async function loadSettings() {
    const res = await fetch("/api/settings", { cache: "no-store" });
    const data = await res.json().catch(() => null);

    setReceiptUsePrefix(Boolean(data?.receiptUsePrefix));
    setReceiptPrefix(typeof data?.receiptPrefix === "string" ? data.receiptPrefix : "");
  }

  async function loadBanks() {
    const res = await fetch("/api/internal-banks");
    const data = await res.json().catch(() => []);
    setBanks(Array.isArray(data) ? data.filter((b: any) => b.isActive) : []);
  }

useEffect(() => {
  loadReceipts();
}, [page]);

useEffect(() => {
  loadBanks();
  loadSettings();
}, []);

useEffect(() => {
  setPage(1);
}, [methodFilter]);

  async function searchUnits(q: string) {
    setQuery(q);

    if (!q) {
      setUnits([]);
      return;
    }

    const res = await fetch(
      mode === "UNIT"
        ? `/api/units/search?q=${encodeURIComponent(q)}`
        : `/api/owners/search?q=${encodeURIComponent(q)}`
    );
    const data = await res.json().catch(() => []);
    setUnits(Array.isArray(data) ? data : []);
  }

  function openCreate() {
    setEditingReceiptId(null);
    setBankName("");
    setCheckNumber("");
    setUnitId("");
    setAmount("");
    setMethod("CASH");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setQuery("");
    setUnits([]);
    setOpen(true);
    setSuccess(null);
  }

  async function submit() {
    if (busy) return;
    if (!editingReceiptId && (!unitId || Number(amount) <= 0)) return;
    if ((method === "TRANSFER" || method === "CHECK") && !bankName.trim()) return;
    if (method === "CHECK" && !checkNumber.trim()) return;

    setBusy(true);
    setSuccess(null);

    try {
      const isEdit = Boolean(editingReceiptId);

      const res = await fetch(
        isEdit ? `/api/receipts/${editingReceiptId}` : "/api/receipts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEdit
              ? {
                  method,
                  date,
                  bankName,
                  bankRef: checkNumber,
                  note,
                }
              : {
                  unitId,
                  lotNumber: mode === "UNIT" ? query.split(" • ")[0] : undefined,
                  amount: Number(amount),
                  method,
                  type: "CONTRIBUTION",
                  date,
                  note,
                  bankName,
                  checkNumber,
                }
          ),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setToast({
          type: "error",
          text: data?.error ?? "Erreur",
        });

        setTimeout(() => setToast(null), 2500);
        return;
      }

      if (isEdit) {
        setOpen(false);
        setEditingReceiptId(null);
        await loadReceipts();
        setToast({
          type: "success",
          text: "Encaissement modifié",
        });
        setTimeout(() => setToast(null), 2500);
        return;
      }

      setSuccess({
        receiptNumber: Number(data.receiptNumber),
        receiptPeriod: String(data.receiptPeriod),
        firstAllocatedPeriod: data.firstAllocatedPeriod ? String(data.firstAllocatedPeriod) : null,
        lastAllocatedPeriod: data.lastAllocatedPeriod ? String(data.lastAllocatedPeriod) : null,
        monthsTouched: Number(data.monthsTouched ?? 0),
        unallocatedAmount: Number(data.unallocatedAmount ?? 0),
      });

      setOpen(false);
      await loadReceipts();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-4 top-4 z-[100]">
          <div
            className={`min-w-[260px] rounded-2xl border px-4 py-3 shadow-lg transition-all ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <div className="text-sm font-medium">{toast.text}</div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setMethodFilter("ALL")}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "ALL" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Tous
          </button>

          <button
            onClick={() => setMethodFilter("CASH")}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "CASH" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Espèces
          </button>

          <button
            onClick={() => setMethodFilter("TRANSFER")}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "TRANSFER" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Virement
          </button>

          <button
            onClick={() => setMethodFilter("CHECK")}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "CHECK" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Chèque
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Total encaissé</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">
              {totalAll.toLocaleString("fr-FR")} MAD
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Espèces</div>
            <div className="mt-1 text-lg font-semibold text-emerald-600">
              {totalCash.toLocaleString("fr-FR")} MAD
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Virements</div>
            <div className="mt-1 text-lg font-semibold text-blue-600">
              {totalTransfer.toLocaleString("fr-FR")} MAD
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-zinc-500">Chèques</div>
            <div className="mt-1 text-lg font-semibold text-amber-600">
              {totalCheck.toLocaleString("fr-FR")} MAD
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
  setImportOpen(true);
  setImportFile(null);
  setImportResult(null);
  setImportProgress(0);
  setImportTotal(0);
  setImportPercent(0);
}}
            className="rounded-xl border px-4 py-2 text-sm bg-white hover:bg-zinc-50"
          >
            Importer
          </button>

          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white"
          >
            + Encaisser
          </button>
        </div>
      </div>

{selectedReceipts.length > 0 && (

  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">

    <div className="text-sm text-zinc-600">
      {selectedReceipts.length} encaissement(s) sélectionné(s)
    </div>

    <button
      onClick={deleteSelected}
      className="rounded-xl bg-red-600 px-4 py-2 text-sm text-white"
    >
      Supprimer
    </button>

  </div>

)}

      <Table>
<THead>
  <TR>

    <TH>
      <input
        type="checkbox"
        checked={
          receipts.length > 0 &&
          selectedReceipts.length === receipts.length
        }
        onChange={toggleSelectAll}
      />
    </TH>

    <TH>N°</TH>
    <TH>Date</TH>
    <TH>Lot</TH>
    <TH>Immeuble</TH>
    <TH>Copropriétaire</TH>
    <TH>Méthode</TH>
    <TH className="text-right">Montant</TH>
    <TH></TH>
  </TR>
</THead>

        <tbody>
          {receipts
            .filter((r) => methodFilter === "ALL" || r.method === methodFilter)
            .map((r) => (
                
              <TR key={r.id}>
                <TD>
  <input
    type="checkbox"
    checked={selectedReceipts.includes(r.id)}
    onChange={() => toggleSelect(r.id)}
  />
</TD>
                <TD
                  onClick={() => openDetail(r.id)}
                  className="cursor-pointer font-semibold text-zinc-900 hover:underline"
                >
                  {fmtReceiptNumber(r.receiptNumber, receiptUsePrefix, receiptPrefix)}
                </TD>

                <TD>{fmtDate(r.date)}</TD>
                <TD>{r.unit?.reference ?? "—"}</TD>
                <TD>{r.building?.name ?? "—"}</TD>
                <TD>{r.owner?.name ?? "—"}</TD>

                <TD>
                  {r.method === "CASH" && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      💵 Espèces
                    </span>
                  )}

                  {r.method === "TRANSFER" && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                      🏦 Virement
                    </span>
                  )}

                  {r.method === "CHECK" && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      🧾 Chèque
                    </span>
                  )}
                </TD>

                <TD className="text-right">
                  <span className="font-semibold text-zinc-900">
                    {Number(r.amount).toLocaleString("fr-FR")} MAD
                  </span>
                </TD>

                <TD className="text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditInForm(r.id)}
                      className="group flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600"
                      title="Modifier l'encaissement"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => askDelete(r.id, r.receiptNumber)}
                      className="group flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Supprimer l'encaissement"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
        </tbody>
      </Table>

<div className="flex gap-2 mt-4">
  <button
    disabled={page === 1}
    onClick={() => setPage(page - 1)}
  >
    Previous
  </button>

  <span>
    Page {page} / {totalPages}
  </span>

  <button
    disabled={page === totalPages}
    onClick={() => setPage(page + 1)}
  >
    Next
  </button>
</div>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingReceiptId(null);
        }}
        title={editingReceiptId ? "Modifier l'encaissement" : "Encaisser une cotisation"}
      >
        <div className="grid gap-4">
          {success ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">Encaissement enregistré</div>
              <div className="mt-2 space-y-1">
                <div>
                  N° reçu : {fmtReceiptNumber(success.receiptNumber, receiptUsePrefix, receiptPrefix)}
                </div>
                <div>
                  Mois couverts :{" "}
                  {success.firstAllocatedPeriod && success.lastAllocatedPeriod
                    ? `${fmtMonth(success.firstAllocatedPeriod)} → ${fmtMonth(success.lastAllocatedPeriod)}`
                    : fmtMonth(success.receiptPeriod)}
                </div>
                <div>Mois impactés : {success.monthsTouched}</div>
                {success.lastAllocatedPeriod &&
                new Date(success.lastAllocatedPeriod).getTime() >
                  new Date(success.receiptPeriod).getTime() ? (
                  <div>Avance jusqu’à : {fmtMonth(success.lastAllocatedPeriod)}</div>
                ) : null}
                {success.unallocatedAmount > 0 ? (
                  <div>Crédit restant : {success.unallocatedAmount}</div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div>
            <label className="text-sm font-medium">Mode</label>

            <select
              className="h-10 w-full rounded-xl border px-3"
              value={mode}
              disabled={Boolean(editingReceiptId)}
              onChange={(e) => {
                setMode(e.target.value as "UNIT" | "OWNER");
                setQuery("");
                setUnits([]);
                setUnitId("");
              }}
            >
              <option value="UNIT">Par lot</option>
              <option value="OWNER">Par copropriétaire</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Lot / LotNumber</label>

            <input
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
              placeholder={
                mode === "UNIT"
                  ? "Rechercher un lot (ex: INM2A12)..."
                  : "Rechercher un copropriétaire..."
              }
              value={query}
              disabled={Boolean(editingReceiptId)}
              onChange={(e) => searchUnits(e.target.value)}
            />

            {units.length > 0 && (
              <div className="mt-3 max-h-64 overflow-auto rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
                <div className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Résultats
                </div>

                <div className="space-y-2">
                  {units.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setUnitId(u.id);
                        setQuery(`${u.lotNumber} • ${u.ownerName ?? ""}`);
                        setUnits([]);
                      }}
                      className="group block w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                              {u.lotNumber}
                            </span>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                u.type === "APARTMENT"
                                  ? "bg-blue-100 text-blue-700"
                                  : u.type === "GARAGE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {u.type === "APARTMENT"
                                ? "Appartement"
                                : u.type === "GARAGE"
                                ? "Garage"
                                : "Autre"}
                            </span>
                          </div>

                          <div className="mt-2 text-sm font-medium text-zinc-900">
                            {u.ownerName ?? "Sans copropriétaire"}
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            {u.buildingName ?? "Sans immeuble"}{" "}
                            {u.reference ? `• ${u.reference}` : ""}
                          </div>
                        </div>

                        <div className="pt-1 text-xs font-medium text-zinc-400 group-hover:text-zinc-600">
                          Choisir
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Montant</label>
            <input
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
              value={amount}
              disabled={Boolean(editingReceiptId)}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ex: 350"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Méthode</label>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setMethod("CASH");
                  setBankName("");
                  setCheckNumber("");
                }}
                className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                  method === "CASH"
                    ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="text-2xl">💵</div>
                <div className="mt-3 text-sm font-semibold text-zinc-900">Espèces</div>
                <div className="mt-1 text-xs text-zinc-500">Encaissement direct</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("TRANSFER");
                  setCheckNumber("");
                }}
                className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                  method === "TRANSFER"
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="text-2xl">🏦</div>
                <div className="mt-3 text-sm font-semibold text-zinc-900">Virement</div>
                <div className="mt-1 text-xs text-zinc-500">Via banque interne</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMethod("CHECK");
                }}
                className={`rounded-2xl border px-4 py-4 text-left shadow-sm transition ${
                  method === "CHECK"
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
                    : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                }`}
              >
                <div className="text-2xl">🧾</div>
                <div className="mt-3 text-sm font-semibold text-zinc-900">Chèque</div>
                <div className="mt-1 text-xs text-zinc-500">Banque + numéro de chèque</div>
              </button>
            </div>
          </div>

          {method !== "CASH" && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Banque</label>

              <select
                className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
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
          )}

          {method === "CHECK" && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">N° de chèque</label>

              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="Numéro du chèque"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Date</label>

            <input
              type="date"
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-zinc-900"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Note</label>

            <textarea
              className="min-h-[110px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition focus:border-zinc-900"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ajouter une note..."
            />
          </div>

          <button
            onClick={submit}
            disabled={
              busy ||
              !unitId ||
              Number(amount) <= 0 ||
              ((method === "TRANSFER" || method === "CHECK") && !bankName.trim()) ||
              (method === "CHECK" && !checkNumber.trim())
            }
            className="h-12 rounded-2xl bg-blue-600 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? "Enregistrement..." : editingReceiptId ? "Mettre à jour" : "Encaisser"}
          </button>
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={
          detail
            ? `Encaissement n°${fmtReceiptNumber(
                detail.receiptNumber,
                receiptUsePrefix,
                receiptPrefix
              )}`
            : "Détail"
        }
      >
        {!detail ? (
          <div className="text-sm text-zinc-500">Chargement...</div>
        ) : (
          <div className="grid gap-5">
            <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Encaissement validé
                  </div>

                  <div className="mt-3 text-xl font-semibold text-zinc-900">
                    N° {fmtReceiptNumber(detail.receiptNumber, receiptUsePrefix, receiptPrefix)}
                  </div>

                  {editMode ? (
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="mt-1 h-10 rounded-xl border px-3"
                    />
                  ) : (
                    <div className="mt-1 text-sm text-zinc-500">{fmtDate(detail.date)}</div>
                  )}
                </div>

                <div className="rounded-2xl bg-blue-600 px-4 py-3 text-right text-white shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-zinc-300">Montant</div>
                  <div className="mt-1 text-2xl font-semibold">{detail.amount}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Copropriétaire
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {detail.owner?.name ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {detail.owner?.cin ?? ""}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Immeuble
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-900">
                    {detail.building?.name ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {detail.unit?.lotNumber ?? detail.unit?.reference ?? ""}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Paiement
                  </div>

                  {editMode ? (
                    <select
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value as Method)}
                      className="mt-1 h-10 rounded-xl border px-3"
                    >
                      <option value="CASH">Espèces</option>
                      <option value="TRANSFER">Virement</option>
                      <option value="CHECK">Chèque</option>
                    </select>
                  ) : (
                    <div className="mt-1 text-sm font-semibold text-zinc-900">
                      {detail.method}
                    </div>
                  )}

                  {detail.bankName ? (
                    <div className="mt-1 text-xs text-zinc-500">
                      Banque : {detail.bankName}
                    </div>
                  ) : null}

                  {detail.bankRef ? (
                    <div className="mt-1 text-xs text-zinc-500">
                      Référence : {detail.bankRef}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">Mois couverts</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    Détail des périodes payées et de l’éventuelle avance
                  </div>
                </div>

                <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {detail.allocations?.length ?? 0} ligne(s)
                </div>
              </div>

              {detail.allocations?.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                  Aucune allocation.
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {detail.allocations.map((a: any, index: number) => {
                    const isAdvance =
                      new Date(a.due.period).getTime() > new Date(detail.date).getTime();

                    return (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-gradient-to-r from-white to-zinc-50 px-4 py-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                              {fmtMonth(a.due.period)}
                            </span>

                            {isAdvance ? (
                              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                Avance
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                Payé
                              </span>
                            )}

                            {index === 0 ? (
                              <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                                Début
                              </span>
                            ) : null}

                            {index === (detail.allocations?.length ?? 0) - 1 ? (
                              <span className="inline-flex rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-medium text-purple-700">
                                Fin
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-xs text-zinc-500">
                            {a.due.unit?.building?.name ?? detail.building?.name ?? "—"}
                            {" • "}
                            {a.due.unit?.lotNumber ?? a.due.unit?.reference ?? "—"}
                          </div>
                        </div>

                        <div className="ml-4 rounded-2xl bg-emerald-500/90 px-4 py-2 text-right text-white shadow-sm">
                          <div className="text-[11px] uppercase tracking-wide text-zinc-300">
                            Montant
                          </div>
                          <div className="text-base font-semibold">{a.amount}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {detail.unallocatedAmount > 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
                <span className="font-semibold">Crédit restant :</span> {detail.unallocatedAmount}
              </div>
            ) : null}
          </div>
        )}

        {editMode && (
          <div className="flex justify-end">
            <button
              onClick={updateReceipt}
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm text-white shadow-sm hover:bg-blue-700"
            >
              Enregistrer
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer l'encaissement"
      >
        <div className="space-y-4">
          <div className="text-sm text-zinc-600">
            Êtes-vous sûr de vouloir supprimer
            {receiptToDeleteNumber
              ? ` l'encaissement N°${fmtReceiptNumber(
                  receiptToDeleteNumber,
                  receiptUsePrefix,
                  receiptPrefix
                )}`
              : " cet encaissement"}{" "}
            ? Cette action est irréversible et les mois couverts seront recalculés.
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteOpen(false);
                setReceiptToDelete(null);
                setReceiptToDeleteNumber(null);
              }}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportFile(null);
        }}
        title="Importer des encaissements (CSV)"
      >
        <div className="space-y-4">
          <div className="text-sm text-zinc-600">
            CSV attendu : <b>lotNumber, amount, method, date, note</b>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

{importBusy && (
  <div className="space-y-2">
    <div className="flex justify-between text-sm text-zinc-700">
      <span>Import en cours</span>
      <span>
        {importProgress} / {importTotal}
      </span>
    </div>

    <div className="h-3 w-full rounded-full bg-zinc-200 overflow-hidden">
      <div
        className="h-3 bg-blue-600 transition-all"
        style={{ width: `${importPercent}%` }}
      />
    </div>

    <div className="text-xs text-zinc-500">{importPercent}%</div>
  </div>
)}         

          <div className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">
            lotNumber,amount,method,date,note
            <br />
            INM1A1,350,CASH,2026-03-01,Paiement mars
            <br />
            INM1A2,350,TRANSFER,2026-03-02,Virement
          </div>

          <button
  onClick={importReceipts}
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
      </Modal>
    </div>
  );
}