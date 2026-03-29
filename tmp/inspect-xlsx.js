const xlsx = require("xlsx");
const path = require("path");

const filePath = path.join(process.cwd(), "liste-des-paiements-du-01-01-2020-au-31-12-2023.xlsx");
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet);
console.log(`Total rows: ${data.length}`);
console.log("Sample row 1:", JSON.stringify(data[0], null, 2));
console.log("Sample row 2:", JSON.stringify(data[1], null, 2));
