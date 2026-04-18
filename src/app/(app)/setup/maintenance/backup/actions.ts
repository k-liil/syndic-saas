"use server";

import { BackupService, GitHubBackup } from "@/lib/backup-service";
import { logAction } from "@/lib/audit-service";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getBackupsAction(organizationId?: string): Promise<GitHubBackup[]> {
  try {
    console.log("[BACKUP_LOG] Fetching backups list...");
    const backups = await BackupService.listBackups(organizationId);
    console.log(`[BACKUP_LOG] Found ${backups.length} backups.`);
    return backups;
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in getBackupsAction:", error);
    return [];
  }
}

export async function triggerManualBackupAction(organizationId: string) {
  try {
    console.log(`[BACKUP_LOG] Triggering manual backup for org ${organizationId}...`);
    const res = await BackupService.triggerOrganizationBackup(organizationId, true);
    console.log("[BACKUP_LOG] Manual backup successful:", res.fileName);
    revalidatePath("/setup/maintenance/backup");
    return res;
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in triggerManualBackupAction:", error);
    throw new Error(error.message || "La sauvegarde a échoué.");
  }
}

export async function getBackupConfigAction() {
  const config = {
    hasToken: Boolean(process.env.BACKUP_GITHUB_TOKEN),
    repo: process.env.BACKUP_GITHUB_REPO || "Non configuré",
    heartbeatToken: process.env.BACKUP_HEARTBEAT_TOKEN || 'syndic-heartbeat-default'
  };
  return config;
}

export async function getSystemBackupHealthAction() {
  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'singleton' }
    });
    return {
      lastHeartbeatAt: settings?.lastBackupHeartbeatAt?.toISOString() || null,
    };
  } catch (error) {
    console.error("[BACKUP_LOG] Error in getSystemBackupHealthAction:", error);
    return { lastHeartbeatAt: null };
  }
}

export async function getBackupScheduleAction(organizationId: string) {
  try {
    const sched = await prisma.backupSchedule.findUnique({
      where: { organizationId }
    });
    if (!sched) return null;
    return {
      id: sched.id,
      organizationId: sched.organizationId,
      frequency: sched.frequency,
      isActive: sched.isActive,
      retentionCount: sched.retentionCount || 10,
      lastRunAt: sched.lastRunAt?.toISOString() || null,
      nextRunAt: sched.nextRunAt?.toISOString() || null,
      createdAt: sched.createdAt.toISOString(),
      updatedAt: sched.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error("[BACKUP_LOG] Error in getBackupScheduleAction:", error);
    return null;
  }
}

export async function updateBackupScheduleAction(
  organizationId: string, 
  frequency: number, 
  isActive: boolean,
  retentionCount: number = 10
) {
  try {
    const nextRunAt = new Date(Date.now() + frequency * 60000);
    
    const res = await prisma.backupSchedule.upsert({
      where: { organizationId },
      update: { frequency, isActive, nextRunAt, retentionCount },
      create: { organizationId, frequency, isActive, nextRunAt, retentionCount }
    });
    return {
      id: res.id,
      organizationId: res.organizationId,
      frequency: res.frequency,
      isActive: res.isActive,
      retentionCount: res.retentionCount || 10,
      lastRunAt: res.lastRunAt?.toISOString() || null,
      nextRunAt: res.nextRunAt?.toISOString() || null,
      createdAt: res.createdAt.toISOString(),
      updatedAt: res.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in updateBackupScheduleAction:", error);
    return { error: `Erreur SQL : ${error.message || String(error)}` };
  }
}

export async function getBackupAuditAction(organizationId: string, page: number = 1, pageSize: number = 20) {
  try {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.backupAudit.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          organization: { select: { name: true } }
        }
      }),
      prisma.backupAudit.count({ where: { organizationId } })
    ]);

    return {
      items: items.map(a => ({
        id: a.id,
        organizationId: a.organizationId,
        fileName: a.fileName,
        status: a.status,
        errorMsg: a.errorMsg,
        sizeBytes: a.sizeBytes,
        createdAt: a.createdAt.toISOString(),
        deletedAt: a.deletedAt?.toISOString() || null,
        organizationName: a.organization.name
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in getBackupAuditAction:", error);
    return { items: [], pagination: { page, pageSize, total: 0, totalPages: 0 }, error: String(error) };
  }
}

export async function getOrganizationsAction() {
  try {
    return await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error("[BACKUP_LOG] Error in getOrganizationsAction:", error);
    return [];
  }
}

export async function deleteBackupAction(fileName: string) {
  try {
    await BackupService.deleteBackup(fileName, "MANUAL");
    revalidatePath("/setup/maintenance/backup");
    return { success: true };
  } catch (error) {
    console.error("[BACKUP_ACTION] Error deleting backup:", error);
    return { error: "Failed to delete backup" };
  }
}
