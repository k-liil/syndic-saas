const { PrismaClient, DueStatus, ReceiptType } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const lotName = "J1";
  const unit = await prisma.unit.findFirst({
    where: {
      OR: [
        { lotNumber: lotName },
        { reference: lotName }
      ]
    },
    include: {
      ownerships: {
        where: { endDate: null },
        include: { owner: true }
      }
    }
  });

  if (!unit) {
    console.log(`Unit ${lotName} not found.`);
    return;
  }

  console.log(`--- Verification du Lot: ${unit.lotNumber} (${unit.reference}) ---`);
  console.log(`Propriétaire: ${unit.ownerships[0]?.owner?.name || "N/A"}`);
  console.log(`Début Co-pro (startDate): ${unit.ownerships[0]?.startDate?.toISOString().slice(0, 10)}`);

  const dues = await prisma.monthlyDue.findMany({
    where: { unitId: unit.id },
    orderBy: { period: "asc" }
  });

  const receipts = await prisma.receipt.findMany({
    where: { unitId: unit.id, type: ReceiptType.CONTRIBUTION },
    orderBy: { date: "asc" },
    include: {
      allocations: {
        include: { due: true }
      }
    }
  });

  console.log("\n--- REÇUS (Paiements) ---");
  receipts.forEach(r => {
    console.log(`Reçu #${r.receiptNumber} | Date: ${r.date.toISOString().slice(0, 10)} | Montant: ${Number(r.amount).toFixed(2)} | Note: ${r.note || ""}`);
  });

  console.log("\n--- COTISATIONS (Dues) ---");
  dues.forEach(d => {
    const statusIcon = d.status === DueStatus.PAID ? "✅" : d.status === DueStatus.PARTIAL ? "🟡" : "❌";
    console.log(`${statusIcon} Période: ${d.period.toISOString().slice(0, 7)} | Du: ${Number(d.amountDue).toFixed(2)} | Payé: ${Number(d.paidAmount).toFixed(2)} | Status: ${d.status}`);
  });

  const totalDue = dues.reduce((sum, d) => sum + Number(d.amountDue), 0);
  const totalPaid = dues.reduce((sum, d) => sum + Number(d.paidAmount), 0);
  const totalReceipts = receipts.reduce((sum, r) => sum + Number(r.amount), 0);

  console.log("\n--- TOTALS ---");
  console.log(`Total Appels de Fonds: ${totalDue.toFixed(2)} MAD`);
  console.log(`Total Payé (allocations): ${totalPaid.toFixed(2)} MAD`);
  console.log(`Total Reçu (reçus): ${totalReceipts.toFixed(2)} MAD`);
  console.log(`Solde impayé: ${(totalDue - totalPaid).toFixed(2)} MAD`);
}

main().finally(() => prisma.$disconnect());
