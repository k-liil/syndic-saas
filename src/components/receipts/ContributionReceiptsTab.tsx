"use client";

import { useEffect, useState } from "react";
import { useApiUrl, useOrganization } from "@/lib/org-context";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { canManage } from "@/lib/roles";

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
  owner: { name: string; firstName?: string | null };
  building: { name: string };
  unit: { id?: string; lotNumber?: string; reference: string; type: string } | null;
  firstPeriod: string | null;
  lastPeriod: string | null;
  isPartial: boolean;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
  });
}

function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtPeriodRange(first: string | null, last: string | null) {
  if (!first) return "—";
  if (!last || first === last) return fmtMonth(first);

  const start = new Date(first);
  const end = new Date(last);

  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    const startMonth = start.toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
    const endMonth = end.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
    return `${startMonth} à ${endMonth}`;
  }

  return `${fmtMonth(first)} à ${fmtMonth(last)}`;
}

function fmtElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

export function ContributionReceiptsTab({
  monthFilter,
  onMonthFilterChange,
}: {
  monthFilter: number;
  onMonthFilterChange: (month: number) => void;
}) {
  const { data: session } = useSession();
  const { org } = useOrganization();
  const apiUrl = useApiUrl();
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
  const canEdit = canManage((session?.user as any)?.role);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalReceipts, setTotalReceipts] = useState(0);
  const [selectAllAcrossResults, setSelectAllAcrossResults] = useState(false);

const [totals, setTotals] = useState({
  all: 0,
  cash: 0,
  transfer: 0,
  check: 0,
});

  const [page, setPage] = useState(1);
const [pageSize] = useState(50);
const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);


  const [methodFilter, setMethodFilter] = useState<
    "ALL" | "CASH" | "TRANSFER" | "CHECK"
  >("ALL");

  const [search, setSearch] = useState("");
  const [lotFilter, setLotFilter] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

const totalAll = totals.all;
const totalCash = totals.cash;
const totalTransfer = totals.transfer;
const totalCheck = totals.check;

const filteredReceipts = receipts;

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
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);
  const [importElapsedMs, setImportElapsedMs] = useState(0);

  const [toast, setToast] = useState<null | { type: "success" | "error"; text: string }>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
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
  const [importDateFormat, setImportDateFormat] = useState<"DMY" | "MDY">("DMY");
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<null | {
  imported: number;
  errors: { row: number; error: string }[];
  durationMs: number;
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
  if (!year) return;

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    type: "CONTRIBUTION",
    year,
    q: lotFilter,
    sortDir,
  });

  if (methodFilter !== "ALL") {
    params.append("method", methodFilter);
  }

  if (monthFilter > 0) {
    params.append("month", String(monthFilter));
  }

  const res = await fetch(apiUrl(`/api/receipts?${params.toString()}`), {
    cache: "no-store",
  });

  const data = await res.json();

setReceipts(Array.isArray(data?.items) ? data.items : []);
setTotalPages(Number(data?.pagination?.totalPages ?? 1));
setTotalReceipts(Number(data?.pagination?.total ?? 0));

setTotals({
  all: Number(data?.totals?.all ?? 0),
  cash: Number(data?.totals?.cash ?? 0),
  transfer: Number(data?.totals?.transfer ?? 0),
  check: Number(data?.totals?.check ?? 0),
});
}

