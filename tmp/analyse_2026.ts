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

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let currentBuilding = "1";
  const analysis: any[] = [];

  for (let r = range.s.r; r <= range.e.r; ++r) {
    // Check if this row defines a new building (Column M has 'Immeuble', Column N has number)
    const cellM = sheet[XLSX.utils.encode_cell({ r, c: 12 })];
    const cellN = sheet[XLSX.utils.encode_cell({ r, c: 13 })];

    if (cellM && cellM.v === "Immeuble" && cellN) {
      currentBuilding = String(cellN.v);
      continue;
    }

    // Check if this is a unit row (Column A has a numeric apprt number)
    const cellA = sheet[XLSX.utils.encode_cell({ r, c: 0 })];
    if (cellA && typeof cellA.v === 'number') {
      const apprt = cellA.v;
      const ownerCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
      const owner = ownerCell ? ownerCell.v : "Inconnu";
      
      const unit = `Imm${currentBuilding}.A${apprt}`;
      
      // Check months (Col C to N -> Jan to Dec)
      const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"];
      
      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const colIdx = mIdx + 2; // C is index 2
        const monthCell = sheet[XLSX.utils.encode_cell({ r, c: colIdx })];
        
        if (monthCell && monthCell.c && monthCell.c.length > 0) {
          analysis.push({
            unit,
            owner,
            month: months[mIdx],
            comment: monthCell.c[0].t || monthCell.c[0]
          });
        }
      }

      // Check Garage (Col O -> Index 14)
      const garageCell = sheet[XLSX.utils.encode_cell({ r, c: 14 })];
      if (garageCell && garageCell.c && garageCell.c.length > 0) {
        analysis.push({
          unit,
          owner,
          month: "Garage",
          comment: garageCell.c[0].t || garageCell.c[0]
        });
      }
    }
  }

  console.log("ANALYSIS OF 2026 SHEET COMMENTS:");
  analysis.forEach(entry => {
    console.log(`[${entry.unit}] ${entry.owner} | ${entry.month}:`);
    console.log(`   ${entry.comment.replace(/\r\n/g, ' ').replace(/\n/g, ' ')}`);
  });
}

main().catch(console.error);
