import BackupContent from "./BackupContent";
import { Metadata } from "next";
import { requireSuperAdmin } from "@/lib/authz";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sauvegardes | Syndicly",
  description: "Gérer vos sauvegardes de base de données.",
};

export default async function BackupPage() {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-10 px-4">
       <BackupContent />
    </div>
  );
}
