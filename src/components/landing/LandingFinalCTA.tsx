import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingFinalCTA() {
  return (
    <section
      className="relative overflow-hidden px-6 py-24 text-center"
      style={{
        background: "linear-gradient(145deg, #1a3a6b 0%, #0a1a36 100%)",
      }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 700, height: 700,
          background: "radial-gradient(circle, rgba(11,191,173,0.1) 0%, transparent 70%)",
        }}
      />

      <div className="relative">
        <h2
          className="mb-5 font-bold leading-tight tracking-tight text-white"
          style={{ fontSize: "clamp(28px, 5vw, 52px)", letterSpacing: "-0.03em" }}
        >
          Prêt à digitaliser
          <br />
          votre syndic ?
        </h2>
        <p
          className="mx-auto mb-10 max-w-md text-lg"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Rejoignez les syndics qui gèrent leur copropriété sans tableur ni friction.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="btn-primary inline-flex items-center gap-3 rounded-xl px-8 py-4 text-base font-bold"
          >
            Demander une démo
            <ArrowRight size={20} />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl px-7 py-4 text-base font-medium transition-all no-underline"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1.5px solid rgba(255,255,255,0.25)",
              color: "#fff",
            }}
          >
            Se connecter
          </Link>
        </div>
      </div>
    </section>
  );
}
