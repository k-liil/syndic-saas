import { PrismaClient, ReceiptType, PaymentMethod, DueStatus } from "@prisma/client";

const prisma = new PrismaClient();

const SOURCE_ORG_ID = "cmn1l60dv0001nucwyt4tcbef"; // Les Jardins de Cherrat
const TARGET_ORG_ID = "cmo59283d0000pb0fwk5a4ie5"; // Démo
const YEAR = 2026;

async function migrate() {
  console.log(`Starting migration from Cherrat (${SOURCE_ORG_ID}) to Demo (${TARGET_ORG_ID}) for ${YEAR}...`);

  // --- Step 0: Clear target data for 2026 ---
  console.log("Cleaning target data for 2026...");
  
  const startOfYear = new Date(Date.UTC(YEAR, 0, 1));
  const endOfYear = new Date(Date.UTC(YEAR, 11, 31, 23, 59, 59));

  // Delete allocations first
  await prisma.receiptAllocation.deleteMany({
    where: {
      OR: [
        { receipt: { organizationId: TARGET_ORG_ID, date: { gte: startOfYear, lte: endOfYear } } },
        { due: { organizationId: TARGET_ORG_ID, period: { gte: startOfYear, lte: endOfYear } } }
      ]
    }
  });

  await prisma.receipt.deleteMany({
    where: { organizationId: TARGET_ORG_ID, date: { gte: startOfYear, lte: endOfYear } }
  });

  await prisma.payment.deleteMany({
    where: { organizationId: TARGET_ORG_ID, date: { gte: startOfYear, lte: endOfYear } }
  });

  await prisma.otherReceipt.deleteMany({
    where: { organizationId: TARGET_ORG_ID, date: { gte: startOfYear, lte: endOfYear } }
  });

  await prisma.monthlyDue.deleteMany({
    where: { organizationId: TARGET_ORG_ID, period: { gte: startOfYear, lte: endOfYear } }
  });

  console.log("Cleanup done.");

  // --- Step 1: Sync Structural Data ---
  console.log("Syncing structural data...");

  const buildingMap = new Map<string, string>();
  const ownerMap = new Map<string, string>();
  const unitMap = new Map<string, string>();
  const bankMap = new Map<string, string>();
  const supplierMap = new Map<string, string>();
  const accountMap = new Map<string, string>();

  // Buildings
  const sBuildings = await prisma.building.findMany({ where: { organizationId: SOURCE_ORG_ID } });
  for (const b of sBuildings) {
    let tB = await prisma.building.findFirst({
        where: { organizationId: TARGET_ORG_ID, name: b.name }
    });
    if (!tB) {
        tB = await prisma.building.create({
            data: { organizationId: TARGET_ORG_ID, name: b.name, address: b.address }
        });
        console.log(`Building "${b.name}" created.`);
    }
    buildingMap.set(b.id, tB.id);
  }

  // Owners
  const sOwners = await prisma.owner.findMany({ where: { organizationId: SOURCE_ORG_ID } });
  for (const o of sOwners) {
    let tO;
    if (o.cin) {
      tO = await prisma.owner.findFirst({
        where: { organizationId: TARGET_ORG_ID, cin: o.cin }
      });
    }
    if (!tO) {
       tO = await prisma.owner.findFirst({
           where: { organizationId: TARGET_ORG_ID, name: o.name }
       });
    }
    
    if (!tO) {
         tO = await prisma.owner.create({
           data: {
               organizationId: TARGET_ORG_ID,
               name: o.name,
               firstName: o.firstName,
               cin: o.cin,
               email: o.email,
               phone: o.phone,
               userId: null,
               notes: o.notes
           }
         });
         console.log(`Owner "${o.name}" created.`);
    }
    ownerMap.set(o.id, tO.id);
  }

  // Units
  const sUnits = await prisma.unit.findMany({ where: { organizationId: SOURCE_ORG_ID } });
  for (const u of sUnits) {
    const targetBuildingId = buildingMap.get(u.buildingId || "");
    let tU = await prisma.unit.findFirst({
        where: { organizationId: TARGET_ORG_ID, lotNumber: u.lotNumber }
    });
    if (!tU) {
        tU = await prisma.unit.create({
            data: {
                organizationId: TARGET_ORG_ID,
                lotNumber: u.lotNumber,
                reference: u.reference || `UNIT-${u.lotNumber}`,
                type: u.type,
                buildingId: targetBuildingId || null,
                surface: u.surface,
                floor: u.floor,
                isActive: u.isActive,
                overrideStart: u.overrideStart,
                startYear: u.startYear,
                startMonth: u.startMonth
            }
        });
        console.log(`Unit "${u.lotNumber}" created.`);
    }
    unitMap.set(u.id, tU.id);
  }

  // Internal Banks
  const sBanks = await prisma.internalBank.findMany({ where: { organizationId: SOURCE_ORG_ID } });
  for (const b of sBanks) {
    let tB = await prisma.internalBank.findFirst({
        where: { organizationId: TARGET_ORG_ID, name: b.name }
    });
    if (!tB) {
        tB = await prisma.internalBank.create({
            data: {
                organizationId: TARGET_ORG_ID,
                name: b.name,
                openingBalance: b.openingBalance,
                isActive: b.isActive
            }
        });
        console.log(`Bank "${b.name}" created.`);
    }
    bankMap.set(b.id, tB.id);
  }

  // Suppliers
  const sSuppliers = await prisma.supplier.findMany({ where: { organizationId: SOURCE_ORG_ID } });
  for (const s of sSuppliers) {
    let tS = await prisma.supplier.findFirst({
        where: { organizationId: TARGET_ORG_ID, name: s.name }
    });
    if (!tS) {
        tS = await prisma.supplier.create({
            data: {
                organizationId: TARGET_ORG_ID,
                name: s.name,
                email: s.email,
                phone: s.phone,
                address: s.address,
                sector: s.sector,
                contactName: s.contactName,
                isActive: s.isActive
            }
        });
        console.log(`Supplier "${s.name}" created.`);
    }
    supplierMap.set(s.id, tS.id);
  }

  // Accounting Posts
  const sAccounts = await prisma.accountingPost.findMany({ where: { organizationId: SOURCE_ORG_ID } });
  for (const a of sAccounts) {
    let tA = await prisma.accountingPost.findFirst({
        where: { organizationId: TARGET_ORG_ID, name: a.name }
    });
    
    if (!tA && a.code) {
        tA = await prisma.accountingPost.findFirst({
            where: { organizationId: TARGET_ORG_ID, code: a.code }
        });
    }

    if (!tA) {
        try {
            tA = await prisma.accountingPost.create({
                data: {
                    organizationId: TARGET_ORG_ID,
                    name: a.name,
                    code: a.code,
                    postType: a.postType,
                    isActive: a.isActive
                }
            });
            console.log(`Account Post "${a.name}" created.`);
        } catch (e) {
            console.warn(`[WARN] Unique constraint on code ${a.code} failed for "${a.name}". Retrying without code...`);
            tA = await prisma.accountingPost.create({
                data: {
                    organizationId: TARGET_ORG_ID,
                    name: a.name,
                    code: `${a.code}_dup_${Math.floor(Math.random()*1000)}`,
                    postType: a.postType,
                    isActive: a.isActive
                }
            });
            console.log(`Account Post "${a.name}" created (WITH DUMMY CODE).`);
        }
    }
    accountMap.set(a.id, tA.id);
  }

  console.log("Structure synced.");

  // --- Step 2: Sync Dues 2026 ---
  console.log("Syncing Monthly Dues 2026...");
  const sDues = await prisma.monthlyDue.findMany({
    where: { organizationId: SOURCE_ORG_ID, period: { gte: startOfYear, lte: endOfYear } }
  });
  
  const dueMap = new Map<string, string>();
  for (const d of sDues) {
    const targetUnitId = unitMap.get(d.unitId);
    if (!targetUnitId) continue;
    
    const tD = await prisma.monthlyDue.create({
      data: {
        organizationId: TARGET_ORG_ID,
        unitId: targetUnitId,
        period: d.period,
        amountDue: d.amountDue,
        paidAmount: d.paidAmount,
        status: d.status
      }
    });
    dueMap.set(d.id, tD.id);
  }
  console.log(`${sDues.length} dues created.`);

  // --- Step 3: Sync Receipts 2026 ---
  console.log("Syncing Receipts 2026...");
  const sReceipts = await prisma.receipt.findMany({
    where: { organizationId: SOURCE_ORG_ID, date: { gte: startOfYear, lte: endOfYear } },
    include: { allocations: true }
  });

  for (const r of sReceipts) {
    const tUId = unitMap.get(r.unitId || "");
    const tOId = ownerMap.get(r.ownerId || "");
    const tBId = buildingMap.get(r.buildingId || "");
    const tBankId = bankMap.get(r.bankId || "");

    if (!tOId || !tBId) {
        console.warn(`Skipping receipt #${r.receiptNumber} due to missing owner (${r.ownerId}) or building (${r.buildingId}) mapping.`);
        continue;
    }

    const tR = await prisma.receipt.create({
      data: {
        organizationId: TARGET_ORG_ID,
        receiptNumber: r.receiptNumber,
        type: r.type,
        ownerId: tOId,
        buildingId: tBId,
        unitId: tUId || null,
        amount: r.amount,
        method: r.method,
        date: r.date,
        note: r.note,
        bankName: r.bankName,
        bankRef: r.bankRef,
        bankId: tBankId || null,
        unallocatedAmount: Number(r.unallocatedAmount) || 0,
        allocations: {
          create: r.allocations.map(a => ({
            amount: a.amount,
            dueId: dueMap.get(a.dueId)!
          })).filter(a => a.dueId)
        }
      }
    });
    console.log(`Receipt #${tR.receiptNumber} created.`);
  }

  // --- Step 4: Sync Payments 2026 ---
  console.log("Syncing Payments 2026...");
  const sPayments = await prisma.payment.findMany({
    where: { organizationId: SOURCE_ORG_ID, date: { gte: startOfYear, lte: endOfYear } }
  });

  for (const p of sPayments) {
    const tSuppId = supplierMap.get(p.supplierId || "");
    const tBankId = bankMap.get(p.bankId || "");
    const tAccountId = accountMap.get(p.accountingPostId || "");

    if (!tSuppId) {
        console.warn(`Skipping payment #${p.paymentNumber} due to missing supplier (${p.supplierId}) mapping.`);
        continue;
    }

    await prisma.payment.create({
      data: {
        organizationId: TARGET_ORG_ID,
        paymentNumber: p.paymentNumber,
        supplierId: tSuppId,
        bankId: tBankId || null,
        accountingPostId: tAccountId || null,
        amount: p.amount,
        method: p.method,
        date: p.date,
        note: p.note,
        bankName: p.bankName,
        bankRef: p.bankRef,
        attachments: p.attachments
      }
    });
    console.log(`Payment #${p.paymentNumber} created.`);
  }
  console.log(`${sPayments.length} payments created.`);

  // --- Step 5: Sync Other Receipts 2026 ---
  console.log("Syncing Other Receipts 2026...");
  const sOthers = await prisma.otherReceipt.findMany({
    where: { organizationId: SOURCE_ORG_ID, date: { gte: startOfYear, lte: endOfYear } }
  });

  for (const o of sOthers) {
    const tBankId = bankMap.get(o.bankId || "");

    await prisma.otherReceipt.create({
      data: {
        organizationId: TARGET_ORG_ID,
        receiptNumber: o.receiptNumber,
        type: o.type,
        amount: o.amount,
        method: o.method,
        date: o.date,
        note: o.note,
        description: o.description,
        bankName: o.bankName,
        bankRef: o.bankRef,
        bankId: tBankId || null
      }
    });
  }
  console.log(`${sOthers.length} other receipts created.`);

  console.log("Migration completed successfully!");
}

migrate()
  .catch(e => {
    console.error("Migration fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
