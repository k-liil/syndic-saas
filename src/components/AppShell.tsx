"use client";

import { Sidebar } from "@/components/Sidebar";
import { PropertyYearSwitcher } from "@/components/PropertyYearSwitcher";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut, LogIn } from "lucide-react";
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
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const username = session?.user?.email?.split("@")[0] ?? "—";

  return (
    <div className="min-h-screen app-bg">
      {/* ✅ Un seul layout, 2 lignes (header + content), 2 colonnes (sidebar + main) */}
      <div className="w-full">
        <div className="grid min-h-screen grid-rows-[56px_1fr] md:grid-cols-[280px_minmax(0,1fr)]">
          {/* SIDEBAR (col 1, rows 1-2) */}
          <aside className="row-span-2 hidden border-r border-zinc-100 bg-white md:block">
            <div className="h-14 px-4 flex items-center">
              {/* ⚠️ Pas de doublon: on n’affiche PAS brandName en gros ici */}
              <div className="text-sm text-zinc-700">
                Bienvenue, <span className="font-semibold">{username}</span>
              </div>
            </div>

            <div className="h-[calc(100vh-56px)] overflow-y-auto py-4">
              <Sidebar />
            </div>
          </aside>

          {/* HEADER (col 2, row 1) */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-100 bg-white/80 px-4 backdrop-blur md:border-l md:px-6">
            <div className="min-w-0">
<PropertyYearSwitcher brandName={brandName} />
            </div>

            {/* User menu */}
            <div className="relative" ref={ref}>
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center border bg-white hover:bg-zinc-50"
                aria-label="User menu"
              >
                <User size={18} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-64 border bg-white p-3 shadow-lg">
                  {session?.user ? (
                    <>
                      <div className="text-sm">
                        <div className="truncate font-medium">{session.user.email}</div>
                        <div className="text-xs text-zinc-500">
                          {(session.user as any).role}
                        </div>
                      </div>

                      <div className="my-3 h-px bg-zinc-100" />

                      <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="flex w-full items-center gap-2 border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-2 border px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                      <LogIn size={16} />
                      Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* MAIN (col 2, row 2) ✅ border-l = séparation continue avec header */}
          <main className="min-h-0 border-l border-zinc-100 bg-transparent px-8 py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}