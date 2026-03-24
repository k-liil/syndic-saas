const fs = require('fs');
const xlsx = require('xlsx');
const wb = xlsx.readFile('Biens.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
fs.writeFileSync('biens_out.json', JSON.stringify({ HEADERS: Object.keys(rows[0]), ROW1: rows[0] }, null, 2));
console.log("Written to biens_out.json");
