import * as XLSX from 'xlsx';

async function main() {
  const workbook = XLSX.readFile('Gestion Syndic Intellak II v10.xlsx');
  const sheet = workbook.Sheets['2026'];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let start = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] && rows[i].includes('Immeuble') && rows[i].includes(4)) {
      start = i;
      break;
    }
  }

  console.log(`--- Immeuble 4 Excel Rows (Start index: ${start}) ---`);
  let inData = false;
  let runningTotal = 0;

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (i > start && row && row.includes('Immeuble')) break;
    
    if (row && row.includes('Apprt')) {
      inData = true;
      console.log('Apprt | Jan | Feb | Mar | Apr | ... | Tot');
      continue;
    }

    if (inData && row && typeof row[0] === 'number') {
      const lot = row[0];
      const jan = row[2] || 0;
      const feb = row[3] || 0;
      const mar = row[4] || 0;
      const apr = row[5] || 0;
      const total = row[15] || 0;
      
      console.log(`${lot.toString().padEnd(5)} | ${jan.toString().padEnd(3)} | ${feb.toString().padEnd(3)} | ${mar.toString().padEnd(3)} | ${apr.toString().padEnd(3)} | ... | ${total}`);
      runningTotal += Number(total);
    }
  }
  console.log(`\nGrand Total for Building 4: ${runningTotal}`);
}

main().catch(console.error);
