"use client";

import { useState, useEffect } from "react";
import { 
  getBackupsAction, 
  triggerManualBackupAction, 
  getBackupConfigAction,
  getOrganizationsAction,
  getBackupScheduleAction,
  updateBackupScheduleAction,
  getBackupAuditAction,
  getSystemBackupHealthAction,
  deleteBackupAction
} from "./actions";
import { GitHubBackup } from "@/lib/backup-service";
import { 
  Database, 
  Download, 
  HardDrive, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Github,
  RefreshCw,
  Calendar,
  Settings2,
  Clock,
  History,
  ShieldCheck,
  Search,
  Activity,
  ExternalLink,
  Copy,
  Info,
  Trash
} from "lucide-react";

export default function BackupContent() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [backups, setBackups] = useState<GitHubBackup[]>([]);
  const [config, setConfig] = useState<{ hasToken: boolean; repo: string; heartbeatToken?: string } | null>(null);
  const [schedule, setSchedule] = useState<any>({ frequency: 1440, isActive: false, retentionCount: 10 });
  const [audits, setAudits] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<{ lastHeartbeatAt: string | null }>({ lastHeartbeatAt: null });
  
  const [loading, setLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (selectedOrgId) {
      loadOrgData(selectedOrgId);
    }
  }, [selectedOrgId]);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMsg({ text, type });
    if (type !== 'info') {
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const init = async () => {
    setLoading(true);
    try {
      const [orgs, cfg, health] = await Promise.all([
        getOrganizationsAction(),
        getBackupConfigAction(),
        getSystemBackupHealthAction()
      ]);
      setOrganizations(orgs);
      setConfig(cfg);
      setSystemHealth(health);
      if (orgs.length > 0) {
        setSelectedOrgId(orgs[0].id);
      }
    } catch (error) {
      showStatus("Impossible de charger les organisations.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadOrgData = async (orgId: string) => {
    setLoading(true);
    try {
      const [files, sched, logs] = await Promise.all([
        getBackupsAction(orgId),
        getBackupScheduleAction(orgId),
        getBackupAuditAction(orgId)
      ]);
      
      setBackups(files || []);
      setSchedule(sched || { frequency: 1440, isActive: true, retentionCount: 10 });
      setAudits(logs || []);
    } catch (error: any) {
      showStatus(error.message || "Erreur lors du chargement des données de l'organisation.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualBackup = async () => {
    if (!selectedOrgId) return;
    setIsBackingUp(true);
    showStatus("Exportation et sauvegarde en cours...", "info");
    try {
      await triggerManualBackupAction(selectedOrgId);
      showStatus("Sauvegarde réussie !", "success");
      await loadOrgData(selectedOrgId);
    } catch (error: any) {
      showStatus(error.message || "La sauvegarde a échoué.", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedOrgId || !schedule) return;
    setIsSavingSchedule(true);
    try {
      await updateBackupScheduleAction(
        selectedOrgId, 
        schedule.frequency || 1440, 
        !!schedule.isActive,
        schedule.retentionCount || 10
      );
      showStatus("Planning mis à jour.", "success");
    } catch (error: any) {
      showStatus(error.message || "Erreur lors de la mise à jour du planning.", "error");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleDeleteBackup = async (backup: GitHubBackup) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la sauvegarde "${backup.name}" de GitHub ?`)) {
      return;
    }

    try {
      showStatus("Suppression en cours...", "info");
      await deleteBackupAction(`backups/${backup.name}`, backup.sha);
      showStatus("Sauvegarde supprimée.", "success");
      // Refresh list
      const updatedFiles = await getBackupsAction(selectedOrgId);
      setBackups(updatedFiles);
    } catch (error: any) {
      showStatus(error.message || "Erreur lors de la suppression.", "error");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
  
  const copyHeartbeatUrl = () => {
    const url = `${window.location.origin}/api/backups/heartbeat?token=${config?.heartbeatToken}`;
    navigator.clipboard.writeText(url);
    showStatus("URL copiée dans le presse-papier", "success");
  };

  const filteredOrgs = organizations.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            Super-Admin Backups
          </h1>
          <p className="text-sm text-zinc-500">
            Gestion multi-tenant des sauvegardes et planifications automatiques.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Rechercher org..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 w-[200px]"
            />
          </div>
          <select 
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {filteredOrgs.map(org => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
          <button 
            onClick={handleManualBackup} 
            disabled={isBackingUp || !config?.hasToken || !selectedOrgId}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {isBackingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {isBackingUp ? "Exportation..." : "Backup Manuel"}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-md border text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Config & Statistics */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-500">
              <Activity className="h-4 w-4" />
              État du Moteur (Heartbeat)
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">Statut du Moteur</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  systemHealth.lastHeartbeatAt && (Date.now() - new Date(systemHealth.lastHeartbeatAt).getTime() < 10 * 60000)
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                  {systemHealth.lastHeartbeatAt && (Date.now() - new Date(systemHealth.lastHeartbeatAt).getTime() < 10 * 60000)
                    ? 'ACTIF'
                    : 'INACTIF / HORS LIGNE'}
                </span>
              </div>
              
              <div className="text-xs text-zinc-500 flex flex-col gap-1">
                <span>Dernier passage détecté :</span>
                <span className="font-medium text-zinc-900">
                  {systemHealth.lastHeartbeatAt ? new Date(systemHealth.lastHeartbeatAt).toLocaleString() : 'Jamais'}
                </span>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed italic">
                  Pour activer les sauvegardes automatiques, configurez une tâche Cron (ex: Railway, cron-job.org) sur cette URL :
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={copyHeartbeatUrl}
                    className="flex-1 flex items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 py-1.5 text-[10px] font-bold text-zinc-700 hover:bg-zinc-200 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    Copier URL de Trigger
                  </button>
                  <a 
                    href="https://docs.railway.app/guides/cron-jobs" 
                    target="_blank"
                    className="flex items-center justify-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-zinc-400 hover:text-indigo-600 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-500">
              <Settings2 className="h-4 w-4" />
              Planification Automatique
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">Service Actif</span>
                <button 
                  onClick={() => setSchedule({...schedule, isActive: !schedule.isActive})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${schedule?.isActive ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${schedule?.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500">FRÉQUENCE (MINUTES)</label>
                <select 
                  value={schedule?.frequency || 1440}
                  onChange={(e) => setSchedule({...schedule, frequency: parseInt(e.target.value)})}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value={5}>Toutes les 5 minutes</option>
                  <option value={15}>Toutes les 15 minutes</option>
                  <option value={30}>Toutes les 30 minutes</option>
                  <option value={60}>Chaque heure</option>
                  <option value={360}>Toutes les 6 heures</option>
                  <option value={720}>Toutes les 12 heures</option>
                  <option value={1440}>Quotidien (24h)</option>
                  <option value={10080}>Hebdomadaire (7j)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500">RÉTENTION (NBRE DE SAUVEGARDES à CONSERVER)</label>
                <input 
                  type="number"
                  min={1}
                  max={100}
                  value={schedule?.retentionCount || 10}
                  onChange={(e) => setSchedule({...schedule, retentionCount: parseInt(e.target.value) || 10})}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <p className="text-[10px] text-zinc-400 italic">
                  Les sauvegardes les plus anciennes seront automatiquement supprimées une fois cette limite atteinte.
                </p>
              </div>

              <button 
                onClick={handleUpdateSchedule}
                disabled={isSavingSchedule}
                className="w-full rounded-md bg-zinc-900 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isSavingSchedule ? "Enregistrement..." : "Appliquer le planning"}
              </button>
            </div>

            {schedule?.nextRunAt && (
              <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                Prochain passage : {new Date(schedule.nextRunAt).toLocaleString()}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-zinc-900 flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-500">
              <History className="h-4 w-4" />
              Historique Récent (Audits)
            </h3>
            <div className="space-y-3">
              {audits.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">Aucun log récent.</p>
              ) : (
                audits.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-zinc-50 group transition-colors">
                    <div className={`mt-1 p-1 rounded-full ${log.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                      {log.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <AlertCircle className="h-3 w-3 text-red-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-900 truncate">{log.fileName}</p>
                      <p className="text-[10px] text-zinc-400">{new Date(log.createdAt).toLocaleString()} • {formatSize(log.sizeBytes)}</p>
                      {log.errorMsg && <p className="text-[10px] text-red-500 mt-0.5 mt-0.5 line-clamp-1">{log.errorMsg}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: File List */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
              <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                <Github className="h-5 w-5 text-indigo-600" />
                Dépôt GitHub : {config?.repo}
              </h3>
              <RefreshCw 
                className={`h-4 w-4 text-zinc-400 cursor-pointer hover:text-indigo-600 transition-colors ${loading ? 'animate-spin' : ''}`} 
                onClick={() => selectedOrgId && loadOrgData(selectedOrgId)}
              />
            </div>
            
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-100 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 font-semibold text-zinc-500">Archive</th>
                    <th className="px-5 py-3 font-semibold text-zinc-500">Type</th>
                    <th className="px-5 py-3 font-semibold text-zinc-500">Taille</th>
                    <th className="px-5 py-3 font-semibold text-zinc-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-20">
                        <RefreshCw className="h-8 w-8 text-indigo-200 animate-spin mx-auto mb-3" />
                        <p className="text-zinc-400 italic">Synchronisation avec GitHub...</p>
                      </td>
                    </tr>
                  ) : backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-20 text-zinc-400">
                        <HardDrive className="h-10 w-10 text-zinc-100 mx-auto mb-3" />
                        <p>Aucune archive trouvée pour cette organisation.</p>
                      </td>
                    </tr>
                  ) : (
                    backups.map((b) => (
                      <tr key={b.sha} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-4 min-w-[200px]">
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-900 font-mono text-xs">{b.name}</span>
                            <span className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 uppercase tracking-tighter">
                              <Calendar className="h-2.5 w-2.5" />
                              {b.name.includes('manual') ? 'Manuel' : 'Automatique'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-zinc-500">
                           <span className="px-2 py-0.5 rounded bg-zinc-100 text-[10px] font-bold text-zinc-600">SQL GZ</span>
                        </td>
                        <td className="px-5 py-4 text-zinc-500 font-medium">{formatSize(b.size)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a 
                              href={`/api/backups/download?file=${encodeURIComponent(b.name)}`}
                              download={b.name}
                              title="Télécharger"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all active:scale-95 shadow-sm"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteBackup(b)}
                              title="Supprimer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50/30 text-red-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {config && !config.hasToken && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-4">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold uppercase tracking-wider text-xs">Alerte Configuration</h5>
            <p className="text-sm opacity-90">
              Le jeton GitHub n'est pas configuré. Les sauvegardes vers le dépôt externe sont désactivées.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
