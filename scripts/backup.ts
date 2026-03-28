import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Script de sauvegarde automatique Syndicly
 * Ce script :
 * 1. Effectue un dump de la base de données via Prisma
 * 2. Compresse le fichier
 * 3. L'envoie vers un dépôt GitHub privé
 */

async function runBackup() {
    const GITHUB_TOKEN = process.env.BACKUP_GITHUB_TOKEN;
    const GITHUB_REPO = process.env.BACKUP_GITHUB_REPO; // ex: "username/syndicly-backups"
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!GITHUB_TOKEN || !GITHUB_REPO || !DATABASE_URL) {
        console.error("Missing environment variables: BACKUP_GITHUB_TOKEN, BACKUP_GITHUB_REPO, or DATABASE_URL");
        process.exit(1);
    }

    const date = new Date().toISOString().split('T')[0];
    const fileName = `backup-${date}.sql`;
    const filePath = path.join(process.cwd(), fileName);

    try {
        console.log(`[BACKUP] Starting dump for ${date}...`);
        
        // Use pg_dump if available, else fallback to a simpler method or warn
        // On Railway with Nixpacks, pg_dump is usually available if we add it to the environment
        execSync(`pg_dump "${DATABASE_URL}" > "${filePath}"`);
        
        console.log(`[BACKUP] Compressing...`);
        execSync(`gzip "${filePath}"`);
        const zippedPath = `${filePath}.gz`;
        const zippedName = `${fileName}.gz`;

        console.log(`[BACKUP] Uploading to GitHub: ${GITHUB_REPO}...`);
        
        // Prepare GitHub Upload via API (to avoid complex git clone/push in ephemeral env)
        const content = fs.readFileSync(zippedPath).toString('base64');
        
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/backups/${zippedName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Nightly backup ${date}`,
                content: content,
            })
        });

        if (response.ok) {
            console.log(`[SUCCESS] Backup uploaded successfully to GitHub.`);
        } else {
            const err = await response.json();
            console.error(`[ERROR] GitHub Upload failed:`, err);
        }

        // Cleanup
        fs.unlinkSync(zippedPath);

    } catch (error) {
        console.error(`[CRITICAL] Backup failed:`, error);
        process.exit(1);
    }
}

runBackup();