async function loadReceiptsTotalCount() {
  if (!year) return 0;

  const params = new URLSearchParams({
    page: "1",
    pageSize: "1",
    type: "CONTRIBUTION",
    year,
    q: lotFilter,
    sortDir,
  });

  if (methodFilter !== "ALL") {
    params.append("method", methodFilter);
  }

  if (monthFilter > 0) {
    params.append("month", String(monthFilter));
  }

  const res = await fetch(apiUrl(`/api/receipts?${params.toString()}`), {
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);
  return Number(data?.pagination?.total ?? 0);
}

async function deleteSelected() {
  if (selectedReceipts.length === 0 && !selectAllAcrossResults) return;

  setBulkDeleting(true);

  if (selectAllAcrossResults) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await fetch(apiUrl("/api/receipts/bulk"), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deleteAll: true,
          type: "CONTRIBUTION",
          year,
          month: monthFilter > 0 ? monthFilter : undefined,
          method: methodFilter === "ALL" ? undefined : methodFilter,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setToast({
          type: "error",
          text: data?.error ?? "Erreur suppression",
        });
        setBulkDeleting(false);
        return;
      }

      const remaining = await loadReceiptsTotalCount();
      if (remaining === 0) {
        break;
      }

      if (attempt === 4) {
        setToast({
          type: "error",
          text: `Suppression partielle : ${remaining} ligne(s) restante(s)`,
        });
        setBulkDeleting(false);
        return;
      }
    }
  } else {
    const res = await fetch(apiUrl("/api/receipts/bulk"), {
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
      setBulkDeleting(false);
      return;
    }
  }

  setSelectedReceipts([]);
  setSelectAllAcrossResults(false);
  setPage(1);

  await loadReceipts();
  setBulkDeleting(false);

  setToast({
    type: "success",
    text: "Encaissements supprimés",
  });

  setTimeout(() => setToast(null), 2500);
}

function toggleSelectAll() {
  if (selectedReceipts.length === receipts.length && !selectAllAcrossResults) {
    setSelectedReceipts([]);
    setSelectAllAcrossResults(false);
  } else {
    setSelectedReceipts(receipts.map((r) => r.id));
    setSelectAllAcrossResults(false);
  }
}

  function toggleSelect(id: string) {
  setSelectAllAcrossResults(false);
  setSelectedReceipts((prev) =>
    prev.includes(id)
      ? prev.filter((x) => x !== id)
      : [...prev, id]
  );
}

async function importReceipts() {
  if (!importFile) return;

  const startedAt = Date.now();
  setImportBusy(true);
  setImportStartedAt(startedAt);
  setImportElapsedMs(0);
  setImportProgress(0);
  setImportTotal(0);
  setImportPercent(0);
setImportResult(null);

  try {
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

    if (rows.length === 0) {
      throw new Error("Le fichier ne contient aucune ligne exploitable");
    }

    setImportTotal(rows.length);

    const start = await fetch(apiUrl("/api/import/receipts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        totalRows: rows.length,
      }),
    });

    const startData = await start.json().catch(() => null);

    if (!start.ok || !startData?.jobId) {
      throw new Error(startData?.error ?? "Impossible de demarrer l'import");
    }

    const jobId = startData.jobId;

    const batchSize = 100;
    let processed = 0;
    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    while (processed < rows.length) {
      const batch = rows.slice(processed, processed + batchSize);

      const res = await fetch(apiUrl("/api/import/receipts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "batch",
          jobId,
          rows: batch,
          offset: processed,
          dateFormat: importDateFormat,
          isLastBatch: processed + batchSize >= rows.length,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error ?? "Echec pendant l'import");
      }

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
      durationMs: Date.now() - startedAt,
    });

    setImportFile(null);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement | null;
    if (input) input.value = "";
  } catch (error: any) {
    setImportResult({
      imported: 0,
      errors: [
        {
          row: 0,
          error: error?.message ?? "Import impossible",
        },
      ],
      durationMs: Date.now() - startedAt,
    });
  } finally {
    setImportBusy(false);
    setImportStartedAt(null);
    setImportElapsedMs(0);
  }
}

