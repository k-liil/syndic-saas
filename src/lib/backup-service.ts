import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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
      dbUrl: process.env.DATABASE_URL,
    };
  }

  static async listBackups(): Promise<GitHubBackup[]> {
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
      const files = await response.json();
      return Array.isArray(files) ? files.filter(f => f.name.endsWith('.gz')) : [];
    } catch (e) {
      console.error('Failed to list backups:', e);
      return [];
    }
  }

  static async triggerManualBackup() {
    const { token, repo, dbUrl } = this.config;
    if (!token || !repo || !dbUrl) throw new Error("Configuration de sauvegarde manquante.");

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().getTime();
    const fileName = `manual-backup-${date}-${time}.sql`;
    const filePath = path.join('/tmp', fileName);

    try {
      // 1. Dump
      execSync(`pg_dump "${dbUrl}" > "${filePath}"`);
      
      // 2. Compress
      execSync(`gzip "${filePath}"`);
      const zippedPath = `${filePath}.gz`;
      const zippedName = `${fileName}.gz`;

      // 3. Upload
      const content = fs.readFileSync(zippedPath).toString('base64');
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/backups/${zippedName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Manual backup ${date}`,
          content: content,
        })
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(`Erreur GitHub: ${JSON.stringify(err)}`);
      }

      // Cleanup
      fs.unlinkSync(zippedPath);
      return { success: true, fileName: zippedName };

    } catch (error: any) {
      console.error('Manual backup failed:', error);
      throw error;
    }
  }
}
