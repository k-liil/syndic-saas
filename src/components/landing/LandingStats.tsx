export default function LandingStats() {
  const stats = [
    { value: "360°", label: "Vision copropriété" },
    { value: "1 espace", label: "Compta & exploitation" },
    { value: "0", label: "Tableur dispersé" },
    { value: "100%", label: "Opérations tracées" },
  ];

  return (
    <section
      className="px-6 py-14"
      style={{
        background: "#0d1b38",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className="mb-2 text-4xl font-bold leading-tight"
              style={{
                background: "linear-gradient(135deg, #0bbfad, #1a3a6b)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {s.value}
            </div>
            <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
