import Link from "next/link";
import Image from "next/image";

export default function LandingFooter() {
  return (
    <footer
      className="px-6 py-12"
      style={{
        background: "#070f20",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Syndicly" width={28} height={28} unoptimized />
          <span className="text-lg font-bold text-white" style={{ letterSpacing: "-0.02em" }}>
            Syndicly
          </span>
        </div>

        {/* Copyright */}
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
          © 2026 Syndicly. Gestion de copropriété moderne au Maroc.
        </p>

        {/* Links */}
        <div className="flex gap-6">
          {[
            { label: "Connexion", href: "/login" },
            { label: "Contact", href: "/login" },
            { label: "CGU", href: "/login" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="text-sm no-underline transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.35)";
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
