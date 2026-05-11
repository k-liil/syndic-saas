"use client";

import { SidebarV2 } from "@/components/SidebarV2";
import { ResidenceSwitcher } from "@/components/ResidenceSwitcher";
import { UserCardTopbar } from "@/components/UserCardTopbar";
import { useSession } from "next-auth/react";
import { Bell, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

// AppShellV2 — sidebar shows the Syndicly brand. Topbar holds the residence
// switcher (left), notifications bell + user card (right). The fiscal-year
// selector is page-scoped: pages that depend on a year render <YearSelector />
// themselves.
export function AppShellV2({
  children,
  brandName: _brandName, // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  children: React.ReactNode;
  brandName: string;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { loading: orgLoading } = useOrganization();
  const apiUrl = useApiUrl();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const role = getRoleLabel(session?.user?.role);
  const roleCode = session?.user?.role;
  const canSeeNotifications = canManage(roleCode);

  useEffect(() => {
    if (!canSeeNotifications) return;
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
    const interval = window.setInterval(() => void loadNotifications(), 120000);
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
    <div className="min-h-screen">
      {/* Mobile nav drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl">
            <div className="flex h-12 shrink-0 items-center justify-end border-b border-slate-200 px-3">
              <button
                onClick={() => setMobileNavOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Fermer le menu"
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarV2 onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-screen md:grid-cols-[282px_minmax(0,1fr)] bg-[#FCFCFB]">
        <aside className="sticky top-0 hidden h-screen border-r border-slate-200/70 md:flex md:flex-col">
          <SidebarV2 />
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
            <div className="flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu size={20} />
                </button>
                <ResidenceSwitcher />
              </div>

              <div className="relative flex items-center gap-3" ref={ref}>
                {canSeeNotifications ? (
                  <div className="relative">
                    <button
                      onClick={() => setNotificationsOpen((value) => !value)}
                      className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-100"
                      aria-label="Notifications"
                    >
                      <Bell size={18} />
                      {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-md bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      ) : null}
                    </button>

                    {notificationsOpen ? (
                      <div className="absolute right-0 top-full z-50 mt-1 w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:right-0 sm:w-96">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Notifications</div>
                            <div className="text-xs text-slate-500">{unreadCount} non lue(s)</div>
                          </div>
                          {unreadCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => void markAllNotificationsRead()}
                              className="cursor-pointer text-xs font-semibold text-cyan-700 hover:text-cyan-800"
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
                                    <div className="mt-1 text-xs text-slate-600">{item.message || "Nouvelle activité"}</div>
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

                {session?.user ? (
                  <UserCardTopbar
                    email={session.user.email ?? "-"}
                    roleLabel={role}
                    roleCode={roleCode}
                  />
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                  >
                    Connexion
                  </Link>
                )}
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {orgLoading ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="animate-pulse text-sm text-slate-400">
                  Chargement de l&apos;environnement...
                </div>
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
