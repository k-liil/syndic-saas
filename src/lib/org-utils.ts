import { prisma } from "@/lib/prisma";
import { AuthGateSuccess, getOrganizationIdsForRole } from "@/lib/authz";

export async function getOrgId(gate: AuthGateSuccess): Promise<string | undefined> {
  if (gate.isSuperAdmin) {
    return undefined;
  }

  return (
    getOrganizationIdsForRole(gate, "MANAGER")[0] ??
    gate.organizationId ??
    undefined
  );
}

export async function getOrgIdFromRequest(
  req: Request,
  gate: AuthGateSuccess
): Promise<string | undefined> {
  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get("orgId")?.trim();

  // 1. Try URL parameter
  if (orgIdParam) {
    if (gate.isSuperAdmin) {
      const organization = await prisma.organization.findUnique({
        where: { id: orgIdParam },
        select: { id: true },
      });
      return organization?.id;
    }

    const accessibleOrgIds = getOrganizationIdsForRole(gate, "MANAGER");
    return accessibleOrgIds.includes(orgIdParam) ? orgIdParam : undefined;
  }

  // 2. Try Cookie fallback (especially important for SuperAdmins)
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/syndic-org-id=([^;]+)/);
  const cookieOrgId = match ? match[1] : null;

  if (cookieOrgId && gate.isSuperAdmin) {
    // Basic verification for superadmin
    const organization = await prisma.organization.findUnique({
      where: { id: cookieOrgId },
      select: { id: true },
    });
    return organization?.id;
  }

  // 3. Last resort
  return getOrgId(gate);
}