useEffect(() => {
  if (!importBusy || !importStartedAt) {
    setImportElapsedMs(0);
    return;
  }

  setImportElapsedMs(Date.now() - importStartedAt);

  const timer = window.setInterval(() => {
    setImportElapsedMs(Date.now() - importStartedAt);
  }, 1000);

  return () => window.clearInterval(timer);
}, [importBusy, importStartedAt]);

  async function openDetail(id: string) {
    const res = await fetch(apiUrl(`/api/receipts/${id}`), { cache: "no-store" });
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
    const res = await fetch(apiUrl(`/api/receipts/${id}`), { cache: "no-store" });
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

    const res = await fetch(apiUrl(`/api/receipts/${receiptToDelete}`), {
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

    const res = await fetch(apiUrl(`/api/receipts/${detail.id}`), {
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
    const res = await fetch(apiUrl("/api/settings"), { cache: "no-store" });
    const data = await res.json().catch(() => null);

    setReceiptUsePrefix(Boolean(data?.receiptUsePrefix));
    setReceiptPrefix(typeof data?.receiptPrefix === "string" ? data.receiptPrefix : "");
  }

  async function loadBanks() {
    const res = await fetch(apiUrl("/api/internal-banks"));
    const data = await res.json().catch(() => []);
    setBanks(Array.isArray(data) ? data.filter((b: any) => b.isActive) : []);
  }

useEffect(() => {
  if (!year || !org?.id) return;
  loadReceipts();
}, [page, methodFilter, monthFilter, year, org?.id, lotFilter, sortDir]);

useEffect(() => {
  if (!org?.id) return;
  loadBanks();
  loadSettings();
}, [org?.id]);

useEffect(() => {
  setPage(1);
  setSelectedReceipts([]);
  setSelectAllAcrossResults(false);
}, [year, monthFilter, lotFilter, sortDir]);

useEffect(() => {
  setSelectedReceipts([]);
  setSelectAllAcrossResults(false);
}, [methodFilter, page]);

  async function searchUnits(q: string) {
    setQuery(q);

    if (!q) {
      setUnits([]);
      return;
    }

    const res = await fetch(
      apiUrl(
        mode === "UNIT"
          ? `/api/units/search?q=${encodeURIComponent(q)}`
          : `/api/owners/search?q=${encodeURIComponent(q)}`
      )
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
        apiUrl(isEdit ? `/api/receipts/${editingReceiptId}` : "/api/receipts"),
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
            onClick={() => {
              setPage(1);
              setMethodFilter("ALL");
            }}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "ALL" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Tous
          </button>

          <button
            onClick={() => {
              setPage(1);
              setMethodFilter("CASH");
            }}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "CASH" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Espèces
          </button>

          <button
            onClick={() => {
              setPage(1);
              setMethodFilter("TRANSFER");
            }}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "TRANSFER" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Virement
          </button>

          <button
            onClick={() => {
              setPage(1);
              setMethodFilter("CHECK");
            }}
            className={`rounded-xl px-3 py-1.5 text-sm border ${
              methodFilter === "CHECK" ? "bg-zinc-900 text-white" : "bg-white"
            }`}
          >
            Chèque
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Lot :</span>
          <input
            type="text"
            value={lotFilter}
            onChange={(e) => {
              setPage(1);
              setLotFilter(e.target.value);
            }}
            placeholder="Ex: E12"
            className="h-9 w-28 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm outline-none transition focus:border-zinc-900"
          />
          {lotFilter.trim() ? (
            <button
              onClick={() => {
                setPage(1);
                setLotFilter("");
              }}
              className="rounded-xl border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* Filtre par mois */}
        <div className="hidden items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Mois :</span>
          <select
            value={monthFilter}
            onChange={(e) => {
              setPage(1);
              onMonthFilterChange(Number(e.target.value));
            }}
            className="h-9 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm"
          >
            <option value={0}>Tous les mois</option>
            <option value={1}>Janvier</option>
            <option value={2}>Février</option>
            <option value={3}>Mars</option>
            <option value={4}>Avril</option>
            <option value={5}>Mai</option>
            <option value={6}>Juin</option>
            <option value={7}>Juillet</option>
            <option value={8}>Août</option>
            <option value={9}>Septembre</option>
            <option value={10}>Octobre</option>
            <option value={11}>Novembre</option>
            <option value={12}>Décembre</option>
          </select>
          {monthFilter > 0 && (
            <button
              onClick={() => {
                setPage(1);
                onMonthFilterChange(0);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Total encaissé</div>
            <div className="mt-1 text-lg font-semibold text-zinc-900">
              {totalAll.toLocaleString("fr-FR")} MAD
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Espèces</div>
            <div className="mt-1 text-lg font-semibold text-emerald-600">
              {totalCash.toLocaleString("fr-FR")} MAD
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Virements</div>
            <div className="mt-1 text-lg font-semibold text-blue-600">
              {totalTransfer.toLocaleString("fr-FR")} MAD
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">Chèques</div>
            <div className="mt-1 text-lg font-semibold text-amber-600">
              {totalCheck.toLocaleString("fr-FR")} MAD
            </div>
          </div>
        </div>

        {canEdit ? (
          <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => {
                setImportOpen(true);
                setImportFile(null);
                setImportResult(null);
                setImportProgress(0);
                setImportTotal(0);
                setImportPercent(0);
              }}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Importer
            </button>

            <button
              onClick={openCreate}
              className="btn-brand rounded-2xl px-5 py-2.5 text-sm font-medium"
            >
              + Encaisser
            </button>
          </div>
        ) : null}
      </div>

      {canEdit && (selectedReceipts.length > 0 || selectAllAcrossResults) && (

        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">

          <div className="text-sm text-zinc-600">
            {selectAllAcrossResults
              ? `${totalReceipts} encaissement(s) sélectionné(s)`
              : `${selectedReceipts.length} encaissement(s) sélectionné(s)`}
          </div>

          {!selectAllAcrossResults && totalReceipts > selectedReceipts.length ? (
            <button
              type="button"
              onClick={() => setSelectAllAcrossResults(true)}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Selectionner toute la base ({totalReceipts})
            </button>
          ) : null}

          {selectAllAcrossResults ? (
            <button
              type="button"
              onClick={() => setSelectAllAcrossResults(false)}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 transition hover:bg-red-100"
            >
              Revenir a la page courante
            </button>
          ) : null}

          <button
            onClick={deleteSelected}
            disabled={bulkDeleting}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkDeleting ? "Suppression..." : "Supprimer"}
          </button>

        </div>

      )}

      {bulkDeleting ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
          <span>Suppression en cours, merci de patienter...</span>
        </div>
      ) : null}

{false && selectedReceipts.length > 0 && !selectAllAcrossResults && totalReceipts > selectedReceipts.length ? (
  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
    <span>
      {selectedReceipts.length} ligne(s) selectionnee(s) sur cette page.
    </span>

    <button
      type="button"
      onClick={() => setSelectAllAcrossResults(true)}
      className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
    >
      Selectionner toute la base ({totalReceipts})
    </button>
  </div>
) : null}

{false && selectAllAcrossResults ? (
  <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-sm">
    <span>{totalReceipts} ligne(s) selectionnee(s) dans toute la base filtree.</span>

    <button
      type="button"
      onClick={() => setSelectAllAcrossResults(false)}
      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-800 transition hover:bg-red-100"
    >
      Revenir a la page courante
    </button>
  </div>
) : null}

<div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
  <div className="overflow-x-auto">
    <Table className="text-sm">
<THead>
  <TR className="border-b border-zinc-200 bg-zinc-50">
    <TH className="w-10">
      <input
        type="checkbox"
        checked={
          selectAllAcrossResults || (
          receipts.length > 0 &&
          selectedReceipts.length === receipts.length
        )}
        onChange={toggleSelectAll}
      />
    </TH>

    <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">N°</TH>
    <TH 
      className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-700"
      onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
    >
      <div className="flex items-center gap-1">
        Date
        <span className="text-[10px]">
          {sortDir === "desc" ? "▼" : "▲"}
        </span>
      </div>
    </TH>
    <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Lot</TH>
    <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Immeuble</TH>
    <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Copropriétaire</TH>
    <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Méthode</TH>
    <TH className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Montant</TH>
    <TH className="w-24 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">Actions</TH>
  </TR>
</THead>

        <tbody>
          {filteredReceipts.map((r) => (
            <TR
              key={r.id}
              onClick={() => openDetail(r.id)}
              className="group cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50"
            >
                <TD onClick={(e) => e.stopPropagation()}>
  <input
    type="checkbox"
    checked={selectedReceipts.includes(r.id)}
    onChange={() => toggleSelect(r.id)}
  />
</TD>
                <TD className="font-semibold text-zinc-900">
                  {fmtReceiptNumber(r.receiptNumber, receiptUsePrefix, receiptPrefix)}
                </TD>

                <TD className="text-zinc-600">{fmtDate(r.date)}</TD>
                <TD>
                  <span className="font-medium text-zinc-900">{r.unit?.lotNumber ?? r.unit?.reference ?? "—"}</span>
                </TD>
                <TD className="text-zinc-700">{r.building?.name ?? "—"}</TD>
                <TD className="font-medium text-zinc-900">
                  {r.owner?.firstName ? `${r.owner.firstName} ${r.owner.name}` : r.owner?.name}
                </TD>
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
                  <div className="font-semibold text-zinc-900">
                    {Number(r.amount).toLocaleString("fr-FR")} MAD
                  </div>
                  {r.firstPeriod && (
                    <div className={`mt-0.5 text-[10px] font-medium ${
                      r.isPartial ? "text-amber-600" : "text-emerald-600"
                    }`}>
                      {r.isPartial ? "🟠" : "🟢"} {fmtPeriodRange(r.firstPeriod, r.lastPeriod)}
                    </div>
                  )}
                </TD>

                <TD className="text-right">
                  <div
                    className="flex justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => openEditInForm(r.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600"
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

                    {/* Bouton imprimer reçu */}
                    <button
                      type="button"
                      onClick={() => window.open(apiUrl(`/api/receipts/${r.id}/print`), "_blank")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-teal-50 hover:text-teal-600"
                      title="Imprimer le reçu"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9V2h12v7" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" rx="1" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => askDelete(r.id, r.receiptNumber)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
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
  </div>
</div>

<div className="mt-5 flex items-center justify-between">
  <div className="text-sm text-zinc-500">
    Page {page} sur {totalPages}
  </div>

  <div className="flex items-center gap-2">
    <button
      disabled={page === 1}
      onClick={() => setPage(page - 1)}
      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Précédent
    </button>

    <button
      disabled={page === totalPages}
      onClick={() => setPage(page + 1)}
      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      Suivant
    </button>
  </div>
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
            <label className="text-sm font-medium">
              {mode === "UNIT" ? "Lot" : "Copropriétaire"}
            </label>

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
            className="btn-brand h-12 rounded-2xl text-sm font-medium disabled:opacity-50"
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
                    {detail.owner?.firstName ? `${detail.owner.firstName} ${detail.owner.name}` : detail.owner?.name ?? "—"}
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

              {(() => {
                const allocations = detail.allocations ?? [];
                if (allocations.length === 0) {
                  return (
                    <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      Aucune allocation.
                    </div>
                  );
                }

                const typedAllocs = allocations.map((a: any) => {
                  const amountDue = Number(a.due.amountDue);
                  const previousTotal = Number(a.previousTotal ?? 0);
                  const afterTotal = Number(a.afterTotal ?? 0);

                  let type: "COMPLEMENT" | "FULL" | "PARTIAL" = "PARTIAL";

                  if (afterTotal >= amountDue) {
                    // It is now fully paid
                    type = previousTotal > 0 ? "COMPLEMENT" : "FULL";
                  } else {
                    // Still partial
                    type = "PARTIAL";
                  }

                  return { ...a, type };
                });

                // Group consecutive FULL allocations
                const displayGroups: any[] = [];
                let currentGroup: any = null;

                for (const a of typedAllocs) {
                  if (a.type === "FULL") {
                    if (!currentGroup) {
                      currentGroup = {
                        type: "FULL",
                        items: [a],
                        total: Number(a.amount),
                      };
                      displayGroups.push(currentGroup);
                    } else {
                      currentGroup.items.push(a);
                      currentGroup.total += Number(a.amount);
                    }
                  } else {
                    currentGroup = null;
                    displayGroups.push({
                      type: a.type,
                      item: a,
                      total: Number(a.amount),
                    });
                  }
                }

                return (
                  <div className="mt-4 space-y-4">
                    {displayGroups.map((group, idx) => {
                      if (group.type === "FULL") {
                        const first = group.items[0];
                        const last = group.items[group.items.length - 1];
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-4 shadow-sm">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80">Période réglée</div>
                              <div className="mt-1 text-base font-semibold text-zinc-900">
                                {fmtPeriodRange(first.due.period, last.due.period)}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {group.items.length} mois couvert(s)
                              </div>
                            </div>
                            <div className="ml-4 rounded-xl bg-emerald-600 px-4 py-2 text-right text-white shadow-sm">
                              <div className="text-[10px] font-medium uppercase tracking-tight text-emerald-100">Total</div>
                              <div className="text-lg font-bold">{group.total.toLocaleString("fr-FR")} <span className="text-xs font-normal">MAD</span></div>
                            </div>
                          </div>
                        );
                      }

                      if (group.type === "COMPLEMENT") {
                        return (
                          <div key={idx} className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/50 px-5 py-4 shadow-sm">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80">Règlement complémentaire</div>
                              <div className="mt-1 text-base font-semibold text-zinc-900">
                                {fmtMonth(group.item.due.period)}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                Mois complété
                              </div>
                            </div>
                            <div className="ml-4 rounded-xl bg-emerald-600 px-4 py-2 text-right text-white shadow-sm">
                              <div className="text-[10px] font-medium uppercase tracking-tight text-emerald-100">Plus</div>
                              <div className="text-lg font-bold">{group.total.toLocaleString("fr-FR")} <span className="text-xs font-normal">MAD</span></div>
                            </div>
                          </div>
                        );
                      }

                      // PARTIAL
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50/50 px-5 py-4 shadow-sm">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold uppercase tracking-wider text-amber-600/80">Paiement partiel</div>
                            <div className="mt-1 text-base font-semibold text-zinc-900">
                              {fmtMonth(group.item.due.period)}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              Reliquat alloué
                            </div>
                          </div>
                          <div className="ml-4 rounded-xl bg-amber-500 px-4 py-2 text-right text-white shadow-sm">
                            <div className="text-[10px] font-medium uppercase tracking-tight text-amber-100">Total</div>
                            <div className="text-lg font-bold">{group.total.toLocaleString("fr-FR")} <span className="text-xs font-normal">MAD</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
              className="btn-brand rounded-2xl px-4 py-2 text-sm"
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

          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-zinc-700">Format date :</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="dateFormat"
                checked={importDateFormat === "DMY"}
                onChange={() => setImportDateFormat("DMY")}
                className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
              />
              <span className="text-zinc-600">JJ/MM/AAAA</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="dateFormat"
                checked={importDateFormat === "MDY"}
                onChange={() => setImportDateFormat("MDY")}
                className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
              />
              <span className="text-zinc-600">MM/JJ/AAAA</span>
            </label>
          </div>

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

    <div className="flex justify-between text-xs text-zinc-500">
      <span>{importPercent}%</span>
      <span>
        Temps ecoule : {fmtElapsed(importElapsedMs)}
      </span>
    </div>

    {importProgress === 0 ? (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
        Preparation du premier lot...
      </div>
    ) : null}
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

      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
        Temps : {fmtElapsed(importResult.durationMs)}
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
