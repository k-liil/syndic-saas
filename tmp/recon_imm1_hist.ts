import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const ORG_ID = 'cmmyv5nxi0002num0zk6du1ki';
const DB_URL = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

async function run() {
  const excelPath = 'Gestion Syndic Intellak II v10.xlsx';
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['2026'];
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('--- RECONCILIATION IMM 1 (PRIOR TO 2026) ---');

  // Find Immeuble 1 section
  let startRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].includes('Immeuble') && data[i].includes(1)) {
      startRow = i;
      break;
    }
  }

  if (startRow === -1) {
    console.error('Could not find Immeuble 1 section');
    return;
  }

  const excelHistorical: any[] = [];
  let inData = false;

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    
    // Stop if we hit next building
    if (i > startRow && row && row.includes('Immeuble')) break;

    if (row && row.includes('Apprt')) {
      inData = true;
      continue;
    }

    if (inData && row && (row[0] === 'TOTAL' || row[1] === 'TOTAL')) {
      inData = false;
      continue;
    }

    if (inData && row && typeof row[0] === 'number') {
      const apartment = row[0];
      const owner = row[1];
      const remarks = row[16] || '';
      const total = row[15];

      // Detect if this row contains historical payments (Prior to 2026)
      // Usually indicated in remarks like "RELICAT 2025", "DECEMBRE 2025", etc.
      if (remarks && (remarks.includes('2025') || remarks.includes('2024') || remarks.includes('ANC'))) {
        excelHistorical.push({
          unit: `Imm1.A${apartment}`,
          owner,
          amount: total,
          remarks
        });
      }
    }
  }

  console.log('\nExcel Findings (Prior to 2026 - Immeuble 1):');
  console.table(excelHistorical);

  // DB Findings (OtherReceipt table for Imm1)
  const dbOther = await prisma.otherReceipt.findMany({
    where: {
      organizationId: ORG_ID,
      OR: [
        { description: { contains: 'Imm1', mode: 'insensitive' } },
        { note: { contains: 'Imm1', mode: 'insensitive' } },
        { description: { contains: 'Immeuble 1', mode: 'insensitive' } },
        { note: { contains: 'Immeuble 1', mode: 'insensitive' } }
      ],
      date: {
        gte: new Date('2026-01-01'),
        lt: new Date('2027-01-01')
      }
    }
  });

  console.log('\nDatabase Findings (OtherReceipt - Imm1 in 2026):');
  console.table(dbOther.map(r => ({
    receipt: r.receiptNumber,
    description: r.description,
    amount: r.amount,
    date: r.date,
    note: r.note
  })));

  // Compare
  console.log('\n--- DISCREPANCIES ---');
  const missingInDB = excelHistorical.filter(ex => {
    return !dbOther.some(db => db.description.includes(ex.unit) || (db.note && db.note.includes(ex.unit)));
  });

  if (missingInDB.length > 0) {
    console.log('Units in Excel (Prior to 2026) NOT FOUND in DB OtherReceipts:');
    console.table(missingInDB);
  } else {
    console.log('All Excel historical entries for Imm 1 found in DB OtherReceipts.');
  }

  await prisma.$disconnect();
}

run();
