"use client";

import { togglePrismaLogging } from "./actions";
import { useState } from "react";

export function MaintenanceContent({ initialLogging }: { initialLogging: boolean }) {
  const [enabled, setEnabled] = useState(initialLogging);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);

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
