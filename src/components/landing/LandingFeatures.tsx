"use client";

import {
  BarChart3,
  Building2,
  FileSpreadsheet,
  ReceiptText,
  Users,
  WalletCards,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Pilotage financier clair",
    desc: "Suivez encaissements, dépenses, soldes et catégories depuis un tableau de bord lisible et exploitable au quotidien.",
    color: "#0bbfad",
  },
  {
    icon: Building2,
    title: "Gestion copropriété centralisée",
    desc: "Lots, copropriétaires, affectations et exercices fiscaux restent synchronisés au même endroit.",
    color: "#1a3a6b",
  },
  {
    icon: ReceiptText,
    title: "Reçus et paiements tracés",
    desc: "Standardisez les encaissements, paiements fournisseurs et pièces justificatives avec des reçus générés automatiquement.",
    color: "#5db87a",
  },
  {
    icon: FileSpreadsheet,
    title: "Imports rapides CSV",
    desc: "Intégrez vos données historiques depuis CSV pour accélérer la mise en service sans saisie manuelle.",
    color: "#e0943d",
  },
  {
    icon: Users,
    title: "Annuaire copropriétaires",
    desc: "Gérez les contacts, lots, quotes-parts et l'historique complet de chaque copropriétaire depuis un profil unifié.",
    color: "#0bbfad",
  },
  {
    icon: WalletCards,
    title: "Suivi annuel des cotisations",
    desc: "Planifiez et suivez les appels de fonds, les retards et les soldes par exercice avec une vue chronologique.",
    color: "#1a3a6b",
  },
];

export default function LandingFeatures() {
  return (
    <section
      id="features"
      className="px-6 py-24"
      style={{ background: "#0a1a36" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <div
            className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#0bbfad" }}
          >
            Fonctionnalités
          </div>
          <h2
            className="font-bold leading-tight tracking-tight text-white"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
          >
            Tout ce qu'il faut pour
            <br />
            piloter sans friction
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group rounded-2xl p-8 transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ background: f.color + "22" }}
                >
                  <Icon size={22} style={{ color: f.color }} />
                </div>
                <h3
                  className="mb-3 text-lg font-semibold text-white"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
