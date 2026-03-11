import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false as const, status: 401, error: "UNAUTHENTICATED" };
  }
  return { ok: true as const, session };
}

export async function requireAdmin() {
  const r = await requireAuth();
  if (!r.ok) return r;

  const role = (r.session.user as any)?.role;
  if (role !== "ADMIN") {
    return { ok: false as const, status: 403, error: "FORBIDDEN" };
  }

  return { ok: true as const, session: r.session };
}