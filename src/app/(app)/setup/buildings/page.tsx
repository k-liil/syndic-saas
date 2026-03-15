"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TR, TH, TD } from "@/components/ui/table";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Pencil, Trash2 } from "lucide-react";

type Building = {
  id: string;
  name: string;
  address: string | null;
};
  type ImportError = { row: number; error: string };
  type ImportResult = { imported: number; errors: ImportError[] };

export default function BuildingsPage() {
  const [items, setItems] = useState<Building[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openImport, setOpenImport] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const [importFile, setImportFile] = useState<File | null>(null);


  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string>("");

  const [importBusy, setImportBusy] = useState(false);

  const [loading, setLoading] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function load() {
    const res = await fetch("/api/buildings", { cache: "no-store" });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
  }

  async function createBuilding() {
  if (!canCreate || loading) return;
  setLoading(true);

  try {
    const payload = { name: name.trim(), address: address.trim() || null };

    const res = await fetch("/api/buildings", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? (editingId ? "Update failed" : "Create failed"));

    setName("");
    setAddress("");
    setEditingId(null);
    setOpenAdd(false);
    await load();
  } finally {
    setLoading(false);
  }
}

  async function deleteBuilding(id: string) {
    if (loading) return;
    if (!confirm("Supprimer cet immeuble ?")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/buildings", {
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
      setLoading(false);
    }
  }

  function editBuilding(b: Building) {
  setEditingId(b.id);
  setName(b.name ?? "");
  setAddress(b.address ?? "");
  setOpenAdd(true);
}

  async function importBuildings() {
    if (!importFile || importBusy) return;
    setImportBusy(true);
    setImportResult(null);
    setImportError("");

    try {
      const fd = new FormData();
      fd.append("file", importFile);

      const res = await fetch("/api/import/buildings", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");

      // endpoint => { ok: true, imported, errors }
      setImportResult({
        imported: Number(data?.imported ?? 0),
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });

      setImportFile(null);
      const input = document.getElementById("importFile") as HTMLInputElement | null;
      if (input) input.value = "";

      await load();
    } catch (e: any) {
      setImportError(e?.message ?? "Import failed");
    } finally {
      setImportBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Gestion des Immeubles</h1>
          <p className="mt-1 text-sm text-zinc-500">Créer et gérer les immeubles.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpenImport(true)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Importer
          </button>

          <button
            onClick={() => setOpenAdd(true)}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            + Ajouter un immeuble
          </button>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Nom</TH>
            <TH>Adresse</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <tbody>
          {items.length === 0 ? (
            <TR>
              <TD className="text-zinc-500">Aucun immeuble.</TD>
              <TD />
              <TD />
            </TR>
          ) : (
            items.map((b) => (
              <TR key={b.id}>
                <TD className="font-medium text-zinc-900">{b.name}</TD>
                <TD className="text-zinc-600">{b.address ?? "—"}</TD>
                <TD>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => editBuilding(b)}
                      title="Éditer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteBuilding(b.id)}
                      title="Supprimer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </tbody>
      </Table>

      <Modal
        open={openAdd}
        onClose={() => {
          setOpenAdd(false);
          setEditingId(null);
          setName("");
          setAddress("");
        }}
        title={editingId ? "Modifier un immeuble" : "Ajouter un immeuble"}
        zIndex={50}
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nom</label>
            <input
              className="h-10 rounded-xl border border-zinc-200 px-3"
              placeholder="Nom de l’immeuble"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Adresse</label>
            <input
              className="h-10 rounded-xl border border-zinc-200 px-3"
              placeholder="Optionnel"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button
            onClick={createBuilding}
            disabled={!canCreate || loading}
            className="mt-2 h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {loading ? (editingId ? "Enregistrement..." : "Création...") : (editingId ? "Enregistrer" : "Créer")}
          </button>
        </div>
      </Modal>

      <Modal open={openImport} onClose={() => setOpenImport(false)} title="Importer des immeubles (CSV)" zIndex={50}>
        <div className="grid gap-4">
          <div className="text-sm text-zinc-600">
            CSV attendu : colonnes <b>name</b> (obligatoire) et <b>address</b> (optionnel)
          </div>

          <input
            id="importFile"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          <pre className="rounded-xl bg-zinc-50 p-3 text-xs overflow-auto">
name,address
Immeuble 1,Adresse test
Immeuble 2,
          </pre>

          <button
            onClick={importBuildings}
            disabled={!importFile || importBusy}
            className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {importBusy ? "Import..." : "Importer"}
          </button>

          {importError ? (
  <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
    <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
    <div>
      <div className="font-medium">Import échoué</div>
      <div className="mt-0.5">{importError}</div>
    </div>
  </div>
) : null}

    {importResult ? (
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
            <div>
              <div className="text-xs text-emerald-800/80">Importés</div>
              <div className="text-lg font-semibold text-emerald-900">{importResult.imported}</div>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 rounded-xl border p-3 ${
              importResult.errors.length > 0
                ? "border-amber-200 bg-amber-50"
                : "border-zinc-200 bg-zinc-50"
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${
                importResult.errors.length > 0 ? "text-amber-700" : "text-zinc-600"
              }`}
            />
            <div>
              <div className="text-xs text-zinc-600">Erreurs</div>
              <div className="text-lg font-semibold text-zinc-900">{importResult.errors.length}</div>
            </div>
          </div>
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