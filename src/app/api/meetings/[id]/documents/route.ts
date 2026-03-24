import { NextResponse } from "next/server";
import { MeetingDocumentSourceType, MeetingDocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!meeting) return NextResponse.json({ error: "MEETING_NOT_FOUND" }, { status: 404 });

  const type = Object.values(MeetingDocumentType).includes(body.type as MeetingDocumentType)
    ? (body.type as MeetingDocumentType)
    : MeetingDocumentType.OTHER;

  const vaultDocumentId = asString(body.vaultDocumentId);
  if (vaultDocumentId) {
    const vaultDocument = await prisma.digitalVaultDocument.findFirst({
      where: { id: vaultDocumentId, organizationId: orgId },
      select: { id: true, name: true, fileName: true, fileUrl: true, mimeType: true, sizeBytes: true },
    });

    if (!vaultDocument) {
      return NextResponse.json({ error: "VAULT_DOCUMENT_NOT_FOUND" }, { status: 404 });
    }

    const document = await prisma.meetingDocument.create({
      data: {
        meetingId: id,
        type,
        sourceType: MeetingDocumentSourceType.VAULT,
        title: vaultDocument.name,
        fileName: vaultDocument.fileName,
        fileUrl: vaultDocument.fileUrl,
        mimeType: vaultDocument.mimeType,
        sizeBytes: vaultDocument.sizeBytes,
        vaultDocumentId: vaultDocument.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  }

  const title = asString(body.title);
  const fileName = asString(body.fileName);
  const fileUrl = asString(body.fileUrl);
  const mimeType = asString(body.mimeType) || "application/octet-stream";

  if (!title || !fileName || !fileUrl) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const document = await prisma.meetingDocument.create({
    data: {
      meetingId: id,
      type,
      sourceType: MeetingDocumentSourceType.UPLOAD,
      title,
      fileName,
      fileUrl,
      mimeType,
      sizeBytes: getDataUrlSizeBytes(fileUrl),
    },
  });

  return NextResponse.json(document, { status: 201 });
}

export async function PATCH(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const documentId = asString(body?.id);
  if (!documentId) return NextResponse.json({ error: "DOCUMENT_ID_REQUIRED" }, { status: 400 });

  const existing = await prisma.meetingDocument.findFirst({
    where: { id: documentId, meetingId: id, meeting: { organizationId: orgId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });

  const document = await prisma.meetingDocument.update({
    where: { id: documentId },
    data: {
      ...(body.title !== undefined ? { title: asString(body.title) } : {}),
      ...(body.fileName !== undefined ? { fileName: asString(body.fileName) || null } : {}),
      ...(body.fileUrl !== undefined ? { fileUrl: asString(body.fileUrl) || null } : {}),
      ...(body.mimeType !== undefined ? { mimeType: asString(body.mimeType) || null } : {}),
    },
  });

  return NextResponse.json(document);
}

export async function DELETE(req: Request, { params }: Params) {
  const gate = await requireManager();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const documentId = asString(body?.id);
  if (!documentId) return NextResponse.json({ error: "DOCUMENT_ID_REQUIRED" }, { status: 400 });

  const existing = await prisma.meetingDocument.findFirst({
    where: { id: documentId, meetingId: id, meeting: { organizationId: orgId } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });

  await prisma.meetingDocument.delete({ where: { id: documentId } });
  return NextResponse.json({ ok: true });
}
