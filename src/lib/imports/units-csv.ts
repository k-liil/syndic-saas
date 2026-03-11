export type ImportUnitRow = {
  lotNumber: string;
  reference: string | null;
  type: "APARTMENT" | "GARAGE" | "COMMERCIAL";
  buildingName?: string | null;
  monthlyDueAmount?: number | null;
};

export type ImportUnitError = {
  row: number;
  error: string;
};

function parseMoney(v: string): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;

  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return NaN;

  return Math.round(n);
}

function parseLotNumber(v: string): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  return s;
}

export function parseUnitsCsv(text: string): {
  rows: ImportUnitRow[];
  errors: ImportUnitError[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, error: "CSV vide" }] };
  }

  const delim = lines[0].includes(";") ? ";" : ",";
  const header = lines[0].split(delim).map((h) => h.trim().toLowerCase());

  const lotIdx = header.indexOf("lotnumber");
  const refIdx = header.indexOf("reference");
  const typeIdx = header.indexOf("type");
  const bldIdx = header.indexOf("building");
  const dueIdx = header.indexOf("monthlydueamount");

  const errors: ImportUnitError[] = [];
  const rows: ImportUnitRow[] = [];

  if (lotIdx === -1) errors.push({ row: 1, error: "Colonne manquante: lotNumber" });
  if (typeIdx === -1) errors.push({ row: 1, error: "Colonne manquante: type" });

  if (errors.length) {
    return { rows: [], errors };
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim());

    const lotNumber = parseLotNumber(cols[lotIdx] ?? "");
    const reference = refIdx >= 0 ? (cols[refIdx] ?? "").trim() : "";
    const rawType = (cols[typeIdx] ?? "").trim().toUpperCase();
    const buildingName = bldIdx >= 0 ? (cols[bldIdx] ?? "").trim() : "";
    const dueRaw = dueIdx >= 0 ? (cols[dueIdx] ?? "").trim() : "";

    if (!lotNumber) {
      errors.push({ row: i + 1, error: "lotNumber invalide" });
      continue;
    }

    let type: ImportUnitRow["type"] | null = null;
    if (rawType === "APARTMENT") type = "APARTMENT";
    else if (rawType === "GARAGE") type = "GARAGE";
    else if (rawType === "OTHER" || rawType === "COMMERCIAL") type = "COMMERCIAL";

    if (!type) {
      errors.push({
        row: i + 1,
        error: "type invalide (APARTMENT|GARAGE|OTHER|COMMERCIAL)",
      });
      continue;
    }

    const monthlyDueAmount = parseMoney(dueRaw);
    if (Number.isNaN(monthlyDueAmount as number)) {
      errors.push({
        row: i + 1,
        error: "monthlyDueAmount invalide (doit être >= 0)",
      });
      continue;
    }

    rows.push({
      lotNumber,
      reference: reference || null,
      type,
      buildingName: buildingName || null,
      monthlyDueAmount: monthlyDueAmount ?? null,
    });
  }

  return { rows, errors };
}