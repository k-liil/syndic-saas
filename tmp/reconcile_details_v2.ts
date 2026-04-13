import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const ORG_ID = 'cmmyv5nxi0002num0zk6du1ki';
const DB_URL = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const BUILDINGS = [
  { id: '621fc018-5038-441a-a512-ddcaa7a64cd4', name: 'Immeuble 1', short: 'Imm1' },
  { id: '16d1f113-8e87-4a62-b93f-a682dd58377d', name: 'Immeuble 4', short: 'Imm4' },
  { id: 'a798b35d-7ba5-48b4-8d34-ca3c0c3297f6', name: 'Immeuble 5', short: 'Imm5' },
  { id: 'a7cd3bc9-36a8-4373-8fbb-1f44e5711cb0', name: 'Immeuble 6', short: 'Imm6' },
];

async function run() {
  const excelPath = 'Gestion Syndic Intellak II v10.xlsx';
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['2026'];
  const excelRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  for (const b of BUILDINGS) {
    console.log(`\n=== DÉTAILS ÉCARTS : ${b.name} ===`);

    // 1. Extract every single payment from Excel
    let startRow = -1;
    for (let i = 0; i < excelRows.length; i++) {
        const row = excelRows[i];
        if (row && row.includes('Immeuble') && row.includes(parseInt(b.name.split(' ')[1]))) {
            startRow = i;
            break;
        }
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

      if (inData && row) {
        let label = row[0] || row[1] || 'Unknown';
        for (let m = 2; m <= 14; m++) {
          const val = row[m];
          if (typeof val === 'number' && val > 0) {
            excelPayments.push({ label, amount: val, monthIdx: m });
          }
        }
      }
    }

    // 2. Query DB
    const dbReceipts = await prisma.receipt.findMany({
      where: { buildingId: b.id, date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } },
      include: { unit: true }
    });
    const dbOther = await prisma.otherReceipt.findMany({
      where: { 
        organizationId: ORG_ID,
        OR: [{ description: { contains: b.short, mode: 'insensitive' } }, { note: { contains: b.short, mode: 'insensitive' } }] 
      }
    });

    const dbAll = [
        ...dbReceipts.map(r => ({ label: r.unit.lotNumber, amount: Number(r.amount) })),
        ...dbOther.map(o => ({ label: o.description || o.note, amount: Number(o.amount) }))
    ];

    // 3. Match sums per Unit/Label
    const excelSums: Record<string, number> = {};
    excelPayments.forEach(p => {
        const key = String(p.label).toUpperCase();
        excelSums[key] = (excelSums[key] || 0) + p.amount;
    });

    const dbSums: Record<string, number> = {};
    dbAll.forEach(p => {
        // Try to normalize label
        let label = String(p.label).toUpperCase();
        // Extract unit number if possible (e.g. Imm4.A7 -> 7)
        const match = label.match(/A(\d+)/);
        const key = match ? match[1] : label;
        dbSums[key] = (dbSums[key] || 0) + p.amount;
    });

    // Final Comparison
    const allKeys = Array.from(new Set([...Object.keys(excelSums), ...Object.keys(dbSums)]));
    
    const missing: any[] = [];
    allKeys.forEach(k => {
        const ex = excelSums[k] || 0;
        const db = dbSums[k] || 0;
        if (Math.abs(ex - db) > 1) {
            missing.push({ Unité: k, Excel: ex, DB: db, Diff: ex - db });
        }
    });

    if (missing.length === 0) {
        console.log('✅ Synchronisation parfaite des montants.');
    } else {
        console.table(missing);
    }
  }

  await prisma.$disconnect();
}

run();
