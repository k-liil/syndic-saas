import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_ACCOUNTING_POST_SOURCE_SLUG,
  ensureOrganizationAccountingPosts,
} from "../src/lib/accounting-post-defaults";

const prisma = new PrismaClient();

async function main() {
  const targetSlug = process.argv[2] ?? "les-jardins-de-cherrat";
  const targetOrg = await prisma.organization.findUnique({
    where: { slug: targetSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!targetOrg) {
    throw new Error(`Organisation introuvable: ${targetSlug}`);
  }

  const result = await ensureOrganizationAccountingPosts(
    prisma,
    targetOrg.id,
    DEFAULT_ACCOUNTING_POST_SOURCE_SLUG,
  );

  console.log(
    `Organisation ${targetOrg.name} (${targetOrg.slug}) synchronisee: ${result.createdCount} poste(s) cree(s).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
