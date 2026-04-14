import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const orgId = 'cmmyv5nxi0002num0zk6du1ki';
  const buildingId = '16d1f113-8e87-4a62-b93f-a682dd58377d';

  // 1. Load Excel Data for 2026
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

  const excelMap = new Map<string, number>();
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
      const lotNum = String(row[0]);
      const total = Number(row[15]) || 0;
      excelMap.set(lotNum, total);
    }
  }

  // 2. Load Database Data for 2026
  const units = await prisma.unit.findMany({
    where: { buildingId },
    select: { id: true, lotNumber: true }
  });

  const year2026 = new Date('2026-01-01');
  const year2027 = new Date('2027-01-01');

  const results = [];
  let dbTotalSum = 0;
  let excelTotalSum = 0;

  for (const u of units) {
    const lotKey = u.lotNumber.split('.').pop()?.replace('A', '') || '';
    const receipts = await prisma.receipt.aggregate({
      where: {
        unitId: u.id,
        date: {
          gte: year2026,
          lt: year2027
        }
      },
      _sum: { amount: true }
    });

    const dbTotal = Number(receipts._sum.amount || 0);
    const excelTotal = excelMap.get(lotKey) || 0;
    
    dbTotalSum += dbTotal;
    excelTotalSum += excelTotal;

    if (dbTotal !== excelTotal) {
      results.push({
        lot: u.lotNumber,
        dbTotal,
        excelTotal,
        diff: excelTotal - dbTotal
      });
    }
  }

  console.log('--- Reconciliation Results for Immeuble 4 (2026) ---');
  console.log(`Global Excel Total: ${excelTotalSum}`);
  console.log(`Global DB Total: ${dbTotalSum}`);
  console.log(`Global Diff: ${excelTotalSum - dbTotalSum}`);
  console.log('\nDetailed Discrepancies:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
