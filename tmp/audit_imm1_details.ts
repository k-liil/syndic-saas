import { PrismaClient } from '@prisma/client';

const ORG_ID = 'cmmyv5nxi0002num0zk6du1ki';
const DB_URL = 'postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

async function main() {
  const buildingId = '621fc018-5038-441a-a512-ddcaa7a64cd4';
  const receipts = await prisma.receipt.findMany({ 
    where: { buildingId }, 
    include: { unit: true },
    orderBy: { unit: { lotNumber: 'asc' } }
  });
  
  const other = await prisma.otherReceipt.findMany({ 
    where: { 
      OR: [
        { description: { contains: 'Imm1', mode: 'insensitive' } }, 
        { note: { contains: 'Imm1', mode: 'insensitive' } }
      ] 
    } 
  });

  console.log('--- REÇUS STANDARD DB (IMM 1) ---');
  receipts.forEach(r => {
    console.log(`Unit: ${r.unit.lotNumber} | Date: ${r.date.toISOString().slice(0, 10)} | Amount: ${r.amount}`);
  });

  console.log('\n--- AUTRES RECETTES DB (ARRIÉRÉS IMM 1) ---');
  other.forEach(o => {
    console.log(`Desc: ${o.description} | Date: ${o.date.toISOString().slice(0, 10)} | Amount: ${o.amount}`);
  });

  await prisma.$disconnect();
}

main();
