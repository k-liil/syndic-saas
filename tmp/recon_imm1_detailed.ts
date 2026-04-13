import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const ORG_ID = 'cmmyv5nxi0002num0zk6du1ki';
const DB_URL = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

async function run() {
  const excelPath = 'Gestion Syndic Intellak II v10.xlsx';
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['2026'];
  const excelRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('--- RECONCILIATION IMM 1 (2026 VS PRIOR) ---');

  // Find Immeuble 1 section
  let startRow = -1;
  for (let i = 0; i < excelRows.length; i++) {
    if (excelRows[i] && excelRows[i].includes('Immeuble') && excelRows[i].includes(1)) {
      startRow = i;
      break;
    }
  }

  if (startRow === -1) {
    console.error('Could not find Immeuble 1 section');
    return;
  }

  const excelPayments: any[] = [];
  let inData = false;

  for (let i = startRow; i < excelRows.length; i++) {
    const row = excelRows[i];
    if (i > startRow && row && row.includes('Immeuble')) break;
    if (row && row.includes('Apprt')) { inData = true; continue; }
    if (inData && row && (row[0] === 'TOTAL' || row[1] === 'TOTAL' || (typeof row[0] === 'string' && row[0].includes('Total')))) {
      inData = false;
      continue;
    }

    if (inData && row && typeof row[0] === 'number') {
      const apartment = row[0];
      const owner = row[1];
      const remarks = row[16] || '';
      
      // Check each month Jan(2) to Dec(13) and Garage(14)
      for (let m = 2; m <= 14; m++) {
        const val = row[m];
        if (val) {
          let category: 'STANDARD_2026' | 'PRIOR_HISTORICAL' = 'STANDARD_2026';
          let amount = 0;

          if (typeof val === 'number') {
            amount = val;
             // Heuristic: If amount is large (e.g. > 400) and it's in a single month cell, it's likely a bulk payment/relicat
             if (amount > 400 || (remarks && (remarks.includes('2025') || remarks.includes('2024') || remarks.includes('ANC')))) {
               category = 'PRIOR_HISTORICAL';
             }
          } else if (typeof val === 'string' && val.toUpperCase().includes('PAYE')) {
             // 'PAYE' usually indicates a standard payment or already covered
             // But if it's in the 2026 sheet, we should see it in the DB Receipts
             category = 'STANDARD_2026';
          }

          if (amount > 0 || (typeof val === 'string' && val.toUpperCase().includes('PAYE'))) {
            excelPayments.push({
              apartment,
              owner,
              monthIdx: m,
              monthName: excelRows[startRow + 2] ? excelRows[startRow + 2][m] : `Col ${m}`,
              value: val,
              amount,
              category,
              remarks: String(remarks).trim()
            });
          }
        }
      }
    }
  }

  console.log(`\nExcel Payments found for Imm 1: ${excelPayments.length}`);

  // Fetch DB Receipts (Contributions 2026) for Imm 1
  const dbReceipts = await prisma.receipt.findMany({
    where: {
      organizationId: ORG_ID,
      buildingId: '621fc018-5038-441a-a512-ddcaa7a64cd4', // Imm 1
      date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') }
    },
    include: { unit: true }
  });

  // Fetch DB OtherReceipts (Historical) for Imm 1
  const dbOther = await prisma.otherReceipt.findMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { description: { contains: 'Imm1', mode: 'insensitive' } },
        { note: { contains: 'Imm1', mode: 'insensitive' } },
        { description: { contains: 'Immeuble 1', mode: 'insensitive' } },
        { note: { contains: 'Immeuble 1', mode: 'insensitive' } }
      ],
      date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') }
    }
  });

  console.log(`DB Standard 2026 Receipts: ${dbReceipts.length}`);
  console.log(`DB Other Receipts (Historical): ${dbOther.length}`);

  // Identification Logic
  const missingHistorical: any[] = [];
  const missingStandard: any[] = [];

  const excelHistorical = excelPayments.filter(p => p.category === 'PRIOR_HISTORICAL');
  const excelStandard = excelPayments.filter(p => p.category === 'STANDARD_2026');

  // Check Historical
  for (const ex of excelHistorical) {
    const found = dbOther.some(db => 
      (db.description && db.description.includes(`A${ex.apartment}`)) || 
      (db.note && db.note.includes(`A${ex.apartment}`)) ||
      (db.bankName && db.bankName.includes(`A${ex.apartment}`)) // My import put units in bankName!
    );
    if (!found) missingHistorical.push(ex);
  }

  // Check Standard
  for (const ex of excelStandard) {
    const found = dbReceipts.some(db => db.unit?.lotNumber === `A${ex.apartment}` || db.unit?.reference?.includes(`A${ex.apartment}`));
    if (!found) missingStandard.push(ex);
  }

  console.log('\n--- REPORT IMM 1 ---');
  console.log(`\n[HISTORICAL - Prior to 2026] Missing in DB (OtherReceipt): ${missingHistorical.length}`);
  if (missingHistorical.length > 0) {
    console.table(missingHistorical.map(m => ({ Apt: m.apartment, Owner: m.owner, Amount: m.amount, Remarks: m.remarks })));
  }

  console.log(`\n[STANDARD - 2026 Dues] Missing in DB (Receipt): ${missingStandard.length}`);
  if (missingStandard.length > 0) {
    console.table(missingStandard.map(m => ({ Apt: m.apartment, Owner: m.owner, Value: m.value })));
  }

  await prisma.$disconnect();
}

run();
