import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { id } = await params;

  const job = await prisma.importJob.findFirst({
    where: { id, organizationId: gate.organizationId },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const percent =
    job.totalRows > 0 ? Math.round((job.processed / job.totalRows) * 100) : 0;

  return NextResponse.json({
    id: job.id,
    type: job.type,
    status: job.status,
    totalRows: job.totalRows,
    processed: job.processed,
    percent,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}
