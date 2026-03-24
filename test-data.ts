import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
prisma.organization.findUnique({ where: { slug: "les-jardins-de-cherrat" } })
  .then((org) => {
    console.log("DB DATA:");
    console.log(JSON.stringify(org, null, 2));
    process.exit(0);
  });
