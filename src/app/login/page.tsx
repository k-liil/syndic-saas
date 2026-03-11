"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Connexion...");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setMsg("Email ou mot de passe invalide");
      return;
    }

    window.location.href = next;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Accès réservé au gestionnaire.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              className="w-full rounded-xl border p-2"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full rounded-xl border p-2"
              placeholder="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="w-full rounded-xl bg-indigo-600 p-2 text-white hover:bg-indigo-700">
              Se connecter
            </button>
          </form>

          {msg && <div className="mt-3 text-sm">{msg}</div>}
        </div>
      </div>
    </div>
  );
}