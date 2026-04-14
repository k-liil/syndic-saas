import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Full Database Audit of Internal Banks ---');
  try {
    // Audit all organizations
    const orgs = await prisma.organization.findMany({
        select: { id: true, name: true }
    });
    
    for (const org of orgs) {
        console.log(`\nOrganization: ${org.name} (${org.id})`);
        try {
            const banks: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "InternalBank" WHERE "organizationId" = '${org.id}'`);
            console.log(`Banks: ${banks.length}`);
            if (banks.length > 0) {
                console.log(JSON.stringify(banks, null, 2));
            }
        } catch (e) {
            console.error(`Error for ${org.name}:`, e.message);
        }
    }
  } catch (err) {
    console.error('Audit failed:', err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
