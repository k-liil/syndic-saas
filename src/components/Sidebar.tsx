"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  Building2,
  CalendarRange,
  Calculator,
  FileText,
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
} from "lucide-react";
import { normalizeRole } from "@/lib/roles";
import { PAGE_VISIBILITY_REGISTRY, type PageVisibilityRecord, roleCanSeePage } from "@/lib/page-visibility";

const ICONS: Record<string, ElementType> = {
  AlertCircle,
  Banknote,
  BarChart3,
  Building2,
  CalendarRange,
  Calculator,
  FileText,
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/80">
      {children}
    </div>
  );
}

function NavItem({
  href,
  title,
  Icon,
  active,
}: {
  href: string;
  title: string;
  Icon: ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-2 px-3 py-1.5 text-[13px] transition",
        active
          ? "bg-sky-50 text-sky-700 font-medium"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-7 w-7 items-center justify-center rounded-lg transition",
          active
            ? "bg-sky-100 text-sky-600"
            : "bg-slate-100 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-800",
        ].join(" ")}
      >
        <Icon size={14} />
      </span>
      <span className="font-medium">{title}</span>
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

const sectionOrder = ["dashboard", "suivi", "operations", "gestion", "organisation", "administration"] as const;
const sectionLabels: Record<(typeof sectionOrder)[number], string> = {
  dashboard: "",
  suivi: "Suivi",
  operations: "Operations",
  gestion: "Gestion",
  organisation: "Organisation",
  administration: "Administration",
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const role = normalizeRole(session?.user?.role);
  const [items, setItems] = useState<PageVisibilityRecord[]>(defaultItems);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    fetch("/api/page-visibility", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : defaultItems);
      })
      .catch(() => setItems(defaultItems))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <aside className="flex h-full flex-col">
        <div className="space-y-2 px-3 py-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-10 rounded-xl bg-slate-100/80 animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  const visibleItems = items.filter((item) => roleCanSeePage(item, role));

  return (
    <aside className="flex h-full flex-col">
      <div className="space-y-0.5">
        {sectionOrder.map((section) => {
          const sectionItems = visibleItems.filter((item) => item.section === section);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section}>
              {sectionLabels[section] ? <SectionTitle>{sectionLabels[section]}</SectionTitle> : null}
              <nav className="space-y-0.5">
                {sectionItems.map((item) => {
                  const Icon = ICONS[item.icon] ?? Shield;
                  return (
                    <NavItem
                      key={item.href}
                      href={item.href}
                      title={item.title}
                      Icon={Icon}
                      active={isActivePath(pathname, item.href)}
                    />
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
