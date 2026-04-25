"use client";

import { Sidebar } from "@/components/Sidebar";
import { PropertyYearSwitcher } from "@/components/PropertyYearSwitcher";
import { useSession, signOut } from "next-auth/react";
import { Bell, LogIn, LogOut, Menu, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { canManage, getRoleLabel } from "@/lib/roles";
import { useApiUrl, useOrganization } from "@/lib/org-context";

type NotificationItem = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  claim?: {
    id: string;
    title: string;
    status: string;
  } | null;
};

export function AppShell({
  children,
  brandName,
}: {
  children: React.ReactNode;
  brandName: string;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { org: orgInfo, loading: orgLoading } = useOrganization();
  const apiUrl = useApiUrl();

  const outerWrapperClass = "";
  const parentBgClass = "bg-[#FCFCFB]";
  const menuBgClass = "bg-transparent !bg-none border-slate-200/70 shadow-none";
  const pageBgClass = "bg-transparent shadow-none";
  const headerBgClass = "bg-white/40 border-slate-200/50";

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const username = session?.user?.email?.split("@")[0] ?? "-";
  const role = getRoleLabel(session?.user?.role);
  const roleCode = session?.user?.role;
  const canSeeNotifications = canManage(roleCode);

  useEffect(() => {
    if (!canSeeNotifications) {
      return;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch(apiUrl("/api/notifications"));
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        setNotifications(Array.isArray(data?.items) ? data.items : []);
        setUnreadCount(Number(data?.unreadCount ?? 0));
      } catch {
        if (cancelled) return;
        setNotifications([]);
        setUnreadCount(0);
      }
    }

    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 120000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiUrl, canSeeNotifications]);

  async function markNotificationRead(id: string) {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    const response = await fetch(apiUrl("/api/notifications"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      const fresh = await fetch(apiUrl("/api/notifications"));
      const data = await fresh.json().catch(() => null);
      setNotifications(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount ?? 0));
    }
  }

  async function markAllNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    const response = await fetch(apiUrl("/api/notifications"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });

    if (!response.ok) {
      const fresh = await fetch(apiUrl("/api/notifications"));
      const data = await fresh.json().catch(() => null);
      setNotifications(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount ?? 0));
    }
  }

  function formatNotificationDate(value: string) {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className={`${outerWrapperClass} min-h-screen`}>
      {/* Mobile nav drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Syndicly Logo" className="h-10 w-10 object-contain drop-shadow-sm" />
                <div className="text-base font-semibold text-slate-900">Syndicly</div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
              <Sidebar onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="border-t border-slate-200 px-5 py-3 text-[11px] leading-5 text-slate-500">
              Recettes = encaissements. Depenses = paiements fournisseurs.
            </div>
          </div>
        </div>
      ) : null}

      <div className={`grid min-h-screen md:grid-cols-[282px_minmax(0,1fr)] ${parentBgClass}`}>
        <aside className={`sticky top-0 hidden h-screen border-r text-slate-900 md:flex md:flex-col ${menuBgClass}`}>
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Syndicly Logo"
              className="h-10 w-10 object-contain drop-shadow-sm"
            />
            <div className="text-base font-semibold text-slate-900">
              Syndicly
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <Sidebar />
          </div>

          <div className="border-t border-slate-200 px-5 py-3 text-[11px] leading-5 text-slate-500">
            Recettes = encaissements. Depenses = paiements fournisseurs.
          </div>
        </aside>

        <div className={`flex min-h-screen flex-col ${pageBgClass}`}>
          <header className={`sticky top-0 z-30 flex h-16 shrink-0 items-center border-b backdrop-blur-xl ${headerBgClass}`}>
            <div className="flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu size={20} />
                </button>
                <Suspense
                  fallback={
                    <div className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
                      Chargement...
                    </div>
                  }
                >
                  <PropertyYearSwitcher brandName={brandName} />
                </Suspense>
              </div>

              <div className="relative flex items-center gap-3" ref={ref}>
                {canSeeNotifications ? (
                  <div className="relative">
                    <button
                      onClick={() => setNotificationsOpen((value) => !value)}
                      className="glass-panel relative flex h-12 w-12 items-center justify-center rounded-md hover:-translate-y-px"
                      aria-label="Notifications"
                    >
                      <Bell size={18} />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </button>

                    {notificationsOpen ? (
                      <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm z-50 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:right-0 sm:w-96">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Notifications</div>
                            <div className="text-xs text-slate-500">{unreadCount} non lue(s)</div>
                          </div>
                          {unreadCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => void markAllNotificationsRead()}
                              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                            >
                              Tout lire
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-4 max-h-96 space-y-2 overflow-auto">
                          {notifications.length === 0 ? (
                            <div className="rounded-md bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                              Aucune notification.
                            </div>
                          ) : (
                            notifications.map((item) => (
                              <Link
                                key={item.id}
                                href={item.link || "/organisation/claims"}
                                onClick={() => {
                                  setNotificationsOpen(false);
                                  if (!item.isRead) {
                                    void markNotificationRead(item.id);
                                  }
                                }}
                                className={[
                                  "block rounded-md border px-4 py-3 transition",
                                  item.isRead
                                    ? "border-slate-200 bg-white hover:bg-slate-50"
                                    : "border-cyan-100 bg-cyan-50/70 hover:bg-cyan-50",
                                ].join(" ")}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                                    <div className="mt-1 text-xs text-slate-600">{item.message || "Nouvelle activite"}</div>
                                  </div>
                                  {!item.isRead ? (
                                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-md bg-cyan-500" />
                                  ) : null}
                                </div>
                                <div className="mt-2 text-[11px] text-slate-400">
                                  {formatNotificationDate(item.createdAt)}
                                </div>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  onClick={() => setOpen((v) => !v)}
                  className="glass-panel flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left hover:-translate-y-px"
                  aria-label="User menu"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-950 text-white">
                    <User size={16} />
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-xs font-semibold text-slate-900">{username}</span>
                    <span className="block text-[10px] text-slate-500 leading-none">{role}</span>
                  </span>
                </button>

                {open ? (
                  <div className="absolute right-0 mt-35 w-72 z-50 rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
                    {session?.user ? (
                      <>
                        <div className="rounded-md bg-slate-50 p-4">
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
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:-translate-y-px hover:bg-rose-100"
                        >
                          <LogOut size={16} />
                          Se deconnecter
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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

          <main className="min-h-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {orgLoading ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="animate-pulse text-sm text-slate-400">Chargement de l&apos;environnement...</div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
