import "./globals.css";
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Syndicly | Gestion de Copropriété Moderne",
  description: "Plateforme professionnelle pour la gestion simplifiée de vos résidences et syndics de copropriété au Maroc.",
  keywords: ["syndic", "copropriété", "gestion immobilière", "Maroc"],
  authors: [{ name: "Syndicly Team" }],
  robots: "index, follow",
  openGraph: {
    title: "Syndicly | Gestion de Copropriété Moderne",
    description: "Simplifiez la gestion de votre syndic avec notre solution digitale complète.",
    url: "https://www.syndicly.ma",
    siteName: "Syndicly",
    locale: "fr_FR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen text-zinc-900 antialiased app-bg">
        {children}
      </body>
    </html>
  );
}
