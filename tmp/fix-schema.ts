
import * as fs from 'fs';

const filePath = 'prisma/schema.prisma';
let content = fs.readFileSync(filePath, 'utf8');

// Handle Windows line endings by splitting properly and cleaning whitespace
const lines = content.split(/\r?\n/);
const newLines = lines.map(line => {
  if (line.includes('organization') && line.includes('Organization') && line.includes('@relation') && !line.includes('onDelete: Cascade')) {
    // Replace the trailing ) with , onDelete: Cascade). Handle optional whitespace/cr
    return line.replace(/\)\s*$/, ', onDelete: Cascade)');
  }
  return line;
});

// Join with \n (or the original line ending style)
fs.writeFileSync(filePath, newLines.join('\n'));
console.log('Schema updated successfully');
