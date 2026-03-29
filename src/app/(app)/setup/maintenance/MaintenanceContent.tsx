"use client";

import { togglePrismaLogging, searchUnitsInOrg, reallocateUnitsFIFO } from "./actions";
import { useState, useEffect } from "react";
import { Search, X, RefreshCcw, Landmark, LayoutGrid } from "lucide-react";
import { useOrgId } from "@/lib/org-context";

export function MaintenanceContent({ initialLogging }: { initialLogging: boolean }) {
  const [enabled, setEnabled] = useState(initialLogging);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  
  const orgId = useOrgId();
  
  // Per-unit Recalculation State
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

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

  const handleAddUnit = (unit: any) => {
    if (selectedUnits.find(u => u.id === unit.id)) return;
    setSelectedUnits([...selectedUnits, unit]);
    setSearch("");
    setSearchResults([]);
  };

  const handleRemoveUnit = (id: string) => {
    setSelectedUnits(selectedUnits.filter(u => u.id !== id));
  };

  const handleRecalculate = async () => {
    if (selectedUnits.length === 0) return;
    if (!confirm(`Voulez-vous vraiment recalculer le moteur FIFO pour ces ${selectedUnits.length} lot(s) ?`)) return;
    
    setRecalculating(true);
    try {
      const ids = selectedUnits.map(u => u.id);
      const res = await reallocateUnitsFIFO(ids);
      if (res.ok) {
        alert("Recalcul terminé avec succès !");
        setSelectedUnits([]);
      } else {
        alert("Erreur lors du recalcul : " + res.error);
      }
    } finally {
      setRecalculating(false);
    }
  };

  const handleToggle = async (val: boolean) => {
    setLoading(true);
    try {
      const res = await togglePrismaLogging(val);
      if (res.ok) {
        setEnabled(val);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-800">Logs de la base de données</h3>
        </div>
        <div className="p-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-slate-700">Logs de requêtes Prisma (SQL)</span>
              <p className="text-xs text-slate-500">
                Affiche les requêtes SQL en temps réel dans la console du serveur (Railway).
              </p>
            </div>
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                disabled={loading}
                onChange={(e) => handleToggle(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
            </div>
          </label>
          
          {loading && (
            <p className="mt-2 text-[10px] text-sky-600 font-medium animate-pulse">
              Mise à jour en cours...
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-amber-100 bg-amber-50/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-900">Intégrité des Données</h3>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Avancé
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 max-w-[70%]">
              <span className="text-sm font-medium text-slate-700">Synchroniser les soldes (Recalculer)</span>
              <p className="text-xs text-slate-500">
                Recalcule le montant payé de chaque échéance à partir de l'historique des reçus. Utile pour corriger les "paiements fantômes".
              </p>
            </div>
            <button
              onClick={async () => {
                if (!confirm("Voulez-vous vraiment recalculer tous les soldes ? Cette opération peut durer plusieurs minutes.")) return;
                setRepairing(true);
                try {
                  const items = await import("./actions");
                  const res = await items.repairAllDues();
                  if (res.ok) {
                    alert("Les soldes ont été synchronisés avec succès !");
                  } else {
                    alert("Erreur : " + res.error);
                  }
                } finally {
                  setRepairing(false);
                }
              }}
              disabled={repairing}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {repairing ? "Réparation..." : "Réparer les soldes"}
            </button>
          </div>
          {repairing && (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 animate-pulse">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
              <span>Traitement de toute la base de données en cours... Veuillez ne pas fermer cette page.</span>
            </div>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-sky-200 bg-white shadow-sm">
        <div className="p-4 border-b border-sky-100 bg-sky-50/50 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-semibold text-sky-900">Recalcul Granulaire (FIFO)</h3>
          </div>
          <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
            Nouveau
          </span>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Sélectionner les lots à recalculer</span>
            <p className="text-xs text-slate-500">
              Recherchez des lots par numéro, copropriétaire ou copropriété pour forcer une réallocation FIFO.
            </p>
          </div>

          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: J1, Khalil, Jardins..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:border-sky-500 focus:bg-white focus:outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searching && (
                <div className="absolute right-3 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-black/5">
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleAddUnit(u)}
                    className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-sky-50 transition-colors group"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">Lot {u.lotNumber}</span>
                        {u.reference && (
                          <>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className="text-xs text-slate-600">{u.reference}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Landmark className="h-2.5 w-2.5" />
                        {u.buildingName}
                      </span>
                    </div>
                    <LayoutGrid className="h-3.5 w-3.5 text-slate-300 group-hover:text-sky-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedUnits.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedUnits.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 shadow-sm"
                >
                  <span className="font-bold">Lot {u.lotNumber}</span>
                  <button
                    onClick={() => handleRemoveUnit(u.id)}
                    className="hover:text-sky-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleRecalculate}
              disabled={recalculating || selectedUnits.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 transition-all active:scale-95"
            >
              {recalculating ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Recalcul en cours...</span>
                </>
              ) : (
                <>
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>Recalculer {selectedUnits.length > 0 ? `${selectedUnits.length} lot(s)` : "les lots"} sélectionné(s)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-indigo-900">Sauvegardes GitHub</h3>
          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
            Nouveau
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 max-w-[70%]">
              <span className="text-sm font-medium text-slate-700">Gérer les sauvegardes</span>
              <p className="text-xs text-slate-500">
                Consulter l'historique des fichiers stockés sur GitHub et déclencher une sauvegarde manuelle immédiate.
              </p>
            </div>
            <button
              onClick={() => (window.location.href = "/setup/maintenance/backup")}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all active:scale-95"
            >
              Ouvrir le tableau de bord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
