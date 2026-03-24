"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

function LoginPageContent() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const error = sp.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const errorMessage = useMemo(() => {
    if (!error) return "";
    const messages: Record<string, string> = {
      Configuration:
        "La configuration de connexion n'est pas encore correcte.",
    };

    return messages[error] ?? "Une erreur de connexion est survenue.";
  }, [error]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Connexion en cours...");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setMsg("Email ou mot de passe invalide.");
      return;
    }

    window.location.href = next;
  }

  return (
    <div className="ambient-grid min-h-screen overflow-hidden text-slate-900">
      <div className="soft-orb left-[-7rem] top-[8rem] h-72 w-72 bg-sky-300/55" />
      <div className="soft-orb right-[-5rem] top-[5rem] h-64 w-64 bg-orange-300/45" />
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="glass-panel flex flex-col justify-between rounded-[40px] p-8 text-slate-900 lg:p-10">
          <div>
            <div className="inline-flex rounded-[32px] border border-slate-200 bg-white/80 p-4 shadow-sm">
              <Image
                src="/logo.png"
                alt="Syndicly"
                width={320}
                height={118}
                className="h-auto w-[220px] object-contain sm:w-[280px]"
                priority
              />
            </div>

            <h1 className="display-title mt-8 max-w-xl text-5xl font-semibold leading-[0.96] text-slate-950 sm:text-6xl">
              Une connexion plus nette pour une gestion de syndic plus fluide.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Retrouvez vos immeubles, vos coproprietaires, vos encaissements et
              vos paiements dans un espace pense pour l&apos;exploitation quotidienne.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
              <Mail className="text-sky-500" size={20} />
              <div className="mt-4 text-sm font-semibold text-slate-900">Connexion rapide</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Email et mot de passe dans une interface simple et directe.
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
              <ShieldCheck className="text-emerald-500" size={20} />
              <div className="mt-4 text-sm font-semibold text-slate-900">Acces controle</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Les comptes inactifs ou inconnus restent bloques cote serveur.
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
              <LockKeyhole className="text-amber-500" size={20} />
              <div className="mt-4 text-sm font-semibold text-slate-900">Parcours propre</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Une interface plus premium et plus claire des la premiere page.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="glass-panel w-full max-w-md rounded-[36px] p-7 sm:p-8">
            <div className="inline-flex rounded-full border border-sky-200 bg-sky-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              Espace gestionnaire
            </div>

            <h2 className="display-title mt-4 text-5xl font-semibold leading-none text-slate-950">
              Connexion
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Connectez-vous pour acceder au tableau de bord et a vos operations.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="vous@syndic.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Mot de passe
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Votre mot de passe"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>

              <button className="btn-primary inline-flex w-full items-center justify-center gap-2 text-sm font-semibold">
                Se connecter
                <ArrowRight size={16} />
              </button>
            </form>

            {msg || errorMessage ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {msg || errorMessage}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="ambient-grid min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-8">
            <div className="glass-panel w-full max-w-md rounded-[36px] p-8 text-center text-slate-600">
              Chargement...
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
