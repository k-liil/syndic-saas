"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Syndicly est-il adapté aux petites copropriétés ?",
    a: "Oui, Syndicly convient aussi bien aux petites résidences de 5 lots qu'aux grandes copropriétés de 200 lots. L'interface s'adapte à la taille de votre portefeuille.",
  },
  {
    q: "Comment importer mes données existantes ?",
    a: "Syndicly propose un système d'import CSV pour intégrer vos copropriétaires, lots et historique d'opérations. Un guide d'import est disponible directement dans l'application.",
  },
  {
    q: "Les données sont-elles sécurisées ?",
    a: "Toutes les données sont hébergées de façon sécurisée avec chiffrement en transit et au repos. Vos données financières ne sont accessibles que par vous et les utilisateurs que vous autorisez.",
  },
  {
    q: "Peut-on générer des reçus automatiquement ?",
    a: "Oui, chaque encaissement enregistré dans Syndicly génère automatiquement un reçu numérique téléchargeable au format PDF, prêt à être envoyé au copropriétaire.",
  },
  {
    q: "Y a-t-il une période d'essai ?",
    a: "Syndicly est accessible gratuitement pour démarrer. Vous pouvez configurer votre espace, importer vos données et tester toutes les fonctionnalités sans engagement.",
  },
  {
    q: "Peut-on gérer plusieurs immeubles ?",
    a: "Absolument. Syndicly vous permet de gérer plusieurs immeubles et résidences depuis un seul espace, avec une vue consolidée ou par immeuble selon vos besoins.",
  },
];

export default function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="px-6 py-24" style={{ background: "#0a1a36" }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-14 text-center">
          <div
            className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#0bbfad" }}
          >
            FAQ
          </div>
          <h2
            className="font-bold tracking-tight text-white"
            style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.025em" }}
          >
            Questions fréquentes
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${open === i ? "rgba(11,191,173,0.4)" : "rgba(255,255,255,0.08)"}`,
              }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <span className="text-base font-semibold text-white">{f.q}</span>
                <span
                  className="shrink-0 transition-transform duration-200"
                  style={{
                    color: open === i ? "#0bbfad" : "rgba(255,255,255,0.3)",
                    transform: open === i ? "rotate(180deg)" : "none",
                  }}
                >
                  <ChevronDown size={18} />
                </span>
              </button>
              {open === i && (
                <div
                  className="px-6 pb-5 text-sm leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
