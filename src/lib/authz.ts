import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { ensureOrganizationForUser } from "@/lib/organization";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "UNAUTHENTICATED" };
  }
  let organizationId = (session.user as any)?.organizationId;
  if (!organizationId) {
    const organization = await ensureOrganizationForUser((session.user as any)?.id);
    organizationId = organization.id;
    (session.user as any).organizationId = organizationId;
  }
  if (!organizationId) {
    return { ok: false as const, status: 403, error: "NO_ORGANIZATION" };
  }
  return { ok: true as const, session, organizationId };
}

export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.ok) return r;

  const role = (r.session.user as any)?.role;
  if (role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "FORBIDDEN" };
  }

  return { ok: true as const, session: r.session, organizationId: r.organizationId };
}
