export default function LandingResultBand() {
  return (
    <section className="px-6 py-20" style={{ background: "#0d1b38" }}>
      <div className="mx-auto max-w-3xl text-center">
        <div
          className="rounded-2xl p-12"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(11,191,173,0.2)",
          }}
        >
          <div
            className="mb-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#0bbfad" }}
          >
            Résultat attendu
          </div>
          <p
            className="font-semibold leading-relaxed tracking-tight"
            style={{
              fontSize: "clamp(20px, 3vw, 28px)",
              color: "rgba(255,255,255,0.9)",
              letterSpacing: "-0.01em",
            }}
          >
            Moins de dispersion, plus de visibilité sur les flux financiers
            et un meilleur pilotage des opérations quotidiennes.
          </p>
        </div>
      </div>
    </section>
  );
}
