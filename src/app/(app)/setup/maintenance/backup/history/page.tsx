import { History } from "lucide-react";
import HistoryContent from "./HistoryContent";
import Link from "next/link";

export default function BackupHistoryPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link 
          href="/setup/maintenance/backup" 
          className="text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors mb-2 block"
        >
          ← Retour aux sauvegardes
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Historique des Sauvegardes</h1>
            <p className="text-muted-foreground">
              Journal complet des exécutions, succès, échecs et rétentions.
            </p>
          </div>
        </div>
      </div>

      <HistoryContent />
    </div>
  );
}
