import "./globals.css";
import SessionProviderClient from "@/components/providers/SessionProviderClient";

export const metadata = {
  title: "Syndicly SaaS",
  description: "Plateforme SaaS de gestion de syndic et de copropriete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen text-zinc-900 antialiased app-bg">
        <SessionProviderClient>{children}</SessionProviderClient>
      </body>
    </html>
  );
}
