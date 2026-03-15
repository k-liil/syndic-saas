"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import {
  parseUnitsCsv,
  type ImportUnitError,
  type ImportUnitRow,
} from "@/lib/imports/units-csv";

type Building = { id: string; name: string };

type LotType = "APARTMENT" | "GARAGE" | "OTHER";

type Unit = {
  id: string;
  lotNumber: string | null;
  reference: string;
  type: "APARTMENT" | "GARAGE" | "COMMERCIAL";
  building: Building | null;
  monthlyDueAmount: number | null;
};

type Owner = { id: string; name: string };

function TypeBadge({ type }: { type: Unit["type"] }) {
  const label =
    type === "APARTMENT"
      ? "Appartement"
      : type === "GARAGE"
      ? "Garage"
      : "Autre";

  const cls =
    type === "APARTMENT"
      ? "bg-blue-100 text-blue-700"
      : type === "GARAGE"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-zinc-200 text-zinc-700";

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

function formatMoneyMAD(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return `${v.toLocaleString("fr-FR")} MAD`;
}

function lotNumberSortValue(v: string | null) {
  if (!v) return Number.MAX_SAFE_INTEGER;
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export default function LotsPage() {
  const [lots, setLots] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);

  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importPercent, setImportPercent] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: ImportUnitError[];
  } | null>(null);
  const [importError, setImportError] = useState("");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const [lotNumber, setLotNumber] = useState("");
  const [reference, setReference] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [type, setType] = useState<LotType>("APARTMENT");
  const [ownerId, setOwnerId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [monthlyDueAmount, setMonthlyDueAmount] = useState<string>("");

  const [loading, setLoading] = useState(false);

  const lotNumberValue = useMemo(() => {
    const raw = lotNumber.trim();
    if (!raw) return NaN;
    const n = Number(raw);
    if (!Number.isInteger(n) || n <= 0) return NaN;
    return n;
  }, [lotNumber]);

  const lotNumberInvalid = useMemo(() => {
    return lotNumber.trim().length > 0 && Number.isNaN(lotNumberValue);
  }, [lotNumber, lotNumberValue]);

  const canCreate = useMemo(() => {
    if (Number.isNaN(lotNumberValue)) return false;
    if (type === "APARTMENT") return !!buildingId;
    return true;
  }, [lotNumberValue, buildingId, type]);

  const monthlyDueAmountNumber = useMemo(() => {
    const raw = monthlyDueAmount.trim();
    if (!raw) return null;
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return NaN;
    return Math.round(n);
  }, [monthlyDueAmount]);

  const monthlyDueAmountInvalid = useMemo(() => {
    return monthlyDueAmount.trim().length > 0 && Number.isNaN(monthlyDueAmountNumber);
  }, [monthlyDueAmount, monthlyDueAmountNumber]);

  async function loadAll() {
    const [uRes, bRes, oRes] = await Promise.all([
      fetch("/api/units", { cache: "no-store" }),
      fetch("/api/buildings", { cache: "no-store" }),
      fetch("/api/owners", { cache: "no-store" }),
    ]);

    const u = await uRes.json();
    const b = await bRes.json();
    const o = await oRes.json();

    const units = Array.isArray(u) ? u : [];
    units.sort((a: Unit, b: Unit) => {
      const aLot = lotNumberSortValue(a.lotNumber);
      const bLot = lotNumberSortValue(b.lotNumber);
      if (aLot !== bLot) return aLot - bLot;
      return (a.reference ?? "").localeCompare(b.reference ?? "", "fr");
    });

    setLots(units);
    setBuildings(Array.isArray(b) ? b : []);
    setOwners(Array.isArray(o) ? o : []);

    if (!buildingId && Array.isArray(b) && b.length > 0) {
      setBuildingId(b[0].id);
    }
  }

  async function createLot() {
    if (!canCreate || loading) return;
    if (monthlyDueAmountInvalid || lotNumberInvalid) return;

    setLoading(true);

    try {
      const apiType = type === "OTHER" ? "COMMERCIAL" : type;

      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotNumber: String(lotNumberValue),
          reference: reference.trim() || `Lot ${lotNumberValue}`,
          type: apiType,
          ...(type === "APARTMENT" ? { buildingId } : {}),
          monthlyDueAmount: monthlyDueAmountNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Lot create failed");

      setLotNumber("");
      setReference("");
      setSurface("");
      setType("APARTMENT");
      setOwnerId("");
      setMonthlyDueAmount("");
      setOpen(false);

      await loadAll();
    } catch (e: any) {
      alert(e?.message ?? "Lot create failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected]
  );

  const allChecked = useMemo(() => {
    return lots.length > 0 && lots.every((u) => selected[u.id]);
  }, [lots, selected]);

  function toggleAll(v: boolean) {
    const next: Record<string, boolean> = {};
    if (v) lots.forEach((u) => (next[u.id] = true));
    setSelected(next);
  }

  async function removeSelected() {
    if (selectedIds.length === 0 || bulkBusy) return;
    if (!confirm(`Supprimer ${selectedIds.length} lot(s) ?`)) return;

    setBulkBusy(true);
    try {
      const res = await fetch("/api/units/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Bulk delete failed");

      setSelected({});
      await loadAll();
    } catch (e: any) {
      alert(e?.message ?? "Bulk delete failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function runImportInBatches(rows: ImportUnitRow[]) {
    const startRes = await fetch("/api/import/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        totalRows: rows.length,
      }),
    });

    const startData = await startRes.json().catch(() => null);
    if (!startRes.ok) {
      throw new Error(startData?.error ?? "Impossible de créer le job d'import");
    }

    const jobId = startData.jobId as string;
    const batchSize = 25;
    const chunks = chunkArray(rows, batchSize);

    let importedTotal = 0;
    const allErrors: ImportUnitError[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const batch = chunks[i];

      const batchRes = await fetch("/api/import/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch",
          jobId,
          rows: batch,
          offset: i * batchSize,
          isLastBatch: i === chunks.length - 1,
        }),
      });

      const batchData = await batchRes.json().catch(() => null);

      if (!batchRes.ok) {
        throw new Error(batchData?.error ?? "Erreur pendant l'import d'un batch");
      }

      importedTotal += Number(batchData?.imported ?? 0);

      if (Array.isArray(batchData?.errors)) {
        allErrors.push(...batchData.errors);
      }

      const processed = Number(batchData?.processed ?? 0);
      const totalRows = Number(batchData?.totalRows ?? rows.length);

      setImportProgress(processed);
      setImportTotal(totalRows);
      setImportPercent(totalRows > 0 ? Math.round((processed / totalRows) * 100) : 0);
    }

    return {
      imported: importedTotal,
      errors: allErrors,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Gestion des Lots</h1>
          <p className="mt-1 text-sm text-zinc-500">Appartements, garages et autres lots.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={removeSelected}
            disabled={selectedIds.length === 0 || bulkBusy}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40"
          >
            Supprimer ({selectedIds.length})
          </button>

          <button
            onClick={() => {
              setOpenImport(true);
              setImportFile(null);
              setImportError("");
              setImportResult(null);
              setImportProgress(0);
              setImportTotal(0);
              setImportPercent(0);
            }}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Charger
          </button>

          <button
            onClick={() => {
              setOpen(true);
              setLotNumber("");
              setReference("");
              setMonthlyDueAmount("");
              if (!buildingId && buildings.length > 0) setBuildingId(buildings[0].id);
            }}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Ajouter un Lot
          </button>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH className="w-10">
              <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
            </TH>
            <TH>N° lot</TH>
            <TH>Libellé</TH>
            <TH>Type</TH>
            <TH>Cotisation</TH>
            <TH>Immeuble</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>

        <tbody>
          {lots.length === 0 ? (
            <TR>
              <TD />
              <TD className="text-zinc-500">Aucun lot.</TD>
              <TD />
              <TD />
              <TD />
              <TD />
              <TD />
            </TR>
          ) : (
            lots.map((l) => (
              <TR key={l.id}>
                <TD className="w-10">
                  <input
                    type="checkbox"
                    checked={!!selected[l.id]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [l.id]: e.target.checked }))}
                  />
                </TD>

                <TD className="font-medium text-zinc-900">{l.lotNumber ?? "—"}</TD>

                <TD className="text-zinc-700">{l.reference || "—"}</TD>

                <TD>
                  <TypeBadge type={l.type} />
                </TD>

                <TD className="text-zinc-700">{formatMoneyMAD(l.monthlyDueAmount)}</TD>

                <TD className="text-zinc-600">{l.building?.name ?? "—"}</TD>

                <TD>
                  <div className="flex justify-end gap-2">
                    <button className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50">
                      Éditer
                    </button>
                    <button className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs hover:bg-zinc-50">
                      Supprimer
                    </button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      <Modal open={open} onClose={() => setOpen(false)} title="Ajouter un Lot" zIndex={50}>
        {buildings.length === 0 ? (
          <div className="text-sm text-zinc-600">Aucun immeuble trouvé. Crée d’abord un immeuble dans “Immeubles”.</div>
        ) : (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-medium">N° lot *</label>
                <input
                  className="h-10 rounded-xl border border-zinc-200 px-3"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  inputMode="numeric"
                  placeholder="Ex: 12"
                />
                {lotNumberInvalid ? <div className="text-xs text-red-600">Numéro de lot invalide.</div> : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Surface (m²)</label>
                <input
                  className="h-10 rounded-xl border border-zinc-200 px-3"
                  placeholder="Optionnel"
                  value={surface}
                  onChange={(e) => setSurface(e.target.value)}
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Libellé</label>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: Appartement 12"
              />
              <div className="text-xs text-zinc-500">Optionnel. Si vide, le système utilisera automatiquement “Lot X”.</div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Cotisation mensuelle (MAD)</label>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                placeholder="Optionnel (ex: 250)"
                value={monthlyDueAmount}
                onChange={(e) => setMonthlyDueAmount(e.target.value)}
                inputMode="numeric"
              />
              {monthlyDueAmountInvalid ? (
                <div className="text-xs text-red-600">Montant invalide.</div>
              ) : (
                <div className="text-xs text-zinc-500">
                  Sert à générer les cotisations mensuelles du lot. Laisse vide si tu veux compléter plus tard.
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
                value={type}
                onChange={(e) => {
                  const next = e.target.value as LotType;
                  setType(next);
                  if (next !== "APARTMENT") setBuildingId("");
                  if (next === "APARTMENT" && !buildingId && buildings.length > 0) setBuildingId(buildings[0].id);
                }}
              >
                <option value="APARTMENT">Appartement</option>
                <option value="GARAGE">Garage</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            {type === "APARTMENT" ? (
              <div className="grid gap-2">
                <label className="text-sm font-medium">Immeuble *</label>
                <select
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                Pour un <b>{type === "GARAGE" ? "garage" : "autre lot"}</b>, aucun immeuble n’est requis.
              </div>
            )}

            <div className="grid gap-2">
              <label className="text-sm font-medium">Propriétaire</label>
              <select
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Sélectionner un propriétaire (optionnel)</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-zinc-500">
                Ce champ n’est toujours pas branché au backend. On le reliera plus tard via Ownership.
              </div>
            </div>

            <button
              onClick={createLot}
              disabled={!canCreate || loading || monthlyDueAmountInvalid || lotNumberInvalid}
              className="mt-2 h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              {loading ? "Création..." : "Ajouter un Lot"}
            </button>
          </div>
        )}
      </Modal>

      <Modal open={openImport} onClose={() => !importBusy && setOpenImport(false)} title="Charger des lots (CSV)" zIndex={50}>
        <div className="grid gap-4">
          <div className="text-sm text-zinc-600">
            CSV attendu : <b>lotNumber</b>, <b>reference</b>, <b>type</b> (APARTMENT|GARAGE|OTHER), <b>building</b>{" "}
            (obligatoire si APARTMENT), <b>monthlyDueAmount</b> (optionnel).
            <div className="mt-1 text-xs text-zinc-500">
              <b>lotNumber</b> = numéro unique du lot • <b>building</b> = nom exact de l’immeuble •{" "}
              <b>monthlyDueAmount</b> = montant mensuel (MAD)
            </div>
          </div>

          <input
            id="importUnitsFile"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          <pre className="overflow-auto rounded-xl bg-zinc-50 p-3 text-xs">
{`lotNumber,reference,type,building,monthlyDueAmount
12,Appartement 12,APARTMENT,Immeuble 1,250
101,Garage 101,GARAGE,,0
900,Local technique,OTHER,,0`}
          </pre>

          <button
            disabled={!importFile || importBusy}
            onClick={async () => {
              if (!importFile || importBusy) return;

              setImportBusy(true);
              setImportError("");
              setImportResult(null);
              setImportProgress(0);
              setImportTotal(0);
              setImportPercent(0);

              try {
                const text = await importFile.text();
                const parsed = parseUnitsCsv(text);

                if (parsed.rows.length === 0) {
                  setImportResult({
                    imported: 0,
                    errors: parsed.errors.length ? parsed.errors : [{ row: 0, error: "Aucune ligne valide" }],
                  });
                  return;
                }

                setImportTotal(parsed.rows.length);

                const result = await runImportInBatches(parsed.rows);

                setImportResult({
                  imported: result.imported,
                  errors: [...parsed.errors, ...result.errors],
                });

                setImportFile(null);
                const input = document.getElementById("importUnitsFile") as HTMLInputElement | null;
                if (input) input.value = "";

                await loadAll();
              } catch (e: any) {
                setImportError(e?.message ?? "Import failed");
              } finally {
                setImportBusy(false);
              }
            }}
            className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {importBusy ? "Import en cours..." : "Charger"}
          </button>

          {(importBusy || importTotal > 0) ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-zinc-700">
                <span>Import en cours</span>
                <span>
                  {importProgress} / {importTotal}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-3 rounded-full bg-zinc-900 transition-all duration-300"
                  style={{ width: `${importPercent}%` }}
                />
              </div>

              <div className="text-xs text-zinc-500">{importPercent}%</div>
            </div>
          ) : null}

          {importError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{importError}</div>
          ) : null}

          {importResult ? (
            <div className="grid gap-2">
<div className="flex gap-2">
  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
    Importés : {importResult.imported}
  </span>

  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
      importResult.errors.length > 0
        ? "bg-red-100 text-red-700"
        : "bg-zinc-100 text-zinc-600"
    }`}
  >
    Erreurs : {importResult.errors.length}
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