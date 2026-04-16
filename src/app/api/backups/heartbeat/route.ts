import { NextResponse } from 'next/server';
import { BackupService } from '@/lib/backup-service';

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
    await BackupService.processHeartbeat();
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[API_HEARTBEAT] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
