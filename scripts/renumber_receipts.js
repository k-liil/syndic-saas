const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";
const START_NUMBER = 10000;

async function main() {
  // Récupérer toutes les recettes triées par date puis par id (ordre stable)
  const receipts = await p.receipt.findMany({
    where: { organizationId: ORG_ID, type: "CONTRIBUTION" },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: { id: true, receiptNumber: true },
  });

  console.log(`📊 ${receipts.length} recettes à renuméroter (${START_NUMBER} → ${START_NUMBER + receipts.length - 1})`);

  // On doit d'abord passer à des numéros négatifs temporaires pour éviter les conflits de contrainte unique
  console.log("🔄 Étape 1: numéros temporaires...");
  for (let i = 0; i < receipts.length; i++) {
    await p.receipt.update({
      where: { id: receipts[i].id },
      data: { receiptNumber: -(i + 1) },
    });
  }

  // Puis renuméroter dans l'ordre final
  console.log("🔄 Étape 2: numérotation finale...");
  for (let i = 0; i < receipts.length; i++) {
    await p.receipt.update({
      where: { id: receipts[i].id },
      data: { receiptNumber: START_NUMBER + i },
    });
  }

  console.log(`\n✅ Renumérotation terminée: E${START_NUMBER} → E${START_NUMBER + receipts.length - 1}`);
}

main().catch(console.error).finally(() => p.$disconnect());
