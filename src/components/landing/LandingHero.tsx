import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function LandingHero() {
  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32"
      style={{
        background: "linear-gradient(145deg, #1a3a6b 0%, #0f2247 40%, #0a1a36 100%)",
      }}
    >
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            top: "-20%", right: "-10%",
            width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(11,191,173,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: "-10%", left: "-5%",
            width: 400, height: 400, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(11,191,173,0.1) 0%, transparent 70%)",
          }}
        />
        {/* Dot grid */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.06]">
          <defs>
            <pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#0bbfad",
          }}
        >
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "#0bbfad" }}
          />
          Gestion de copropriété · Maroc
        </div>

        {/* Headline */}
        <h1
          className="mb-6 font-bold leading-[1.08] tracking-tight text-white"
          style={{ fontSize: "clamp(40px, 6vw, 72px)", letterSpacing: "-0.03em" }}
        >
          Gérez votre syndic
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #0bbfad, #6ec6ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            sans friction.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="mx-auto mb-12 max-w-xl font-normal leading-relaxed"
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "rgba(255,255,255,0.65)",
          }}
        >
          Centralisez les immeubles, copropriétaires, cotisations, encaissements
          et dépenses dans une interface claire.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-3 rounded-xl px-8 py-4 text-base font-semibold"
          >
            Demander une démo
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl px-7 py-4 text-base font-medium transition-all no-underline"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
            }}
          >
            Se connecter
          </Link>
        </div>
      </div>

      {/* Dashboard mockup */}
      <div className="relative z-10 mt-20 w-full max-w-4xl">
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          }}
        >
          {/* Window chrome */}
          <div
            className="flex items-center gap-2 px-5 py-3"
            style={{
              background: "rgba(255,255,255,0.05)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
              <div key={i} className="h-3 w-3 rounded-full" style={{ background: c }} />
            ))}
            <div
              className="ml-4 flex flex-1 items-center rounded-md px-3"
              style={{ height: 28, background: "rgba(255,255,255,0.06)" }}
            >
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                app.syndicly.ma/dashboard
              </span>
            </div>
          </div>

          {/* Dashboard content */}
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  const stats = [
    { label: "Encaissements", value: "184 200 MAD", delta: "+12%", color: "#0bbfad" },
    { label: "Dépenses", value: "62 400 MAD", delta: "-3%", color: "#e05d5d" },
    { label: "Solde net", value: "121 800 MAD", delta: "+18%", color: "#5db87a" },
    { label: "Copropriétaires", value: "48", delta: "+2", color: "#1a3a6b" },
  ];

  const icons = ["⊞", "⌂", "👥", "💳", "🧾"];

  return (
    <div className="flex gap-5 p-6" style={{ background: "#0d1b38" }}>
      {/* Sidebar */}
      <div className="flex w-12 flex-col items-center gap-5 pt-2">
        <Image src="/logo.png" alt="" width={28} height={28} unoptimized />
        {icons.map((ic, i) => (
          <div
            key={i}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-base"
            style={{
              background: i === 0 ? "rgba(11,191,173,0.15)" : "transparent",
              color: i === 0 ? "#0bbfad" : "rgba(255,255,255,0.3)",
            }}
          >
            {ic}
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-semibold text-white">Tableau de bord</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Résidence Les Orangers · Exercice 2026
            </div>
          </div>
          <div
            className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #0bbfad, #1a3a6b)" }}
          >
            + Nouvel encaissement
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="mb-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
              <div className="mb-1 text-sm font-bold text-white">{s.value}</div>
              <div className="text-[11px] font-semibold" style={{ color: s.color }}>{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Chart + list */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Flux mensuel</div>
            <div className="flex h-16 items-end gap-1.5">
              {[40, 65, 50, 80, 60, 90, 75, 95, 70, 85, 60, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    background: i === 11
                      ? "linear-gradient(180deg, #0bbfad, #1a3a6b)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Derniers paiements</div>
            {[
              { name: "Lot 12 — M. Alami", val: "1 200 MAD", ok: true },
              { name: "Lot 07 — Mme Benali", val: "800 MAD", ok: true },
              { name: "Lot 23 — M. Tazi", val: "1 200 MAD", ok: false },
            ].map((row, i) => (
              <div
                key={i}
                className="flex items-center justify-between pb-2.5"
                style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none", marginBottom: i < 2 ? 10 : 0 }}
              >
                <span className="text-xs text-white">{row.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">{row.val}</span>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: row.ok ? "#5db87a" : "#e05d5d" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
