const fs = require('fs');
let txt = fs.readFileSync('import-biens.js', 'utf8');

txt = txt.replace(/share: share,\n/g, '');
txt = txt.replace(/ownerId: ownerId,\n/g, '');

fs.writeFileSync('import-biens.js', txt);
console.log("Fixed import script fields!");
