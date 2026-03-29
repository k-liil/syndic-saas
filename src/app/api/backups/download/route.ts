import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const gate = await requireSuperAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: gate.status });
  }

  const token = process.env.BACKUP_GITHUB_TOKEN;
  const repo = process.env.BACKUP_GITHUB_REPO;
  if (!token || !repo) {
    return NextResponse.json(
      { error: "Backup GitHub config missing" },
      { status: 500 }
    );
  }

  const file = req.nextUrl.searchParams.get("file")?.trim();
  if (!file) {
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
  }

  // Basic guard: expected backup file names only.
  if (file.includes("/") || file.includes("\\") || !file.endsWith(".gz")) {
    return NextResponse.json({ error: "Invalid file parameter" }, { status: 400 });
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/backups/${encodeURIComponent(file)}`;
  const commonHeaders = {
    Authorization: `token ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "syndicly-backup-download",
  };

  // Prefer raw binary download to avoid JSON payload edge-cases/truncation.
  const rawResponse = await fetch(apiUrl, {
    headers: {
      ...commonHeaders,
      Accept: "application/vnd.github.raw",
    },
    cache: "no-store",
  });

  if (rawResponse.ok) {
    const bytes = Buffer.from(await rawResponse.arrayBuffer());
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Fallback: JSON content endpoint
  const response = await fetch(apiUrl, {
    headers: {
      ...commonHeaders,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    console.error("[BACKUP_LOG] Download fetch failed:", response.status, body.slice(0, 300));
    return NextResponse.json({ error: "File not found on GitHub" }, { status: response.status });
  }

  const payload: any = await response.json();
  if (payload?.encoding !== "base64" || typeof payload?.content !== "string") {
    console.error("[BACKUP_LOG] Invalid GitHub payload keys:", Object.keys(payload || {}));
    return NextResponse.json({ error: "Invalid GitHub response payload" }, { status: 502 });
  }

  const normalizedBase64 = payload.content.replace(/\n/g, "");
  const buffer = Buffer.from(normalizedBase64, "base64");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
