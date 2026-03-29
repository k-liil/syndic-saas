import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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
      dbUrl: process.env.BACKUP_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL,
      appDbUrl: process.env.DATABASE_URL,
      pgDumpPath: process.env.PG_DUMP_PATH,
    };
  }

  private static resolvePgDumpPath() {
    const { pgDumpPath } = this.config;
    const candidates = [
      pgDumpPath,
      'pg_dump',
      '/usr/bin/pg_dump',
      '/usr/local/bin/pg_dump',
      '/bin/pg_dump',
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      try {
        const probe = spawnSync(candidate, ['--version'], { stdio: 'pipe', encoding: 'utf8' });
        if (probe.status === 0) {
          console.log(`[BACKUP_LOG] pg_dump found at: ${candidate}`);
          return candidate;
        }
      } catch {
        // Try next candidate
      }
    }

    throw new Error(
      "pg_dump introuvable sur le serveur. Ajoute PostgreSQL au runtime ou configure PG_DUMP_PATH (ex: /usr/bin/pg_dump)."
    );
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
      return Array.isArray(files) ? files.filter(f => f.name.endsWith('.sql.gz')) : [];
    } catch (e) {
      console.error('[BACKUP_LOG] Failed to list backups:', e);
      return [];
    }
  }

  static async triggerManualBackup() {
    console.log("[BACKUP_LOG] Triggering pg_dump backup...");
    const { token, repo, dbUrl, appDbUrl } = this.config;
    if (!token || !repo || !dbUrl) throw new Error("Configuration de sauvegarde manquante.");

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().getTime();
    const fileName = `manual-backup-${date}-${time}.sql`;
    const filePath = path.join('/tmp', fileName);

    try {
      if (appDbUrl?.includes('pgbouncer=true')) {
        console.warn("[BACKUP_LOG] DATABASE_URL points to pgbouncer pooler. Using BACKUP_DATABASE_URL or DIRECT_URL is recommended for pg_dump.");
      }

      // 1. Locate pg_dump and write SQL dump directly to file
      const pgDumpBin = this.resolvePgDumpPath();
      const dumpFd = fs.openSync(filePath, 'w');
      try {
        execFileSync(pgDumpBin, [dbUrl], { stdio: ['ignore', dumpFd, 'pipe'] });
      } finally {
        fs.closeSync(dumpFd);
      }

      // 2. Compress with Node.js to avoid relying on external gzip binary
      const zippedPath = `${filePath}.gz`;
      const zippedName = `${fileName}.gz`;
      const sqlBuffer = fs.readFileSync(filePath);
      const gzBuffer = zlib.gzipSync(sqlBuffer, { level: 9 });
      fs.writeFileSync(zippedPath, gzBuffer);
      fs.unlinkSync(filePath);

      // 3. Upload
      const content = fs.readFileSync(zippedPath).toString('base64');
      const payload = JSON.stringify({
        message: `Manual backup ${date}`,
        content,
      });
      console.log(`[BACKUP_LOG] Upload size (base64 body): ${Buffer.byteLength(payload)} bytes`);

      let lastError: unknown = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`[BACKUP_LOG] GitHub upload attempt ${attempt}/3...`);
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
            signal: AbortSignal.timeout(60_000),
          });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`GitHub upload failed (${response.status}): ${body.slice(0, 500)}`);
          }

          console.log("[BACKUP_LOG] GitHub upload successful.");
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          console.error(`[BACKUP_LOG] GitHub upload attempt ${attempt} failed:`, error);
          if (attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      // Cleanup
      fs.unlinkSync(zippedPath);
      return { success: true, fileName: zippedName };

    } catch (error: any) {
      console.error('[BACKUP_LOG] Manual backup failed:', error);
      throw error;
    }
  }
}
