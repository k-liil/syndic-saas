"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  Banknote,
  Calculator,
  Sparkles,
  Settings,
  Building2,
  Users,
  Home,
  Link2,
  Receipt,
  Truck,
  Tag,
} from "lucide-react";

type Item = { title: string; href: string; icon: React.ElementType };

const dashboard: Item[] = [{ title: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard }];

// Ancien "OPÉRATIONS" (Vue annuelle + Générer cotisations) => devient "SUIVI"
const suivi: Item[] = [
  { title: "Vue annuelle", href: "/ops/year-view", icon: CalendarRange },
  { title: "Générer cotisations", href: "/ops/dues_generate", icon: Sparkles },
];

// Ancien "FINANCES" => devient "OPÉRATIONS" (Recettes/Dépenses/Comptabilité)
const operations: Item[] = [
  { title: "Recettes", href: "/ops/receipts", icon: Banknote },
  { title: "Paiements", href: "/ops/payments", icon: Receipt },
  { title: "Comptabilité", href: "/ops/accounting", icon: Calculator },
];

const gestion: Item[] = [
  { title: "Immeubles", href: "/setup/buildings", icon: Building2 },
  { title: "Lots", href: "/setup/units", icon: Home },
  { title: "Copropriétaires", href: "/setup/owners", icon: Users },
  { title: "Affectations", href: "/setup/ownerships", icon: Link2 },
  { title: "Fournisseurs", href: "/setup/suppliers", icon: Truck },
  { title: "Catégories dépenses", href: "/setup/payment-categories", icon: Tag },
  { title: "Paramètres", href: "/setup/settings", icon: Settings },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
        active ? "bg-zinc-50 text-zinc-900" : "text-zinc-700 hover:bg-zinc-50",
      ].join(" ")}
    >
      <span
        className={[
          "absolute left-0 top-0 h-full w-[3px] rounded-l-lg opacity-0",
          active ? "opacity-100" : "group-hover:opacity-30",
        ].join(" ")}
        style={{ backgroundColor: "var(--brand)" }}
      />
      <Icon size={18} className={active ? "text-[color:var(--brand)]" : "text-zinc-500"} />
      <span className="font-medium">{title}</span>
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  // actif si exactement la route ou si on est dans un sous-chemin
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(href + "/")) return true;
  return false;
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col">
      <div className="px-2 py-3">
        <nav className="space-y-1">
          {dashboard.map((i) => (
            <NavItem
              key={i.href}
              href={i.href}
              title={i.title}
              Icon={i.icon}
              active={isActivePath(pathname, i.href)}
            />
          ))}
        </nav>

        <SectionTitle>Suivi</SectionTitle>
        <nav className="space-y-1">
          {suivi.map((i) => (
            <NavItem
              key={i.href}
              href={i.href}
              title={i.title}
              Icon={i.icon}
              active={isActivePath(pathname, i.href)}
            />
          ))}
        </nav>

        <SectionTitle>Opérations</SectionTitle>
        <nav className="space-y-1">
          {operations.map((i) => (
            <NavItem
              key={i.href}
              href={i.href}
              title={i.title}
              Icon={i.icon}
              active={isActivePath(pathname, i.href)}
            />
          ))}
        </nav>

        <SectionTitle>Gestion</SectionTitle>
        <nav className="space-y-1">
          {gestion.map((i) => (
            <NavItem
              key={i.href}
              href={i.href}
              title={i.title}
              Icon={i.icon}
              active={isActivePath(pathname, i.href)}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t px-4 py-3 text-xs text-zinc-600">
        Recettes = encaissements. Dépenses = paiements fournisseurs.
      </div>
    </aside>
  );
}