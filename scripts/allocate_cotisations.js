/**
 * Allocation des cotisations pour les recettes 2024 de Cherrat
 *
 * Logique :
 *  - Cotisation = 6000 MAD/mois (GLOBAL_FIXED) pour chaque lot
 *  - Démarre depuis startYear=2024, startMonth=1 (Janvier 2024)
 *  - Pour chaque recette, on crée les MonthlyDues manquantes et on alloue le montant
 *    en commençant par le mois de début non payé le plus ancien
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
const ORG_ID = "cmn1l60dv0001nucwyt4tcbef";

function addMonths(date, n) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1));
}

function firstOfMonth(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

async function main() {
  const settings = await p.appSettings.findFirst({ where: { organizationId: ORG_ID } });
  const FEE = Number(settings.globalFixedAmount);
  const START = new Date(Date.UTC(settings.startYear, settings.startMonth - 1, 1));
  const MAX_FUTURE = 240;

  console.log(`⚙️  Cotisation: ${FEE} MAD/mois | Début: ${START.toISOString().slice(0, 7)}`);

  // Récupérer toutes les recettes CONTRIBUTION triées par date
  const receipts = await p.receipt.findMany({
    where: { organizationId: ORG_ID, type: "CONTRIBUTION" },
    orderBy: [{ date: "asc" }, { receiptNumber: "asc" }],
    select: { id: true, receiptNumber: true, unitId: true, buildingId: true, ownerId: true, amount: true, date: true },
  });

  console.log(`📊 ${receipts.length} recettes à traiter`);

  let totalDuesCreated = 0;
  let totalAllocsCreated = 0;
  let errors = [];

  for (const receipt of receipts) {
    if (!receipt.unitId) {
      errors.push({ id: receipt.id, n: receipt.receiptNumber, error: "No unitId" });
      continue;
    }

    try {
      let remaining = Number(receipt.amount);
      let futureOffset = 0;

      while (remaining > 0 && futureOffset <= MAX_FUTURE) {
        // Chercher les dues non payées pour ce lot à partir du début
        const dues = await p.monthlyDue.findMany({
          where: {
            organizationId: ORG_ID,
            unitId: receipt.unitId,
            status: { in: ["UNPAID", "PARTIAL"] },
            period: { gte: START },
          },
          orderBy: [{ period: "asc" }],
          select: { id: true, amountDue: true, paidAmount: true, period: true, status: true },
        });

        // Si pas de dues disponibles, créer le prochain mois
        if (dues.length === 0) {
          // Calculer le prochain mois à créer
          const lastDue = await p.monthlyDue.findFirst({
            where: { organizationId: ORG_ID, unitId: receipt.unitId, period: { gte: START } },
            orderBy: { period: "desc" },
            select: { period: true },
          });

          const nextPeriod = lastDue
            ? addMonths(lastDue.period, 1)
            : START;

          await p.monthlyDue.create({
            data: {
              organizationId: ORG_ID,
              unitId: receipt.unitId,
              period: nextPeriod,
              amountDue: FEE,
              paidAmount: 0,
              status: "UNPAID",
            },
          });
          totalDuesCreated++;
          futureOffset++;
          continue;
        }

        let allocated = false;
        for (const due of dues) {
          if (remaining <= 0) break;

          const amountDue = Number(due.amountDue);
          const paidAmount = Number(due.paidAmount);
          const remainingDue = amountDue - paidAmount;
          if (remainingDue <= 0) continue;

          const allocationAmount = Math.min(remaining, remainingDue);

          // Vérifier qu'il n'y a pas déjà une allocation pour cette recette+due
          const existingAlloc = await p.receiptAllocation.findFirst({
            where: { receiptId: receipt.id, dueId: due.id },
          });

          if (!existingAlloc) {
            await p.receiptAllocation.create({
              data: { receiptId: receipt.id, dueId: due.id, amount: allocationAmount },
            });
            totalAllocsCreated++;
          }

          const newPaid = paidAmount + allocationAmount;
          await p.monthlyDue.update({
            where: { id: due.id },
            data: {
              paidAmount: newPaid,
              status: newPaid >= amountDue ? "PAID" : "PARTIAL",
            },
          });

          remaining -= allocationAmount;
          allocated = true;
        }

        // Si tous les dues existants sont payés, créer le suivant
        if (!allocated || (dues.every((d) => Number(d.amountDue) - Number(d.paidAmount) <= 0))) {
          const lastDue = await p.monthlyDue.findFirst({
            where: { organizationId: ORG_ID, unitId: receipt.unitId, period: { gte: START } },
            orderBy: { period: "desc" },
            select: { period: true },
          });

          if (lastDue) {
            const nextPeriod = addMonths(lastDue.period, 1);
            await p.monthlyDue.upsert({
              where: { organizationId_unitId_period: { organizationId: ORG_ID, unitId: receipt.unitId, period: nextPeriod } },
              update: {},
              create: {
                organizationId: ORG_ID,
                unitId: receipt.unitId,
                period: nextPeriod,
                amountDue: FEE,
                paidAmount: 0,
                status: "UNPAID",
              },
            });
            totalDuesCreated++;
          }

          futureOffset++;

          if (!allocated) break;
        } else {
          break;
        }
      }

      // Mettre à jour unallocatedAmount si il reste un solde
      if (remaining > 0) {
        await p.receipt.update({
          where: { id: receipt.id },
          data: { unallocatedAmount: remaining },
        });
      }
    } catch (err) {
      errors.push({ id: receipt.id, n: receipt.receiptNumber, error: err.message });
      console.error(`  ❌ Recette E${receipt.receiptNumber}: ${err.message}`);
    }
  }

  console.log(`\n✅ Terminé`);
  console.log(`   MonthlyDues créées  : ${totalDuesCreated}`);
  console.log(`   Allocations créées  : ${totalAllocsCreated}`);
  console.log(`   Erreurs             : ${errors.length}`);

  const finalDues = await p.monthlyDue.count({ where: { organizationId: ORG_ID } });
  const finalAllocs = await p.receiptAllocation.count();
  const paidDues = await p.monthlyDue.count({ where: { organizationId: ORG_ID, status: "PAID" } });
  const partialDues = await p.monthlyDue.count({ where: { organizationId: ORG_ID, status: "PARTIAL" } });
  const unpaidDues = await p.monthlyDue.count({ where: { organizationId: ORG_ID, status: "UNPAID" } });

  console.log(`\n📊 Bilan:`);
  console.log(`   MonthlyDues total : ${finalDues} (${paidDues} payées, ${partialDues} partielles, ${unpaidDues} non-payées)`);
  console.log(`   Allocations total : ${finalAllocs}`);
}

main().catch(console.error).finally(() => p.$disconnect());
