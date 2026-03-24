export const DIGITAL_VAULT_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024;
export const DIGITAL_VAULT_MAX_FILE_BYTES = 25 * 1024 * 1024;

export const DIGITAL_VAULT_CATEGORIES = [
  "Reglements",
  "Assemblees Generales",
  "Comptabilite",
  "Contrats",
  "Documents Techniques",
  "Correspondance",
  "Divers",
] as const;

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    const value = bytes / (1024 * 1024);
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} MB`;
  }

  if (bytes >= 1024) {
    const value = bytes / 1024;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} KB`;
  }

  return `${bytes} B`;
}

export function isAllowedDigitalVaultCategory(category: string) {
  return DIGITAL_VAULT_CATEGORIES.includes(
    category as (typeof DIGITAL_VAULT_CATEGORIES)[number],
  );
}

export function parseDigitalVaultDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCDate() !== Number(day) ||
    parsed.getUTCMonth() !== Number(month) - 1 ||
    parsed.getUTCFullYear() !== Number(year)
  ) {
    return null;
  }

  return parsed;
}

export function formatDigitalVaultDate(value: string | Date | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const year = parsed.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
