import { PrismaClient, PaymentMethod, ReceiptType } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const orgId = 'cmmyv5nxi0002num0zk6du1ki';
  const buildingId = '16d1f113-8e87-4a62-b93f-a682dd58377d';
  const bankId = 'cmmz17s5t0005nu8w9ky2t0o5'; // Attijariwafa Bank

  console.log('--- Final Importing 2026 Receipts for Immeuble 4 ---');

  // 1. Fetch metadata
  const lastReceipt = await prisma.receipt.findFirst({
    where: { organizationId: orgId },
    orderBy: { receiptNumber: 'desc' },
    select: { receiptNumber: true }
  });
  let nextReceiptNumber = (lastReceipt?.receiptNumber || 0) + 1;
  console.log(`Starting with receipt number: ${nextReceiptNumber}`);

  const ownerships = await prisma.ownership.findMany({
    where: { 
        organizationId: orgId, 
        endDate: null, 
        unit: { buildingId: buildingId } 
    },
    select: { unitId: true, ownerId: true }
  });
  const unitToOwnerId = new Map(ownerships.map(o => [o.unitId, o.ownerId]));

  const units = await prisma.unit.findMany({
    where: { buildingId },
    select: { id: true, lotNumber: true }
  });
  const lotToUnitId = new Map<string, string>();
  for (const u of units) {
      const lotNumOnly = u.lotNumber.split('.').pop()?.replace('A', '') || '';
      lotToUnitId.set(lotNumOnly, u.id);
  }

  // 2. Load Excel Data
  const workbook = XLSX.readFile('Gestion Syndic Intellak II v10.xlsx');
  const sheet = workbook.Sheets['2026'];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].includes('Immeuble') && rows[i].includes(4)) {
      start = i;
      break;
    }
  }

  if (start === -1) {
    console.error('Could not find Immeuble 4 in Excel');
    return;
  }

  let importedCount = 0;
  let totalAmount = 0;
  let inData = false;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (i > start && row && row.includes('Immeuble')) break;
    if (row && row.includes('Apprt')) { inData = true; continue; }
    if (inData && row && (row[0] === 'TOTAL' || (typeof row[0] === 'string' && row[0].includes('Total')))) {
      inData = false;
      continue;
    }

    if (inData && row && typeof row[0] === 'number') {
      const lotKey = String(row[0]);
      const unitId = lotToUnitId.get(lotKey);
      const ownerId = unitId ? unitToOwnerId.get(unitId) : null;

      if (!unitId || !ownerId) {
        console.warn(`Lot ${lotKey}: Unit or Owner not found. skipping.`);
        continue;
      }

      // Columns 2-13 (Jan-Dec), 14 (Garage)
      for (let m = 2; m <= 14; m++) {
        const amount = Number(row[m]);
        if (amount > 0) {
          const date = (m <= 13) 
            ? new Date(Date.UTC(2026, m - 2, 1))
            : new Date(Date.UTC(2026, 11, 31));

          await prisma.receipt.create({
            data: {
              organizationId: orgId,
              buildingId: buildingId,
              ownerId: ownerId,
              unitId: unitId,
              receiptNumber: nextReceiptNumber++,
              amount: amount,
              date: date,
              method: PaymentMethod.CASH,
              type: ReceiptType.CONTRIBUTION,
              bankId: bankId,
              note: m === 14 ? 'Cotisation Garage 2026 (Import)' : `Cotisation 2026 M${m-1} (Import)`,
            }
          });

          importedCount++;
          totalAmount += amount;
        }
      }
    }
  }

  console.log(`Successfully completed!`);
  console.log(`Imported ${importedCount} receipts for a total of ${totalAmount} DH.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
