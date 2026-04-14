"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { OtherReceiptModal } from "./OtherReceiptModal";
import { Modal } from "@/components/ui/Modal";
import { canManage } from "@/lib/roles";
import { useApiUrl } from "@/lib/org-context";
import { Upload, PlusCircle, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/date-utils";

type Method = "CASH" | "TRANSFER" | "CHECK" | "BANK_DEPOSIT";
type OtherReceiptType = "RENT" | "OTHER";

type OtherReceipt = {
  id: string;
  receiptNumber: number;
  type: OtherReceiptType;
  description: string;
  date: string;
  method: Method;
  amount: number;
  bankName?: string | null;
  bankRef?: string | null;
  note?: string | null;
};

// Relied on central utility

function fmtElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function OtherReceiptsTab({
  monthFilter,
}: {
  monthFilter: number;
}) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
  const canEdit = canManage(session?.user?.role);
  const apiUrl = useApiUrl();
  const [items, setItems] = useState<OtherReceipt[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OtherReceipt | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importPercent, setImportPercent] = useState(0);
  const [importStep, setImportStep] = useState<string>("");
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);
  const [importElapsedMs, setImportElapsedMs] = useState(0);
  const [importResult, setImportResult] = useState<null | {
    imported: number;
    errors: { row: number; error: string }[];
    durationMs: number;
  }>(null);

  // Search & Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllAcrossResults, setSelectAllAcrossResults] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [total, setTotal] = useState(0);

  async function load() {
    if (!year) return;

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      year,
    });

    if (monthFilter > 0) {
      params.append("month", String(monthFilter));
    }

    if (searchQuery.trim()) {
      params.append("search", searchQuery.trim());
    }

    const res = await fetch(apiUrl(`/api/other-receipts?${params.toString()}`), {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    setItems(Array.isArray(data?.items) ? data.items : []);
    setTotalPages(Number(data?.pagination?.totalPages ?? 1));
    setTotal(Number(data?.pagination?.totalItems ?? 0));
  }

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      load();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, year, monthFilter]);

  useEffect(() => {
    if (!year) return;
    load();
  }, [page, year, monthFilter]);

  useEffect(() => {
    setPage(1);
  }, [year, monthFilter]);

  async function remove(id: string) {
    const ok = window.confirm("Supprimer cette autre recette ?");
    if (!ok) return;

    const res = await fetch(apiUrl(`/api/other-receipts/${id}`), {
      method: "DELETE",
    });

    if (!res.ok) return;

    await load();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectAllAcrossResults || (items.length > 0 && selectedIds.length === items.length)) {
      setSelectedIds([]);
      setSelectAllAcrossResults(false);
    } else {
      setSelectedIds(items.map((r) => r.id));
    }
  }

  async function deleteSelected() {
    if (selectedIds.length === 0 && !selectAllAcrossResults) return;

    const ok = window.confirm(
      selectAllAcrossResults
        ? `🚨 ATTENTION : Vous allez supprimer TOUTES les autres recettes (${total}) qui correspondent aux filtres actuels. Continuer ?`
        : `Supprimer les ${selectedIds.length} ligne(s) sélectionnée(s) ?`
    );
    if (!ok) return;

    setBulkDeleting(true);
    try {
      const res = await fetch(apiUrl("/api/other-receipts/bulk"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectAllAcrossResults ? undefined : selectedIds,
          deleteAll: selectAllAcrossResults,
          year,
          month: monthFilter > 0 ? monthFilter : undefined,
          search: searchQuery,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
      } else {
        setSelectedIds([]);
        setSelectAllAcrossResults(false);
        await load();
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de connexion au serveur");
    } finally {
      setBulkDeleting(false);
    }
  }

  async function importOtherReceipts() {
    if (!importFile) return;

    const startedAt = Date.now();
    setImportBusy(true);
    setImportStartedAt(startedAt);
    setImportProgress(0);
    setImportTotal(0);
    setImportPercent(0);
    setImportStep("Lecture du fichier...");
    setImportResult(null);

    try {
      const text = await importFile.text();
      setImportStep("Analyse du contenu CSV...");
      const lines = text.split(/\r?\n/).filter(Boolean);

      const rows = lines.slice(1).map((line) => {
        // Robust CSV splitting: split by comma but preserve spaces and handle quotes
        // We look for commas that are NOT inside double quotes
        const parts: string[] = [];
        let current = "";
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        parts.push(current.trim());

        return {
          type: parts[0] ?? "",
          description: parts[1] ?? "",
          amount: Number(parts[2]),
          method: parts[3] ?? "",
          date: parts[4] ?? "",
          bankName: parts[5] ?? "",
          bankRef: parts[6] ?? "",
          note: parts[7] ?? "",
        };
      });

      setImportTotal(rows.length);
      setImportStep(`Initialisation du job pour ${rows.length} lignes...`);

      const controller = new AbortController();
      const signal = controller.signal;
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const start = await fetch(apiUrl("/api/import/other-receipts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          totalRows: rows.length,
        }),
        signal,
      });

      clearTimeout(timeoutId);

      if (!start.ok) {
        const errData = await start.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur (${start.status})`);
      }

      const startData = await start.json();
      const jobId = startData.jobId;
      const batchSize = 10; // Reduced for better real-time visibility
      let processed = 0;
      let imported = 0;
      const errors: { row: number; error: string }[] = [];

      while (processed < rows.length) {
        const batch = rows.slice(processed, processed + batchSize);
        const nextBatchEnd = Math.min(processed + batchSize, rows.length);
        
        setImportStep(`Envoi des lignes ${processed + 1} à ${nextBatchEnd}...`);

        const bController = new AbortController();
        const bTimeoutId = setTimeout(() => bController.abort(), 45000); // 45s for batches

        const res = await fetch(apiUrl("/api/import/other-receipts"), {
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
          signal: bController.signal,
        });

        clearTimeout(bTimeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(`Erreur lors du traitement du lot : ${errData.error || res.statusText}`);
        }

        const data = await res.json().catch(() => null);
        imported += Number(data?.imported ?? 0);

        if (Array.isArray(data?.errors)) {
          errors.push(...data.errors);
        }

        processed += batch.length;
        setImportProgress(processed);
        setImportPercent(Math.round((processed / rows.length) * 100));
      }

      setImportStep("Synchronisation finale...");
      await load();
      setImportStep("Terminé !");

      setImportResult({
        imported,
        errors,
        durationMs: Date.now() - startedAt,
      });

    } catch (error: any) {
      console.error("Import failed:", error);
      alert(`L'importation a échoué : ${error.name === 'AbortError' ? 'Le serveur a mis trop de temps à répondre (Timeout)' : error.message}`);
      setImportResult({
        imported: 0,
        errors: [{ row: 0, error: error.message }],
        durationMs: Date.now() - startedAt,
      });
    } finally {
      setImportFile(null);
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 bg-zinc-50/50 p-6 rounded-[32px] border border-white xl:flex-row xl:items-center xl:justify-between mb-2 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Upload className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
              Gestion des autres recettes
            </span>
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() =>{ setImportOpen(true); setImportFile(null); setImportResult(null); setImportProgress(0); setImportTotal(0); setImportPercent(0); }} 
              className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 active:scale-95"
            >
              <Upload className="h-4 w-4" /> Importer
            </button>

            <button
              onClick={() =>{ setEditing(null); setOpen(true); }} 
              className="flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" /> Ajouter
            </button>
          </div>
        ) : null}
      </div>

      {/* Bulk Action Bar */}
      {canEdit && (selectedIds.length > 0 || selectAllAcrossResults) && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-zinc-900">
                {selectAllAcrossResults ? total : selectedIds.length} encaissement(s) sélectionné(s)
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-tight">Actions groupées disponibles</span>
            </div>

            {!selectAllAcrossResults && total > selectedIds.length && (
              <button
                onClick={() => setSelectAllAcrossResults(true)}
                className="rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100"
              >
                Sélectionner toute la base ({total})
              </button>
            )}
            {selectAllAcrossResults && (
              <button
                onClick={() => setSelectAllAcrossResults(false)}
                className="rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-bold text-zinc-600 transition hover:bg-zinc-200"
              >
                Revenir à la page courante
              </button>
            )}
          </div>

          <button
            onClick={deleteSelected}
            disabled={bulkDeleting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
          >
            {bulkDeleting ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Suppression...
              </>
            ) : (
              "Supprimer la sélection"
            )}
          </button>
        </div>
      )}

      {bulkDeleting && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 animate-pulse">
           <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
           <span>Suppression en cours dans toute la base, merci de patienter...</span>
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <Table className="text-sm">
            <THead>
              <TR className="border-b border-zinc-200 bg-zinc-50">
                {canEdit && (
                  <TH className="w-12 px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectAllAcrossResults || (items.length > 0 && selectedIds.length === items.length)}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </TH>
                )}
                <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  N°
                </TH>
                <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Date
                </TH>
                <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Type
                </TH>
                <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  <div className="flex flex-col gap-2">
                    <span>Description</span>
                    <input
                      type="text"
                      placeholder="Filtrer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-7 w-full rounded-md border-zinc-200 bg-white px-2 text-[10px] font-normal normal-case tracking-normal shadow-sm transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                      onClick={(e) => e.stopPropagation()} // Prevent sort trigger if any
                    />
                  </div>
                </TH>
                <TH className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Méthode
                </TH>
                <TH className="text-right text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Montant
                </TH>
                <TH className="w-24 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  Actions
                </TH>
              </TR>
            </THead>

            <tbody>
              {items.map((r) => (
                <TR key={r.id} className={`group border-b border-zinc-100 transition hover:bg-zinc-50 ${selectedIds.includes(r.id) ? 'bg-indigo-50/50' : ''}`}>
                  {canEdit && (
                    <TD className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectAllAcrossResults || selectedIds.includes(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </TD>
                  )}
                  <TD className="font-semibold text-zinc-900">{r.receiptNumber}</TD>
                  <TD className="text-zinc-600">{formatDate(r.date)}</TD>
                  <TD>
                    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      r.type === "RENT" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {r.type === "RENT" ? "Loyer" : "Autre"}
                    </span>
                  </TD>
                  <TD className="font-medium text-zinc-900">{r.description}</TD>
                  <TD>
                    {r.method === "CASH" && (
                      <span className="inline-flex gap-3 items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        💵 Espèces
                      </span>
                    )}
                    {r.method === "TRANSFER" && (
                      <span className="inline-flex gap-3 items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        🏦 Virement
                      </span>
                    )}
                    {r.method === "CHECK" && (
                      <span className="inline-flex gap-3 items-center rounded-md bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        🧾 Chèque
                      </span>
                    )}
                  </TD>
                  <TD className="text-right font-semibold text-zinc-900">
                    {Number(r.amount).toLocaleString("fr-FR")} MAD
                  </TD>
                  <TD className="text-right">
                    {canEdit ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditing(r);
                          setOpen(true);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-blue-50 hover:text-blue-600"
                        title="Modifier"
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
                        onClick={() => remove(r.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
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
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Lecture seule</span>
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Previous
        </button>

        <span>
          Page {page} / {totalPages}
        </span>

        <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>

      {canEdit ? <OtherReceiptModal
        open={open}
        receipt={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSaved={load}
      /> : null}

      {canEdit ? <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportFile(null);
        }}
        title="Importer des autres recettes (CSV)"
      >
        <div className="space-y-4">
          <div className="text-sm text-zinc-600">
            CSV attendu : <b>type, description, amount, method, date, bankName, bankRef, note</b>
          </div>

          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          {importBusy && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-cyan-700 animate-pulse">
                <span>{importStep}</span>
                <span>
                  {importProgress} / {importTotal}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-md bg-zinc-200">
                <div
                  className="h-3 bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${importPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-zinc-500">
                <span>{importPercent}%</span>
                <span>
                  Temps ecoule : {fmtElapsed(importElapsedMs)}
                </span>
              </div>
            </div>
          )}

          <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
            type,description,amount,method,date,bankName,bankRef,note
            <br />
            OTHER,Location salle commune,900,CASH,2026-03-01,,,&quot;Paiement comptant&quot;
            <br />
            RENT,Loyer local,2500,TRANSFER,2026-03-02,BMCE,VIR-123,Loyer mars
          </div>

          <button onClick={importOtherReceipts}
            disabled={!importFile || importBusy}
            className="flex items-center justify-center gap-2 h-12 w-full rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40"
          >
            {importBusy ? "Import en cours..." : "Lancer l'importation"}
          </button>

          {importResult ? (
            <div className="grid gap-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex gap-3 items-center gap-1 rounded-md bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  {importResult.imported} importe{importResult.imported > 1 ? "s" : ""}
                </span>

                <span
                  className={`inline-flex gap-3 items-center gap-1 rounded-md px-3 py-1 text-sm font-medium ${
                    importResult.errors.length > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {importResult.errors.length} erreur{importResult.errors.length > 1 ? "s" : ""}
                </span>

                <span className="inline-flex gap-3 items-center gap-1 rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  Temps : {fmtElapsed(importResult.durationMs)}
                </span>
              </div>

              {importResult.errors.length > 0 ? (
                <div className="rounded-md border border-zinc-200 bg-white p-3">
                  <div className="mb-2 text-sm font-medium text-zinc-900">
                    Detail des erreurs
                  </div>
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
      </Modal> : null}
    </div>
  );
}
