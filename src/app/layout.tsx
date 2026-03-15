import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import SessionProviderClient from "@/components/providers/SessionProviderClient";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Syndic SaaS",
  description: "Plateforme SaaS de gestion de syndic et de copropriete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen text-zinc-900 antialiased app-bg">
        <SessionProviderClient>{children}</SessionProviderClient>
      </body>
    </html>
  );
}
