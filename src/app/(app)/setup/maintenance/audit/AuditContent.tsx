"use client";

import { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Building2,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { getAuditLogsAction } from "./actions";
import { formatDate } from "@/lib/date-utils";

export default function AuditContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  });
  const [filters, setFilters] = useState({
    query: "",
    actionType: ""
  });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getAuditLogsAction({
        page,
        pageSize: pagination.pageSize,
        query: filters.query,
        actionType: filters.actionType
      });
      setLogs(res.items);
      setPagination(res.pagination);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      alert("Échec du chargement des journaux");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters.actionType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string, color: string }> = {
      "BACKUP_CREATE": { label: "Sauvegarde", color: "bg-blue-100 text-blue-700 border-blue-200" },
      "BACKUP_DELETE": { label: "Suppression Sauvegarde", color: "bg-red-100 text-red-700 border-red-200" },
      "CREATE_RECEIPT": { label: "Nouveau Reçu", color: "bg-green-100 text-green-700 border-green-200" },
      "DELETE_RECEIPT": { label: "Suppression Reçu", color: "bg-orange-100 text-orange-700 border-orange-200" },
      "CREATE_PAYMENT": { label: "Nouveau Paiement", color: "bg-purple-100 text-purple-700 border-purple-200" },
      "DELETE_PAYMENT": { label: "Suppression Paiement", color: "bg-pink-100 text-pink-700 border-pink-200" },
    };

    const config = actionMap[action] || { label: action, color: "bg-gray-100 text-gray-700 border-gray-200" };
    
    return (
      <span className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input 
              placeholder="Rechercher dans les logs..." 
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
          </div>
          <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-slate-100 text-slate-900 hover:bg-slate-200">
            Rechercher
          </button>
        </form>

        <div className="flex items-center gap-2">
          <select 
            className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-w-[180px]"
            value={filters.actionType}
            onChange={(e) => setFilters({ ...filters, actionType: e.target.value })}
          >
            <option value="">Tous les types</option>
            <option value="BACKUP_CREATE">Sauvegardes</option>
            <option value="BACKUP_DELETE">Suppressions Sauvegardes</option>
            <option value="CREATE_RECEIPT">Reçus (Création)</option>
            <option value="DELETE_RECEIPT">Reçus (Suppression)</option>
            <option value="CREATE_PAYMENT">Paiements (Création)</option>
            <option value="DELETE_PAYMENT">Paiements (Suppression)</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">Date & Heure</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Utilisateur</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Organisation</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Détails</th>
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
                      <Info className="h-8 w-8 opacity-20" />
                      <p>Aucun journal trouvé</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {formatDate(log.createdAt)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(log.createdAt).toLocaleTimeString("fr-FR")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                          <UserIcon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{log.user?.name || "Système"}</span>
                          <span className="text-xs text-slate-500">{log.user?.email || "system@syndicly.ma"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Building2 className="h-3.5 w-3.5 opacity-60" />
                        <span>{log.organization?.name || "Global"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="text-slate-600 line-clamp-2">{log.details}</p>
                        {log.entityId && (
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1 block">
                             ID: {log.entityId}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {pagination.page} sur {pagination.totalPages} ({pagination.total} logs)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-50 h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
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
