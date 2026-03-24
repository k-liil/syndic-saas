import { prisma } from "@/lib/prisma";
import { AuthGateSuccess, getOrganizationIdsForRole } from "@/lib/authz";

export async function getOrgId(gate: AuthGateSuccess): Promise<string | undefined> {
  if (gate.isSuperAdmin) {
    const firstOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return firstOrg?.id ?? undefined;
  }

  return (
    getOrganizationIdsForRole(gate, "OWNER")[0] ??
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

  if (orgIdParam) {
    if (gate.isSuperAdmin) {
      const organization = await prisma.organization.findUnique({
        where: { id: orgIdParam },
        select: { id: true },
      });
      return organization?.id;
    }

    const accessibleOrgIds = getOrganizationIdsForRole(gate, "OWNER");
    return accessibleOrgIds.includes(orgIdParam) ? orgIdParam : undefined;
  }

  return getOrgId(gate);
}
