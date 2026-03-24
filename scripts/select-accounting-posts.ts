import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const charges = [
  { code: "6111", name: "Eau", note: "Consommation eau" },
  { code: "6112", name: "Electricite", note: "Consommation electricite" },
  { code: "6113", name: "Gaz", note: "Consommation gaz" },
  { code: "6114", name: "Telephone / Internet", note: "Frais telecommunication" },
  { code: "6115", name: "Assurances", note: "Contrats d'assurance" },
  { code: "6121", name: "Entretien general", note: "Travaux d'entretien" },
  { code: "6122", name: "Espaces verts", note: "Jardinage et espaces verts" },
  { code: "6123", name: "Ascenseur", note: "Maintenance ascenseur" },
  { code: "6124", name: "Nettoyage", note: "Services de nettoyage" },
  { code: "6131", name: "Honoraires syndic", note: "Frais de gestion" },
  { code: "6132", name: "Frais bancaires", note: "Frais et commissions bancaires" },
  { code: "6141", name: "Fournitures bureau", note: "Consommables bureau" },
  { code: "6142", name: "Petit equipement", note: "Materiel et equipement" },
  { code: "6151", name: "Impot et taxes", note: "Taxes et impots locaux" },
  { code: "6152", name: "Cotisations", note: "Cotisations obligatoires" },
  { code: "6161", name: "Deplacements", note: "Frais de deplacement" },
  { code: "6171", name: "Charges personnel", note: "Salaires et charges sociales" },
  { code: "6181", name: "Formation", note: "Formation personnel" },
  { code: "6191", name: "Autres charges", note: "Charges diverses" },
];

const products = [
  { code: "7111", name: "Appels de fonds", note: "Cotisations coproprietaires" },
  { code: "7112", name: "Charges recuperables", note: "Charges refacturables" },
  { code: "7121", name: "Produits divers", note: "Revenus annexes" },
  { code: "7131", name: "Interets bancaires", note: "Interets crediteurs" },
];

async function main() {
  console.log("Starting accounting posts seed...");

  const orgs = await prisma.organization.findMany();
  console.log(`Found ${orgs.length} organizations`);

  for (const org of orgs) {
    console.log(`\nProcessing organization: ${org.name} (${org.id})`);

    for (const post of charges) {
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
          postType: "CHARGE",
          note: post.note,
          isActive: true,
        },
      });
      console.log(`  + ${post.code} ${post.name}: created`);
    }

    for (const post of products) {
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
          postType: "PRODUCT",
          note: post.note,
          isActive: true,
        },
      });
      console.log(`  + ${post.code} ${post.name}: created`);
    }
  }

  console.log("\nSeed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });