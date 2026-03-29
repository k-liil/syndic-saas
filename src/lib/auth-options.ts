import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureOrganizationForUser } from "@/lib/organization";
import { normalizeRole } from "@/lib/roles";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  debug: process.env.AUTH_DEBUG === "true",
  logger: {
    error(code, metadata) {
      console.error("[AUTH_LOG] NextAuth error:", code, metadata ?? "");
    },
    warn(code) {
      console.warn("[AUTH_LOG] NextAuth warn:", code);
    },
    debug(code, metadata) {
      if (process.env.AUTH_DEBUG === "true") {
        console.log("[AUTH_LOG] NextAuth debug:", code, metadata ?? "");
      }
    },
  },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email =
            typeof credentials?.email === "string" ? credentials.email.trim() : "";
          const password =
            typeof credentials?.password === "string" ? credentials.password : "";

          if (!email || !password) {
            console.warn("[AUTH_LOG] Credentials missing email/password.");
            return null;
          }

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            console.warn("[AUTH_LOG] User not found for email:", email);
            return null;
          }
          if (!user.isActive) {
            console.warn("[AUTH_LOG] User inactive:", email);
            return null;
          }
          if (!user.passwordHash) {
            console.warn("[AUTH_LOG] User has no password hash:", email);
            return null;
          }

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) {
            console.warn("[AUTH_LOG] Password mismatch for email:", email);
            return null;
          }

          console.log("[AUTH_LOG] Login authorize success for:", email);
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
            role: normalizeRole(user.role),
          } as any;
        } catch (error) {
          console.error("[AUTH_LOG] authorize() crashed:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn() {
      return true;
    },

    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = (user as any).id;
          token.role = normalizeRole((user as any).role);
          // Optimization: Pre-fetch organization during login
          const org = await ensureOrganizationForUser(String(token.id));
          token.organizationId = org.id;
          token.organizationName = org.name;
        } else if (token.id && !token.organizationId) {
          // Fallback for existing sessions without orgId
          const org = await ensureOrganizationForUser(String(token.id));
          token.organizationId = org.id;
          token.organizationName = org.name;
        }
        return token;
      } catch (error) {
        console.error("[AUTH_LOG] jwt callback failed:", error);
        throw error;
      }
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).organizationName = token.organizationName;
      }
      return session;
    },
  },
};
