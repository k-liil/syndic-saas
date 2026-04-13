import * as XLSX from 'xlsx';

async function testImm4() {
  const excelPath = 'Gestion Syndic Intellak II v10.xlsx';
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets['2026'];
  const excelRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let startRow = -1;
  for (let i = 0; i < excelRows.length; i++) {
    if (excelRows[i] && excelRows[i].includes('Immeuble') && excelRows[i].includes(4)) {
      startRow = i;
      break;
    }
  }

  console.log(`Start Row for Imm 4: ${startRow}`);

  let excelTotal = 0;
  let inData = false;

  for (let i = startRow; i < excelRows.length; i++) {
    const row = excelRows[i];
    
    // Stop if we hit the next building or end of sheet
    if (i > startRow && row && row.includes('Immeuble')) break;
    
    // Switch to data mode once we hit the header
    if (row && row.includes('Apprt')) { inData = true; continue; }
    
    // Stop if we hit a "TOTAL" row
    if (inData && row && (row[0] === 'TOTAL' || row[1] === 'TOTAL' || (typeof row[0] === 'string' && row[0].includes('Total')))) {
      inData = false;
      continue;
    }

    if (inData && row) {
      // Check if this row has something in the month or total columns
      // Month columns are 2 to 14, Total is 15
      for (let m = 2; m <= 15; m++) {
          const val = row[m];
          if (typeof val === 'number') {
              // Be careful not to double count months and total
              // Let's just sum months 2 to 14
              if (m < 15) {
                excelTotal += val;
              }
          }
      }
    }
  }

  console.log(`Calculated Excel Total for Imm 4 (Sum of months): ${excelTotal}`);
}

testImm4();
