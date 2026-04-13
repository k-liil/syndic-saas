import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testImportPerf() {
  const organizationId = "clp0v6n4v000008j7g6z2g6z2"; // Dummy or real ID from .env if needed
  // Let's try to find an actual org ID
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found");
    return;
  }
  const orgId = org.id;
  console.log(`Using Organization ID: ${orgId}`);

  const rows = Array.from({ length: 40 }, (_, i) => ({
    type: "RENT" as const,
    description: `Test Import Row ${i}`,
    amount: 100 + i,
    method: "CASH" as const,
    date: new Date(),
    bankName: null,
    bankRef: null,
    note: "Test performance",
  }));

  console.log("--- START PERFORMANCE TEST (40 ROWS) ---");
  const start = Date.now();

  // 1. Create Job
  const jobStart = Date.now();
  const job = await prisma.importJob.create({
    data: {
      organizationId: orgId,
      type: "test-perf",
      totalRows: rows.length,
      processed: 0,
      status: "processing",
    },
  });
  console.log(`Job creation: ${Date.now() - jobStart}ms`);

  // 2. Fetch last number
  const fetchStart = Date.now();
  const last = await prisma.otherReceipt.findFirst({
    where: { organizationId: orgId },
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  });
  console.log(`Last receipt fetch: ${Date.now() - fetchStart}ms (last number: ${last?.receiptNumber ?? 0})`);

  const startNumber = last?.receiptNumber ?? 0;

  // 3. Create Many
  const insertStart = Date.now();
  await prisma.otherReceipt.createMany({
    data: rows.map((row, index) => ({
      receiptNumber: startNumber + index + 1,
      organizationId: orgId,
      type: row.type,
      description: row.description,
      amount: row.amount,
      method: row.method,
      date: row.date,
      bankName: row.bankName,
      bankRef: row.bankRef,
      note: row.note,
    })),
  });
  console.log(`createMany insert: ${Date.now() - insertStart}ms`);

  // 4. Update Job
  const updateStart = Date.now();
  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      processed: rows.length,
      status: "done",
    },
  });
  console.log(`Job update: ${Date.now() - updateStart}ms`);

  console.log(`TOTAL TIME: ${Date.now() - start}ms`);
  console.log("--- TEST COMPLETE ---");

  // Cleanup test data
  console.log("Cleaning up test data...");
  await prisma.otherReceipt.deleteMany({
    where: { note: "Test performance", organizationId: orgId }
  });
  await prisma.importJob.delete({ where: { id: job.id } });
}

testImportPerf()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
