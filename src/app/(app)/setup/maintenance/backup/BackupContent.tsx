"use client";

import { useState, useEffect } from "react";
import { 
  getBackupsAction, 
  triggerManualBackupAction, 
  getBackupConfigAction 
} from "./actions";
import { GitHubBackup } from "@/lib/backup-service";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { 
  Database, 
  Download, 
  HardDrive, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Github,
  RefreshCw,
  Calendar
} from "lucide-react";

export default function BackupContent() {
  const [backups, setBackups] = useState<GitHubBackup[]>([]);
  const [config, setConfig] = useState<{ hasToken: boolean; repo: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMsg({ text, type });
    if (type !== 'info') {
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [files, cfg] = await Promise.all([
        getBackupsAction(),
        getBackupConfigAction()
      ]);
      
      // Sort once on load
      const sortedFiles = Array.isArray(files) 
        ? [...files].sort((a, b) => b.name.localeCompare(a.name))
        : [];
        
      setBackups(sortedFiles);
      setConfig(cfg);
    } catch (error) {
      showStatus("Impossible de charger les données.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    showStatus("Sauvegarde en cours sur GitHub...", "info");
    try {
      await triggerManualBackupAction();
      showStatus("Sauvegarde réussie !", "success");
      await loadData();
    } catch (error: any) {
      showStatus(error.message || "La sauvegarde a échoué.", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "--";
    try {
      // GitHub file names are like backup-2026-03-29-123456.sql.gz
      const parts = dateStr.replace('backup-', '').replace('manual-backup-', '').split('-');
      if (parts.length >= 3) {
        return `${parts[2].substring(0,2)}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Gestion des Sauvegardes</h1>
          <p className="text-sm text-zinc-500">
            Historique et déclenchement manuel des sauvegardes GitHub.
          </p>
        </div>
        <button
          onClick={handleManualBackup} 
          disabled={isBackingUp || !config?.hasToken}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-600 hover:to-blue-700 disabled:opacity-50 active:scale-95"
        >
          {isBackingUp ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isBackingUp ? "Traitement..." : "Sauvegarder maintenant"}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          statusMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {statusMsg.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {statusMsg.type === 'error' && <AlertCircle className="h-4 w-4" />}
          {statusMsg.type === 'info' && <RefreshCw className="h-4 w-4 animate-spin" />}
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-zinc-50 rounded-lg">
              <Github className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Répertoire</p>
              <p className="text-sm font-bold text-zinc-900 truncate max-w-[150px]" title={config?.repo || "Non configuré"}>
                {config?.repo || "Chargement..."}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            config?.hasToken ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}>
            {config ? (config.hasToken ? "Connecté" : "Déconnecté") : "..."}
          </span>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Database className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Dernier Backup</p>
              <p className="text-xl font-bold text-zinc-900">
                {backups.length > 0 ? formatDate(backups[0].name) : "--"}
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            {backups.length} fichier(s) archivé(s)
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Planification</p>
              <p className="text-xl font-bold text-zinc-900">Quotidienne</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Rétention : 30 jours
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
          <h3 className="font-bold text-zinc-900">Historique des sauvegardes</h3>
          <RefreshCw 
            className={`h-4 w-4 text-zinc-400 cursor-pointer hover:text-indigo-600 transition-colors ${loading ? 'animate-spin' : ''}`} 
            onClick={loadData}
          />
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-5 py-3 font-semibold text-zinc-600">Fichier</th>
                <th className="px-5 py-3 font-semibold text-zinc-600">Date</th>
                <th className="px-5 py-3 font-semibold text-zinc-600">Taille</th>
                <th className="px-5 py-3 font-semibold text-zinc-600 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(loading && backups.length === 0) ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-zinc-400 italic">
                    Chargement de l'historique depuis GitHub...
                  </td>
                </tr>
              ) : backups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-zinc-400">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-zinc-200" />
                      <p>Aucune sauvegarde trouvée dans le répertoire `/backups`</p>
                    </div>
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr key={b.sha} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-zinc-900">
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <HardDrive className="h-4 w-4 text-zinc-400" />
                        {b.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(b.name)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">{formatSize(b.size)}</td>
                    <td className="px-5 py-4 text-right">
                      <a 
                        href={`/api/backups/download?file=${encodeURIComponent(b.name)}`}
                        download={b.name}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Télécharger
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {config && !config.hasToken && !loading && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-4">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold">Configuration Incomplète</h5>
            <p className="text-sm opacity-90">
              Les variables <code className="bg-red-100 rounded px-1">BACKUP_GITHUB_TOKEN</code> et <code className="bg-red-100 rounded px-1">BACKUP_GITHUB_REPO</code> marquent l'emplacement de vos sauvegardes. 
              Veuillez les configurer sur Railway pour activer ce service.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
