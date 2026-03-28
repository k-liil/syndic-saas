import BackupContent from "./BackupContent";
import { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/authz";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sauvegardes | Syndicly",
  description: "Gérer vos sauvegardes de base de données.",
};

export default async function BackupPage() {
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
}
