import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager } from "@/lib/authz";

type Row = { name: string; address?: string | null };

function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Supporte virgule OU point-virgule
  const delim = lines[0].includes(";") ? ";" : ",";

  const header = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const addrIdx = header.indexOf("address");

  if (nameIdx === -1) throw new Error("CSV must include column: name");

  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim());
    const name = (cols[nameIdx] ?? "").trim();
    const address = addrIdx >= 0 ? (cols[addrIdx] ?? "").trim() : "";

    if (!name) continue;

    rows.push({
      name,
      address: address ? address : null,
    });
  }

  return rows;
}

export async function POST(req: Request) {
  const gate = await requireManager();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const csv = await file.text();
    if (!csv.trim()) {
      return NextResponse.json({ error: "Empty csv file" }, { status: 400 });
    }

    const rows = parseCsv(csv);

    if (rows.length === 0) {
      return NextResponse.json({
        ok: true,
        imported: 0,
        errors: [{ row: 0, error: "No valid rows" }],
      });
    }

    const errors: { row: number; error: string }[] = [];
    let imported = 0;

    if (!gate.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          await tx.building.create({
            data: {
              organizationId: gate.organizationId ?? "",
              name: r.name,
              address: r.address ?? undefined,
            },
          });
          imported++;
        } catch (e: any) {
          errors.push({ row: i + 2, error: e?.message ?? "Create failed" }); // +2 => header + 1-index
        }
      }
    });

    return NextResponse.json({ ok: true, imported, errors });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Import failed" },
      { status: 500 }
    );
  }
}
