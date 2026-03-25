import { normalizeRole, type AppRole } from "@/lib/roles";

export type PageSection =
  | "dashboard"
  | "suivi"
  | "operations"
  | "gestion"
  | "organisation"
  | "administration";

export type PageRegistryItem = {
  title: string;
  href: string;
  icon: string;
  section: PageSection;
  defaultEnabled: boolean;
  roles: Record<AppRole, boolean>;
};

export const PAGE_VISIBILITY_REGISTRY: PageRegistryItem[] = [
  {
    title: "Tableau de bord",
    href: "/dashboard",
    icon: "LayoutDashboard",
    section: "dashboard",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Vue annuelle",
    href: "/ops/contributions/year",
    icon: "CalendarRange",
    section: "suivi",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Generer cotisations",
    href: "/ops/dues_generate",
    icon: "Sparkles",
    section: "suivi",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Recettes",
    href: "/ops/receipts",
    icon: "Banknote",
    section: "operations",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Depenses",
    href: "/ops/payments",
    icon: "Receipt",
    section: "operations",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Budgets",
    href: "/ops/budgets",
    icon: "BarChart3",
    section: "operations",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Comptabilite",
    href: "/ops/accounting",
    icon: "Calculator",
    section: "operations",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Batiments",
    href: "/setup/buildings",
    icon: "Building2",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Lots",
    href: "/setup/units",
    icon: "Home",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Coproprietaires",
    href: "/setup/owners",
    icon: "Users",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Prestataires",
    href: "/setup/suppliers",
    icon: "Truck",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Postes comptables",
    href: "/setup/accounting-posts",
    icon: "FileText",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Parametres",
    href: "/setup/settings",
    icon: "Settings",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: false },
  },
  {
    title: "Utilisateurs",
    href: "/setup/users",
    icon: "Users",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: false, OWNER: false },
  },
  {
    title: "Organisations",
    href: "/setup/organizations",
    icon: "Shield",
    section: "gestion",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: false, OWNER: false },
  },
  {
    title: "Assemblees",
    href: "/organisation/assemblies",
    icon: "Users",
    section: "organisation",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Incidents",
    href: "/organisation/incidents",
    icon: "AlertCircle",
    section: "organisation",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Reclamations",
    href: "/organisation/claims",
    icon: "MessageSquare",
    section: "organisation",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Coffre-Fort",
    href: "/organisation/vault",
    icon: "Vault",
    section: "organisation",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: true, OWNER: true },
  },
  {
    title: "Visibilite des pages",
    href: "/setup/page-visibility",
    icon: "Shield",
    section: "administration",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: false, OWNER: false },
  },
  {
    title: "Maintenance",
    href: "/setup/maintenance",
    icon: "Settings",
    section: "administration",
    defaultEnabled: true,
    roles: { SUPER_ADMIN: true, MANAGER: false, OWNER: false },
  },
];

export type PageVisibilityRecord = {
  href: string;
  title: string;
  section: PageSection;
  icon: string;
  isEnabled: boolean;
  roles: Record<AppRole, boolean>;
};

export function getDefaultPageVisibilityRecords(): PageVisibilityRecord[] {
  return PAGE_VISIBILITY_REGISTRY.map((item) => ({
    href: item.href,
    title: item.title,
    section: item.section,
    icon: item.icon,
    isEnabled: item.defaultEnabled,
    roles: item.roles,
  }));
}

export function mergePageVisibilitySettings(
  stored: Array<{
    href: string;
    title: string;
    section: string;
    icon: string;
    isEnabled: boolean;
    superAdmin: boolean;
    admin: boolean;
    manager: boolean;
    operator: boolean;
    viewer: boolean;
    owner: boolean;
  }>,
) {
  const defaults = getDefaultPageVisibilityRecords();
  const byHref = new Map(stored.map((item) => [item.href, item]));

  return defaults.map((item) => {
    const saved = byHref.get(item.href);
    if (!saved) {
      return item;
    }

    return {
      href: item.href,
      title: saved.title || item.title,
      section: (saved.section as PageSection) || item.section,
      icon: saved.icon || item.icon,
      isEnabled: saved.isEnabled,
      roles: {
        SUPER_ADMIN: saved.superAdmin,
        MANAGER: saved.manager || saved.admin || saved.operator,
        OWNER: saved.owner,
      },
    };
  });
}

export function roleCanSeePage(
  item: PageVisibilityRecord,
  role: AppRole | null | undefined | string,
) {
  if (!item.isEnabled) return false;
  const normalized = normalizeRole(role);
  return Boolean(item.roles[normalized]);
}

export function findPageVisibilityForPath(
  items: PageVisibilityRecord[],
  pathname: string,
) {
  return items.find((item) => {
    if (item.href === pathname) {
      return true;
    }

    if (item.href !== "/" && pathname.startsWith(`${item.href}/`)) {
      return true;
    }

    return false;
  });
}
