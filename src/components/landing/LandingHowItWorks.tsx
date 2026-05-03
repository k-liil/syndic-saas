'use client';

const steps = [
  {
    n: "01",
    title: "Créez votre espace",
    desc: "Configurez vos immeubles, importez vos copropriétaires et définissez les quotes-parts en quelques minutes.",
  },
  {
    n: "02",
    title: "Saisissez les opérations",
    desc: "Enregistrez encaissements, dépenses et appels de fonds. Chaque opération génère une pièce justificative.",
  },
  {
    n: "03",
    title: "Suivez en temps réel",
    desc: "Consultez le tableau de bord pour voir la trésorerie, les retards et les indicateurs clés à tout moment.",
  },
  {
    n: "04",
    title: "Clôturez l'exercice",
    desc: "Exportez les rapports annuels, la balance des comptes et les reçus pour une clôture propre et auditée.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section
      id="how"
      className="relative overflow-hidden px-6 py-24"
      style={{
        background: "linear-gradient(160deg, #1a3a6b 0%, #0f2247 100%)",
      }}
    >
      {/* Dot grid */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]">
        <defs>
          <pattern id="dots3" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="2" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots3)" />
      </svg>

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div
            className="mb-4 inline-block text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#0bbfad" }}
          >
            Comment ça marche
          </div>
          <h2
            className="font-bold tracking-tight text-white"
            style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.025em" }}
          >
            Opérationnel en moins d'une heure
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-7 transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.09)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
              }}
            >
              <div
                className="mb-5 text-5xl font-extrabold leading-none"
                style={{
                  background: "linear-gradient(135deg, #0bbfad, #6ec6ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.n}
              </div>
              <h3 className="mb-3 text-base font-semibold text-white">{s.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
