import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const ORG_ID = 'cmmyv5nxi0002num0zk6du1ki';

async function reconcile(dbUrl: string, dbName: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  const excelPath = 'Gestion Syndic Intellak II v10.xlsx';
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['2026'];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`\n--- RECONCILIATION FOR DB: ${dbName} ---`);

  const excelDataByBuilding: Record<string, { total: number; count: number }> = {};
  let currentBuildingId = 0;
  let inDataSection = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.includes('Immeuble')) {
       const idx = row.indexOf('Immeuble');
       if (idx !== -1 && row[idx+1]) {
         currentBuildingId = parseInt(row[idx+1]);
         const bKey = `Immeuble ${currentBuildingId}`;
         if (!excelDataByBuilding[bKey]) excelDataByBuilding[bKey] = { total: 0, count: 0 };
         inDataSection = false;
       }
    }
    if (row && row.includes('Apprt') && row.includes('Copropriétaire')) {
      inDataSection = true;
      continue;
    }
    if (inDataSection && row && (row[0] === 'TOTAL' || row[1] === 'TOTAL')) {
      inDataSection = false;
      continue;
    }
    if (inDataSection && row && typeof row[0] === 'number') {
      const bKey = `Immeuble ${currentBuildingId}`;
      let unitPaidMonths = 0;
      let unitTotal = 0;
      for (let m = 2; m <= 14; m++) {
        const val = row[m];
        if (val !== null && val !== undefined && val !== '') {
          if (typeof val === 'number') { unitTotal += val; unitPaidMonths++; }
          else if (typeof val === 'string' && val.toUpperCase().includes('PAYE')) { unitPaidMonths++; }
        }
      }
      if (unitPaidMonths > 0) {
        if (!excelDataByBuilding[bKey]) excelDataByBuilding[bKey] = { total: 0, count: 0 };
        excelDataByBuilding[bKey].total += unitTotal;
        excelDataByBuilding[bKey].count += unitPaidMonths;
      }
    }
  }

  const dbBuildings = await prisma.building.findMany({
    where: { organizationId: ORG_ID },
    select: { id: true, name: true }
  });

  const report: any[] = [];
  for (const bld of dbBuildings) {
    const contributionCount = await prisma.receipt.count({
      where: { organizationId: ORG_ID, buildingId: bld.id, date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } }
    });
    const contributionSum = await prisma.receipt.aggregate({
      where: { organizationId: ORG_ID, buildingId: bld.id, date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } },
      _sum: { amount: true }
    });

    const bShort = bld.name.replace('Immeuble ', 'Imm');
    const bShort2 = bld.name.replace('Immeuble ', 'IMM');
    const otherReceipts = await prisma.otherReceipt.findMany({
      where: {
        organizationId: ORG_ID,
        OR: [
          { description: { contains: bShort, mode: 'insensitive' } },
          { note: { contains: bShort, mode: 'insensitive' } },
          { description: { contains: bShort2, mode: 'insensitive' } },
          { note: { contains: bShort2, mode: 'insensitive' } },
          { description: { contains: bld.name, mode: 'insensitive' } },
          { note: { contains: bld.name, mode: 'insensitive' } }
        ],
        date: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') }
      }
    });

    const otherCount = otherReceipts.length;
    const otherSum = otherReceipts.reduce((acc, r) => acc + Number(r.amount), 0);
    const excelEntry = excelDataByBuilding[bld.name] || { total: 0, count: 0 };

    report.push({
      Building: bld.name,
      'Excel Count': excelEntry.count,
      'DB Count': contributionCount + otherCount,
      'Diff Count': excelEntry.count - (contributionCount + otherCount),
      'Excel Sum': excelEntry.total,
      'DB Sum': (contributionSum._sum.amount || 0) + otherSum,
      'Diff Sum': excelEntry.total - ((contributionSum._sum.amount || 0) + otherSum)
    });
  }
  console.table(report);
  await prisma.$disconnect();
}

async function run() {
  const db1 = 'postgresql://postgres.sowxbyunzughfjuhwedy:63gnhwkrmobmaIYs@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const db2 = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  
  await reconcile(db1, 'sowxbyunzughfjuhwedy (Active)');
  await reconcile(db2, 'tlmhuseqfzlivnvfdzkb (Commented)');
}

run();
