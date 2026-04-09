const fs = require('fs');
const path = require('path');

const files = [
  'src/app/(app)/ops/receipts/page.tsx',
  'src/components/receipts/ContributionReceiptsTab.tsx',
  'src/components/receipts/OtherReceiptsTab.tsx',
  'src/components/receipts/ReceiptsTabs.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found at ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace bg-zinc-900 to bg-blue-600
  content = content.replace(/bg-zinc-900(?!\/)/g, 'bg-blue-600 hover:bg-blue-700');
  
  // Replace heavily rounded corners with md
  content = content.replace(/rounded-2xl/g, 'rounded-md');
  content = content.replace(/rounded-xl/g, 'rounded-md');
  content = content.replace(/rounded-full/g, 'rounded-md');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
