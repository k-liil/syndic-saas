"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { OtherReceiptModal } from "./OtherReceiptModal";
import { Modal } from "@/components/ui/Modal";
import { canManage } from "@/lib/roles";
import { useApiUrl } from "@/lib/org-context";

type Method = "CASH" | "TRANSFER" | "CHECK";
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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

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
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);
  const [importElapsedMs, setImportElapsedMs] = useState(0);
  const [importResult, setImportResult] = useState<null | {
    imported: number;
    errors: { row: number; error: string }[];
    durationMs: number;
  }>(null);

  async function load() {
    if (!year) return;

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      type: "OTHER",
      year,
    });

    if (monthFilter > 0) {
      params.append("month", String(monthFilter));
    }

    const res = await fetch(apiUrl(`/api/other-receipts?${params.toString()}`), {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    setItems(Array.isArray(data?.items) ? data.items : []);
    setTotalPages(Number(data?.pagination?.totalPages ?? 1));
  }

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

  async function importOtherReceipts() {
    if (!importFile) return;

    const startedAt = Date.now();
    setImportBusy(true);
    setImportStartedAt(startedAt);
    setImportProgress(0);
    setImportTotal(0);
    setImportPercent(0);
    setImportResult(null);

    const text = await importFile.text();
    const lines = text.split(/\r?\n/).filter(Boolean);

    const rows = lines.slice(1).map((line) => {
      const c = line.split(",");
      return {
        type: c[0],
        description: c[1],
        amount: Number(c[2]),
        method: c[3],
        date: c[4],
        bankName: c[5] ?? "",
        bankRef: c[6] ?? "",
        note: c[7] ?? "",
      };
    });

    setImportTotal(rows.length);

    const start = await fetch(apiUrl("/api/import/other-receipts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        totalRows: rows.length,
      }),
    });

    const startData = await start.json();
    const jobId = startData.jobId;
    const batchSize = 100;
    let processed = 0;
    let imported = 0;
    const errors: { row: number; error: string }[] = [];

    while (processed < rows.length) {
      const batch = rows.slice(processed, processed + batchSize);

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
      });

      const data = await res.json().catch(() => null);

      imported += Number(data?.imported ?? 0);

      if (Array.isArray(data?.errors)) {
        errors.push(...data.errors);
      }

      processed += batch.length;
      setImportProgress(processed);
      setImportPercent(Math.round((processed / rows.length) * 100));
    }

    await load();

    setImportResult({
      imported,
      errors,
      durationMs: Date.now() - startedAt,
    });

    setImportFile(null);
    setImportBusy(false);
    setImportStartedAt(null);
    setImportElapsedMs(0);
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
      {canEdit ? (
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setImportOpen(true);
            setImportFile(null);
            setImportResult(null);
            setImportProgress(0);
            setImportTotal(0);
            setImportPercent(0);
          }}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700"
        >
          Importer
        </button>

        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="btn-brand rounded-xl px-4 py-2"
        >
          + Ajouter
        </button>
      </div>
      ) : null}

      <Table>
        <THead>
          <TR>
            <TH>N°</TH>
            <TH>Date</TH>
            <TH>Type</TH>
            <TH>Description</TH>
            <TH>Methode</TH>
            <TH className="text-right">Montant</TH>
            <TH></TH>
          </TR>
        </THead>

        <tbody>
          {items.map((r) => (
            <TR key={r.id}>
              <TD>{r.receiptNumber}</TD>
              <TD>{fmtDate(r.date)}</TD>
              <TD>{r.type}</TD>
              <TD>{r.description}</TD>
              <TD>{r.method}</TD>
              <TD className="text-right">
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
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-zinc-50"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Supprimer
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
              <div className="flex justify-between text-sm text-zinc-700">
                <span>Import en cours</span>
                <span>
                  {importProgress} / {importTotal}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
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
            </div>
          )}

          <div className="rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-600">
            type,description,amount,method,date,bankName,bankRef,note
            <br />
            OTHER,Location salle commune,900,CASH,2026-03-01,,,&quot;Paiement comptant&quot;
            <br />
            RENT,Loyer local,2500,TRANSFER,2026-03-02,BMCE,VIR-123,Loyer mars
          </div>

          <button
            onClick={importOtherReceipts}
            disabled={!importFile || importBusy}
            className="h-12 w-full rounded-2xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-50"
          >
            {importBusy ? "Import en cours..." : "Importer"}
          </button>

          {importResult ? (
            <div className="grid gap-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  {importResult.imported} importe{importResult.imported > 1 ? "s" : ""}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                    importResult.errors.length > 0
                      ? "bg-red-100 text-red-700"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {importResult.errors.length} erreur{importResult.errors.length > 1 ? "s" : ""}
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  Temps : {fmtElapsed(importResult.durationMs)}
                </span>
              </div>

              {importResult.errors.length > 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-3">
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
