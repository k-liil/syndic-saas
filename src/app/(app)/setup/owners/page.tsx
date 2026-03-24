"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { Pencil, Trash2 } from "lucide-react";
import { canManage } from "@/lib/roles";
import { useApiUrl } from "@/lib/org-context";

type Unit = {
  id: string;
  lotNumber: string;
  reference: string;
  building: { id: string; name: string } | null;
};

type Owner = {
  id: string;
  firstName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  cin: string | null;
  notes: string | null;
  contributionStartAt?: string | null;

  units: {
    id: string;
    lotNumber: string;
    reference: string;
    type: "APARTMENT" | "GARAGE" | "COMMERCIAL";
    buildingName: string | null;
  }[];

  primaryBuildingName: string | null;
  primaryUnitRef: string | null;
};

export default function OwnersPage() {
  const { data: session } = useSession();
  const canEdit = canManage((session?.user as any)?.role);
  function fmtElapsed(ms: number) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<Owner[]>([]);
  const [openForm, setOpenForm] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [name, setName] = useState("");
  const [cin, setCin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [useOrganizationContributionStart, setUseOrganizationContributionStart] = useState(true);
  const [contributionStartMonth, setContributionStartMonth] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState<string>("");

  const [openImport, setOpenImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: { row: number; error: string }[];
    durationMs: number;
  } | null>(null);
  const [importError, setImportError] = useState<string>("");

  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importPercent, setImportPercent] = useState(0);
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);

  // dropdown filtre bâtiment (multi)
  const [buildingMenuOpen, setBuildingMenuOpen] = useState(false);
  const [buildingSelected, setBuildingSelected] = useState<Record<string, boolean>>({});

  const canSubmit = useMemo(() => {
    return name.trim().length > 0;
  }, [name]);

  const apiUrl = useApiUrl();

  async function load() {
    const res = await fetch(apiUrl("/api/owners"), { cache: "no-store" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error("GET /api/owners failed", res.status, data);
      setItems([]);
      return;
    }

    setItems(Array.isArray(data) ? data : []);
  }

  function openCreate() {
    setUnitId("");
    setEditingId(null);
    setFirstName("");
    setName("");
    setCin("");
    setEmail("");
    setPhone("");
    setNotes("");
    setUseOrganizationContributionStart(true);
    setContributionStartMonth("");
    setErrorMsg("");
    setOpenForm(true);
  }

  function openEdit(o: Owner) {
    setEditingId(o.id);
    setFirstName(o.firstName ?? "");
    setName(o.name ?? "");
    setCin(o.cin ?? "");
    setEmail(o.email ?? "");
    setPhone(o.phone ?? "");
    setNotes(o.notes ?? "");
    const contributionMonth = o.contributionStartAt?.slice(0, 7) ?? "";
    setUseOrganizationContributionStart(!contributionMonth);
    setContributionStartMonth(contributionMonth);
    setErrorMsg("");
    setOpenForm(true);

    const primary = o.units?.find((u: any) => u.type === "APARTMENT") ?? o.units?.[0] ?? null;
    setUnitId(primary?.id ?? "");
  }

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setErrorMsg("");

    try {
      const payload = {
        unitId: unitId || undefined,
        lotNumber: unitId || undefined,
        name: name.trim(),
        firstName: firstName.trim(),
        cin: cin.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        contributionStartMonth: useOrganizationContributionStart ? null : contributionStartMonth || null,
      };

      const res = await fetch(apiUrl("/api/owners"), {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Save failed");

      setOpenForm(false);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadUnits() {
    const res = await fetch(apiUrl("/api/units?type=APARTMENT"), { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setUnits(Array.isArray(data) ? data : []);
  }

  async function remove(id: string) {
    if (busy) return;
    if (!confirm("Supprimer ce copropriétaire ?")) return;

    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/owners"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Delete failed");

      await load();
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    loadUnits();
  }, [apiUrl]);

  const buildingOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of items) {
      if (o.primaryBuildingName) set.add(o.primaryBuildingName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [items]);

  const activeBuildingCount = useMemo(() => {
    return Object.values(buildingSelected).filter(Boolean).length;
  }, [buildingSelected]);

  const filteredItems = useMemo(() => {
    if (activeBuildingCount === 0) return items;
    return items.filter((o) => o.primaryBuildingName && buildingSelected[o.primaryBuildingName]);
  }, [items, buildingSelected, activeBuildingCount]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected]
  );

  const allChecked = useMemo(() => {
    return filteredItems.length > 0 && filteredItems.every((o) => selected[o.id]);
  }, [filteredItems, selected]);

  function toggleAll(v: boolean) {
    setSelected((prev) => {
      const next = { ...prev };
      if (v) filteredItems.forEach((o) => (next[o.id] = true));
      else filteredItems.forEach((o) => delete next[o.id]); // décocher seulement les visibles
      return next;
    });
  }

  async function removeSelected() {
    if (!canEdit || selectedIds.length === 0 || busy) return;
    if (!confirm(`Supprimer ${selectedIds.length} copropriétaire(s) ?`)) return;

    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/owners/bulk-delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Bulk delete failed");

      setSelected({});
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Bulk delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 -mx-4 -mt-6 mb-6 bg-[#FCFCFB]/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:-mt-8 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestion des Copropriétaires</h1>
            <p className="mt-1 text-sm text-slate-500">Gérez les copropriétaires et leurs lots.</p>
          </div>

          {canEdit ? (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpenImport(true);
                  setImportResult(null);
                  setImportError("");
                  setImportFile(null);
                  setImportProgress(0);
                  setImportTotal(0);
                  setImportPercent(0);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Importer
              </button>

              <button
                onClick={removeSelected}
                disabled={selectedIds.length === 0 || busy}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Supprimer ({selectedIds.length})
              </button>

              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600"
              >
                + Ajouter
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-auto">

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Table>
          <THead className="bg-slate-50">
            <TR>
              <TH className="w-10">
                {canEdit ? <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} /> : null}
              </TH>

              <TH>Prénom</TH>
              <TH>Nom</TH>

              <TH className="relative">
                <button
                  type="button"
                  onClick={() => setBuildingMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-2"
                  title="Filtrer par bâtiment"
                >
                  Bâtiment
                  <span className="text-xs text-slate-400">{activeBuildingCount > 0 ? `(${activeBuildingCount})` : ""}</span>
                </button>

                {buildingMenuOpen ? (
                  <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="px-2 py-1 text-xs font-medium text-slate-500">Filtrer</div>

                    <button
                      type="button"
                      onClick={() => setBuildingSelected({})}
                      className="w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-50"
                    >
                      Tout afficher
                    </button>

                    <div className="my-2 h-px bg-slate-100" />

                    <div className="max-h-56 overflow-auto">
                      {buildingOptions.map((b) => (
                        <label
                          key={b}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-zinc-50"
                        >
                          <input
                            type="checkbox"
                            checked={!!buildingSelected[b]}
                            onChange={(e) => setBuildingSelected((prev) => ({ ...prev, [b]: e.target.checked }))}
                          />
                          <span className="truncate">{b}</span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setBuildingMenuOpen(false)}
                        className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                ) : null}
              </TH>

              <TH>Lot</TH>
              <TH>Contact</TH>
              <TH>CIN</TH>
              <TH>Note</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>

          <tbody>
            {filteredItems.length === 0 ? (
              <TR>
                <TD className="w-10" />
                <TD className="text-zinc-500">Aucun copropriétaire.</TD>
                <TD />
                <TD />
                <TD />
                <TD />
                <TD />
                <TD />
                <TD />
              </TR>
            ) : (
              filteredItems.map((o) => (
                <TR key={o.id}>
                  <TD className="w-10">
                    {canEdit ? (
                      <input
                        type="checkbox"
                        checked={!!selected[o.id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [o.id]: e.target.checked }))}
                      />
                    ) : null}
                  </TD>

                  <TD className="text-zinc-700">{o.firstName || "—"}</TD>
                  <TD className="font-medium text-zinc-900">{o.name}</TD>

                  <TD className="text-sm text-zinc-800">{o.primaryBuildingName ?? "—"}</TD>

                  <TD className="text-zinc-700">
                    {o.units?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {o.units.slice(0, 2).map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs"
                            title={`${u.type} • Ref: ${u.reference}`}
                          >
                            {u.lotNumber}

                            <span
                              className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                u.type === "APARTMENT"
                                  ? "bg-blue-100 text-blue-700"
                                  : u.type === "GARAGE"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {u.type === "APARTMENT" ? "Apt" : u.type === "GARAGE" ? "Garage" : "Other"}
                            </span>
                          </span>
                        ))}

                        {o.units.length > 2 ? (
                          <span className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                            +{o.units.length - 2}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </TD>

                  <TD className="text-zinc-700">
                    <div className="text-sm">{o.email ?? "—"}</div>
                    <div className="text-xs text-zinc-500">{o.phone ?? ""}</div>
                  </TD>

                  <TD className="text-zinc-700">{o.cin || "—"}</TD>
                  <TD className="text-xs text-zinc-500 max-w-[150px] truncate" title={o.notes ?? ""}>{o.notes || "—"}</TD>

                  <TD>
                    {canEdit ? <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(o)}
                        title="Éditer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(o.id)}
                        title="Supprimer"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div> : <div className="text-right text-xs text-zinc-500">Lecture seule</div>}
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>
      </div>

      {canEdit ? <Modal open={openImport} onClose={() => setOpenImport(false)} title="Importer des copropriétaires (CSV)" zIndex={50}>
        <div className="grid gap-4">
          <div className="text-sm text-zinc-600">
            CSV attendu : <b>cin</b>, <b>name</b>, <b>lotNumber</b>, <b>email</b> (optionnel), <b>phone</b> (optionnel)

            <div className="mt-1 text-xs text-zinc-500">
              <b>lotNumber</b> = numéro unique du lot (ex: A1)
            </div>
          </div>

          <input
            id="importOwnersFile"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          <pre className="rounded-xl bg-zinc-50 p-3 text-xs overflow-auto">
            cin,name,lotNumber,email,phone
            {"\n"}AA123,John Doe,A1,john@x.com,0600000000
            {"\n"}BB456,Jane Doe,B10,,
          </pre>

          <button
            disabled={!importFile || importBusy}
            onClick={async () => {
              if (!importFile || importBusy) return;

              setImportBusy(true);
              setImportResult(null);
              setImportError("");

              try {
                const startedAt = Date.now();
                setImportStartedAt(startedAt);
                const text = await importFile.text();
                const lines = text.split(/\r?\n/).filter(Boolean);

                const rows = lines.slice(1).map((l) => {
                  const c = l.split(",");
                  return {
                    cin: c[0],
                    name: c[1],
                    lotNumber: c[2],
                    email: c[3] || null,
                    phone: c[4] || null,
                  };
                });

                setImportTotal(rows.length);
                const start = await fetch(apiUrl("/api/import/owners"), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "start",
                    totalRows: rows.length,
                  }),
                });

                const startData = await start.json();
                const jobId = startData.jobId;

                const batchSize = 50;
                let processed = 0;
                let imported = 0;
                const errors: any[] = [];

                while (processed < rows.length) {
                  const batch = rows.slice(processed, processed + batchSize);

                  const res = await fetch(apiUrl("/api/import/owners"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "batch",
                      jobId,
                      rows: batch,
                      offset: processed,
                      isLastBatch: processed + batchSize >= rows.length,
                    }),
                  });

                  const data = await res.json();

                  imported += data.imported ?? 0;
                  errors.push(...(data.errors ?? []));

                  processed += batch.length;
                  setImportProgress(processed);
                  setImportPercent(rows.length > 0 ? Math.round((processed / rows.length) * 100) : 0);
                }

                setImportResult({
                  imported,
                  errors,
                  durationMs: Date.now() - startedAt,
                });

                await load();
              } catch (e: any) {
                setImportError(e?.message ?? "Import failed");
              } finally {
                setImportBusy(false);
                setImportStartedAt(null);
              }
            }}
            className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {importBusy ? "Import..." : "Importer"}
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

              <div className="flex justify-between text-xs text-zinc-500">
                <span>{importPercent}%</span>
                <span>
                  Temps ecoule : {fmtElapsed(importStartedAt ? Date.now() - importStartedAt : 0)}
                </span>
              </div>
            </div>
          ) : null}
          {importError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{importError}</div>
          ) : null}

          {importResult ? (
            <div className="grid gap-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                  ✓ {importResult.imported} importé{importResult.imported > 1 ? "s" : ""}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                    importResult.errors.length > 0 ? "bg-red-100 text-red-700" : "bg-zinc-200 text-zinc-600"
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
      </Modal> : null}

      {canEdit ? <Modal
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setEditingId(null);
          setErrorMsg("");
        }}
        title={editingId ? "Modifier un copropriétaire" : "Ajouter un copropriétaire"}
        zIndex={50}
      >
        <div className="grid gap-4">
          {errorMsg ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMsg}</div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-sm font-medium">Lot *</label>
            <select
              className="h-10 rounded-xl border border-zinc-200 px-3 bg-white"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">— Choisir un lot —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.lotNumber}
                </option>
              ))}
            </select>
            <div className="text-xs text-zinc-500">Le copropriétaire est lié automatiquement au lot via son numéro.</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Prénom</label>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                placeholder="Prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Nom *</label>
              <input
                className="h-10 rounded-xl border border-zinc-200 px-3"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">CIN (Optionnel)</label>
            <input
              className="h-10 rounded-xl border border-zinc-200 px-3"
              placeholder="CIN"
              value={cin}
              onChange={(e) => setCin(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Email</label>
            <input
              className="h-10 rounded-xl border border-zinc-200 px-3"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Téléphone</label>
            <input
              className="h-10 rounded-xl border border-zinc-200 px-3"
              placeholder="Téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Note / Infos complémentaires</label>
            <textarea
              className="min-h-[80px] rounded-xl border border-zinc-200 p-3"
              placeholder="Notes, Tel 2, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-medium">Mois d'entree cotisation</label>
                <div className="mt-1 text-xs text-zinc-500">
                  Si ce champ reste sur le parametrage organisation, le calcul reprend le mois de depart defini dans les parametres.
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={useOrganizationContributionStart}
                  onChange={(e) => setUseOrganizationContributionStart(e.target.checked)}
                />
                Parametrage organisation
              </label>
            </div>

            <input
              type="month"
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 disabled:bg-zinc-100 disabled:text-zinc-400"
              value={contributionStartMonth}
              onChange={(e) => setContributionStartMonth(e.target.value)}
              disabled={useOrganizationContributionStart}
            />
          </div>
          <button
            onClick={submit}
            disabled={!canSubmit || busy}
            className="mt-2 h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {busy ? "Enregistrement..." : editingId ? "Enregistrer" : "Créer le copropriétaire"}
          </button>
        </div>
      </Modal> : null}
      </div>
    </div>
  );
}
