"use server";

import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { revalidatePath } from "next/cache";

const DEFAULT_POSTS = [
  { code: "6111", name: "Eau", postType: "CHARGE" },
  { code: "6121", name: "Electricité", postType: "CHARGE" },
  { code: "6131", name: "Entretien et Nettoyage", postType: "CHARGE" },
  { code: "6141", name: "Contrat Ascenseur", postType: "CHARGE" },
  { code: "6151", name: "Petites Réparations", postType: "CHARGE" },
  { code: "6161", name: "Primes d'Assurance", postType: "CHARGE" },
  { code: "6171", name: "Honoraires Syndic", postType: "CHARGE" },
  { code: "6181", name: "Frais Postaux et Bancaires", postType: "CHARGE" },
  { code: "7111", name: "Cotisations Copropriétaires", postType: "PRODUCT" },
  { code: "7121", name: "Produits Financiers", postType: "PRODUCT" },
];

export async function seedDefaultAccountingPosts(organizationId: string) {
  const gate = await requireManager();
  if (!gate.ok || (!gate.isSuperAdmin && gate.organizationId !== organizationId)) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const existingCount = await prisma.accountingPost.count({
      where: { organizationId },
    });

    if (existingCount > 0) {
      // Opt-in to skip if already has data, but we can also just upsert
    }

    for (const post of DEFAULT_POSTS) {
      await prisma.accountingPost.upsert({
        where: {
          organizationId_code: {
            organizationId,
            code: post.code,
          },
        },
        update: {},
        create: {
          organizationId,
          code: post.code,
          name: post.name,
          postType: post.postType as any,
          isActive: true, // Default to active for seeded posts
        },
      });
    }

    revalidatePath("/setup/accounting-posts");
    return { ok: true };
  } catch (error) {
    console.error("Failed to seed accounting posts:", error);
    return { ok: false, error: String(error) };
  }
}
