"use client";

import { useState, useEffect } from "react";
import { Search, Landmark, LayoutGrid, RefreshCcw, Trash2, AlertCircle, Calendar } from "lucide-react";
import { searchUnitsInOrg } from "../maintenance/actions";
import { getUnitAuditData, deleteReceiptAndReallocate, forceRecalculateUnit } from "./actions";
import { useOrganization } from "@/lib/org-context";

export function AllocationAuditContent() {
  const { org } = useOrganization();
  const orgId = org?.id;
  
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  // Search Units Logic
  useEffect(() => {
    if (search.length < 2 || !orgId) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUnitsInOrg(orgId, search);
        setSearchResults(results);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, orgId]);

  const fetchAudit = async (unitId: string) => {
    if (!orgId) return;
    setLoadingAudit(true);
    try {
      const res = await getUnitAuditData(orgId, unitId);
      if (res.ok) {
        setAuditData(res.data);
      } else {
        alert("Erreur audit: " + res.error);
      }
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleSelectUnit = (unit: any) => {
    setSelectedUnit(unit);
    setSearch("");
    setSearchResults([]);
    fetchAudit(unit.id);
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet encaissement ? Toutes ses allocations seront perdues et le lot sera recalculé.")) return;
    setProcessing(true);
    try {
      const res = await deleteReceiptAndReallocate(receiptId);
      if (res.ok) {
        fetchAudit(selectedUnit.id);
      } else {
        alert("Erreur: " + res.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleForceRecalculate = async () => {
    if (!orgId || !selectedUnit) return;
    if (!confirm("Relancer le moteur FIFO pour ce lot ?")) return;
    setProcessing(true);
    try {
      const res = await forceRecalculateUnit(selectedUnit.id, orgId);
      if (res.ok) {
        fetchAudit(selectedUnit.id);
        alert("Recalcul terminé !");
      } else {
        alert("Erreur: " + res.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-md space-y-2">
          <label className="text-sm font-semibold text-slate-700">Rechercher un lot</label>
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Lot A1, B2..."
                disabled={!orgId}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition-all disabled:opacity-50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searching && (
                <div className="absolute right-3 h-4 w-4 animate-spin rounded-md border-2 border-slate-200 border-t-indigo-500" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl ring-1 ring-black/5 max-h-64 overflow-auto">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUnit(u)}
                    className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 tracking-tight">Lot {u.lotNumber}</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Landmark className="h-3 w-3" />
                        {u.buildingName}
                      </span>
                    </div>
                    <LayoutGrid className="h-4 w-4 text-slate-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {loadingAudit && (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <RefreshCcw className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Analyse des flux financiers en cours...</p>
        </div>
      )}

      {selectedUnit && auditData && !loadingAudit && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <LayoutGrid className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lot {selectedUnit.lotNumber}</h2>
                <p className="text-sm text-slate-500">{selectedUnit.buildingName}</p>
              </div>
            </div>
            <button
              onClick={handleForceRecalculate}
              disabled={processing}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${processing ? 'animate-spin' : ''}`} />
              Forcer le Recalcul FIFO
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800">Flux des Dettes Mensuelles</h3>
              </div>
              <div className="p-0 overflow-auto max-h-[600px]">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-slate-600">Période</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Dû</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Réglé</th>
                      <th className="px-5 py-3 font-semibold text-slate-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {auditData.dues.map((due: any) => (
                      <tr key={due.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">{formatDate(due.period)}</td>
                        <td className="px-5 py-4 text-slate-600">{due.amountDue} DH</td>
                        <td className="px-5 py-4 font-bold text-indigo-600">{due.paidAmount} DH</td>
                        <td className="px-5 py-4">
                          {due.status === "PAID" ? (
                            <span className="inline-flex gap-3 items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 uppercase">
                              Réglé
                            </span>
                          ) : due.status === "PARTIAL" ? (
                            <span className="inline-flex gap-3 items-center rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 uppercase">
                              Partiel
                            </span>
                          ) : (
                            <span className="inline-flex gap-3 items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase">
                              Impayé
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-800">Audit des Reçus & Allocations</h3>
              </div>
              <div className="p-4 space-y-4 overflow-auto max-h-[600px] bg-slate-50/30">
                {auditData.receipts.map((r: any) => {
                  const allocations = auditData.allocations.filter((a: any) => a.receiptId === r.id);
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-indigo-200 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <span className="text-indigo-600 font-bold text-sm">#{r.receiptNumber}</span>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">{new Date(r.date).toLocaleDateString()}</p>
                            <p className="text-sm font-bold text-slate-900">{r.amount} DH</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteReceipt(r.id)}
                          disabled={processing}
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-50 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Allocations FIFO</p>
                        {allocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {allocations.map((a: any) => (
                              <div key={a.id} className="inline-flex gap-3 items-center rounded-md bg-indigo-50/50 border border-indigo-100 px-2 py-1 text-[10px] font-medium text-indigo-700">
                                {formatDate(auditData.dues.find((d: any) => d.id === a.dueId)?.period)} : <strong>{a.amount} DH</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Aucune allocation active</p>
                        )}
                        {r.unallocatedAmount > 0 && (
                          <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
                            AVANCE : {r.unallocatedAmount} DH
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {auditData.receipts.length === 0 && (
                  <div className="text-center py-20 flex flex-col items-center">
                    <AlertCircle className="h-10 w-10 text-slate-200 mb-4" />
                    <p className="text-sm text-slate-400 italic">Aucun reçu de contribution trouvé pour ce lot.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!selectedUnit && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-24 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Aucun lot sélectionné</h3>
          <p className="mt-1 text-xs text-slate-500">Choisissez un lot pour démarrer l'audit.</p>
        </div>
      )}
    </div>
  );
}
