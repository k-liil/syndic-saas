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

  console.log('--- RECONCILIATION IMM 2 (2026 VS PRIOR) ---');

  // Find Immeuble 2 section
  let startRow = -1;
  for (let i = 0; i < excelRows.length; i++) {
    if (excelRows[i] && excelRows[i].includes('Immeuble') && excelRows[i].includes(2)) {
      startRow = i;
      break;
    }
  }

  if (startRow === -1) {
    console.error('Could not find Immeuble 2 section');
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
             if (amount > 400 || (remarks && (remarks.includes('2025') || remarks.includes('2024') || remarks.includes('ANC')))) {
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

  console.log(`\nExcel Payments found for Imm 2: ${excelPayments.length}`);

  // Fetch DB Receipts (Contributions 2026) for Imm 2
  const dbReceipts = await prisma.receipt.findMany({
    where: {
      organizationId: ORG_ID,
      buildingId: 'de6a0f20-7e16-422c-a0de-f4ad1af25ce6', // Imm 2
      date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') }
    },
    include: { unit: true }
  });

  // Fetch DB OtherReceipts (Historical) for Imm 2
  const dbOther = await prisma.otherReceipt.findMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { bankName: { contains: 'Imm2', mode: 'insensitive' } },
        { description: { contains: 'Imm2', mode: 'insensitive' } },
        { note: { contains: 'Imm2', mode: 'insensitive' } }
      ],
      date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') }
    }
  });

  console.log(`DB Standard 2026 Receipts: ${dbReceipts.length}`);
  console.log(`DB Other Receipts (Historical): ${dbOther.length}`);

  // Comparison
  const missingHistorical: any[] = [];
  const missingStandard: any[] = [];

  const excelHistorical = excelPayments.filter(p => p.category === 'PRIOR_HISTORICAL');
  const excelStandard = excelPayments.filter(p => p.category === 'STANDARD_2026');

  for (const ex of excelHistorical) {
    const found = dbOther.some(db => 
      (db.description && db.description.includes(`A${ex.apartment}`)) || 
      (db.note && db.note.includes(`A${ex.apartment}`)) ||
      (db.bankName && db.bankName.includes(`A${ex.apartment}`))
    );
    if (!found) missingHistorical.push(ex);
  }

  for (const ex of excelStandard) {
    const found = dbReceipts.some(db => db.unit?.lotNumber === `A${ex.apartment}`);
    if (!found) missingStandard.push(ex);
  }

  console.log('\n--- REPORT IMM 2 ---');
  console.log(`\n[HISTORICAL] Missing in DB: ${missingHistorical.length}`);
  if (missingHistorical.length > 0) {
    console.table(missingHistorical.map(m => ({ Apt: m.apartment, Owner: m.owner, Amount: m.amount, Remarks: m.remarks })));
  }

  console.log(`\n[STANDARD] Missing in DB: ${missingStandard.length}`);
  if (missingStandard.length > 0) {
     const byApt = missingStandard.reduce((acc, curr) => {
        acc[curr.apartment] = (acc[curr.apartment] || 0) + 1;
        return acc;
     }, {});
     console.log('Summary of missing standard months per apartment:');
     console.table(Object.keys(byApt).map(apt => ({ Apt: apt, MissingMonths: byApt[apt] })));
  }

  await prisma.$disconnect();
}

run();
