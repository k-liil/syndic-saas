import { PrismaClient } from "@prisma/client";
import { DEFAULT_ACCOUNTING_POST_TEMPLATES } from "../src/lib/accounting-post-defaults";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting accounting posts seed...");

  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations`);

  for (const org of orgs) {
    console.log(`\nProcessing organization: ${org.name} (${org.id})`);

    for (const post of DEFAULT_ACCOUNTING_POST_TEMPLATES) {
      const existing = await prisma.accountingPost.findFirst({
        where: { organizationId: org.id, code: post.code },
      });

      if (existing) {
        console.log(`  - ${post.code} ${post.name}: already exists, skipping`);
        continue;
      }

      await prisma.accountingPost.create({
        data: {
          organizationId: org.id,
          code: post.code,
          name: post.name,
          postType: post.postType,
          note: post.note,
          isActive: false,
        },
      });
      console.log(`  + ${post.code} ${post.name}: created`);
    }
  }

  console.log("\nSeed completed!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
