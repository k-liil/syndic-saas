import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type AuditAction = 
  | "CREATE_RECEIPT" 
  | "DELETE_RECEIPT"
  | "CREATE_PAYMENT"
  | "DELETE_PAYMENT"
  | "BACKUP_SUCCESS"
  | "BACKUP_ERROR"
  | "BACKUP_DELETE";

export async function logAction(data: {
  action: AuditAction | string;
  details?: string;
  organizationId?: string;
  entityType?: string;
  entityId?: string;
}) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    await prisma.actionLog.create({
      data: {
        action: data.action,
        details: data.details,
        organizationId: data.organizationId,
        userId: userId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG] Failed to log action:", error);
  }
}
