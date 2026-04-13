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

  console.log('--- RECONCILIATION FINALE IMM 1 ---');

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
      const remarks = String(row[16] || '').trim();
      
      for (let m = 2; m <= 14; m++) {
        const val = row[m];
        if (val) {
          let category: 'STANDARD_2026' | 'PRIOR_HISTORICAL' = 'STANDARD_2026';
          let amount = 0;

          if (typeof val === 'number') {
            amount = val;
            // Logical heuristic for Immeuble 1
             if (amount > 300 || (remarks && (remarks.includes('2025') || remarks.includes('2024') || remarks.includes('ANC')))) {
               category = 'PRIOR_HISTORICAL';
             }
          } else if (typeof val === 'string' && val.toUpperCase().includes('PAYE')) {
             category = 'STANDARD_2026';
          }

          if (amount > 0 || (typeof val === 'string' && val.toUpperCase().includes('PAYE'))) {
            excelPayments.push({
              apartment,
              owner,
              monthIdx: m,
              value: val,
              amount,
              category,
              remarks
            });
          }
        }
      }
    }
  }

  console.log(`\nExcel Payments identified for Imm 1: ${excelPayments.length}`);
  const excelHistorical = excelPayments.filter(p => p.category === 'PRIOR_HISTORICAL');
  const excelStandard = excelPayments.filter(p => p.category === 'STANDARD_2026');
  console.log(`  - Standard 2026: ${excelStandard.length}`);
  console.log(`  - Historical: ${excelHistorical.length}`);

  // Fetch DB Receipts (Contributions 2026) for Imm 1
  const buildingId = '621fc018-5038-441a-a512-ddcaa7a64cd4';
  const dbReceipts = await prisma.receipt.findMany({
    where: {
      organizationId: ORG_ID,
      buildingId,
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
        { bankName: { contains: 'Imm1', mode: 'insensitive' } }
      ],
      date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') }
    }
  });

  console.log(`\nDB Data for Imm 1:`);
  console.log(`  - Standard 2026 Receipts: ${dbReceipts.length}`);
  console.log(`  - Other Receipts (Historical): ${dbOther.length}`);

  // Comparison
  const missingHistorical: any[] = [];
  const missingStandard: any[] = [];

  for (const ex of excelHistorical) {
    const aptStr = `A${ex.apartment}`;
    const found = dbOther.some(db => 
      (db.description && db.description.includes(aptStr)) || 
      (db.note && db.note.includes(aptStr)) ||
      (db.bankName && db.bankName.includes(aptStr))
    );
    if (!found) missingHistorical.push(ex);
  }

  for (const ex of excelStandard) {
    const aptStr = `A${ex.apartment}`;
    const found = dbReceipts.some(db => db.unit?.lotNumber === aptStr);
    if (!found) missingStandard.push(ex);
  }

  console.log('\n--- RESULTS IMM 1 ---');
  
  if (missingHistorical.length === 0) {
    console.log('✅ HISTORICAL: All records identified in Excel match the DB.');
  } else {
    console.log(`❌ HISTORICAL: ${missingHistorical.length} records missing in DB.`);
    console.table(missingHistorical.map(m => ({ Apt: m.apartment, Amount: m.amount, Remarks: m.remarks })));
  }

  if (missingStandard.length === 0) {
    console.log('✅ STANDARD 2026: All standard payments identified in Excel match the DB.');
  } else {
    console.log(`❌ STANDARD 2026: ${missingStandard.length} payments missing across building.`);
    const grouped = missingStandard.reduce((acc, curr) => {
        acc[curr.apartment] = (acc[curr.apartment] || 0) + 1;
        return acc;
    }, {});
    console.table(Object.keys(grouped).map(apt => ({ Apt: apt, MissingMonths: grouped[apt] })));
  }

  await prisma.$disconnect();
}

run();
