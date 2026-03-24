"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

type ProviderMap = Record<
  string,
  {
    id: string;
    name: string;
    type: string;
    signinUrl: string;
    callbackUrl: string;
  }
>;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M21.81 10.04H12.3v3.95h5.48c-.24 1.27-.96 2.35-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.5 0-.71-.06-1.4-.27-2.09Z"
        fill="#4285F4"
      />
      <path
        d="M12.3 22c2.7 0 4.97-.89 6.63-2.37l-3.3-2.56c-.91.61-2.09.97-3.33.97-2.55 0-4.71-1.72-5.48-4.03H3.42v2.64A9.99 9.99 0 0 0 12.3 22Z"
        fill="#34A853"
      />
      <path
        d="M6.82 14.01a6.01 6.01 0 0 1 0-4.02V7.35H3.42a9.98 9.98 0 0 0 0 9.3l3.4-2.64Z"
        fill="#FBBC05"
      />
      <path
        d="M12.3 5.96c1.45 0 2.76.5 3.79 1.47l2.85-2.85C17.27 3.02 15 2 12.3 2a9.99 9.99 0 0 0-8.88 5.35l3.4 2.64c.77-2.31 2.93-4.03 5.48-4.03Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginPageContent() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";
  const error = sp.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [providers, setProviders] = useState<ProviderMap>({});
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  useEffect(() => {
    fetch("/api/auth/providers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setProviders(data ?? {}))
      .catch(() => setProviders({}));
  }, []);

  useEffect(() => {
    if (!error) return;

    const messages: Record<string, string> = {
      AccessDenied:
        "Connexion Google refusee. Verifie que votre email existe deja dans la plateforme et que le compte est actif.",
      OAuthAccountNotLinked:
        "Ce compte Google n'est pas encore lie correctement. Reessaie avec le meme email que ton compte existant.",
      Configuration:
        "La connexion externe n'est pas encore configuree correctement.",
    };

    setMsg(messages[error] ?? "Une erreur de connexion est survenue.");
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

  async function onGoogleSignIn() {
    setLoadingGoogle(true);
    setMsg("");
    await signIn("google", { callbackUrl: next });
  }

  const googleProvider = providers.google;

  return (
    <div className="ambient-grid min-h-screen overflow-hidden text-slate-900">
      <div className="soft-orb left-[-7rem] top-[8rem] h-72 w-72 bg-sky-300/55" />
      <div className="soft-orb right-[-5rem] top-[5rem] h-64 w-64 bg-orange-300/45" />
      <div className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="glass-panel flex flex-col justify-between rounded-[40px] p-8 text-slate-900 lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/75 px-3.5 py-1.5 text-sm font-semibold text-slate-800 shadow-sm">
              <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
              Syndicly
            </div>

            <h1 className="display-title mt-8 max-w-xl text-5xl font-semibold leading-[0.96] text-slate-950 sm:text-6xl">
              Une connexion plus nette pour une gestion de syndic plus fluide.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Retrouvez vos immeubles, vos coproprietaires, vos encaissements et
              vos paiements dans un espace pense pour l'exploitation quotidienne.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-slate-200 bg-white/75 p-5">
              <Mail className="text-sky-500" size={20} />
              <div className="mt-4 text-sm font-semibold text-slate-900">Connexion rapide</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Email et mot de passe ou Google selon votre configuration.
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

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={!googleProvider || loadingGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-px hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleIcon />
                {googleProvider ? "Continuer avec Google" : "Google bientot disponible"}
              </button>

              {!googleProvider ? (
                <p className="text-xs leading-5 text-slate-400">
                  Ajoute `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `.env`
                  pour activer la connexion Google.
                </p>
              ) : null}
            </div>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Ou
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
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

            {msg ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {msg}
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
