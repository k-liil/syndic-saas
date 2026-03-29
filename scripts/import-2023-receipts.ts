import { PrismaClient, PaymentMethod, ReceiptType } from "@prisma/client";
import * as xlsx from "xlsx";
import * as path from "path";
import { reallocateUnitContributions } from "../src/lib/allocation"; // Use the newly created service!

const prisma = new PrismaClient();

function parseDate(dateStr: string | number): string {
  if (typeof dateStr === "number") {
    // Excel date number
    const d = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
    return d.toISOString().slice(0, 10);
  }
  if (typeof dateStr === "string") {
    const parts = dateStr.trim().split("/");
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }
  return String(dateStr);
}

function getMethod(methodStr: string): PaymentMethod {
  const m = String(methodStr).toLowerCase();
  if (m.includes("virement")) return PaymentMethod.TRANSFER;
  if (m.includes("chèque")) return PaymentMethod.CHECK;
  if (m.includes("espèce") || m.includes("cash")) return PaymentMethod.CASH;
  return PaymentMethod.CASH;
}

async function main() {
  const orgName = "Les Jardins de Cherrat";
  const org = await prisma.organization.findFirst({
    where: { name: orgName },
  });

  if (!org) {
    throw new Error(`Org not found: ${orgName}`);
  }

  const filePath = path.join(process.cwd(), "liste-des-paiements-du-01-01-2020-au-31-12-2023.xlsx");
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any>(sheet);

  console.log(`Analyzing ${rows.length - 1} rows...`);

  // Target date for all these receipts
  const targetDate = new Date("2024-01-01T00:00:00.000Z");

  const unitsRecalculated = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    // Columns mapping based on sheet structure
    const ref = row["Liste des paiements Du : 01/01/2020 Au : 31/12/2023"];
    const mode = row["__EMPTY"];
    const rawDate = row["__EMPTY_1"];
    const bienLot = row["__EMPTY_2"];
    const montantRaw = row["__EMPTY_4"];
    const commentOrig = row["__EMPTY_5"];

    if (!bienLot) {
      console.log(`Row ${i + 1} SKIP: No unit (lot) found. Reference: ${ref}`);
      continue;
    }

    const amount = Number(montantRaw);
    if (!amount || isNaN(amount)) {
      console.log(`Row ${i + 1} SKIP: Invalid amount for lot ${bienLot}`);
      continue;
    }

    const trueDate = parseDate(rawDate);
    const method = getMethod(mode);

    // Find the unit in DB
    const unit = await prisma.unit.findFirst({
      where: {
        organizationId: org.id,
        OR: [
          { lotNumber: { equals: String(bienLot).trim(), mode: "insensitive" } },
          { reference: { equals: String(bienLot).trim(), mode: "insensitive" } }
        ]
      },
      include: {
        ownerships: {
          where: { endDate: null },
          select: { ownerId: true }
        }
      }
    });

    if (!unit) {
      console.log(`Row ${i + 1} ERROR: Unit not found for lot ${bienLot}`);
      continue;
    }

    const ownerId = unit.ownerships[0]?.ownerId;
    if (!ownerId) {
      console.log(`Row ${i + 1} ERROR: No active owner for unit ${bienLot}`);
      continue;
    }

    // Build the injected Note
    const existingComment = commentOrig ? ` | Commentaire: ${commentOrig}` : "";
    const note = `Histo: Payé originellement le ${trueDate}${existingComment}`;

    // Compute next receipt number uniquely
    const lastReceipt = await prisma.receipt.findFirst({
      where: { organizationId: org.id },
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true },
    });
    const nextNumber = lastReceipt ? lastReceipt.receiptNumber + 1 : 1;

    // Create receipt
    const receipt = await prisma.receipt.create({
      data: {
        organizationId: org.id,
        receiptNumber: nextNumber,
        type: ReceiptType.CONTRIBUTION,
        ownerId,
        buildingId: unit.buildingId!,
        unitId: unit.id,
        amount,
        method,
        date: targetDate,
        note,
        unallocatedAmount: amount, // will be taken care of by reallocate
      }
    });

    console.log(`Row ${i + 1} SUCCESS: Inserted receipt ${receipt.receiptNumber} (${amount} MAD) for lot ${bienLot}`);

    unitsRecalculated.add(unit.id);
  }

  console.log(`\nImport complete! Starting dynamic recalculation for ${unitsRecalculated.size} lots...`);

  // Force chronological reallocation using the new service!
  for (const unitId of unitsRecalculated) {
    // We execute sequentially to avoid transaction deadlocks
    await prisma.$transaction(async (tx) => {
      await reallocateUnitContributions(tx, unitId, org.id);
    }, { timeout: 30000 });
  }

  console.log("Reallocation completed! Everything is correctly smoothed into 2024+ dues.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
