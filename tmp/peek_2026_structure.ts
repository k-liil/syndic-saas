import * as XLSX from 'xlsx';
import * as path from 'path';

async function main() {
  const filePath = path.join(process.cwd(), 'Gestion Syndic Intellak II v10.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = '2026';
  const sheet = workbook.Sheets[sheetName];
  
  if (!sheet) {
    console.log(`Onglet ${sheetName} non trouvé.`);
    return;
  }

  // Get raw data for the first 10 rows to understand the structure
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 }).slice(0, 15);
  console.log("SURFACE OF SHEET 2026 (First 15 rows):");
  console.log(JSON.stringify(data, null, 2));

  // Also check column names (headers)
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log("Range:", sheet['!ref']);
}

main().catch(console.error);
