"use client";

import { Sidebar } from "@/components/Sidebar";
import { PropertyYearSwitcher } from "@/components/PropertyYearSwitcher";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function AppShell({
  children,
  brandName,
}: {
  children: React.ReactNode;
  brandName: string;
}) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const username = session?.user?.email?.split("@")[0] ?? "-";
  const role = (session?.user as any)?.role ?? "OPERATEUR";

  return (
    <div className="ambient-grid min-h-screen">
      <div className="grid min-h-screen md:grid-cols-[282px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200/70 bg-[linear-gradient(180deg,_rgba(252,252,251,0.96)_0%,_rgba(241,245,249,0.92)_100%)] text-slate-900 shadow-[20px_0_60px_rgba(15,23,42,0.06)] md:flex md:flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-sm font-semibold text-white shadow-lg shadow-sky-500/25">
                SY
              </div>
              <div>
                <div className="eyebrow text-sky-700">Syndic SaaS</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{brandName}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/80 p-3 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Session active
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">{username}</div>
              <div className="mt-1 text-sm text-slate-500">{role}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <Sidebar />
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-[11px] leading-5 text-slate-500">
            Recettes = encaissements. Depenses = paiements fournisseurs.
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/60 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="min-w-0">
                <PropertyYearSwitcher brandName={brandName} />
              </div>

              <div className="relative" ref={ref}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="glass-panel flex items-center gap-3 rounded-full px-3 py-2 text-left hover:-translate-y-px"
                  aria-label="User menu"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-white">
                    <User size={18} />
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-sm font-semibold text-slate-900">{username}</span>
                    <span className="block text-xs text-slate-500">{role}</span>
                  </span>
                </button>

                {open ? (
                  <div className="absolute right-0 mt-3 w-72 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                    {session?.user ? (
                      <>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Compte
                          </div>
                          <div className="mt-2 truncate text-sm font-semibold text-slate-900">
                            {session.user.email}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{role}</div>
                        </div>

                        <button
                          onClick={() => signOut({ callbackUrl: "/login" })}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:-translate-y-px hover:bg-rose-100"
                        >
                          <LogOut size={16} />
                          Se deconnecter
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <LogIn size={16} />
                        Connexion
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
