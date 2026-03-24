const fs = require('fs');
const files = [
  'src/app/(app)/setup/buildings/page.tsx',
  'src/app/(app)/setup/units/page.tsx',
  'src/app/(app)/ops/contributions/year/page.tsx',
  'src/components/receipts/ContributionReceiptsTab.tsx'
];
for (const f of files) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content
      .replace(/\bImmeubles\b/g, 'Bâtiments')
      .replace(/\bImmeuble\b/g, 'Bâtiment')
      .replace(/\bimmeubles\b/g, 'bâtiments')
      .replace(/\bimmeuble\b/g, 'bâtiment');
    fs.writeFileSync(f, content);
    console.log("Renamed in", f);
  }
}
