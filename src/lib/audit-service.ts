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
  userId?: string; // Optional override
  entityType?: string;
  entityId?: string;
}) {
  try {
    let finalUserId = data.userId;

    if (!finalUserId) {
      try {
        const session = await auth();
        finalUserId = session?.user?.id;
      } catch (e) {
        console.warn("[AUDIT_LOG] Could not fetch session in logAction:", e);
      }
    }

    await prisma.actionLog.create({
      data: {
        action: data.action,
        details: data.details,
        organizationId: data.organizationId,
        userId: finalUserId,
        entityType: data.entityType,
        entityId: data.entityId,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG] Failed to log action:", error);
  }
}
