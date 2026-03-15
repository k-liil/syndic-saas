"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Banknote,
  Building2,
  CalendarRange,
  Calculator,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

type Item = { title: string; href: string; icon: React.ElementType };

const dashboard: Item[] = [
  { title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
];

const suivi: Item[] = [
  { title: "Vue annuelle", href: "/ops/contributions/year", icon: CalendarRange },
  { title: "Generer cotisations", href: "/ops/dues_generate", icon: Sparkles },
];

const operations: Item[] = [
  { title: "Recettes", href: "/ops/receipts", icon: Banknote },
  { title: "Paiements", href: "/ops/payments", icon: Receipt },
  { title: "Comptabilite", href: "/ops/accounting", icon: Calculator },
];

const gestion: Item[] = [
  { title: "Immeubles", href: "/setup/buildings", icon: Building2 },
  { title: "Lots", href: "/setup/units", icon: Home },
  { title: "Coproprietaires", href: "/setup/owners", icon: Users },
  { title: "Parametres", href: "/setup/settings", icon: Settings },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
  Icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition",
        active
          ? "bg-white text-slate-950 shadow-sm"
          : "text-slate-600 hover:bg-white hover:text-slate-950",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl transition",
          active
            ? "bg-sky-50 text-sky-600"
            : "bg-slate-100 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-800",
        ].join(" ")}
      >
        <Icon size={16} />
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col">
      <div className="space-y-0.5">
        <nav className="space-y-0.5">
          {dashboard.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              title={item.title}
              Icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </nav>

        <SectionTitle>Suivi</SectionTitle>
        <nav className="space-y-0.5">
          {suivi.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              title={item.title}
              Icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </nav>

        <SectionTitle>Operations</SectionTitle>
        <nav className="space-y-0.5">
          {operations.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              title={item.title}
              Icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </nav>

        <SectionTitle>Gestion</SectionTitle>
        <nav className="space-y-0.5">
          {gestion.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              title={item.title}
              Icon={item.icon}
              active={isActivePath(pathname, item.href)}
            />
          ))}
        </nav>
      </div>
    </aside>
  );
}
