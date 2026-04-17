"use server";

import { BackupService, GitHubBackup } from "@/lib/backup-service";
import { revalidatePath } from "next/cache";

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

import { prisma } from "@/lib/prisma";

export async function getBackupScheduleAction(organizationId: string) {
  try {
    const sched = await prisma.backupSchedule.findUnique({
      where: { organizationId }
    });
    if (!sched) return null;
    return {
      ...sched,
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
  isActive: boolean
) {
  try {
    const nextRunAt = new Date(Date.now() + frequency * 60000);
    
    const res = await prisma.backupSchedule.upsert({
      where: { organizationId },
      update: { frequency, isActive, nextRunAt },
      create: { organizationId, frequency, isActive, nextRunAt }
    });
    return {
      ...res,
      lastRunAt: res.lastRunAt?.toISOString() || null,
      nextRunAt: res.nextRunAt?.toISOString() || null,
      createdAt: res.createdAt.toISOString(),
      updatedAt: res.updatedAt.toISOString(),
    };
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in updateBackupScheduleAction:", error);
    throw new Error(`Erreur SQL : ${error.message || String(error)}`);
  }
}

export async function getBackupAuditAction(organizationId: string) {
  try {
    const audits = await prisma.backupAudit.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    return audits.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }));
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in getBackupAuditAction:", error);
    throw new Error(`Erreur Audit SQL : ${error.message || String(error)}`);
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
export async function getAllBackupSchedulesAction() {
  try {
    const schedules = await prisma.backupSchedule.findMany({
      include: {
        organization: {
          select: { name: true, slug: true }
        }
      },
      orderBy: { organization: { name: 'asc' } }
    });
    
    return schedules.map(s => ({
      ...s,
      lastRunAt: s.lastRunAt?.toISOString() || null,
      nextRunAt: s.nextRunAt?.toISOString() || null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error("[BACKUP_LOG] Error in getAllBackupSchedulesAction:", error);
    return [];
  }
}
