const { PrismaClient } = require('@prisma/client')

// URLs
const PROD_URL = "postgresql://postgres.tlmhuseqfzlivnvfdzkb:rHJpnYu0loFdWFzv@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
const DEV_URL = "postgresql://postgres.sowxbyunzughfjuhwedy:63gnhwkrmobmaIYs@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"

const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } })
const dev = new PrismaClient({ datasources: { db: { url: DEV_URL } } })

async function copyTable(name, model) {
  console.log(`[MIGRATE] Table: ${name}...`)
  const data = await prod[model].findMany()
  if (data.length === 0) {
    console.log(`- Empty.`)
    return
  }
  
  // Clean dev table first (to allow re-runs)
  await dev[model].deleteMany({})
  
  // Split into chunks of 100 to avoid large payload errors
  const chunkSize = 100
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize)
    await dev[model].createMany({ data: chunk, skipDuplicates: true })
  }
  console.log(`- Copied ${data.length} records.`)
}

async function main() {
  console.log("=== STARTING CLONE: PROD -> DEV ===")
  
  // ORDER MATTERS due to foreign keys
  const tables = [
    { name: 'User', model: 'user' },
    { name: 'Organization', model: 'organization' },
    { name: 'AppSettings', model: 'appSettings' },
    { name: 'UserOrganization', model: 'userOrganization' },
    { name: 'Building', model: 'building' },
    { name: 'Unit', model: 'unit' },
    { name: 'Owner', model: 'owner' },
    { name: 'Ownership', model: 'ownership' },
    { name: 'ContributionPeriod', model: 'contributionPeriod' },
    { name: 'FiscalYear', model: 'fiscalYear' },
    { name: 'MonthlyDue', model: 'monthlyDue' },
    { name: 'Receipt', model: 'receipt' },
    { name: 'ReceiptAllocation', model: 'receiptAllocation' },
    { name: 'InternalBank', model: 'internalBank' },
    { name: 'AccountingPost', model: 'accountingPost' },
    { name: 'SupplierSector', model: 'supplierSector' },
    { name: 'Supplier', model: 'supplier' }
  ]

  for (const table of tables) {
    try {
      await copyTable(table.name, table.model)
    } catch (e) {
      console.error(`[ERROR] Failed to copy ${table.name}:`, e.message)
    }
  }

  console.log("=== CLONE COMPLETE ===")
}

main()
  .catch(console.error)
  .finally(async () => {
    await prod.$disconnect()
    await dev.$disconnect()
  })
