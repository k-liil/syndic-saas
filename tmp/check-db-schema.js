const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCols() {
  try {
    const cols = await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = 'ContributionGroup';`;
    console.log("Columns in ContributionGroup:", cols);

    const groupUnits = await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = 'ContributionGroupUnit';`;
    console.log("Columns in ContributionGroupUnit:", groupUnits);

  } catch (err) {
    console.error("DB Query error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkCols();
