/**
 * Centralized date utility to ensure consistent formatting (dd/mm/yyyy)
 * across the entire application.
 */

/**
 * Formats a date string or Date object into dd/mm/yyyy.
 * Uses UTC by default to avoid timezone shift issues common with SaaS data.
 */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  
  const date = typeof d === "string" ? new Date(d) : d;
  
  // Use fr-FR to guarantee dd/mm/yyyy
  return date.toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

/**
 * Formats a date into a long month year string (e.g., "Avril 2026").
 */
export function formatMonth(d: string | Date | null | undefined): string {
  if (!d) return "—";
  
  const date = typeof d === "string" ? new Date(d) : d;
  
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Helper to get the start of the current day in YYYY-MM-DD format
 * for use in standard date inputs.
 */
export function getTodayInputVal(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Parses a DD/MM/YYYY string into a Date object (UTC).
 */
export function parseDate(display: string): Date | null {
  const parts = display.split("/");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0]);
  const m = parseInt(parts[1]) - 1;
  const y = parseInt(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;

  const date = new Date(Date.UTC(y, m, d));
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Converts a YYYY-MM-DD string into a DD/MM/YYYY string.
 */
export function toDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
