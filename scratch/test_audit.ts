import { logAction } from "../src/lib/audit-service";
import { prisma } from "../src/lib/prisma";

async function test() {
  console.log("Testing logAction resilience...");
  
  await logAction({
    action: "SYSTEM_TEST",
    details: "Test de résilience du journal d'audit sans session utilisateur",
    organizationId: "TEST_ORG",
    entityType: "SYSTEM",
    entityId: "TEST_001"
  });

  console.log("Check the ActionLog table now.");
  const count = await prisma.actionLog.count({
    where: { action: "SYSTEM_TEST" }
  });
  console.log(`Found ${count} SYSTEM_TEST entries.`);
  
  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
