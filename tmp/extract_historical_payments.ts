import * as XLSX from 'xlsx';
import * as path from 'path';

// Dictionary of months to indices
const MONTHS_MAP: Record<string, number> = {
  'JANV': 0, 'JANVIER': 0,
  'FEV': 1, 'FEVRIER': 1,
  'MARS': 2,
  'AVR': 3, 'AVRIL': 3,
  'MAI': 4,
  'JUIN': 5,
  'JUIL': 6, 'JUILLET': 6,
  'AOUT': 7,
  'SEPT': 8, 'SEPTEMBRE': 8,
  'OCT': 9, 'OCTOBRE': 9,
  'NOV': 10, 'NOVEMBRE': 10,
  'DEC': 11, 'DECEMB': 11, 'DECEMBRE': 11
};

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTH_NAMES_NO_ACCENT = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"
];

function removeAccents(str: string): string {
  if (!str) return "";
  return str
    .replace(/[éèêë]/g, "e")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[àâä]/g, "a")
    .replace(/[ÀÂÄ]/g, "A")
    .replace(/[îï]/g, "i")
    .replace(/[ÎÏ]/g, "I")
    .replace(/[ôö]/g, "o")
    .replace(/[ÔÖ]/g, "O")
    .replace(/[ûüù]/g, "u")
    .replace(/[ÛÜÙ]/g, "U")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
}

interface ExtractedRow {
  type: string;
  description: string;
  amount: number;
  method: string;
  date: string;
  bankName: string;
  bankRef: string;
  note: string;
}

function parseMonthsAndYears(text: string): { month: number, year: number }[] {
  const normalized = text.toUpperCase();
  const results: { month: number, year: number }[] = [];
  
  const yearsFound = [...normalized.matchAll(/\b(202[0-6]|2[0-6])\b/g)].map(m => {
    const val = m[0];
    return val.length === 2 ? 2000 + parseInt(val) : parseInt(val);
  });
  
  const defaultYear = yearsFound.find(y => y < 2026) || 2025;

  const rangeMatch = normalized.match(/(JANV|FEV|MARS|AVR|MAI|JUIN|JUIL|AOUT|SEPT|OCT|NOV|DEC)\s+(?:A|À|AU)\s+(JANV|FEV|MARS|AVR|MAI|JUIN|JUIL|AOUT|SEPT|OCT|NOV|DEC)\s*\b(202[0-6]|2[0-6])?\b/);
  if (rangeMatch) {
    const start = MONTHS_MAP[rangeMatch[1]];
    const end = MONTHS_MAP[rangeMatch[2]];
    const rangeYear = rangeMatch[3] ? (rangeMatch[3].length === 2 ? 2000 + parseInt(rangeMatch[3]) : parseInt(rangeMatch[3])) : defaultYear;
    
    if (start !== undefined && end !== undefined) {
      for (let i = start; i <= end; i++) {
        results.push({ month: i, year: rangeYear });
      }
      return results;
    }
  }

  const tokens = normalized.split(/[\s,&\/]+/);
  let lastYear = defaultYear;

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i];
    const yearMatch = token.match(/^(202[0-6]|2[0-6])$/);
    if (yearMatch) {
      lastYear = yearMatch[1].length === 2 ? 2000 + parseInt(yearMatch[1]) : parseInt(yearMatch[1]);
      continue;
    }
    
    for (const [key, idx] of Object.entries(MONTHS_MAP)) {
      if (token.startsWith(key)) {
        results.push({ month: idx, year: lastYear });
        break;
      }
    }
  }

  return results;
}

function parsePaymentDate(text: string): string | null {
  const match = text.match(/PAYE[E]?\s+LE\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    let year = match[3] || "2026"; 
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  return null;
}

async function main() {
  const filePath = path.join(process.cwd(), 'Gestion Syndic Intellak II v10.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['2026'];
  if (!sheet) return;

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let currentBuilding = "1";
  const results: ExtractedRow[] = [];

  for (let r = range.s.r; r <= range.e.r; ++r) {
    const cellM = sheet[XLSX.utils.encode_cell({ r, c: 12 })];
    const cellN = sheet[XLSX.utils.encode_cell({ r, c: 13 })];
    if (cellM && cellM.v === "Immeuble" && cellN) {
      currentBuilding = String(cellN.v);
      continue;
    }

    const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cellA && typeof cellA.v === 'number') {
      const apprt = cellA.v;
      const unitId = `Imm${currentBuilding}.A${apprt}`;

      for (let mCol = 2; mCol <= 13; mCol++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: mCol })];
        if (cell && cell.c && cell.c.length > 0) {
          const comment = cell.c[0].t || cell.c[0];
          const entries = parseMonthsAndYears(comment);
          const historicalEntries = entries.filter(e => e.year < 2026);
          
          if (historicalEntries.length > 0) {
            const totalMonths = entries.length;
            const amountPerMonth = Number(cell.v) / totalMonths;
            const historicalAmount = amountPerMonth * historicalEntries.length;
            const payDate = parsePaymentDate(comment) || "2026-01-01";

            // Description should be global for all historical entries in this cell
            let descMonths = historicalEntries
               .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
               .map(e => `${MONTH_NAMES_NO_ACCENT[e.month]} ${e.year}`);
            
            // Clean Note: remove prefix, suffix, and 2026 parts
            let cleanNote = comment.replace(/Syndic Intellak II:/i, '').trim();
            cleanNote = cleanNote.split(/PAYE[E]?\s+LE/i)[0].trim();
            // Remove 2026 mentions like "/ JANV 2026"
            cleanNote = cleanNote.replace(/\/?[^/]*2026[^/]*/g, '').replace(/\/+$/, '').trim();

            results.push({
              type: 'RENT',
              description: `Cotisation ${descMonths.join(' et ')}`,
              amount: parseFloat(historicalAmount.toFixed(2)),
              method: 'CASH',
              date: payDate,
              bankName: '',
              bankRef: '',
              note: `${unitId} | ${removeAccents(cleanNote)}`
            });
          }
        }
      }
    }
  }

  // Header
  console.log("type,description,amount,method,date,bankName,bankRef,note");
  results.forEach(row => {
    // No quotes, remove accents from description too
    const desc = removeAccents(row.description);
    const note = removeAccents(row.note);
    console.log(`${row.type},${desc},${row.amount},${row.method},${row.date},${row.bankName},${row.bankRef},${note}`);
  });
}

main().catch(console.error);
