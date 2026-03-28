"use server";

import { BackupService, GitHubBackup } from "@/lib/backup-service";
import { revalidatePath } from "next/cache";

export async function getBackupsAction(): Promise<GitHubBackup[]> {
  return await BackupService.listBackups();
}

export async function triggerManualBackupAction() {
  try {
    const res = await BackupService.triggerManualBackup();
    revalidatePath("/setup/maintenance/backup");
    return res;
  } catch (error: any) {
    throw new Error(error.message || "La sauvegarde a échoué.");
  }
}

export async function getBackupConfigAction() {
  return {
    hasToken: Boolean(process.env.BACKUP_GITHUB_TOKEN),
    repo: process.env.BACKUP_GITHUB_REPO || "Non configuré",
  };
}
