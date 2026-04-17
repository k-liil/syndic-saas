import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    connection: 'pending',
    tables: {},
    errors: []
  };

  try {
    // 1. Test basic connection
    await prisma.$queryRaw`SELECT 1`;
    results.connection = 'SUCCESS';

    // 2. Check BackupSchedule
    try {
      const scheduleCount = await prisma.backupSchedule.count();
      results.tables.BackupSchedule = { status: 'EXISTS', count: scheduleCount };
    } catch (err: any) {
      results.tables.BackupSchedule = { status: 'MISSING_OR_ERROR', error: err.message };
      results.errors.push(`BackupSchedule: ${err.message}`);
    }

    // 3. Check BackupAudit
    try {
      const auditCount = await prisma.backupAudit.count();
      results.tables.BackupAudit = { status: 'EXISTS', count: auditCount };
    } catch (err: any) {
      results.tables.BackupAudit = { status: 'MISSING_OR_ERROR', error: err.message };
      results.errors.push(`BackupAudit: ${err.message}`);
    }

    // 4. Check Organizations (to see if existing tables work)
    try {
      const orgCount = await prisma.organization.count();
      results.tables.Organization = { status: 'EXISTS', count: orgCount };
    } catch (err: any) {
      results.tables.Organization = { status: 'MISSING_OR_ERROR', error: err.message };
      results.errors.push(`Organization: ${err.message}`);
    }

  } catch (error: any) {
    results.connection = 'FAILED';
    results.errors.push(`Connection: ${error.message}`);
  }

  return NextResponse.json(results, { status: results.errors.length > 0 ? 500 : 200 });
}
