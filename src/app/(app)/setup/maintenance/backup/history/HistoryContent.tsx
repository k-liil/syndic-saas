"use client";

import { useState, useEffect } from "react";
import { 
  History, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Info,
  Building2,
  Clock,
  Trash2
} from "lucide-react";
import { getBackupAuditAction, getOrganizationsAction } from "../actions";
import { formatDate, formatDateLong } from "@/lib/date-utils";

export default function HistoryContent() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });

  const init = async () => {
    try {
      const orgs = await getOrganizationsAction();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      console.error("Failed to load organizations:", error);
    }
  };

  const fetchLogs = async (orgId: string, page = 1) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await getBackupAuditAction(orgId, page, pagination.pageSize);
      setLogs(res.items);
      setPagination(res.pagination);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      alert("Échec du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      fetchLogs(selectedOrgId, 1);
    }
  }, [selectedOrgId]);

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Organisation</label>
            <select 
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Total Sauvegardes</label>
            <span className="font-bold text-slate-900">{pagination.total}</span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Date d'exécution</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Fichier</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Taille</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Statut</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Fin de vie (Rétention)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4 text-center text-slate-400">Chargement...</td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <HardDrive className="h-8 w-8 opacity-20" />
                      <p>Aucun historique de sauvegarde</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">
                            {formatDate(log.createdAt)}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700 font-mono text-xs">{log.fileName}</span>
                        {log.triggerType && (
                          <span className="text-[10px] text-slate-400 uppercase tracking-tighter mt-0.5">
                            {log.triggerType === 'MANUAL' ? 'Déclenchement Manuel' : 'Planification Automatique'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600">
                      {formatSize(log.sizeBytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Succès
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border-red-200 gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Échec
                          </span>
                          {log.errorMsg && (
                            <span className="text-[10px] text-red-500 max-w-[200px] truncate" title={log.errorMsg}>
                              {log.errorMsg}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.deletedAt ? (
                        <div className="flex items-center gap-2 text-red-500">
                          <Trash2 className="h-4 w-4" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-tight">Supprimé</span>
                            <span className="text-[10px] opacity-70">
                              {formatDate(log.deletedAt)} {new Date(log.deletedAt).toLocaleTimeString("fr-FR")}
                            </span>
                            {log.deletionType && (
                              <span className="text-[9px] italic opacity-60">
                                ({log.deletionType === 'RETENTION' ? 'Rétention auto' : 'Manuel'})
                              </span>
                            )}
                          </div>
                        </div>
                      ) : log.status === 'SUCCESS' ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium uppercase tracking-tight">Actif sur GitHub</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {pagination.page} sur {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(selectedOrgId, pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-50 h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => fetchLogs(selectedOrgId, pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-50 h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
