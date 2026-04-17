import { NextResponse } from 'next/server';
import { BackupService } from '@/lib/backup-service';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/backups/heartbeat?token=...
 * Triggers the automatic backup logic check.
 * This should be called every minute by a cron job.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  // Simple token protection (can be set in env)
  const expectedToken = process.env.BACKUP_HEARTBEAT_TOKEN || 'syndic-heartbeat-default';
  
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Log the heartbeat pulse in SystemSettings
    await prisma.systemSettings.upsert({
      where: { id: 'singleton' }, // Assuming a singleton record or just using a fixed ID
      update: { lastBackupHeartbeatAt: new Date() },
      create: { id: 'singleton', lastBackupHeartbeatAt: new Date() }
    });

    // 2. Process backups
    await BackupService.processHeartbeat();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[API_HEARTBEAT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
