import BackupContent from "./BackupContent";
import { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/authz";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sauvegardes | Syndicly",
  description: "Gérer vos sauvegardes de base de données.",
};

export default async function BackupPage() {
  try {
    console.log("[BACKUP_LOG] Entering BackupPage (Server Component)");
    const gate = await requireSuperAdmin();
    console.log("[BACKUP_LOG] Authorization check:", gate.ok);
    if (!gate.ok) {
      console.log("[BACKUP_LOG] Not authorized, redirecting...");
      redirect("/dashboard");
    }

    return (
      <div className="container mx-auto py-10 px-4">
         <BackupContent />
      </div>
    );
  } catch (error: any) {
    console.error("[BACKUP_LOG] Critical Error in BackupPage:", error);
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-800">
          <h2 className="text-lg font-bold mb-2">Erreur Critique de Chargement</h2>
          <p className="text-sm opacity-90 mb-4">
            Une erreur est survenue lors de l'initialisation de la page de sauvegarde.
          </p>
          <pre className="p-4 bg-red-100 rounded text-xs overflow-auto">
            {error.message || String(error)}
          </pre>
        </div>
      </div>
    );
  }
}
