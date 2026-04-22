import "./globals.css";
import DiagnosticOverlay from "@/components/debug/DiagnosticOverlay";

export const metadata = {
  title: "Syndicly SaaS",
  description: "Plateforme SaaS de gestion de syndic et de copropriete.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script 
          dangerouslySetInnerHTML={{ 
            __html: `console.log("INLINE: Manual script execution test"); window.__DIAGNOSTIC_INLINE_SCRIPT = true;` 
          }} 
        />
      </head>
      <body className="min-h-screen text-zinc-900 antialiased app-bg">
        {children}
        <DiagnosticOverlay />
      </body>
    </html>
  );
}
