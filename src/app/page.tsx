import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  FileSpreadsheet,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const productHighlights = [
  {
    title: "Pilotage financier clair",
    description:
      "Suivez les encaissements, depenses, soldes et categories depuis un tableau de bord lisible.",
    icon: BarChart3,
  },
  {
    title: "Gestion copropriete centralisee",
    description:
      "Lots, coproprietaires, affectations et exercices fiscaux restent synchronises au meme endroit.",
    icon: Building2,
  },
  {
    title: "Recus et paiements traces",
    description:
      "Standardisez les encaissements, les paiements fournisseurs et les pieces justificatives.",
    icon: ReceiptText,
  },
  {
    title: "Imports rapides",
    description:
      "Integrez facilement vos donnees historiques depuis CSV pour accelerer la mise en service.",
    icon: FileSpreadsheet,
  },
];

const metrics = [
  { value: "360deg", label: "Vision sur la copropriete" },
  { value: "1 espace", label: "Pour la compta et l'exploitation" },
  { value: "0 tableur disperse", label: "Quand le flux est bien cadre" },
];

export default function HomePage() {
  return (
    <main className="ambient-grid relative overflow-hidden">
      <div className="soft-orb left-[-8rem] top-[3rem] h-72 w-72 bg-sky-300/60" />
      <div className="soft-orb right-[-6rem] top-[6rem] h-64 w-64 bg-orange-300/50" />
      <div className="soft-orb bottom-[6rem] right-[18%] h-60 w-60 bg-teal-300/40" />
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/25">
              <Building2 size={20} />
            </div>
            <div>
              <div className="eyebrow text-sky-700">
                Syndic SaaS
              </div>
              <div className="text-sm text-slate-500">
                Gestion de syndic simple, nette et exploitable
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="glass-panel rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:-translate-y-px"
            >
              Connexion
            </Link>
            <Link
              href="/login"
              className="btn-primary text-sm font-medium"
            >
              Ouvrir l'espace
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="max-w-3xl">
            <div className="glass-panel inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-sky-900">
              <ShieldCheck size={16} />
              Une base solide pour digitaliser la gestion de copropriete
            </div>

            <h1 className="display-title mt-6 max-w-4xl text-6xl font-semibold leading-[0.95] text-slate-950 sm:text-7xl">
              Un cockpit moderne pour piloter votre syndic sans friction.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Centralisez les immeubles, les coproprietaires, les cotisations,
              les encaissements et les depenses dans une interface claire,
              pensee pour les operations quotidiennes.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="btn-primary inline-flex items-center gap-2 text-sm font-semibold"
              >
                Acceder au tableau de bord
                <ArrowRight size={16} />
              </Link>
              <div className="glass-panel inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-slate-600">
                <BadgeCheck size={16} className="text-emerald-600" />
                Imports CSV, suivi annuel, comptabilite et recus
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="glass-panel rounded-[28px] p-5"
                >
                  <div className="text-2xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 -top-10 h-28 rounded-full bg-sky-300/30 blur-3xl" />
            <div className="glass-panel relative overflow-hidden rounded-[36px] p-6">
              <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,_rgba(241,245,249,0.95),_rgba(226,232,240,0.92))] px-5 py-4 text-slate-900">
                <div>
                  <div className="eyebrow text-sky-700">
                    Vue operationnelle
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    Tresorerie, coproprietaires et suivi annuel
                  </div>
                </div>
                <WalletCards className="text-sky-600" />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {productHighlights.map(({ title, description, icon: Icon }) => (
                  <article
                    key={title}
                    className="glass-panel rounded-[24px] p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                      <Icon size={20} />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {description}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-[28px] border border-emerald-100 bg-[linear-gradient(135deg,_rgba(236,253,245,0.92),_rgba(209,250,229,0.72))] p-5">
                <div className="eyebrow text-emerald-700">
                  Resultat attendu
                </div>
                <p className="mt-2 text-sm leading-6 text-emerald-900">
                  Moins de dispersion, plus de visibilite sur les flux financiers
                  et un meilleur pilotage des operations quotidiennes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
