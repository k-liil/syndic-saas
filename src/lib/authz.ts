import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { AppRole, hasMinRole, isSuperAdmin, normalizeRole } from "@/lib/roles";

export type UserOrganizationAccess = {
  organizationId: string;
  role: AppRole;
};

export type AuthGateSuccess = {
  ok: true;
  session: Awaited<ReturnType<typeof getServerSession>>;
  userId: string | undefined;
  isSuperAdmin: boolean;
  organizationId: string | null;
  userOrganizations?: UserOrganizationAccess[];
};

export type AuthGateFailure = {
  ok: false;
  status: number;
  error: string;
};

export type AuthGateResult = AuthGateSuccess | AuthGateFailure;

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (process.env.NODE_ENV === "development") {
    console.log("[AUTH DEBUG] requireAuth session found:", !!session, "userId:", (session?.user as any)?.id);
  }

  if (!session?.user || !(session.user as any)?.id) {
    return { ok: false as const, status: 401, error: "UNAUTHENTICATED" };
  }

  const role = normalizeRole(session.user.role);
  const userId = session.user.id;
  const sessionOrgId = (session.user as any).organizationId;

  if (isSuperAdmin(role)) {
    return { 
      ok: true as const, 
      session, 
      userId,
      isSuperAdmin: true,
      organizationId: sessionOrgId || null,
    };
  }
  
  // Use organization from session if available (cached in JWT)
  if (sessionOrgId) {
    return {
      ok: true as const,
      session,
      userId,
      isSuperAdmin: false,
      organizationId: sessionOrgId,
      userOrganizations: [
        { organizationId: sessionOrgId, role },
      ],
    };
  }

  // Fallback for sessions that don't have orgId yet
  const userOrgsRaw = await prisma.userOrganization.findMany({
    where: { userId },
    select: { organizationId: true, role: true },
  });
  const userOrgs = userOrgsRaw.map((item) => ({
    organizationId: item.organizationId,
    role: normalizeRole(item.role),
  }));
  
  if (userOrgs.length === 0) {
    return { ok: false as const, status: 403, error: "NO_ORGANIZATION" };
  }
  
  return { 
    ok: true as const, 
    session, 
    userId,
    isSuperAdmin: false,
    organizationId: userOrgs[0].organizationId,
    userOrganizations: userOrgs,
  };
}

export async function requireSuperAdmin() {
  const r = await requireAuth();
  if (!r.ok) return r;
  
  if (!r.isSuperAdmin) {
    return { ok: false as const, status: 403, error: "SUPER_ADMIN_REQUIRED" };
  }

  return { ok: true as const, session: r.session, userId: r.userId, isSuperAdmin: true };
}

export async function requireAdmin() {
  return requireRole("MANAGER");
}

export async function requireManager() {
  return requireRole("MANAGER");
}

export async function requireRole(minimumRole: AppRole) {
  const r = await requireAuth();
  if (!r.ok) return r;

  if (r.isSuperAdmin) {
    return { 
      ok: true as const, 
      session: r.session, 
      userId: r.userId,
      isSuperAdmin: true,
      organizationId: null,
    };
  }

  const hasRole = r.userOrganizations?.some((uo) =>
    hasMinRole(uo.role, minimumRole)
  );

  if (!hasRole) {
    return { ok: false as const, status: 403, error: "FORBIDDEN" };
  }

  return { 
    ok: true as const, 
    session: r.session, 
    userId: r.userId,
    isSuperAdmin: false,
    organizationId: r.organizationId,
  };
}

export function getOrganizationIdsForRole(
  gate: AuthGateSuccess,
  minimumRole: Exclude<AppRole, "SUPER_ADMIN"> = "OWNER"
) {
  if (gate.isSuperAdmin) {
    return [];
  }

  const orgIds = (gate.userOrganizations ?? [])
    .filter((uo) => hasMinRole(uo.role, minimumRole))
    .map((uo) => uo.organizationId);

  return Array.from(new Set(orgIds));
}
