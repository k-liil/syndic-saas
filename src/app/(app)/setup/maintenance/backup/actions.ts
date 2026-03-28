"use server";

import { BackupService, GitHubBackup } from "@/lib/backup-service";
import { revalidatePath } from "next/cache";

export async function getBackupsAction(): Promise<GitHubBackup[]> {
  try {
    console.log("[BACKUP_LOG] Fetching backups list...");
    const backups = await BackupService.listBackups();
    console.log(`[BACKUP_LOG] Found ${backups.length} backups.`);
    return backups;
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in getBackupsAction:", error);
    return [];
  }
}

export async function triggerManualBackupAction() {
  try {
    console.log("[BACKUP_LOG] Triggering manual backup...");
    const res = await BackupService.triggerManualBackup();
    console.log("[BACKUP_LOG] Manual backup successful:", res.fileName);
    revalidatePath("/setup/maintenance/backup");
    return res;
  } catch (error: any) {
    console.error("[BACKUP_LOG] Error in triggerManualBackupAction:", error);
    throw new Error(error.message || "La sauvegarde a échoué.");
  }
}

export async function getBackupConfigAction() {
  console.log("[BACKUP_LOG] Getting backup config...");
  const config = {
    hasToken: Boolean(process.env.BACKUP_GITHUB_TOKEN),
    repo: process.env.BACKUP_GITHUB_REPO || "Non configuré",
  };
  console.log("[BACKUP_LOG] Config found:", { ...config, hasToken: config.hasToken });
  return config;
}
