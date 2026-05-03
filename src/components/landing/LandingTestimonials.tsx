const testimonials = [
  {
    name: "Karim Bensouda",
    role: "Syndic professionnel · Casablanca",
    quote:
      "Avant Syndicly, je jonglais entre 4 tableurs différents. Maintenant tout est au même endroit, les copropriétaires reçoivent leurs reçus automatiquement et je clôture mes exercices en une heure.",
    lots: "6 immeubles · 240 lots",
  },
  {
    name: "Nadia El Fassi",
    role: "Gestionnaire immobilière · Rabat",
    quote:
      "L'import CSV m'a permis de basculer tout mon historique en une matinée. L'interface est vraiment pensée pour les opérations quotidiennes, pas pour les comptables.",
    lots: "3 résidences · 87 lots",
  },
  {
    name: "Youssef Amrani",
    role: "Copropriété en self-management · Marrakech",
    quote:
      "On gère notre résidence entre bénévoles. Syndicly nous a donné une vraie visibilité sur la trésorerie et éliminé les disputes sur qui a payé quoi et quand.",
    lots: "1 résidence · 32 lots",
  },
];

export default function LandingTestimonials() {
  return (
    <section
      id="testimonials"
      className="px-6 py-24"
      style={{ background: "#0d1b38" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div
            className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#0bbfad" }}
          >
            Témoignages
          </div>
          <h2
            className="font-bold tracking-tight text-white"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
          >
            Ils gèrent déjà sans friction
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="flex flex-col gap-6 rounded-2xl p-8 transition-all duration-200 hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Quote mark */}
              <div
                className="select-none text-5xl leading-none"
                style={{
                  fontFamily: "Georgia, serif",
                  background: "linear-gradient(135deg, #0bbfad, #1a3a6b)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                "
              </div>

              {/* Quote */}
              <p
                className="flex-1 text-sm italic leading-relaxed"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {t.quote}
              </p>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

              {/* Author */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {t.role}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: "rgba(11,191,173,0.15)", color: "#0bbfad" }}
                >
                  {t.lots}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
