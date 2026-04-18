import { prisma } from '@/lib/prisma';
import { logAction } from './audit-service';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Use the shared prisma instance

export interface GitHubBackup {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  download_url: string;
  type: string;
}

export class BackupService {
  private static get config() {
    return {
      token: process.env.BACKUP_GITHUB_TOKEN,
      repo: process.env.BACKUP_GITHUB_REPO,
    };
  }

  /**
   * Generates a SQL dump for a specific organization by exporting rows from all tables
   * that have an organizationId column.
   */
  private static async generateTenantDump(organizationId: string): Promise<string> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true }
    });

    if (!org) throw new Error("Organization not found");

    // Get all tables that have an organizationId column
    const tablesResult = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'organizationId' 
      AND table_schema = 'public'
    `;

    const tableNames = tablesResult.map(r => r.table_name);
    let sqlDump = `-- Backup for organization: ${org.slug} (${organizationId})\n`;
    sqlDump += `-- Date: ${new Date().toISOString()}\n\n`;

    for (const tableName of tableNames) {
      // Fetch rows for this organization
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "${tableName}" WHERE "organizationId" = $1`,
        organizationId
      );

      if (rows.length === 0) continue;

      sqlDump += `-- Table: ${tableName}\n`;
      for (const row of rows) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
        const values = Object.values(row).map(v => {
          if (v === null) return 'NULL';
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return v;
        }).join(', ');

        sqlDump += `INSERT INTO "${tableName}" (${columns}) VALUES (${values});\n`;
      }
      sqlDump += `\n`;
    }

    return sqlDump;
  }

  static async listBackups(organizationId?: string): Promise<GitHubBackup[]> {
    const { token, repo } = this.config;
    if (!token || !repo) return [];

    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/backups`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store'
      });

      if (!response.ok) return [];
      const files: any[] = await response.json();
      
      let backups = Array.isArray(files) ? files.filter(f => f.name.endsWith('.sql.gz')) : [];
      
      // If organizationId is provided, filter by prefix in filename
      if (organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { slug: true } });
        if (org) {
          const prefix = `${org.slug}-`;
          backups = backups.filter(b => b.name.startsWith(prefix));
        }
      }

      return backups;
    } catch (e) {
      console.error('[BACKUP_LOG] Failed to list backups:', e);
      return [];
    }
  }

  static async deleteBackup(fileName: string, deletionType: "MANUAL" | "RETENTION" = "MANUAL") {
    const { token, repo } = this.config;
    if (!token || !repo) throw new Error("GitHub Configuration missing.");

    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/contents/backups/${fileName}`,
        {
          method: "GET",
          headers: {
            Authorization: `token ${process.env.BACKUP_GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to find backup file: ${response.statusText}`);
      }

      const data = await response.json();
      const sha = data.sha;

      const deleteResponse = await fetch(
        `https://api.github.com/repos/${repo}/contents/backups/${fileName}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `token ${process.env.BACKUP_GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Delete backup ${fileName} (${deletionType})`,
            sha,
          }),
        }
      );

      if (!deleteResponse.ok) {
        throw new Error(`Failed to delete backup file: ${deleteResponse.statusText}`);
      }

      // Track in database
      await prisma.backupAudit.updateMany({
        where: { fileName: fileName },
        data: {
          deletedAt: new Date(),
          deletionType: deletionType
        }
      });

      await logAction({
        action: "BACKUP_DELETE",
        details: `Deleted ${fileName} (${deletionType})`,
        entityType: "BACKUP",
        entityId: fileName
      });

      return { success: true };
    } catch (error) {
      console.error("[BACKUP_LOG] Error in deleteBackup:", error);
      throw error;
    }
  }

  static async enforceRetention(organizationId: string) {
    try {
      const schedule = await prisma.backupSchedule.findUnique({
        where: { organizationId },
        select: { retentionCount: true }
      });

      const limit = schedule?.retentionCount || 10;
      const backups = await this.listBackups(organizationId);

      if (backups.length > limit) {
        console.log(`[BACKUP_LOG] Enforcing retention for org ${organizationId}: ${backups.length} backups found, limit is ${limit}.`);
        
        // Sort by name (timestamp is at the end) - name-backup-date-timestamp.sql.gz
        // GitHub usually returns them sorted, but let's be safe.
        const sorted = backups.sort((a, b) => a.name.localeCompare(b.name));
        
        const backupsToDelete = sorted.slice(0, backups.length - limit);
        
        for (const fileToDelete of backupsToDelete) {
          console.log(`[BACKUP_LOG] Retention: deleting ${fileToDelete.name}`);
          await this.deleteBackup(fileToDelete.name, "RETENTION");
        }
      }
    } catch (error) {
      console.error('[BACKUP_LOG] Failed to enforce retention:', error);
    }
  }

  static async triggerOrganizationBackup(organizationId: string, isManual = false) {
    const { token, repo } = this.config;
    if (!token || !repo) throw new Error("GitHub Configuration missing.");

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new Error("Organization not found.");

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().getTime();
    const prefix = isManual ? 'manual-' : '';
    const zippedName = `${org.slug}-${prefix}backup-${date}-${time}.sql.gz`;
    const tempPath = path.join('/tmp', zippedName);

    try {
      // 1. Generate Dump
      const sqlDump = await this.generateTenantDump(organizationId);
      const gzBuffer = zlib.gzipSync(Buffer.from(sqlDump), { level: 9 });

      // 2. Upload to GitHub
      const content = gzBuffer.toString('base64');
      const payload = JSON.stringify({
        message: `Backup for ${org.slug} - ${date}`,
        content,
      });

      const response = await fetch(`https://api.github.com/repos/${repo}/contents/backups/${zippedName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'syndicly-backup-bot',
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub Upload failed: ${errorText}`);
      }

      // 3. Update Schedule & Audit
      await prisma.backupAudit.create({
        data: {
          organizationId,
          fileName: zippedName,
          status: 'SUCCESS',
          sizeBytes: gzBuffer.length,
        }
      });

      if (!isManual) {
        const schedule = await prisma.backupSchedule.findUnique({ where: { organizationId } });
        if (schedule) {
          const nextRun = new Date(Date.now() + schedule.frequency * 60000);
          await prisma.backupSchedule.update({
            where: { id: schedule.id },
            data: {
              lastRunAt: new Date(),
              nextRunAt: nextRun
            }
          });
        }
      }

      // 4. Enforce Retention
      await this.enforceRetention(organizationId);

      return { success: true, fileName: zippedName };
    } catch (error: any) {
      console.error(`[BACKUP_LOG] Backup failed for ${org.slug}:`, error);
      
      await prisma.backupAudit.create({
        data: {
          organizationId,
          fileName: zippedName,
          status: 'ERROR',
          errorMsg: error.message || String(error),
        }
      });

      throw error;
    }
  }

  static async processHeartbeat() {
    console.log("[BACKUP_LOG] Processing Heartbeat...");
    const now = new Date();

    const schedulesToRun = await prisma.backupSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now }
      }
    });

    console.log(`[BACKUP_LOG] Found ${schedulesToRun.length} schedules to process.`);

    for (const schedule of schedulesToRun) {
      try {
        await this.triggerOrganizationBackup(schedule.organizationId);
        console.log(`[BACKUP_LOG] Automatic backup completed for org ${schedule.organizationId}`);
      } catch (error) {
        console.error(`[BACKUP_LOG] Failed automatic backup for org ${schedule.organizationId}:`, error);
      }
    }
  }
}
