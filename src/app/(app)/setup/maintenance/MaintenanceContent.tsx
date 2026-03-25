"use client";

import { togglePrismaLogging } from "./actions";
import { useState } from "react";

export function MaintenanceContent({ initialLogging }: { initialLogging: boolean }) {
  const [enabled, setEnabled] = useState(initialLogging);
  const [loading, setLoading] = useState(false);

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
  );
}
