import "./globals.css";
import SessionProviderClient from "@/components/providers/SessionProviderClient";
import DiagnosticOverlay, { addDiagnosticLog } from "@/components/debug/DiagnosticOverlay";

export const metadata = {
  title: "Syndicly SaaS",
  description: "Plateforme SaaS de gestion de syndic et de copropriete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (typeof window !== "undefined") {
    addDiagnosticLog("Layout initial render (typeof window !== undefined)");
  }

  return (
    <html lang="fr">
      <body className="min-h-screen text-zinc-900 antialiased app-bg">
        <SessionProviderClient>
          {children}
          <DiagnosticOverlay />
        </SessionProviderClient>
      </body>
    </html>
  );
}
