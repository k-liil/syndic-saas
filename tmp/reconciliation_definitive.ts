import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const ORG_ID = 'cmmyv5nxi0002num0zk6du1ki';
const DB_URL = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const BUILDINGS = [
  { id: '621fc018-5038-441a-a512-ddcaa7a64cd4', name: 'Immeuble 1', short: 'Imm1' },
  { id: 'de6a0f20-7e16-422c-a0de-f4ad1af25ce6', name: 'Immeuble 2', short: 'Imm2' },
  { id: '00564732-26d3-4720-bbeb-9942494bd138', name: 'Immeuble 3', short: 'Imm3' },
  { id: '16d1f113-8e87-4a62-b93f-a682dd58377d', name: 'Immeuble 4', short: 'Imm4' },
  { id: 'a798b35d-7ba5-48b4-8d34-ca3c0c3297f6', name: 'Immeuble 5', short: 'Imm5' },
  { id: 'a7cd3bc9-36a8-4373-8fbb-1f44e5711cb0', name: 'Immeuble 6', short: 'Imm6' },
];

async function run() {
  const excelPath = 'Gestion Syndic Intellak II v10.xlsx';
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['2026'];
  const excelRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log('--- RECONCILIATION GLOBALE 2026 (IMM 1 À 6) ---');

  for (const b of BUILDINGS) {
    console.log(`\n> Analyse de l'${b.name}...`);

    // 1. Extract from Excel
    let startRow = -1;
    for (let i = 0; i < excelRows.length; i++) {
        const row = excelRows[i];
        if (row && row.includes('Immeuble') && row.includes(parseInt(b.name.split(' ')[1]))) {
            startRow = i;
            break;
        }
    }

    if (startRow === -1) {
      console.log(`  [ERROR] Section non trouvée`);
      continue;
    }

    let excelSum = 0;
    let inData = false;

    for (let i = startRow; i < excelRows.length; i++) {
      const row = excelRows[i];
      if (i > startRow && row && row.includes('Immeuble')) break;
      if (row && row.includes('Apprt')) { inData = true; continue; }
      if (inData && row && (row[0] === 'TOTAL' || row[1] === 'TOTAL' || (typeof row[0] === 'string' && row[0].includes('Total')))) {
        inData = false;
        continue;
      }

      if (inData && row) {
        for (let m = 2; m <= 14; m++) { // Months Jan to Dec + optional arrears column depending on structure
          const val = row[m];
          if (typeof val === 'number') {
            excelSum += val;
          }
        }
      }
    }

    // 2. Query DB
    const dbReceipts = await prisma.receipt.findMany({
      where: { buildingId: b.id, date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } }
    });
    const dbOther = await prisma.otherReceipt.findMany({
      where: { 
        organizationId: ORG_ID,
        OR: [{ description: { contains: b.short, mode: 'insensitive' } }, { note: { contains: b.short, mode: 'insensitive' } }] 
      }
    });

    const sumStandard = dbReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const sumOther = dbOther.reduce((sum, o) => sum + Number(o.amount), 0);
    const dbTotal = sumStandard + sumOther;

    console.log(`  Excel Total: ${excelSum.toLocaleString('fr-FR')} MAD`);
    console.log(`  DB Total:    ${dbTotal.toLocaleString('fr-FR')} MAD (Std: ${sumStandard}, Other: ${sumOther})`);
    
    if (Math.abs(excelSum - dbTotal) < 1) {
      console.log(`  ✅ SYNC OK`);
    } else {
      console.log(`  ❌ DIFF: ${excelSum - dbTotal} MAD`);
    }
  }

  await prisma.$disconnect();
}

run();
