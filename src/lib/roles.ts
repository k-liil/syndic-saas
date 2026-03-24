export type AppRole = "SUPER_ADMIN" | "MANAGER" | "OWNER";
export type LegacyAppRole =
  | AppRole
  | "ADMIN"
  | "VIEWER"
  | "OPERATOR";

const ROLE_RANK: Record<AppRole, number> = {
  OWNER: 0,
  MANAGER: 1,
  SUPER_ADMIN: 2,
};

export function normalizeRole(role?: string | null): AppRole {
  switch (role) {
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    case "ADMIN":
    case "MANAGER":
    case "OPERATOR":
      return "MANAGER";
    case "VIEWER":
    case "OWNER":
    default:
      return "OWNER";
  }
}

export function hasMinRole(role: string | null | undefined, minimumRole: AppRole) {
  return ROLE_RANK[normalizeRole(role)] >= ROLE_RANK[minimumRole];
}

export function isSuperAdmin(role: string | null | undefined) {
  return normalizeRole(role) === "SUPER_ADMIN";
}

export function canManage(role: string | null | undefined) {
  return hasMinRole(role, "MANAGER");
}

export function canAccessSettings(role: string | null | undefined) {
  return canManage(role);
}

export function canManageUsers(role: string | null | undefined) {
  return isSuperAdmin(role);
}

export function canManageOrganizations(role: string | null | undefined) {
  return isSuperAdmin(role);
}

export function getRoleLabel(role: string | null | undefined) {
  switch (normalizeRole(role)) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "MANAGER":
      return "Gestionnaire";
    case "OWNER":
    default:
      return "Coproprietaire";
  }
}
