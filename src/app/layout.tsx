import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata = {
  title: "Syndic MVP",
  description: "Property management MVP",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen text-zinc-900 antialiased app-bg">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}