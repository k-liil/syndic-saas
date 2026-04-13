import * as XLSX from 'xlsx';
import * as path from 'path';

async function main() {
  const filePath = path.join(process.cwd(), 'Gestion Syndic Intellak II v10.xlsx');
  
  console.log(`Lecture du fichier : ${filePath}`);
  
  const workbook = XLSX.readFile(filePath);
  
  let found = false;

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let r = range.s.r; r <= range.e.r; ++r) {
      for (let c = range.s.c; c <= range.e.c; ++c) {
        const address = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[address];
        
        if (cell && cell.c && cell.c.length > 0) {
          found = true;
          console.log(`--- Sheet: ${sheetName} | Cell: ${address} ---`);
          cell.c.forEach((comment: any, idx: number) => {
            console.log(`Commentaire ${idx + 1}: ${comment.t || comment}`);
          });
        }
      }
    }
  });

  if (!found) {
    console.log("Aucun commentaire trouvé dans le fichier.");
  }
}

main().catch(console.error);
