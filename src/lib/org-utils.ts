import { prisma } from "@/lib/prisma";
import { AuthGateSuccess, getOrganizationIdsForRole } from "@/lib/authz";

export async function getOrgId(gate: AuthGateSuccess): Promise<string | undefined> {
  // If it's a super admin, we can fallback to the first accessible org if needed
  // but usually they should pass an orgId param.
  
  const accessibleOrgs = await getOrganizationIdsForRole(gate, "MANAGER");
  
  return (
    accessibleOrgs[0] ??
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

  console.log("[getOrgIdFromRequest] Called");
  console.log("[getOrgIdFromRequest] orgIdParam from URL:", orgIdParam);
  console.log("[getOrgIdFromRequest] gate.isSuperAdmin:", gate.isSuperAdmin);

  // 1. Try URL parameter
  if (orgIdParam) {
    console.log("[getOrgIdFromRequest] Trying orgIdParam:", orgIdParam);

    if (gate.isSuperAdmin) {
      console.log("[getOrgIdFromRequest] User is superadmin, checking if org exists");
      const organization = await prisma.organization.findUnique({
        where: { id: orgIdParam },
        select: { id: true },
      });
      console.log("[getOrgIdFromRequest] Organization found:", !!organization);
      return organization?.id;
    }

    console.log("[getOrgIdFromRequest] User is NOT superadmin, checking accessible orgs");
    const accessibleOrgIds = await getOrganizationIdsForRole(gate, "MANAGER");
    console.log("[getOrgIdFromRequest] Accessible orgs:", accessibleOrgIds);
    const isAccessible = accessibleOrgIds.includes(orgIdParam);
    console.log("[getOrgIdFromRequest] Is orgIdParam accessible?", isAccessible);
    return isAccessible ? orgIdParam : undefined;
  }

  // 2. Try Cookie fallback (especially important for SuperAdmins)
  console.log("[getOrgIdFromRequest] No orgIdParam, trying cookie fallback");
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/syndic-org-id=([^;]+)/);
  const cookieOrgId = match ? match[1] : null;

  console.log("[getOrgIdFromRequest] cookieOrgId:", cookieOrgId);

  if (cookieOrgId && gate.isSuperAdmin) {
    // Basic verification for superadmin
    const organization = await prisma.organization.findUnique({
      where: { id: cookieOrgId },
      select: { id: true },
    });
    console.log("[getOrgIdFromRequest] Cookie org found:', !!organization);
    return organization?.id;
  }

  // 3. Last resort
  console.log("[getOrgIdFromRequest] Using getOrgId fallback");
  const fallbackOrgId = await getOrgId(gate);
  console.log("[getOrgIdFromRequest] Fallback orgId:', fallbackOrgId);
  return fallbackOrgId;
}
