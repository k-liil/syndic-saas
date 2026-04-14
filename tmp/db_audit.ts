import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Column Audit ---');
  
  const tables = ['Receipt', 'InternalBank', 'Payment', 'OtherReceipt'];
  
  for (const table of tables) {
    console.log(`\nTable: ${table}`);
    try {
      const columns: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
      console.log(columns.map(c => c.column_name).join(', '));
    } catch (err) {
      console.error(`Error auditing ${table}:`, err.message);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
