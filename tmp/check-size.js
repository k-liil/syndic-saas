const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const res = await prisma.$queryRawUnsafe('SELECT pg_size_pretty(pg_database_size(current_database())) as size')
    console.log('TAILLE:', res[0].size)
  } catch (e) {
    console.error(e.message)
  } finally {
    await prisma.$disconnect()
  }
}
main()
