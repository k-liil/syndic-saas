import BackupContent from "./BackupContent";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sauvegardes | Syndic",
  description: "Gérer vos sauvegardes de base de données.",
};

export default function BackupPage() {
  return (
    <div className="container mx-auto py-10 px-4">
       <BackupContent />
    </div>
  );
}
