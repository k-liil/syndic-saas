import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";
import { getOrgIdFromRequest } from "@/lib/org-utils";

function getErrorDetail(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ posts: [] });
  }

  const posts = await prisma.accountingPost.findMany({
    where: { organizationId: orgId },
    orderBy: [{ postType: "asc" }, { code: "asc" }],
  });

  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const postType = body.postType === "PRODUCT" ? "PRODUCT" : "CHARGE";

    if (!code || !name) {
      return NextResponse.json({ error: "CODE_AND_NAME_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.accountingPost.findFirst({
      where: { organizationId: orgId, code },
    });

    if (existing) {
      return NextResponse.json({ error: "POST_ALREADY_EXISTS" }, { status: 400 });
    }

    const post = await prisma.accountingPost.create({
      data: {
        organizationId: orgId,
        code,
        name,
        postType,
        note: typeof body.note === "string" ? body.note.trim() : null,
        isActive: false,
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("POST /api/accounting-posts failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.accountingPost.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "POST_NOT_FOUND" }, { status: 404 });
    }

    const post = await prisma.accountingPost.update({
      where: { id },
      data: {
        code: typeof body.code === "string" ? body.code.trim().toUpperCase() : undefined,
        name: typeof body.name === "string" ? body.name.trim() : undefined,
        postType: body.postType === "PRODUCT" ? "PRODUCT" : body.postType === "CHARGE" ? "CHARGE" : undefined,
        note: typeof body.note === "string" ? body.note.trim() : undefined,
        isActive: typeof body.isActive === "boolean" ? body.isActive : undefined,
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("PUT /api/accounting-posts failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const isActive =
      typeof body.isActive === "boolean" ? body.isActive : undefined;

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ error: "IS_ACTIVE_REQUIRED" }, { status: 400 });
    }

    const result = await prisma.accountingPost.updateMany({
      where: { organizationId: orgId },
      data: { isActive },
    });

    return NextResponse.json({ ok: true, count: result.count, isActive });
  } catch (e) {
    console.error("PATCH /api/accounting-posts failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const orgId = await getOrgIdFromRequest(req, gate);
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "ID_REQUIRED" }, { status: 400 });
    }

    const existing = await prisma.accountingPost.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: "POST_NOT_FOUND" }, { status: 404 });
    }

    await prisma.accountingPost.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/accounting-posts failed:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", detail: getErrorDetail(e) },
      { status: 500 }
    );
  }
}
