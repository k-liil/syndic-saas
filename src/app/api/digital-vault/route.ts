import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";
import {
  DIGITAL_VAULT_CATEGORIES,
  DIGITAL_VAULT_MAX_FILE_BYTES,
  DIGITAL_VAULT_STORAGE_LIMIT_BYTES,
  isAllowedDigitalVaultCategory,
  parseDigitalVaultDate,
} from "@/lib/digital-vault";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

function getDataUrlSizeBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

export async function GET(req: Request) {
  const gate = await requireAuth();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({
      documents: [],
      categories: DIGITAL_VAULT_CATEGORIES,
      storageUsedBytes: 0,
      storageLimitBytes: DIGITAL_VAULT_STORAGE_LIMIT_BYTES,
      maxFileBytes: DIGITAL_VAULT_MAX_FILE_BYTES,
    });
  }

  const role = gate.session.user?.role;
  const where =
    role === "OWNER"
      ? { organizationId: orgId, isVisibleToOwners: true }
      : { organizationId: orgId };

  const documents = await prisma.digitalVaultDocument.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });

  const storageUsedBytes = documents.reduce((sum, document) => sum + document.sizeBytes, 0);

  return NextResponse.json({
    documents,
    categories: DIGITAL_VAULT_CATEGORIES,
    storageUsedBytes,
    storageLimitBytes: DIGITAL_VAULT_STORAGE_LIMIT_BYTES,
    maxFileBytes: DIGITAL_VAULT_MAX_FILE_BYTES,
  });
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const name = asString(body.name);
  const category = asString(body.category) || "Divers";
  const fileName = asString(body.fileName);
  const fileUrl = asString(body.fileUrl);
  const mimeType = asString(body.mimeType) || "application/octet-stream";
  const tags = parseTags(body.tags);
  const isVisibleToOwners = Boolean(body.isVisibleToOwners);
  const documentDate = parseDigitalVaultDate(asString(body.documentDate));

  if (!name || !fileName || !fileUrl) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  if (!fileUrl.startsWith("data:")) {
    return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
  }

  if (!isAllowedDigitalVaultCategory(category)) {
    return NextResponse.json({ error: "INVALID_CATEGORY" }, { status: 400 });
  }

  const sizeBytes = getDataUrlSizeBytes(fileUrl);
  if (sizeBytes <= 0) {
    return NextResponse.json({ error: "INVALID_FILE_SIZE" }, { status: 400 });
  }

  if (sizeBytes > DIGITAL_VAULT_MAX_FILE_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const aggregate = await prisma.digitalVaultDocument.aggregate({
    where: { organizationId: orgId },
    _sum: { sizeBytes: true },
  });

  const storageUsedBytes = aggregate._sum.sizeBytes ?? 0;
  if (storageUsedBytes + sizeBytes > DIGITAL_VAULT_STORAGE_LIMIT_BYTES) {
    return NextResponse.json({ error: "STORAGE_LIMIT_EXCEEDED" }, { status: 400 });
  }

  const document = await prisma.digitalVaultDocument.create({
    data: {
      organizationId: orgId,
      name,
      category,
      fileName,
      fileUrl,
      mimeType,
      sizeBytes,
      tags,
      isVisibleToOwners,
      documentDate,
    },
  });

  return NextResponse.json(document, { status: 201 });
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const id = asString(body?.id);
  if (!id) {
    return NextResponse.json({ error: "DOCUMENT_ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.digitalVaultDocument.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });
  }

  await prisma.digitalVaultDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORGANIZATION" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const id = asString(body?.id);
  if (!id) {
    return NextResponse.json({ error: "DOCUMENT_ID_REQUIRED" }, { status: 400 });
  }

  const existing = await prisma.digitalVaultDocument.findFirst({
    where: { id, organizationId: orgId },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "DOCUMENT_NOT_FOUND" }, { status: 404 });
  }

  const document = await prisma.digitalVaultDocument.update({
    where: { id },
    data: {
      isVisibleToOwners: Boolean(body?.isVisibleToOwners),
    },
  });

  return NextResponse.json(document);
}
