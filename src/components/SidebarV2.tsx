"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowRightLeft,
  Banknote,
  BarChart3,
  Building2,
  CalendarRange,
  Calculator,
  ClipboardList,
  FileText,
  History,
  Home,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Search,
  Settings,
  Shield,
  Sparkles,
  Truck,
  Users,
  Vault,
} from "lucide-react";
import { normalizeRole } from "@/lib/roles";
import {
  PAGE_VISIBILITY_REGISTRY,
  type PageVisibilityRecord,
  roleCanSeePage,
} from "@/lib/page-visibility";
import { SidebarBrand } from "@/components/SidebarBrand";

const ICONS: Record<string, ElementType> = {
  AlertCircle,
  ArrowRightLeft,
  Banknote,
  BarChart3,
  Building2,
  CalendarRange,
  Calculator,
  ClipboardList,
  FileText,
  History,
  Home,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Truck,
  Users,
  Vault,
};

// Pages on which we want to show a numeric badge in the nav (unread counts).
// Wire these to a real hook when the API is ready — see useUnreadCounts() stub below.
const BADGED_HREFS: Record<string, "info" | "alert"> = {
  "/ops/receipts": "info",
  "/organisation/claims": "alert",
};

function useUnreadCounts() {
  // TODO: brancher sur les APIs notifications + receipts pending + claims open.
  // Pour l'instant retourne 0 partout, le badge ne s'affiche pas.
  return { "/ops/receipts": 0, "/organisation/claims": 0 } as Record<string, number>;
}

const sectionOrder = [
  "dashboard",
  "suivi",
  "operations",
  "gestion",
  "organisation",
  "administration",
] as const;
const sectionLabels: Record<(typeof sectionOrder)[number], string> = {
  dashboard: "",
  suivi: "Suivi",
  operations: "Opérations",
  gestion: "Gestion",
  organisation: "Organisation",
  administration: "Administration",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700/70">
      {children}
    </div>
  );
}

function NavItem({
  href,
  title,
  Icon,
  active,
  badge,
  badgeTone,
  onClick,
}: {
  href: string;
  title: string;
  Icon: ElementType;
  active: boolean;
  badge?: number;
  badgeTone?: "info" | "alert";
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] transition",
        active
          ? "bg-gradient-to-r from-sky-500 to-sky-700 text-white shadow-[0_4px_12px_-2px_rgba(14,165,233,0.45)]"
          : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-7 w-7 items-center justify-center rounded-md transition",
          active
            ? "bg-white/20 text-white"
            : "text-slate-500 group-hover:text-slate-700",
        ].join(" ")}
      >
        <Icon size={15} strokeWidth={1.75} />
      </span>
      <span className={active ? "font-semibold" : "font-medium"}>{title}</span>
      {badge && badge > 0 ? (
        <span
          className={[
            "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold",
            active
              ? "bg-white/25 text-white"
              : badgeTone === "alert"
              ? "bg-rose-100 text-rose-700"
              : "bg-sky-100 text-sky-700",
          ].join(" ")}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

const defaultItems: PageVisibilityRecord[] = PAGE_VISIBILITY_REGISTRY.map((item) => ({
  href: item.href,
  title: item.title,
  section: item.section,
  icon: item.icon,
  isEnabled: item.defaultEnabled,
  roles: item.roles,
}));

export function SidebarV2({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = normalizeRole(session?.user?.role);
  const [items, setItems] = useState<PageVisibilityRecord[]>(defaultItems);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const unreadCounts = useUnreadCounts();

  useEffect(() => {
    if (status === "loading") return;

    fetch("/api/page-visibility", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : defaultItems);
      })
      .catch(() => setItems(defaultItems))
      .finally(() => setLoading(false));
  }, [status]);

  // Cmd/Ctrl-K focus the search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("syndicly-sidebar-search")?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visibleItems = items
    .filter((item) => roleCanSeePage(item, role))
    .filter((item) =>
      search.trim()
        ? item.title.toLowerCase().includes(search.toLowerCase().trim())
        : true,
    );

  return (
    <aside className="flex h-full flex-col bg-[#FCFCFB]">
      {/* Header — Brand (matches topbar h-16 for visual alignment) */}
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200/50 px-3">
        <SidebarBrand />
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            id="syndicly-sidebar-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-12 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Nav */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {status === "loading" || loading ? (
          <div className="space-y-2 px-1 py-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="h-9 rounded-lg bg-slate-100/80 animate-pulse"
              />
            ))}
          </div>
        ) : (
          sectionOrder.map((section) => {
            const sectionItems = visibleItems.filter(
              (item) => item.section === section,
            );
            if (sectionItems.length === 0) return null;

            return (
              <div key={section}>
                {sectionLabels[section] ? (
                  <SectionTitle>{sectionLabels[section]}</SectionTitle>
                ) : null}
                <nav className="space-y-0.5 pt-0.5">
                  {sectionItems.map((item) => {
                    const Icon = ICONS[item.icon] ?? Shield;
                    const badge = unreadCounts[item.href];
                    const tone = BADGED_HREFS[item.href];
                    return (
                      <NavItem
                        key={item.href}
                        href={item.href}
                        title={item.title}
                        Icon={Icon}
                        active={isActivePath(pathname, item.href)}
                        badge={badge}
                        badgeTone={tone}
                        onClick={onNavigate}
                      />
                    );
                  })}
                </nav>
              </div>
            );
          })
        )}
      </div>

    </aside>
  );
}
